// supabase/functions/billing-create-checkout/index.ts
// Создаёт платёж в YooKassa и возвращает confirmation_url для redirect.
//
// Защита от open-redirect: returnPath проверяется по allow-list
// (должен начинаться с '/' и НЕ содержать '//'/'\\'/CR/LF), а Origin —
// по allow-list из env (BILLING_ALLOWED_ORIGINS / AI_PROXY_ALLOWED_ORIGINS).

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { createYookassaPayment, YookassaApiError } from '../_shared/yookassa.ts';

const VALID_PLANS = new Set(['pro_monthly', 'pro_yearly']);
const PAYMENT_DESCRIPTION = 'Поток: визуальный редактор квизов';

function getProviderMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const description = typeof obj.description === 'string' ? obj.description : '';
  const parameter = typeof obj.parameter === 'string' ? obj.parameter : '';
  if (description && parameter) return `${description} (${parameter})`;
  if (description) return description;
  if (typeof obj.type === 'string') return obj.type;
  return null;
}

/**
 * Open-redirect guard. Allowed patterns:
 *   - "/billing/return"
 *   - "/billing/return?foo=bar"
 *   - "/some/path#section"
 * Forbidden:
 *   - absolute URLs ("http://evil.com", "//evil.com", "javascript:...")
 *   - any path containing CRLF (header injection)
 *   - backslash variants ("\\\\evil.com")
 *   - non-ASCII characters
 */
export function safeReturnPath(p: unknown): string | null {
  if (typeof p !== 'string' || !p) return null;
  if (p.length > 200) return null;
  if (!p.startsWith('/')) return null;
  if (p.startsWith('//')) return null;
  if (/[\r\n\\]/.test(p)) return null;
  if (!/^[\x20-\x7E/]+$/.test(p)) return null;
  return p;
}

/** Resolve the request origin against an allow-list. Returns null if not allowed. */
export function resolveAllowedSiteOrigin(req: Request, originHeader: string | null): string | null {
  const allowList = (Deno.env.get('BILLING_ALLOWED_ORIGINS') ??
    Deno.env.get('AI_PROXY_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // If no allow-list configured, refuse to construct a return URL with
  // arbitrary Origin. Otherwise an attacker who controls Origin could
  // bounce victims off our checkout endpoint to an arbitrary host.
  if (allowList.length === 0) return null;
  // Allow '*' for backwards-compat with dev environments.
  if (allowList.includes('*')) {
    if (originHeader && /^https?:\/\//.test(originHeader)) return originHeader;
    return null;
  }
  if (originHeader && allowList.includes(originHeader)) return originHeader;
  return null;
}

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const userClient = createUserClient(req.headers.get('Authorization'));
  const user = await getUserFromRequest(req, userClient);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401, origin);
  }
  const admin = createAdminClient();
  const userEmail = typeof user.email === 'string' ? user.email.trim() : '';
  if (!userEmail) {
    return jsonResponse({ error: 'user_email_required' }, 400, origin);
  }

  let body: { planId?: string; returnPath?: string; paymentMethod?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }
  const planId = body.planId;
  if (!planId || !VALID_PLANS.has(planId)) {
    return jsonResponse({ error: 'Invalid planId' }, 400, origin);
  }
  const paymentMethod = body.paymentMethod ?? 'any';
  if (paymentMethod !== 'any' && paymentMethod !== 'sbp') {
    return jsonResponse({ error: 'Invalid paymentMethod' }, 400, origin);
  }
  const returnPath = body.returnPath
    ? safeReturnPath(body.returnPath)
    : '/billing/return';
  if (body.returnPath && !returnPath) {
    return jsonResponse({ error: 'Invalid returnPath' }, 400, origin);
  }

  // 1. Получаем план
  const { data: plan, error: planErr } = await admin
    .from('plans')
    .select('id, name, price_kopecks, period')
    .eq('id', planId)
    .eq('is_active', true)
    .single();
  if (planErr || !plan) {
    return jsonResponse({ error: 'Plan not found' }, 404, origin);
  }

  // 2. Проверяем, нет ли уже активной подписки
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .maybeSingle();
  if (existing && new Date(existing.current_period_end) > new Date()) {
    return jsonResponse(
      { error: 'already_subscribed', subscription: existing },
      409,
      origin,
    );
  }

  // 3. Создаём idempotence-key. Use a stable per-plan per-day bucket so
  // legitimate retries within the same day are deduped at YooKassa while
  // still allowing fresh attempts on the next day.
  const dayBucket = new Date().toISOString().slice(0, 10);
  const compactUserId = user.id.replaceAll('-', '').slice(0, 16);
  const compactPlanId = planId === 'pro_yearly' ? 'y' : 'm';
  const compactPaymentMethod = paymentMethod === 'sbp' ? 's' : 'a';
  const idempotenceKey = `co:${compactUserId}:${compactPlanId}:${compactPaymentMethod}:${dayBucket.replaceAll('-', '')}:v2`;

  // 4. Build the return URL. The site origin MUST be in the allow-list
  // to prevent redirecting victims to an attacker-controlled domain.
  const siteOrigin = resolveAllowedSiteOrigin(req, origin);
  if (!siteOrigin) {
    return jsonResponse(
      { error: 'origin_not_allowed' },
      403,
      origin,
    );
  }
  const fullReturnUrl = `${siteOrigin}/#${returnPath}`;

  let payment;
  try {
    payment = await createYookassaPayment({
      amountKopecks: plan.price_kopecks,
      description: PAYMENT_DESCRIPTION,
      returnUrl: fullReturnUrl,
      savePaymentMethod: false,
      paymentMethodType: paymentMethod === 'sbp' ? 'sbp' : undefined,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        user_email: userEmail,
        payment_method: paymentMethod,
      },
      customerEmail: userEmail,
      idempotenceKey,
      receiptItems: [
        {
          description: PAYMENT_DESCRIPTION,
          amount: {
            value: (plan.price_kopecks / 100).toFixed(2),
            currency: 'RUB',
          },
          vat_code: 1, // без НДС
          quantity: 1,
          payment_mode: 'full_payment',
          payment_subject: 'service',
        },
      ],
    });
  } catch (e) {
    console.error('[create-checkout] YooKassa error:', e);
    if (e instanceof YookassaApiError) {
      return jsonResponse(
        {
          error: 'payment_provider_error',
          provider_status: e.status,
          provider_message: getProviderMessage(e.body),
        },
        502,
        origin,
      );
    }
    return jsonResponse({ error: 'payment_provider_error' }, 502, origin);
  }

  // 5. Сохраняем pending-платёж
  const { error: insErr } = await admin.from('payments').insert({
    user_id: user.id,
    plan_id: planId,
    provider: 'yookassa',
    external_id: payment.id,
    status: payment.status,
    amount_kopecks: plan.price_kopecks,
    currency: 'RUB',
    save_payment_method: false,
    description: PAYMENT_DESCRIPTION,
    idempotence_key: idempotenceKey,
  });
  if (insErr) {
    console.error('[create-checkout] insert payment failed:', insErr);
    // не критично — webhook создаст/обновит запись
  }

  return jsonResponse({
    confirmation_url: payment.confirmation?.confirmation_url,
    payment_id: payment.id,
    amount: payment.amount.value,
    currency: payment.amount.currency,
  }, 200, origin);
});

function serve(handler: (req: Request) => Promise<Response>) {
  if (import.meta.main) {
    return Deno.serve(handler);
  }
  return { finish: () => {} };
}

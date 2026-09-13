// supabase/functions/billing-yookassa-webhook/index.ts
// Принимает уведомления от YooKassa, обновляет payments/subscriptions/entitlements.
//
// Идемпотентность: (provider, external_id) UNIQUE в webhook_events.
// Безопасность: defense-in-depth —
//   1) shared secret в ?key= (BILLING_WEBHOOK_SECRET),
//   2) IP allow-list YooKassa (best-effort),
//   3) ручная верификация через get-payment (источник истины).
// Configure the secret in YooKassa dashboard when registering the webhook URL.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  getYookassaPayment,
  getClientIp,
  isYookassaIp,
} from '../_shared/yookassa.ts';
import { timingSafeEqual, verifyHashedSecret } from '../_shared/crypto.ts';
import { getFreeTierFeatures } from '../_shared/free_tier_defaults.ts';

const WEBHOOK_SOURCES = new Set(['yookassa']);

/**
 * Runs the 4 early-return layers (secret → IP → size → body shape) that
 * gate the webhook before any DB or HTTP calls happen. On success,
 * returns the parsed payload and external id so the handler doesn't
 * have to re-read the body. On failure, returns a 4xx/5xx Response
 * suitable to be returned directly to the caller.
 *
 * Exported for unit testing — the rest of the handler (dedup,
 * processPaymentEvent, atomic grant) is too DB-coupled to test
 * without a Supabase stub and is covered by integration / smoke tests.
 */
export type WebhookValidationResult =
  | { ok: true; payload: { type: string; event: string; object: { id: string } }; externalId: string }
  | { ok: false; response: Response };

export async function validateWebhookRequest(
  req: Request,
  env: {
    webhookSecret?: string;
    webhookSecretHash?: string;
    skipIpCheck?: boolean;
  } = {},
): Promise<WebhookValidationResult> {
  // 1. Shared secret (hash mode preferred, raw-string fallback for
  //    legacy deployments, 503 if neither is configured).
  const url = new URL(req.url);
  const gotKey = url.searchParams.get('key') ?? '';
  if (env.webhookSecretHash) {
    if (!(await verifyHashedSecret(gotKey, env.webhookSecretHash))) {
      return { ok: false, response: jsonResponse({ error: 'forbidden' }, 403, null) };
    }
  } else if (env.webhookSecret) {
    if (!timingSafeEqual(gotKey, env.webhookSecret)) {
      return { ok: false, response: jsonResponse({ error: 'forbidden' }, 403, null) };
    }
  } else {
    return { ok: false, response: jsonResponse({ error: 'webhook_disabled' }, 503, null) };
  }

  // 2. IP allow-list (best-effort; bypassable via XFF spoofing — which
  //    is exactly why layer 1 matters most).
  const clientIp = getClientIp(req);
  if (!env.skipIpCheck && !isYookassaIp(clientIp)) {
    return { ok: false, response: jsonResponse({ error: 'forbidden_ip' }, 403, null) };
  }

  // 3. Body size cap (32 KB — YooKassa webhooks are typically < 4 KB).
  const MAX_WEBHOOK_BODY = 32 * 1024;
  const contentLengthRaw = req.headers.get('content-length');
  const contentLength = contentLengthRaw ? parseInt(contentLengthRaw, 10) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY) {
    return { ok: false, response: jsonResponse({ error: 'payload_too_large' }, 413, null) };
  }

  // 4. JSON shape (notification event with object.id).
  let payload: {
    type?: string;
    event?: string;
    object?: { id?: string };
  };
  let rawBody = '';
  try {
    rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BODY) {
      return { ok: false, response: jsonResponse({ error: 'payload_too_large' }, 413, null) };
    }
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, response: jsonResponse({ error: 'invalid_json' }, 400, null) };
  }
  if (payload.type !== 'notification' || !payload.event) {
    return { ok: false, response: jsonResponse({ error: 'not_a_notification' }, 400, null) };
  }
  if (!payload.object?.id) {
    return { ok: false, response: jsonResponse({ error: 'missing_object_id' }, 400, null) };
  }
  return {
    ok: true,
    payload: payload as { type: string; event: string; object: { id: string } },
    externalId: payload.object.id,
  };
}

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, null);
  }

  // 1-3. Secret, IP, size, body shape. See validateWebhookRequest for
  // the rationale on each layer.
  const validationRes = await validateWebhookRequest(req, {
    webhookSecret: Deno.env.get('BILLING_WEBHOOK_SECRET') ?? undefined,
    webhookSecretHash: Deno.env.get('BILLING_WEBHOOK_SECRET_HASH') ?? undefined,
    skipIpCheck: Deno.env.get('YOOKASSA_SKIP_IP_CHECK') === 'true',
  });
  if (!validationRes.ok) return validationRes.response;
  const { payload, externalId } = validationRes;

  const admin = createAdminClient();

  // 4. Идемпотентность: пишем в webhook_events, если уже есть — 200 OK
  const { data: inserted, error: insertErr } = await admin
    .from('webhook_events')
    .insert({
      provider: 'yookassa',
      event_type: payload.event,
      external_id: externalId,
      payload,
    })
    .select('id')
    .maybeSingle();
  if (insertErr) {
    // конфликт уникальности → уже обработано
    if (insertErr.code === '23505') {
      return jsonResponse({ ok: true, dedup: true }, 200, null);
    }
    console.error('[webhook] insert event failed:', insertErr);
    return jsonResponse({ error: 'internal' }, 500, null);
  }
  if (!inserted) {
    return jsonResponse({ ok: true, dedup: true }, 200, null);
  }
  const eventId = inserted.id;

  // 5. Обработка по типу события
  try {
    switch (payload.event) {
      case 'payment.succeeded':
      case 'payment.canceled':
      case 'payment.waiting_for_capture':
      case 'refund.succeeded': {
        await processPaymentEvent(admin, externalId, payload.event);
        break;
      }
      default:
        // неизвестное событие — логируем, но не падаем
        console.log('[webhook] unknown event:', payload.event);
    }
    await admin
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId);
  } catch (e) {
    console.error('[webhook] processing error:', e);
    await admin
      .from('webhook_events')
      .update({
        error: e instanceof Error ? e.message : String(e),
      })
      .eq('id', eventId);
    return jsonResponse({ error: 'processing_failed' }, 500, null);
  }

  return jsonResponse({ ok: true }, 200, null);
});

interface Plan {
  id: string;
  name: string;
  period: 'month' | 'year';
}

async function processPaymentEvent(
  admin: ReturnType<typeof createAdminClient>,
  paymentId: string,
  event: string,
) {
  // 1. Перезапрашиваем платёж в YooKassa (источник истины)
  const payment = await getYookassaPayment(paymentId);
  const meta = payment.metadata ?? {};
  const userId = meta.user_id;
  const planId = meta.plan_id;
  if (!userId || !planId) {
    throw new Error('payment metadata missing user_id/plan_id');
  }

  // 2. Обновляем payments
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id')
    .eq('external_id', paymentId)
    .maybeSingle();

  const updateFields: Record<string, unknown> = {
    status: payment.status,
    raw_payload: payment,
    payment_method_id: payment.payment_method?.id ?? null,
  };
  if (payment.receipt?.registration_url) {
    updateFields.receipt_url = payment.receipt.registration_url;
  }

  if (!existingPayment) {
    // первый раз видим (например, тест или ручной триггер)
    const { data: plan } = await admin
      .from('plans')
      .select('id, price_kopecks, period, name')
      .eq('id', planId)
      .single();
    if (!plan) throw new Error('plan not found for payment');
    await admin.from('payments').insert({
      user_id: userId,
      plan_id: planId,
      provider: 'yookassa',
      external_id: paymentId,
      status: payment.status,
      amount_kopecks: plan.price_kopecks,
      currency: payment.amount.currency,
      is_recurring: false,
      save_payment_method: false,
      payment_method_id: payment.payment_method?.id ?? null,
      raw_payload: payment,
    });
  } else {
    await admin
      .from('payments')
      .update(updateFields)
      .eq('external_id', paymentId);
  }

  // 3. Если платёж успешен → активируем/продлеваем подписку
  if (event === 'payment.succeeded' && payment.status === 'succeeded') {
    await activateOrRenewSubscription(admin, userId, planId, payment);
  } else if (
    event === 'payment.canceled' ||
    payment.status === 'canceled'
  ) {
    await cancelSubscriptionByFailedPayment(admin, userId);
  }
}

async function activateOrRenewSubscription(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  planId: string,
  payment: { id: string; payment_method?: { id?: string; saved?: boolean } },
) {
  // Получаем тариф
  const { data: plan } = await admin
    .from('plans')
    .select('id, name, period, features, price_kopecks')
    .eq('id', planId)
    .single();
  if (!plan) throw new Error('plan not found');
  const typedPlan = plan as Plan & { features: Record<string, unknown> };

  const periodMs = typedPlan.period === 'year'
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const newEnd = new Date(now.getTime() + periodMs);

  // Look up our local payment row (FK target for last_payment_id).
  const { data: paymentRow } = await admin
    .from('payments')
    .select('id')
    .eq('external_id', payment.id)
    .maybeSingle();

  // Single RPC, single transaction. Replaces 4-6 sequential updates that
  // could partially fail and leave subscriptions vs entitlements out of
  // sync. The RPC handles both first-grant and renewal cases.
  const { data, error } = await admin.rpc('process_payment_atomic', {
    p_provider: 'yookassa',
    p_provider_payment_id: payment.id,
    p_user_id: userId,
    p_plan_id: planId,
    p_period_start: now.toISOString(),
    p_period_end: newEnd.toISOString(),
    p_last_payment_id: paymentRow?.id ?? null,
    p_features: typedPlan.features,
  });

  if (error) {
    console.error('[webhook] process_payment_atomic failed:', error);
    throw new Error('atomic grant failed: ' + error.message);
  }

  console.log('[webhook] process_payment_atomic result:', data);
}

async function cancelSubscriptionByFailedPayment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Откатываем entitlement на free. The free-tier shape lives in
  // _shared/free_tier_defaults.ts so it cannot drift between
  // billing-yookassa-webhook, billing-auto-renew, and any future
  // cancel path (e.g. billing-cancel-subscription).
  await admin
    .from('entitlements')
    .update({
      plan: 'free',
      features: getFreeTierFeatures(),
      valid_until: null,
      source: 'system',
    })
    .eq('user_id', userId);
}

function serve(handler: (req: Request) => Promise<Response>) {
  if (import.meta.main) {
    return Deno.serve(handler);
  }
  return { finish: () => {} };
}

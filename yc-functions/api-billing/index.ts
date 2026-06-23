import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';
import { getYookassaPayment, isYookassaIp, getClientIp, timingSafeEqual } from '../_shared/yookassa';
import { randomUUID } from 'node:crypto';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const YOOKASSA_API = 'https://api.yookassa.ru/v3';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mykviz.ru';
const BILLING_WEBHOOK_SECRET = process.env.BILLING_WEBHOOK_SECRET || '';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod === 'POST' && pathParameters?.action === 'yookassa-webhook') {
    return handleWebhook(event, body);
  }

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    switch (pathParameters?.action) {
      case 'create-checkout':
        return await createCheckout(body, user);
      case 'get-entitlement':
        return await getEntitlement(user);
      case 'cancel-subscription':
        return await cancelSubscription(user);
      default:
        return notFound();
    }
  } catch (error) {
    console.error('Billing error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function getEntitlement(user: any) {
  const [row] = await query(
    `SELECT public.get_effective_entitlement($1::uuid) as entitlement`,
    [user.id],
  );

  const entitlement = row?.entitlement || {
    plan: 'free',
    features: {
      max_quizzes: 3,
      ai_tier: 'basic',
      hide_branding: false,
      premium_templates: false,
      unlimited_logic: false,
    },
  };

  const rawPlan = String(entitlement.plan || 'free');
  const isPro = rawPlan === 'pro' || rawPlan.startsWith('pro_');
  const features = entitlement.features || {};
  const aiTier = features.ai_tier || (isPro ? 'advanced' : 'basic');

  return ok({
    tier: isPro ? 'pro' : 'free',
    plan: isPro ? 'pro' : 'free',
    plan_id: isPro ? (entitlement.plan_id || rawPlan) : 'free',
    status: isPro ? 'active' : 'free',
    quizzes_limit: features.max_quizzes ?? (isPro ? null : 3),
    ai_questions_limit: aiTier === 'premium' ? 500 : aiTier === 'advanced' ? 200 : 5,
    has_media_upload: isPro || Boolean(features.hide_branding || features.has_media_upload),
    current_period_end: entitlement.valid_until || null,
    cancel_at_period_end: Boolean(entitlement.cancel_at_period_end),
    features,
  });
}

async function createCheckout(body: string, user: any) {
  const { plan } = JSON.parse(body);
  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    return badRequest('plan must be monthly or yearly');
  }

  const planRow = await queryOne(
    `SELECT * FROM public.plans WHERE id = $1`,
    [`pro_${plan}`],
  );
  if (!planRow) return badRequest('Plan not found');

  const amount = (planRow.price_kopecks / 100).toFixed(2);
  const description = plan === 'monthly' ? 'PRO подписка QuizFlow (месяц)' : 'PRO подписка QuizFlow (год)';

  const idempotenceKey = randomUUID();
  const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

  const paymentBody = {
    amount: { value: amount, currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: `${FRONTEND_URL}/billing?success=true` },
    description,
    metadata: { user_id: user.id, plan_id: `pro_${plan}` },
  };

  let res: Response;
  try {
    res = await fetch(`${YOOKASSA_API}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(paymentBody),
    });
  } catch (err) {
    console.error('[billing] yookassa network error:', (err as Error).message);
    return serverError('Payment provider unavailable');
  }

  if (!res.ok) {
    const text = await res.text();
    console.error('[billing] yookassa error:', res.status, text);
    return serverError('Payment creation failed');
  }

  const payment = await res.json() as { id: string; confirmation?: { confirmation_url?: string } };

  await query(
    `INSERT INTO public.payments (user_id, plan_id, amount_kopecks, status, provider_payment_id, description, currency)
     VALUES ($1, $2, $3, 'pending', $4, $5, 'RUB')`,
    [user.id, planRow.id, planRow.price_kopecks, payment.id, description],
  );

  return ok({
    confirmation_url: payment.confirmation?.confirmation_url,
    payment_id: payment.id,
    amount: planRow.price_kopecks,
    currency: 'RUB',
  });
}

async function cancelSubscription(user: any) {
  const sub = await queryOne(
    `SELECT * FROM public.subscriptions
     WHERE user_id = $1 AND status IN ('active', 'past_due')
     ORDER BY current_period_end DESC LIMIT 1`,
    [user.id],
  );

  if (!sub) return badRequest('No active subscription');

  if (sub.provider_subscription_id) {
    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
    try {
      await fetch(`${YOOKASSA_API}/subscriptions/${sub.provider_subscription_id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'Idempotence-Key': crypto.randomUUID(),
        },
      });
    } catch (err) {
      console.error('[billing] cancel subscription error:', (err as Error).message);
    }
  }

  await query(
    `UPDATE public.subscriptions
     SET status = 'canceled', canceled_at = now(), cancel_at_period_end = true, updated_at = now()
     WHERE id = $1`,
    [sub.id],
  );

  return ok({
    ok: true,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: true,
  });
}

async function handleWebhook(event: any, body: string) {
  const clientIp = getClientIp(event);

  // Layer 1: Shared secret verification
  if (BILLING_WEBHOOK_SECRET) {
    const url = new URL(event.url || `https://placeholder/?key=${event.queryStringParameters?.key || ''}`);
    const gotKey = event.queryStringParameters?.key || url.searchParams.get('key') || '';
    if (!timingSafeEqual(gotKey, BILLING_WEBHOOK_SECRET)) {
      console.warn('[webhook] secret mismatch from', clientIp);
      return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'forbidden' }) };
    }
  }

  // Layer 2: IP allow-list (best-effort)
  if (!isYookassaIp(clientIp)) {
    console.warn('[webhook] IP not in allow-list:', clientIp);
    // Soft-fail for now — IP check is best-effort behind CDN/proxy
  }

  // Layer 3: Body size cap (32 KB)
  if (body.length > 32 * 1024) {
    return { statusCode: 413, headers: corsHeaders(), body: JSON.stringify({ error: 'payload_too_large' }) };
  }

  // Layer 4: JSON shape validation
  let payload: any;
  try { payload = JSON.parse(body); } catch { return badRequest('Invalid JSON'); }
  if (payload.type !== 'notification' || !payload.event) {
    return badRequest('not_a_notification');
  }
  if (!payload.object?.id) {
    return badRequest('missing_object_id');
  }

  const externalId = payload.object.id;

  // Layer 5: Idempotency check via webhook_events table
  const existing = await queryOne(
    `SELECT id FROM public.webhook_events WHERE provider = 'yookassa' AND external_id = $1`,
    [externalId],
  );
  if (existing) {
    return ok({ ok: true, dedup: true });
  }

  // Insert event for dedup
  await query(
    `INSERT INTO public.webhook_events (provider, event_type, external_id, payload)
     VALUES ('yookassa', $1, $2, $3)
     ON CONFLICT (provider, external_id) DO NOTHING`,
    [payload.event, externalId, JSON.stringify(payload)],
  );

  // Layer 6: Re-fetch payment from YooKassa (source of truth)
  let payment;
  try {
    payment = await getYookassaPayment(externalId);
  } catch (err) {
    console.error('[webhook] failed to re-fetch payment:', (err as Error).message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'payment_fetch_failed' }) };
  }

  const meta = payment.metadata ?? {};
  const userId = meta.user_id;
  const planId = meta.plan_id;

  try {
    switch (payload.event) {
      case 'payment.succeeded':
      case 'payment.waiting_for_capture':
        if (userId && planId) {
          await activateOrRenewSubscription(userId, planId, payment);
        }
        break;
      case 'payment.canceled':
        if (userId) {
          await cancelSubscriptionByPayment(userId);
        }
        break;
      default:
        console.log('[webhook] unknown event:', payload.event);
    }

    // Mark as processed
    await query(
      `UPDATE public.webhook_events SET processed_at = now() WHERE provider = 'yookassa' AND external_id = $1`,
      [externalId],
    );
  } catch (err) {
    console.error('[webhook] processing error:', err);
    await query(
      `UPDATE public.webhook_events SET error = $1 WHERE provider = 'yookassa' AND external_id = $2`,
      [err instanceof Error ? err.message : 'unknown', externalId],
    );
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'processing_failed' }) };
  }

  return ok({ ok: true });
}

async function activateOrRenewSubscription(userId: string, planId: string, payment: any) {
  const plan = await queryOne(`SELECT * FROM public.plans WHERE id = $1`, [planId]);
  if (!plan) throw new Error('plan not found: ' + planId);

  const now = new Date();
  const periodMs = plan.period === 'year'
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  const newEnd = new Date(now.getTime() + periodMs);

  // Upsert subscription
  const existingSub = await queryOne(
    `SELECT id FROM public.subscriptions WHERE user_id = $1 AND status IN ('active', 'past_due')`,
    [userId],
  );

  if (existingSub) {
    await query(
      `UPDATE public.subscriptions
       SET status = 'active', current_period_end = $1, updated_at = now()
       WHERE id = $2`,
      [newEnd.toISOString(), existingSub.id],
    );
  } else {
    await query(
      `INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, provider)
       VALUES ($1, $2, 'active', $3, $4, 'yookassa')`,
      [userId, planId, now.toISOString(), newEnd.toISOString()],
    );
  }

  // Upsert entitlement
  await query(
    `INSERT INTO public.entitlements (user_id, plan, features, valid_until, source)
     VALUES ($1, 'pro', $2, $3, 'payment')
     ON CONFLICT (user_id) DO UPDATE SET
       plan = 'pro', features = $2, valid_until = $3, source = 'payment'`,
    [userId, JSON.stringify(plan.features || {}), newEnd.toISOString()],
  );

  // Update payment status
  await query(
    `UPDATE public.payments SET status = 'succeeded' WHERE provider_payment_id = $1`,
    [payment.id],
  );
}

async function cancelSubscriptionByPayment(userId: string) {
  await query(
    `UPDATE public.subscriptions
     SET status = 'canceled', canceled_at = now(), updated_at = now()
     WHERE user_id = $1 AND status IN ('active', 'past_due')`,
    [userId],
  );

  // Revert entitlement to free
  await query(
    `UPDATE public.entitlements
     SET plan = 'free', features = $1, valid_until = NULL, source = 'system'
     WHERE user_id = $2`,
    [JSON.stringify({ max_quizzes: 3, ai_tier: 'basic', hide_branding: false, premium_templates: false, unlimited_logic: false }), userId],
  );
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) };
}

function badRequest(message: string) {
  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function notFound() {
  return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Not found' }) };
}

function serverError(message: string) {
  return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

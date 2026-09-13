import { applyConfirmedPayment } from '../_shared/payment-application';
import { AccountBlockedError } from '../_shared/auth';
import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne, withTransaction } from '../_shared/db';
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
    const user = await verifyAuth(event, { allowBlocked: ['get-entitlement', 'cancel-subscription'].includes(pathParameters?.action) });
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    switch (pathParameters?.action) {
      case 'create-checkout':
        return await createCheckout(body, user);
      case 'get-entitlement':
        return await getEntitlement(user);
      case 'cancel-subscription':
        return await withTransaction(async()=>{ await query("SELECT id FROM public.users WHERE id=$1 FOR UPDATE",[user.id]); return cancelSubscription(user); });
      default:
        return notFound();
    }
  } catch (error) {
    if (error instanceof AccountBlockedError) return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: error.code }) };
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
    `SELECT id FROM public.webhook_events WHERE provider = 'yookassa' AND external_id = $1 AND processed_at IS NOT NULL AND event_type = $2`,
    [externalId, payload.event],
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
    await query("UPDATE public.webhook_events SET error='provider_unavailable' WHERE provider='yookassa' AND external_id=$1",[externalId]);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'payment_fetch_failed' }) };
  }


  try {
    switch (payload.event) {
      case 'payment.succeeded': {
        const local = await queryOne('SELECT id FROM public.payments WHERE provider_payment_id=$1',[externalId]);
        if (!local) throw new Error('payment_not_found');
        await applyConfirmedPayment(local.id,payment,'webhook');
        break;
      }
      case 'payment.waiting_for_capture':
        return ok({ok:true});
      case 'payment.canceled':
        if (payment.status === 'canceled') await query("UPDATE public.payments SET status='canceled' WHERE provider_payment_id=$1 AND status='pending'",[externalId]);
        break;
      default:
        console.log('[webhook] unknown event:', payload.event);
    }

    // Mark as processed
    await query(
      `UPDATE public.webhook_events SET processed_at = now(),error=NULL,event_type=$2 WHERE provider = 'yookassa' AND external_id = $1`,
      [externalId,payload.event],
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

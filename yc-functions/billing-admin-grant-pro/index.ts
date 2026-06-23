import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';
import { timingSafeEqual, getClientIp } from '../_shared/yookassa';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fingerprintSecret(secret: string, bucket: string): Promise<string> {
  const data = new TextEncoder().encode(secret + '|' + bucket);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  // Admin secret verification (constant-time)
  const expected = process.env.BILLING_ADMIN_SECRET || '';
  if (!expected) {
    const got = headers['x-admin-secret'] || '';
    timingSafeEqual(got, expected);
    return {
      statusCode: 503,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'admin_disabled' }),
    };
  }
  const got = headers['x-admin-secret'] || '';
  if (!timingSafeEqual(got, expected)) {
    return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'forbidden' }) };
  }

  let parsed: { user_id?: string; days?: number; reason?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const userId = parsed.user_id;
  if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_user_id' }) };
  }

  const rawDays = Number(parsed.days);
  if (!Number.isFinite(rawDays) || rawDays <= 0) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_days' }) };
  }
  const days = Math.max(1, Math.min(365, Math.trunc(rawDays)));

  const reasonRaw = typeof parsed.reason === 'string' ? parsed.reason : null;
  const reason = reasonRaw ? reasonRaw.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500) : null;

  const planId = days >= 300 ? 'pro_yearly' : 'pro_monthly';
  const plan = await queryOne(`SELECT * FROM public.plans WHERE id = $1`, [planId]);
  if (!plan) return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'plan_not_found' }) };

  const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Upsert entitlement
  await query(
    `INSERT INTO public.entitlements (user_id, plan, features, source, valid_until)
     VALUES ($1, 'pro', $2, 'admin', $3)
     ON CONFLICT (user_id) DO UPDATE SET
       plan = 'pro', features = $2, source = 'admin', valid_until = $3`,
    [userId, JSON.stringify(plan.features || {}), validUntil],
  );

  // Upsert subscription
  const now = new Date().toISOString();
  await query(
    `INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, 'active', $3, $4, false)
     ON CONFLICT (user_id) DO UPDATE SET
       plan_id = $2, status = 'active', current_period_start = $3, current_period_end = $4, cancel_at_period_end = false`,
    [userId, planId, now, validUntil],
  );

  // Audit log
  const auditBucket = new Date().toISOString().slice(0, 10);
  const fingerprint = await fingerprintSecret(got, auditBucket);
  const ip = getClientIp(event);
  const userAgent = (headers['user-agent'] || '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500);

  await query(
    `INSERT INTO public.admin_audit_log
     (actor_fingerprint, action, target_type, target_id, details, ip, user_agent)
     VALUES ($1, 'grant_pro', 'user', $2, $3, $4, $5)`,
    [fingerprint, userId, JSON.stringify({ days, plan: planId, reason }), ip, userAgent || null],
  );

  return {
    statusCode: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      user_id: userId,
      plan: planId,
      valid_until: validUntil,
      reason: reason || null,
    }),
  };
}

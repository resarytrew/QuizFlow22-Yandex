import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    const { code } = JSON.parse(body);
    if (!code || typeof code !== 'string') return badRequest('code is required');

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9\-]{4,20}$/.test(normalizedCode)) {
      return badRequest('invalid code format');
    }

    const promo = await queryOne(
      `SELECT * FROM public.promo_codes WHERE code = $1`,
      [normalizedCode],
    );
    if (!promo) return badRequest('promocode_not_found');
    if (!promo.is_active) return badRequest('promocode_inactive');

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return badRequest('promocode_not_yet_valid');
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return badRequest('promocode_expired');
    }
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return badRequest('promocode_exhausted');
    }

    const existingRedemption = await queryOne(
      `SELECT id FROM public.promo_redemptions WHERE code = $1 AND user_id = $2`,
      [normalizedCode, user.id],
    );
    if (existingRedemption) return badRequest('promocode_already_used');

    const planDays = promo.plan_id === 'pro_yearly' ? 365 : 30;
    const validUntil = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    const planRow = await queryOne(
      `SELECT id, features FROM public.plans WHERE id = $1`,
      [promo.plan_id],
    );
    if (!planRow) return badRequest('plan_not_found');

    // Upsert entitlement
    await query(
      `INSERT INTO public.entitlements (user_id, plan, features, source, valid_until)
       VALUES ($1, 'pro', $2, 'promo', $3)
       ON CONFLICT (user_id) DO UPDATE SET
         plan = 'pro', features = $2, source = 'promo', valid_until = $3`,
      [user.id, JSON.stringify(planRow.features || {}), validUntil],
    );

    // Upsert subscription
    await query(
      `INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, 'active', $3, $4, false)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = $2, status = 'active', current_period_start = $3, current_period_end = $4, cancel_at_period_end = false`,
      [user.id, promo.plan_id, nowISO, validUntil],
    );

    // Record redemption
    await query(
      `INSERT INTO public.promo_redemptions (code, user_id) VALUES ($1, $2)`,
      [normalizedCode, user.id],
    );

    // Increment usage count
    await query(
      `UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = $1`,
      [normalizedCode],
    );

    return ok({
      ok: true,
      grant: {
        plan: promo.plan_id,
        valid_until: validUntil,
      },
    });
  } catch (error) {
    console.error('Redeem promo error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
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

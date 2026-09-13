import { AccountBlockedError } from '../_shared/auth';
import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne, withTransaction } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(event);
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    const { code } = JSON.parse(body);
    if (!code || typeof code !== 'string') return badRequest('code is required');

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9\-]{4,20}$/.test(normalizedCode)) {
      return badRequest('invalid code format');
    }

    return await withTransaction(async()=>{
    await query('SELECT id FROM public.users WHERE id=$1 FOR UPDATE',[user.id]);
    const promo = await queryOne(
      `SELECT * FROM public.promo_codes WHERE code = $1 FOR UPDATE`,
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
    const redemption = await queryOne(`INSERT INTO public.promo_redemptions(code,user_id,valid_until)
      VALUES($1,$2,GREATEST(now(),(public.get_effective_entitlement($2)->>'valid_until')::timestamptz)+($3::integer * interval '1 day')) RETURNING valid_until`,
      [normalizedCode,user.id,planDays]);
    const validUntil = new Date(redemption!.valid_until).toISOString();
    await query('SELECT public.refresh_effective_entitlement($1)',[user.id]);

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
    });
  } catch (error) {
    if (error instanceof AccountBlockedError) return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: error.code }) };
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

// supabase/functions/billing-redeem-promo/index.ts
// Apply a 100%-off promo code to get free PRO access.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, origin);
  }

  const userClient = createUserClient(req.headers.get('Authorization'));
  const user = await getUserFromRequest(req, userClient);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401, origin);

  let body: { code?: unknown };
  try { body = await req.json(); } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, origin);
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code || !/^[A-Z0-9\-]{4,20}$/.test(code)) {
    return jsonResponse({ error: 'invalid_code' }, 400, origin);
  }

  const admin = createAdminClient();

  const { data: promo, error: promoErr } = await admin
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (promoErr) {
    console.error('[billing-redeem-promo] query error:', promoErr.message);
    return jsonResponse({ error: 'internal_error' }, 500, origin);
  }
  if (!promo) return jsonResponse({ error: 'promocode_not_found' }, 404, origin);
  if (!promo.is_active) return jsonResponse({ error: 'promocode_inactive' }, 400, origin);

  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return jsonResponse({ error: 'promocode_not_yet_valid' }, 400, origin);
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return jsonResponse({ error: 'promocode_expired' }, 400, origin);
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return jsonResponse({ error: 'promocode_exhausted' }, 400, origin);
  }

  const { data: existingRedemption } = await admin
    .from('promo_redemptions')
    .select('id')
    .eq('code', code)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingRedemption) {
    return jsonResponse({ error: 'promocode_already_used' }, 409, origin);
  }

  const planDays = promo.plan_id === 'pro_yearly' ? 365 : 30;
  const validUntil = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000).toISOString();
  const nowISO = now.toISOString();

  const { data: planRow } = await admin
    .from('plans')
    .select('id, features')
    .eq('id', promo.plan_id)
    .single();
  if (!planRow) {
    console.error('[billing-redeem-promo] plan not found:', promo.plan_id);
    return jsonResponse({ error: 'plan_not_found' }, 500, origin);
  }

  const { error: entErr } = await admin.from('entitlements').upsert(
    {
      user_id: user.id,
      plan: 'pro',
      features: planRow.features,
      source: 'promo',
      valid_until: validUntil,
    },
    { onConflict: 'user_id' },
  );
  if (entErr) {
    console.error('[billing-redeem-promo] entitlement upsert failed:', entErr.message);
    return jsonResponse({ error: 'db_error' }, 500, origin);
  }

  const { error: subErr } = await admin.from('subscriptions').upsert(
    {
      user_id: user.id,
      plan_id: promo.plan_id,
      status: 'active',
      current_period_start: nowISO,
      current_period_end: validUntil,
      cancel_at_period_end: false,
    },
    { onConflict: 'user_id' },
  );
  if (subErr) {
    console.error('[billing-redeem-promo] subscription upsert failed:', subErr.message);
  }

  const { error: redeemErr } = await admin.from('promo_redemptions').insert({
    code,
    user_id: user.id,
  });
  if (redeemErr) {
    console.error('[billing-redeem-promo] redemption insert failed:', redeemErr.message);
  }

  const { error: incErr } = await admin
    .from('promo_codes')
    .update({ used_count: promo.used_count + 1 })
    .eq('code', code);
  if (incErr) console.error('[billing-redeem-promo] increment failed:', incErr.message);

  return jsonResponse(
    {
      ok: true,
      grant: {
        plan: promo.plan_id,
        valid_until: validUntil,
      },
    },
    200,
    origin,
  );
});

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

// supabase/functions/billing-get-entitlement/index.ts
// Возвращает текущий entitlement + активную подписку + историю платежей.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getEntitlement } from '../_shared/entitlement.ts';

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const userClient = createUserClient(req.headers.get('Authorization'));
  const user = await getUserFromRequest(req, userClient);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);

  const admin = createAdminClient();
  const ent = await getEntitlement(admin, user.id);

  const [subRes, paymentsRes, plansRes] = await Promise.all([
    admin
      .from('subscriptions')
      .select('id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
    admin
      .from('payments')
      .select('id, plan_id, status, amount_kopecks, currency, created_at, receipt_url, description')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('plans')
      .select('id, name, period, price_kopecks, currency, features, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  return jsonResponse(
    {
      entitlement: ent,
      subscription: subRes.data?.[0] ?? null,
      payments: paymentsRes.data ?? [],
      plans: plansRes.data ?? [],
    },
    200,
    origin,
  );
});

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

// supabase/functions/billing-cancel-subscription/index.ts
// Пользовательская отмена подписки (cancel_at_period_end = true).

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';
import { getUserFromRequest } from '../_shared/auth.ts';

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const userClient = createUserClient(req.headers.get('Authorization'));
  const user = await getUserFromRequest(req, userClient);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, origin);

  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (error || !sub) {
    return jsonResponse({ error: 'no_active_subscription' }, 404, origin);
  }

  await admin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  return jsonResponse(
    {
      ok: true,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: true,
    },
    200,
    origin,
  );
});

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

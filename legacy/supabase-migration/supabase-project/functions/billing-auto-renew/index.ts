// supabase/functions/billing-auto-renew/index.ts
// Ежедневный CRON: списывает оплату за следующий период для подписок,
// у которых current_period_end истекает в течение следующих 24 часов.
//
// Защита: X-Cron-Secret должен совпасть с env BILLING_CRON_SECRET
// (raw compare) или BILLING_CRON_SECRET_HASH (SHA-256 compare, preferred
// for production — see _shared/crypto.ts).

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { verifyCronSecretAsync } from '../_shared/crypto.ts';
import { createYookassaPayment } from '../_shared/yookassa.ts';
import { getFreeTierFeatures } from '../_shared/free_tier_defaults.ts';

const RENEW_WINDOW_HOURS = 24;
const MAX_RETRIES = 3;
const PAYMENT_DESCRIPTION = 'Поток: визуальный редактор квизов';

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }
  if (!(await verifyCronSecretAsync(req))) {
    return jsonResponse({ error: 'forbidden' }, 403, origin);
  }

  const admin = createAdminClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + RENEW_WINDOW_HOURS * 60 * 60 * 1000);

  // Берём активные подписки, у которых есть сохранённый payment_method_id
  // и период кончается в ближайшие сутки
  const { data: dueSubs, error } = await admin
    .from('subscriptions')
    .select('id, user_id, plan_id, current_period_end, payment_method_id, cancel_at_period_end')
    .eq('status', 'active')
    .not('payment_method_id', 'is', null)
    .lte('current_period_end', horizon.toISOString())
    .gt('current_period_end', now.toISOString());
  if (error) {
    console.error('[auto-renew] query failed:', error);
    return jsonResponse({ error: 'db_error' }, 500, origin);
  }

  const results: Array<{ sub: string; status: string; reason?: string }> = [];

  for (const sub of dueSubs ?? []) {
    // Не продлеваем, если пользователь явно отменил
    if (sub.cancel_at_period_end) {
      // Переводим в canceled после окончания периода
      await admin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', sub.id);
      await admin
        .from('entitlements')
        .update({
          plan: 'free',
          features: getFreeTierFeatures(),
          valid_until: null,
        })
        .eq('user_id', sub.user_id);
      results.push({ sub: sub.id, status: 'canceled_at_period_end' });
      continue;
    }

    const { data: plan } = await admin
      .from('plans')
      .select('id, name, price_kopecks, period')
      .eq('id', sub.plan_id)
      .single();
    if (!plan) {
      results.push({ sub: sub.id, status: 'plan_not_found' });
      continue;
    }

    const { data: userRow } = await admin.auth.admin.getUserById(sub.user_id);
    const userEmail = userRow?.user?.email ?? null;

    const idempotenceKey = `renew:${sub.id}:${sub.current_period_end}`;
    try {
      const payment = await createYookassaPayment({
        amountKopecks: plan.price_kopecks,
        description: PAYMENT_DESCRIPTION,
        returnUrl: `${Deno.env.get('BILLING_RETURN_URL') ?? 'https://mykviz.ru'}/#/billing/return`,
        savePaymentMethod: true,
        paymentMethodId: sub.payment_method_id ?? undefined,
        metadata: {
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          kind: 'renewal',
          subscription_id: sub.id,
          user_email: userEmail ?? '',
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
            vat_code: 1,
            quantity: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          },
        ],
      });
      await admin.from('payments').insert({
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        provider: 'yookassa',
        external_id: payment.id,
        status: payment.status,
        amount_kopecks: plan.price_kopecks,
        currency: 'RUB',
        is_recurring: true,
        save_payment_method: true,
        payment_method_id: payment.payment_method?.id ?? sub.payment_method_id,
        description: PAYMENT_DESCRIPTION,
        idempotence_key: idempotenceKey,
      });
      results.push({ sub: sub.id, status: 'renewal_initiated', reason: payment.id });
    } catch (e) {
      console.error(`[auto-renew] payment failed for sub ${sub.id}:`, e);
      // помечаем подписку past_due
      await admin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', sub.id);
      results.push({
        sub: sub.id,
        status: 'payment_failed',
        reason: e instanceof Error ? e.message : 'unknown',
      });
    }
  }

  return jsonResponse(
    { ok: true, processed: results.length, results },
    200,
    origin,
  );
});

// подавляем неиспользуемый импорт для typecheck
void MAX_RETRIES;

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

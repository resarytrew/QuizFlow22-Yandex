import { query } from './db';
import { applyConfirmedPayment } from './payment-application';
import { getYookassaPayment } from './yookassa';

/** Recover missed notifications using only provider-confirmed, account-owned payments. */
export async function reconcileUserPayments(userId: string) {
  // Claim a small batch atomically. Concurrent tabs and return-page polling must
  // not repeatedly call the provider or hold database locks during HTTP requests.
  const payments = await query<{ id: string; provider_payment_id: string }>(
    `UPDATE public.payments SET provider_checked_at=now()
     WHERE id IN (
       SELECT p.id FROM public.payments p
       WHERE p.user_id=$1 AND p.provider='yookassa'
         AND p.provider_payment_id IS NOT NULL
         AND p.status IN ('pending','succeeded')
         AND NOT EXISTS (SELECT 1 FROM public.payment_applications a WHERE a.payment_id=p.id)
         AND (p.provider_checked_at IS NULL OR p.provider_checked_at < now()-interval '15 seconds')
       ORDER BY p.provider_checked_at ASC NULLS FIRST,p.created_at DESC
       LIMIT 3 FOR UPDATE OF p SKIP LOCKED
     ) RETURNING id,provider_payment_id`,
    [userId],
  );
  await Promise.all(payments.map(async (local) => {
    try {
      const provider = await getYookassaPayment(local.provider_payment_id);
      if (provider.id !== local.provider_payment_id) throw new Error('payment_mismatch');
      if (provider.status === 'succeeded') {
        // Uses the same transaction, validation and payment application ledger
        // as webhooks and admin recovery, so retries cannot add a second period.
        await applyConfirmedPayment(local.id, provider, 'reconciliation');
      } else if (provider.status === 'canceled') {
        await query("UPDATE public.payments SET status='canceled' WHERE id=$1 AND status='pending'", [local.id]);
      }
      await query('UPDATE public.payments SET provider_status=$2 WHERE id=$1', [local.id, provider.status]);
    } catch (error) {
      console.warn('[billing] payment reconciliation failed:', local.id, error instanceof Error ? error.message : 'unknown');
    }
  }));
}

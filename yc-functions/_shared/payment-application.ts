import { query, queryOne, withTransaction } from "./db";
import { AdminAuthError } from "./admin";
import type { YookassaPayment } from "./yookassa";

export async function applyConfirmedPayment(
  paymentId: string,
  provider: YookassaPayment,
  source: string,
) {
  return withTransaction(async () => {
    const initial = await queryOne(
      "SELECT user_id FROM public.payments WHERE id=$1",
      [paymentId],
    );
    if (!initial) throw new AdminAuthError(404, "payment_not_found");
    await query("SELECT id FROM public.users WHERE id=$1 FOR UPDATE", [
      initial.user_id,
    ]);
    const payment = (await queryOne(
      "SELECT * FROM public.payments WHERE id=$1 FOR UPDATE",
      [paymentId],
    ))!;
    if (
      provider.id !== payment.provider_payment_id ||
      provider.amount.currency !== payment.currency ||
      !/^\d+\.\d{2}$/.test(provider.amount.value) ||
      Math.round(Number(provider.amount.value) * 100) !==
        payment.amount_kopecks ||
      (provider.metadata?.user_id &&
        provider.metadata.user_id !== payment.user_id) ||
      (provider.metadata?.plan_id &&
        provider.metadata.plan_id !== payment.plan_id)
    )
      throw new AdminAuthError(409, "payment_mismatch");
    if (
      provider.status !== "succeeded" ||
      !provider.paid ||
      payment.status === "refunded" ||
      (provider.refunded_amount && Number(provider.refunded_amount.value) !== 0)
    )
      throw new AdminAuthError(409, "payment_not_confirmed");
    const prior = await queryOne(
      "SELECT * FROM public.payment_applications WHERE payment_id=$1",
      [paymentId],
    );
    if (
      prior?.source === "legacy" &&
      !(await queryOne(
        "SELECT id FROM public.subscriptions WHERE user_id=$1 LIMIT 1",
        [payment.user_id],
      ))
    )
      throw new AdminAuthError(409, "historical_payment_requires_review");
    if (prior) return { applied: false, already_applied: true };
    const plan = await queryOne("SELECT * FROM public.plans WHERE id=$1", [
      payment.plan_id,
    ]);
    if (!plan) throw new AdminAuthError(409, "plan_not_found");
    const days = plan.period === "year" ? 365 : 30;
    const current = await queryOne(
      "SELECT * FROM public.subscriptions WHERE user_id=$1 AND status IN ('active','past_due') FOR UPDATE",
      [payment.user_id],
    );
    let subscription;
    if (current) {
      subscription = await queryOne(
        "UPDATE public.subscriptions SET status='active',plan_id=$2,current_period_end=GREATEST(now(),current_period_end)+($3::int*interval '1 day'),last_payment_id=$4,updated_at=now() WHERE id=$1 RETURNING id",
        [current.id, payment.plan_id, days, paymentId],
      );
    } else {
      const savedMethod =
        source === "webhook" &&
        payment.save_payment_method &&
        provider.payment_method?.saved
          ? provider.payment_method.id
          : null;
      subscription = await queryOne(
        "INSERT INTO public.subscriptions(user_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end,last_payment_id,payment_method_id) VALUES($1,$2,'active',now(),now()+($3::int*interval '1 day'),$5,$4,$6) RETURNING id",
        [
          payment.user_id,
          payment.plan_id,
          days,
          paymentId,
          !savedMethod,
          savedMethod,
        ],
      );
    }
    await query(
      "INSERT INTO public.payment_applications(payment_id,subscription_id,source) VALUES($1,$2,$3)",
      [paymentId, subscription!.id, source],
    );
    await query("UPDATE public.payments SET status='succeeded' WHERE id=$1", [
      paymentId,
    ]);
    await query("SELECT public.refresh_effective_entitlement($1)", [
      payment.user_id,
    ]);
    return { applied: true, already_applied: false };
  });
}

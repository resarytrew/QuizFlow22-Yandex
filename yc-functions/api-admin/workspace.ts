import { randomBytes } from "node:crypto";
import { query, queryOne } from "../_shared/db";
import {
  AdminAuthError,
  hasPermission,
  writeAdminAudit,
  type AdminStaffContext,
} from "../_shared/admin";
import {
  WorkspaceInput,
  WorkspaceSchema,
  AttentionSchema,
} from "../_shared/admin-workspace-contracts";
import { getYookassaPayment } from "../_shared/yookassa";
import { applyConfirmedPayment } from "../_shared/payment-application";
import { grantPro } from "../_shared/grant-pro";
import { ok } from "./responses";

export async function userWorkspace(id: string, ctx: AdminStaffContext) {
  if (!WorkspaceInput.safeParse({ user_id: id }).success || !id)
    throw new AdminAuthError(400, "user_id_required");
  const account = await queryOne(
    "SELECT u.id,u.email,u.created_at,p.account_code,p.display_name,p.status,p.blocked_until,(p.user_id IS NULL) AS missing_profile FROM public.users u LEFT JOIN public.profiles p ON p.user_id=u.id WHERE u.id=$1",
    [id],
  );
  if (!account) throw new AdminAuthError(404, "user_not_found");
  const billing = hasPermission(ctx, "subscriptions.read"),
    support = hasPermission(ctx, "support.read");
  const [access, payments, subscriptions, grants, tickets, events, notes] =
    await Promise.all([
      billing
        ? queryOne("SELECT public.get_effective_entitlement($1) AS value", [
            id,
          ]).then((r) => r?.value)
        : null,
      billing
        ? query(
            "SELECT id,plan_id,amount_kopecks,currency,status,provider_payment_id,provider_status,provider_checked_at,created_at,(SELECT error FROM public.webhook_events w WHERE w.external_id=payments.provider_payment_id AND w.provider='yookassa' LIMIT 1) AS webhook_error,(SELECT processed_at FROM public.webhook_events w WHERE w.external_id=payments.provider_payment_id AND w.provider='yookassa' LIMIT 1) AS webhook_processed_at FROM public.payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [id],
          )
        : [],
      billing
        ? query(
            "SELECT id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end FROM public.subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [id],
          )
        : [],
      billing
        ? query(
            "SELECT 'admin' AS source,valid_until,reason,created_at FROM public.admin_pro_grants WHERE user_id=$1 UNION ALL SELECT 'promo',valid_until,NULL,redeemed_at FROM public.promo_redemptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [id],
          )
        : [],
      support
        ? query(
            "SELECT id,subject,status,assigned_to,created_at,updated_at FROM public.support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
            [id],
          )
        : [],
      hasPermission(ctx, "audit.read")
        ? query(
            "SELECT action,outcome,created_at,payload,request_id FROM public.admin_audit_log WHERE target_id=$1 OR payload->>'user_id'=$1 ORDER BY created_at DESC LIMIT 100",
            [id],
          )
        : [],
      support
        ? query(
            "SELECT n.id,n.ticket_id,n.body,n.created_at FROM public.support_notes n JOIN public.support_tickets t ON t.id=n.ticket_id WHERE t.user_id=$1 ORDER BY n.created_at DESC,n.id LIMIT 100",
            [id],
          )
        : [],
    ]);
  const promos =
    billing && support
      ? await query(
          "SELECT code,grant_days,used_count,is_active,created_at FROM public.promo_codes WHERE beneficiary_user_id=$1 ORDER BY created_at DESC LIMIT 100",
          [id],
        )
      : [];
  const messages = support
    ? await query(
        "SELECT m.id,m.sender_kind,m.body,m.created_at FROM public.support_ticket_messages m JOIN public.support_tickets t ON t.id=m.ticket_id WHERE t.user_id=$1 ORDER BY m.created_at DESC,m.id LIMIT 100",
        [id],
      )
    : [];
  return ok({
    workspace: WorkspaceSchema.parse(
      JSON.parse(
        JSON.stringify({
          account,
          access: access ?? null,
          payments,
          subscriptions,
          grants,
          tickets,
          events,
          notes,
          promos,
          messages,
        }),
      ),
    ),
  });
}
export async function attention(ctx: AdminStaffContext) {
  const parts: string[] = [];
  if (hasPermission(ctx, "users.read"))
    parts.push(
      "SELECT 'missing_profile' AS kind,u.id::text,u.id AS user_id,u.email AS label,u.created_at FROM public.users u LEFT JOIN public.profiles p ON p.user_id=u.id WHERE p.user_id IS NULL",
    );
  if (hasPermission(ctx, "subscriptions.read"))
    parts.push(
      "SELECT 'payment_review',p.id::text,p.user_id,p.status||' / '||p.amount_kopecks::text||' коп.',p.created_at FROM public.payments p WHERE (p.status='pending' AND p.created_at<now()-interval '30 minutes') OR (p.status='succeeded' AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id=p.user_id))",
    );
  if (hasPermission(ctx, "support.read"))
    parts.push(
      "SELECT 'unanswered',t.id::text,t.user_id,t.subject,t.created_at FROM public.support_tickets t WHERE t.status IN ('open','in_progress') AND t.updated_at<now()-interval '24 hours'",
    );
  if (hasPermission(ctx, "audit.read"))
    parts.push(
      "SELECT 'admin_error',id::text,NULL::uuid,action,created_at FROM public.admin_audit_log WHERE outcome IN ('failed','error') AND created_at>now()-interval '7 days'",
    );
  if (hasPermission(ctx, "subscriptions.read"))
    parts.push(
      "SELECT 'webhook_error',w.id::text,p.user_id,COALESCE(w.error,'Ошибка обработки оплаты'),w.created_at FROM public.webhook_events w JOIN public.payments p ON p.provider_payment_id=w.external_id WHERE w.provider='yookassa' AND w.error IS NOT NULL AND w.processed_at IS NULL",
    );
  const items = parts.length
    ? await query(
        parts.join(" UNION ALL ") + " ORDER BY created_at ASC LIMIT 100",
      )
    : [];
  return ok(AttentionSchema.parse(JSON.parse(JSON.stringify({ items }))));
}
export async function workspaceMutation(
  action: string,
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  ua: string | null,
) {
  const parsed = WorkspaceInput.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) throw new AdminAuthError(400, "invalid_request");
  const data = parsed.data;
  if (action === "payment-check" || action === "payment-restore") {
    if (!data.payment_id) throw new AdminAuthError(400, "payment_id_required");
    const payment = await queryOne(
      "SELECT id,user_id,provider_payment_id FROM public.payments WHERE id=$1",
      [data.payment_id],
    );
    if (!payment?.provider_payment_id)
      throw new AdminAuthError(404, "payment_not_found");
    let provider;
    try {
      provider = await getYookassaPayment(payment.provider_payment_id);
    } catch {
      throw new AdminAuthError(502, "provider_unavailable");
    }
    const result =
      action === "payment-restore"
        ? await applyConfirmedPayment(payment.id, provider, "admin")
        : { provider_status: provider.status, paid: provider.paid };
    await query(
      "UPDATE public.payments SET provider_status=$2,provider_checked_at=now() WHERE id=$1",
      [payment.id, provider.status],
    );
    await writeAdminAudit(ctx, {
      action,
      targetType: "user",
      targetId: payment.user_id,
      details: { payment_id: payment.id, ...result },
      ip,
      userAgent: ua,
    });
    return ok({ result });
  }
  if (!hasPermission(ctx, "support.read"))
    throw new AdminAuthError(403, "permission_denied");
  if (!data.ticket_id) throw new AdminAuthError(400, "ticket_id_required");
  const ticket = await queryOne(
    "SELECT * FROM public.support_tickets WHERE id=$1 FOR UPDATE",
    [data.ticket_id],
  );
  if (!ticket) throw new AdminAuthError(404, "ticket_not_found");
  if (action === "support-note") {
    if (!data.body) throw new AdminAuthError(400, "body_required");
    await query(
      "INSERT INTO public.support_notes(ticket_id,actor_user_id,body) VALUES($1,$2,$3)",
      [ticket.id, ctx.userId, data.body],
    );
  } else if (action === "support-assign") {
    if (
      data.user_id &&
      !(await queryOne(
        "SELECT user_id FROM public.admin_staff WHERE user_id=$1 AND is_active=true",
        [data.user_id],
      ))
    )
      throw new AdminAuthError(400, "staff_not_active");
    await query(
      "UPDATE public.support_tickets SET assigned_to=$2 WHERE id=$1",
      [ticket.id, data.user_id ?? null],
    );
  } else if (action === "support-promo") {
    if (!hasPermission(ctx, "promocodes.manage"))
      throw new AdminAuthError(403, "permission_denied");
    if (!data.days || !data.idempotency_key || !data.body)
      throw new AdminAuthError(400, "compensation_details_required");
    const key = ctx.userId + ":" + data.idempotency_key;
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
    const prior = await queryOne(
      "SELECT * FROM public.promo_codes WHERE request_key=$1",
      [key],
    );
    if (
      prior &&
      (prior.support_ticket_id !== ticket.id ||
        prior.grant_days !== data.days ||
        prior.compensation_reason !== data.body)
    )
      throw new AdminAuthError(409, "idempotency_conflict");
    const code =
      prior?.code ?? "HELP-" + randomBytes(7).toString("hex").toUpperCase();
    if (!prior) {
      await query(
        "INSERT INTO public.promo_codes(code,plan_id,max_uses,beneficiary_user_id,support_ticket_id,grant_days,request_key,compensation_reason) VALUES($1,'pro_monthly',1,$2,$3,$4,$5,$6)",
        [code, ticket.user_id, ticket.id, data.days, key, data.body],
      );
      await writeAdminAudit(ctx, {
        action,
        targetType: "user",
        targetId: ticket.user_id,
        details: { ticket_id: ticket.id, code, days: data.days },
        ip,
        userAgent: ua,
      });
    }
    return ok({ result: { code } });
  } else if (action === "support-compensate") {
    if (!data.days || !data.idempotency_key || !data.body)
      throw new AdminAuthError(400, "compensation_details_required");
    await grantPro(
      {
        user_id: ticket.user_id,
        days: data.days,
        reason: "Support " + ticket.id + ": " + data.body,
        idempotency_key: data.idempotency_key,
      },
      ctx,
      ip,
      ua,
    );
  }
  await writeAdminAudit(ctx, {
    action,
    targetType: "user",
    targetId: ticket.user_id,
    details: { ticket_id: ticket.id },
    ip,
    userAgent: ua,
  });
  return ok({ result: { saved: true } });
}

export async function supportStaff() {
  return ok({
    staff_members: await query(
      "SELECT s.user_id,u.email,p.display_name FROM public.admin_staff s JOIN public.users u ON u.id=s.user_id LEFT JOIN public.profiles p ON p.user_id=s.user_id WHERE s.is_active=true ORDER BY u.email",
    ),
  });
}

import { query, queryOne } from "../_shared/db";
import {
  AdminAuthError,
  writeAdminAudit,
  type AdminStaffContext,
} from "../_shared/admin";
import { grantPro } from "../_shared/grant-pro";
import { ok, notFound, badRequest, staffSession } from "./responses";
import {
  handleListQuizzes,
  handleListReports,
  handleListSupport,
} from "./read-models";
export async function handlePromocodeCreate(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { code, plan_id, valid_until, max_uses } = JSON.parse(body);
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode || !plan_id)
    return badRequest("code and plan_id are required");
  if (!["pro_monthly", "pro_yearly"].includes(plan_id))
    return badRequest("Invalid plan_id");

  const row = await queryOne(
    `INSERT INTO public.promo_codes (code, plan_id, valid_from, valid_until, max_uses, is_active)
     VALUES ($1, $2, now(), $3, $4, true)
     RETURNING code, plan_id, is_active, max_uses, used_count, valid_from, valid_until, created_at`,
    [normalizedCode, plan_id, valid_until || null, max_uses ?? null],
  );

  await writeAdminAudit(ctx, {
    action: "create_promocode",
    targetType: "promo_code",
    targetId: normalizedCode,
    ip,
    userAgent,
  });

  return ok({
    staff: await staffSession(ctx),
    promocode: { ...row, discount_pct: 100 },
    generated_at: new Date().toISOString(),
  });
}

export async function handlePromocodeToggle(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { code, is_active } = JSON.parse(body);
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode || typeof is_active !== "boolean")
    return badRequest("code and is_active are required");

  const row = await queryOne(
    `UPDATE public.promo_codes
     SET is_active = $2
     WHERE code = $1
     RETURNING code, plan_id, is_active, max_uses, used_count, valid_from, valid_until, created_at`,
    [normalizedCode, is_active],
  );
  if (!row) return notFound();

  await writeAdminAudit(ctx, {
    action: "toggle_promocode",
    targetType: "promo_code",
    targetId: normalizedCode,
    details: { is_active },
    ip,
    userAgent,
  });

  return ok({
    staff: await staffSession(ctx),
    promocode: { ...row, discount_pct: 100 },
    generated_at: new Date().toISOString(),
  });
}

export async function handlePromocodeDelete(
  event: any,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const normalizedCode = String(event.queryStringParameters?.code || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) return badRequest("code is required");

  if (
    !(await queryOne(
      `DELETE FROM public.promo_codes WHERE code = $1 RETURNING code`,
      [normalizedCode],
    ))
  )
    return notFound();
  await writeAdminAudit(ctx, {
    action: "delete_promocode",
    targetType: "promo_code",
    targetId: normalizedCode,
    ip,
    userAgent,
  });

  return ok({
    staff: await staffSession(ctx),
    ok: true,
    generated_at: new Date().toISOString(),
  });
}

export async function handleUpdateUser(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { user_id, role } = JSON.parse(body);
  if (!user_id || !role) return badRequest("user_id and role are required");
  if (!["user", "admin"].includes(role)) return badRequest("Invalid role");

  const updated = await queryOne(
    `UPDATE public.users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id`,
    [role, user_id],
  );

  if (!updated) return notFound();
  await writeAdminAudit(ctx, {
    action: "update_user_role",
    targetType: "user",
    targetId: user_id,
    details: { role },
    ip,
    userAgent,
  });

  return ok({
    staff: await staffSession(ctx),
    ok: true,
    generated_at: new Date().toISOString(),
  });
}

export async function handleBlockUser(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { user_id, blocked, reason, duration_hours } = JSON.parse(body);
  if (typeof blocked !== "boolean") return badRequest("invalid_blocked");
  const hours = duration_hours ?? 24;
  if (!Number.isFinite(hours) || hours <= 0)
    return badRequest("invalid_duration");
  return handleUserStatus(
    JSON.stringify({
      user_id,
      status: blocked ? "temporarily_blocked" : "active",
      blocked_until: blocked
        ? new Date(Date.now() + hours * 3600000).toISOString()
        : null,
      reason,
    }),
    ctx,
    ip,
    userAgent,
  );
}

export async function handleUserStatus(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { user_id, status, blocked_until, reason } = JSON.parse(body);
  if (!user_id || !status) return badRequest("user_id and status are required");
  if (!["active", "temporarily_blocked", "blocked"].includes(status))
    return badRequest("Invalid status");

  if (!(await queryOne("SELECT id FROM public.users WHERE id=$1", [user_id])))
    return notFound();
  if (
    status === "temporarily_blocked" &&
    (!blocked_until ||
      !Number.isFinite(Date.parse(blocked_until)) ||
      Date.parse(blocked_until) <= Date.now())
  )
    return badRequest("invalid_blocked_until");
  await query(
    `INSERT INTO public.profiles (user_id, account_code, status, blocked_until, block_reason)
     VALUES ($1, lpad((floor(random() * 1000000))::int::text, 6, '0'), $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET status = $2, blocked_until = $3, block_reason = $4, updated_at = now()`,
    [
      user_id,
      status,
      status === "temporarily_blocked" ? blocked_until : null,
      reason || null,
    ],
  );

  await writeAdminAudit(ctx, {
    action: "update_user_status",
    targetType: "user",
    targetId: user_id,
    details: {
      status,
      blocked_until: blocked_until || null,
      reason: reason || null,
    },
    ip,
    userAgent,
  });

  const row = await queryOne(
    `SELECT u.id, u.email, u.created_at,
            p.account_code, p.username, p.display_name, p.status as profile_status,
            p.blocked_until, p.last_active_at, p.updated_at,
            COUNT(q.id) FILTER (WHERE q.deleted_at IS NULL) as quiz_count
     FROM public.users u
     LEFT JOIN public.profiles p ON p.user_id = u.id
     LEFT JOIN public.quizzes q ON q.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.email, u.created_at, p.account_code, p.username, p.display_name,
              p.status, p.blocked_until, p.last_active_at, p.updated_at`,
    [user_id],
  );

  return ok({
    staff: await staffSession(ctx),
    user: row
      ? {
          id: row.id,
          account_code: Number(row.account_code || 0),
          username: row.username ?? null,
          display_name: row.display_name ?? row.email ?? null,
          status: row.profile_status || "active",
          blocked_until: row.blocked_until ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at ?? row.created_at,
          last_active_at: row.last_active_at ?? null,
          quiz_count: Number(row.quiz_count || 0),
        }
      : null,
    generated_at: new Date().toISOString(),
  });
}

export async function handleModerateQuiz(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { quiz_id, moderation_status, moderation_reason, reason } =
    JSON.parse(body);
  if (!quiz_id || !moderation_status)
    return badRequest("quiz_id and moderation_status are required");

  if (
    ![
      "unreviewed",
      "reviewing",
      "approved",
      "rejected",
      "blocked",
      "hidden",
      "deleted",
    ].includes(moderation_status)
  )
    return badRequest("invalid_moderation_status");
  const updated = await queryOne(
    `UPDATE public.quizzes
     SET moderation_status = $1, moderation_reason = $2, moderated_by = $4, moderated_at = now(), updated_at = now(), deleted_at = CASE WHEN $1 = 'deleted' THEN now() ELSE NULL END
     WHERE id = $3 RETURNING id`,
    [moderation_status, moderation_reason || reason || null, quiz_id, ctx.userId],
  );

  if (!updated) return notFound();
  await writeAdminAudit(ctx, {
    action: "moderate_quiz",
    targetType: "quiz",
    targetId: quiz_id,
    details: {
      moderation_status,
      moderation_reason: moderation_reason || reason || null,
    },
    ip,
    userAgent,
  });

  return entityResponse("quiz", quiz_id, ctx);
}

export async function handleSupportReply(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { ticket_id, message, body: messageBody } = JSON.parse(body);
  const replyText = message || messageBody;
  if (!ticket_id || !replyText)
    return badRequest("ticket_id and message are required");

  const ticket = await queryOne(
    "SELECT status FROM public.support_tickets WHERE id=$1 FOR UPDATE",
    [ticket_id],
  );
  if (!ticket) return notFound();
  if (["closed", "resolved"].includes(ticket.status))
    throw new AdminAuthError(409, "ticket_closed");
  const row = await queryOne(
    `INSERT INTO public.support_ticket_messages (ticket_id, sender_id, sender_user_id, sender_kind, body, message, is_staff)
     VALUES ($1, $2, $2, 'admin', $3, $3, true)
     RETURNING id, ticket_id, sender_user_id, sender_kind, body, message, is_staff, created_at`,
    [ticket_id, ctx.userId, replyText],
  );

  await query(
    `UPDATE public.support_tickets SET status='waiting_user', updated_at = now() WHERE id = $1`,
    [ticket_id],
  );

  await writeAdminAudit(ctx, {
    action: "support_reply",
    targetType: "support_ticket",
    targetId: ticket_id,
    ip,
    userAgent,
  });

  return entityResponse("ticket", ticket_id, ctx, { message: row });
}

export async function handleSupportUpdateStatus(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { ticket_id, status, internal_note, resolution } = JSON.parse(body);
  if (!ticket_id || !status)
    return badRequest("ticket_id and status are required");
  if (!["new", "in_progress", "waiting_user", "closed"].includes(status)) {
    return badRequest("Invalid status");
  }

  const dbStatus = status === "new" ? "open" : status;
  const updated = await queryOne(
    `UPDATE public.support_tickets SET status=$1, updated_at=now(),
    internal_note=CASE WHEN $5 THEN $3 ELSE internal_note END,
    resolution=CASE WHEN $6 THEN $4 WHEN $1 <> 'closed' THEN NULL ELSE resolution END,
    closed_at=CASE WHEN $1='closed' THEN COALESCE(closed_at,now()) ELSE NULL END
    WHERE id=$2 RETURNING id`,
    [
      dbStatus,
      ticket_id,
      internal_note ?? null,
      resolution ?? null,
      internal_note !== undefined,
      resolution !== undefined,
    ],
  );
  if (!updated) return notFound();

  await writeAdminAudit(ctx, {
    action: "support_update_status",
    targetType: "support_ticket",
    targetId: ticket_id,
    details: { status },
    ip,
    userAgent,
  });

  return entityResponse("ticket", ticket_id, ctx);
}

export async function handleReportUpdate(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const { report_id, status, resolution } = JSON.parse(body);
  if (!report_id || !status)
    return badRequest("report_id and status are required");

  if (!["new", "reviewing", "approved", "rejected", "closed"].includes(status))
    return badRequest("invalid_report_status");
  const updated = await queryOne(
    `UPDATE public.quiz_reports SET status = $1, resolution = $2, updated_at = now(), resolved_at=CASE WHEN $1 IN ('approved','rejected','closed') THEN COALESCE(resolved_at,now()) ELSE NULL END WHERE id = $3 RETURNING id`,
    [status, resolution || null, report_id],
  );

  if (!updated) return notFound();
  await writeAdminAudit(ctx, {
    action: "update_report",
    targetType: "quiz_report",
    targetId: report_id,
    details: { status, resolution },
    ip,
    userAgent,
  });

  return entityResponse("report", report_id, ctx);
}

export async function handleGrantPro(
  body: string,
  ctx: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const grant = await grantPro(JSON.parse(body), ctx, ip, userAgent);
  return ok({
    staff: await staffSession(ctx),
    grant,
    generated_at: new Date().toISOString(),
  });
}

export async function entityResponse(
  kind: "quiz" | "ticket" | "report",
  id: string,
  ctx: AdminStaffContext,
  extra: Record<string, unknown> = {},
) {
  const event = { queryStringParameters: { id, limit: "1" } };
  const result =
    kind === "quiz"
      ? await handleListQuizzes(event, ctx)
      : kind === "ticket"
        ? await handleListSupport(event, ctx)
        : await handleListReports(event, ctx);
  const data = JSON.parse(result.body);
  const entity =
    data[
      kind === "quiz" ? "quizzes" : kind === "ticket" ? "tickets" : "reports"
    ][0];
  if (!entity) return notFound();
  return ok({
    staff: data.staff,
    ok: true,
    [kind]: entity,
    ...extra,
    generated_at: data.generated_at,
  });
}

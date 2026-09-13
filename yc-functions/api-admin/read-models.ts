import { query, queryOne } from "../_shared/db";
import { hasPermission, type AdminStaffContext } from "../_shared/admin";
import { ok, staffSession, listMeta } from "./responses";
export async function handleStats(ctx: AdminStaffContext) {
  const [userCount] = await query("SELECT COUNT(*) as count FROM public.users");
  const [quizCount] = await query(
    "SELECT COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL",
  );
  const [resultCount] = await query(
    "SELECT COUNT(*) as count FROM public.quiz_results",
  );
  const [proCount] = await query(
    `SELECT COUNT(*) as count FROM public.subscriptions WHERE status = 'active'`,
  );
  const [ticketCount] = await query(
    `SELECT COUNT(*) as count FROM public.support_tickets WHERE status != 'closed'`,
  );

  return ok({
    users: parseInt(userCount?.count || "0"),
    quizzes: parseInt(quizCount?.count || "0"),
    results: parseInt(resultCount?.count || "0"),
    pro_subscriptions: hasPermission(ctx, "subscriptions.read")
      ? parseInt(proCount?.count || "0")
      : 0,
    open_tickets: parseInt(ticketCount?.count || "0"),
  });
}

export async function handleDashboard(ctx: AdminStaffContext) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [newUsers7d] = await query(
    `SELECT COUNT(*) as count FROM public.users WHERE created_at >= $1`,
    [sevenDaysAgo.toISOString()],
  );
  const [newUsers30d] = await query(
    `SELECT COUNT(*) as count FROM public.users WHERE created_at >= $1`,
    [thirtyDaysAgo.toISOString()],
  );
  const [newQuizzes7d] = await query(
    `SELECT COUNT(*) as count FROM public.quizzes WHERE created_at >= $1 AND deleted_at IS NULL`,
    [sevenDaysAgo.toISOString()],
  );
  const [results7d] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_results WHERE created_at >= $1`,
    [sevenDaysAgo.toISOString()],
  );
  const [revenue30d] = await query(
    `SELECT COALESCE(SUM(amount_kopecks), 0) as total FROM public.payments WHERE status = 'succeeded' AND created_at >= $1`,
    [thirtyDaysAgo.toISOString()],
  );

  return ok({
    new_users_7d: parseInt(newUsers7d?.count || "0"),
    new_users_30d: parseInt(newUsers30d?.count || "0"),
    new_quizzes_7d: parseInt(newQuizzes7d?.count || "0"),
    results_7d: parseInt(results7d?.count || "0"),
    revenue_30d_kopecks: hasPermission(ctx, "finance.read")
      ? parseInt(revenue30d?.total || "0")
      : null,
  });
}

export async function handleOverview(ctx: AdminStaffContext) {
  const staff = await staffSession(ctx);
  const [usersTotal] = await query(
    "SELECT COUNT(*) as count FROM public.users",
  );
  const [usersActive30d] = await query(
    `SELECT COUNT(*) as count FROM public.profiles WHERE last_active_at >= now() - interval '30 days'`,
  );
  const [usersNew24h] = await query(
    `SELECT COUNT(*) as count FROM public.users WHERE created_at >= now() - interval '24 hours'`,
  );
  const [quizzesTotal] = await query(
    `SELECT COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL`,
  );
  const [quizzesNew24h] = await query(
    `SELECT COUNT(*) as count FROM public.quizzes WHERE created_at >= now() - interval '24 hours' AND deleted_at IS NULL`,
  );
  const [usersBlocked] = await query(
    `SELECT COUNT(*) as count FROM public.profiles WHERE status = 'blocked' OR blocked_until > now()`,
  );
  const [pendingModeration] = await query(
    `SELECT COUNT(*) as count FROM public.quizzes WHERE moderation_status IN ('unreviewed', 'reviewing') AND deleted_at IS NULL`,
  );
  const [staffActive] = await query(
    `SELECT COUNT(*) as count FROM public.admin_staff WHERE is_active = true`,
  );
  const [subsActive] = await query(
    `SELECT COUNT(*) as count FROM public.subscriptions WHERE status = 'active' AND current_period_end > now()`,
  );
  const [subsAdmin] = await query(
    `SELECT COUNT(*) as count FROM public.entitlements WHERE source = 'admin' AND valid_until > now()`,
  );
  const [completionsTotal] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_results`,
  );
  const [completions24h] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_results WHERE created_at >= now() - interval '24 hours'`,
  );
  const [reportsOpen] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_reports WHERE status NOT IN ('closed', 'rejected')`,
  );
  const [supportOpen] = await query(
    `SELECT COUNT(*) as count FROM public.support_tickets WHERE status != 'closed'`,
  );
  const visibilityRows = await query(
    `SELECT visibility, COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL GROUP BY visibility`,
  );
  const planRows = await query(
    `SELECT plan_id, COUNT(*) as count FROM public.subscriptions WHERE status = 'active' GROUP BY plan_id`,
  );
  const recentActions = hasPermission(ctx, "audit.read")
    ? await auditRows(10)
    : [];

  const visibility = { private: 0, unlisted: 0, public: 0 };
  for (const row of visibilityRows) {
    if (row.visibility in visibility)
      visibility[row.visibility as keyof typeof visibility] = Number(
        row.count || 0,
      );
  }
  const plans = {
    pro_monthly: 0,
    pro_yearly: 0,
    admin_granted: Number(subsAdmin?.count || 0),
  };
  for (const row of planRows) {
    if (row.plan_id === "pro_monthly" || row.plan_id === "pro_yearly") {
      plans[row.plan_id as "pro_monthly" | "pro_yearly"] = Number(
        row.count || 0,
      );
    }
  }

  return ok({
    staff,
    metrics: {
      users_total: Number(usersTotal?.count || 0),
      users_active_30d: Number(usersActive30d?.count || 0),
      users_new_24h: Number(usersNew24h?.count || 0),
      quizzes_total: Number(quizzesTotal?.count || 0),
      quizzes_new_24h: Number(quizzesNew24h?.count || 0),
      users_blocked: Number(usersBlocked?.count || 0),
      quizzes_pending_moderation: Number(pendingModeration?.count || 0),
      staff_active: Number(staffActive?.count || 0),
      subscriptions_active: hasPermission(ctx, "subscriptions.read")
        ? Number(subsActive?.count || 0)
        : 0,
      subscriptions_admin_granted: hasPermission(ctx, "subscriptions.read")
        ? Number(subsAdmin?.count || 0)
        : 0,
      quiz_completions_total: Number(completionsTotal?.count || 0),
      quiz_completions_24h: Number(completions24h?.count || 0),
      reports_open: Number(reportsOpen?.count || 0),
      support_open: Number(supportOpen?.count || 0),
    },
    trend_7d: await query(`SELECT to_char(d,'YYYY-MM-DD') AS date,
      (SELECT count(*)::int FROM public.users WHERE created_at>=d AND created_at<d+interval '1 day') AS users,
      (SELECT count(*)::int FROM public.quizzes WHERE created_at>=d AND created_at<d+interval '1 day') AS quizzes,
      (SELECT count(*)::int FROM public.quiz_results WHERE created_at>=d AND created_at<d+interval '1 day') AS completions
      FROM generate_series(date_trunc('day',now())-interval '6 days',date_trunc('day',now()),interval '1 day') d`),
    breakdown: {
      quizzes_by_visibility: visibility,
      subscriptions_by_plan: hasPermission(ctx, "subscriptions.read")
        ? plans
        : { pro_monthly: 0, pro_yearly: 0, admin_granted: 0 },
    },
    recent_actions: recentActions,
    unavailable_sources: [
      ...(!hasPermission(ctx, "subscriptions.read") ? ["subscriptions"] : []),
      ...(!hasPermission(ctx, "audit.read") ? ["audit"] : []),
    ],
    generated_at: new Date().toISOString(),
  });
}

export async function handleListUsers(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const search = params.q || "";

  let whereClause = "";
  let countWhereClause = "";
  const queryParams: any[] = [limit, offset];

  if (search) {
    whereClause = `WHERE (u.email ILIKE $3 OR p.display_name ILIKE $3 OR p.username ILIKE $3 OR p.account_code::text ILIKE $3)`;
    countWhereClause = `WHERE (u.email ILIKE $1 OR p.display_name ILIKE $1 OR p.username ILIKE $1 OR p.account_code::text ILIKE $1)`;
    queryParams.push(`%${search}%`);
  }

  const rows = await query(
    `SELECT u.id, u.email, u.role, u.created_at,
            p.account_code, p.username, p.display_name, p.status as profile_status,
            p.blocked_until, p.last_active_at, p.updated_at,
            COUNT(q.id) FILTER (WHERE q.deleted_at IS NULL) as quiz_count
     FROM public.users u
     LEFT JOIN public.profiles p ON p.user_id = u.id
     LEFT JOIN public.quizzes q ON q.user_id = u.id
     ${whereClause}
     GROUP BY u.id, u.email, u.role, u.created_at, p.account_code, p.username, p.display_name,
              p.status, p.blocked_until, p.last_active_at, p.updated_at
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    queryParams,
  );

  const [countRow] = await query(
    `SELECT COUNT(*) as count FROM public.users u LEFT JOIN public.profiles p ON p.user_id=u.id ${countWhereClause}`,
    search ? [`%${search}%`] : [],
  );

  const total = parseInt(countRow?.count || "0");
  if (!ctx) return ok({ users: rows, total, page, limit });

  return ok({
    staff: await staffSession(ctx),
    users: rows.map((row) => ({
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
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

export async function handleListQuizzes(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || "";
  const visibility = params.visibility || "";
  const search = params.q || "";

  const conditions: string[] = params.id ? [] : ["q.deleted_at IS NULL"];
  const queryParams: any[] = [limit, offset];
  let paramIdx = 3;

  if (params.id) {
    conditions.push(`q.id = $${paramIdx++}`);
    queryParams.push(params.id);
  }
  if (status && status !== "all") {
    conditions.push(`q.moderation_status = $${paramIdx}`);
    queryParams.push(status);
    paramIdx++;
  }
  if (visibility && visibility !== "all") {
    conditions.push(`q.visibility = $${paramIdx}`);
    queryParams.push(visibility);
    paramIdx++;
  }
  if (search) {
    conditions.push(
      `(q.name ILIKE $${paramIdx} OR q.display_code::text ILIKE $${paramIdx})`,
    );
    queryParams.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const rows = await query(
    `SELECT q.id, q.user_id, q.name, q.visibility, q.moderation_status,
            q.moderation_reason, q.moderated_at, q.created_at, q.updated_at,
            q.deleted_at, q.published_at,
            q.display_code as raw_display_code,
            q.display_code::text as display_code,
            u.email as owner_email, p.account_code as owner_account_code,
            p.display_name as owner_display_name, p.username as owner_username,
            p.status as owner_status
     FROM public.quizzes q
     LEFT JOIN public.users u ON u.id = q.user_id
     LEFT JOIN public.profiles p ON p.user_id = q.user_id
     ${whereClause}
     ORDER BY q.created_at DESC
     LIMIT $1 OFFSET $2`,
    queryParams,
  );

  const countParams = queryParams.slice(2);
  const countConditions = conditions.map((condition) =>
    condition.replace(/\$(\d+)/g, (_, index) => `$${Number(index) - 2}`),
  );
  const [countRow] = await query(
    `SELECT COUNT(*) as count FROM public.quizzes q WHERE ${countConditions.join(" AND ")}`,
    countParams,
  );

  const total = parseInt(countRow?.count || "0");
  if (!ctx) return ok({ quizzes: rows, total, page, limit });

  return ok({
    staff: await staffSession(ctx),
    quizzes: rows.map((row) => ({
      id: row.id,
      owner_user_id: row.user_id,
      owner_account_code: row.owner_account_code ?? null,
      owner_display_name: row.owner_display_name ?? row.owner_email ?? null,
      owner_username: row.owner_username ?? null,
      owner_status: row.owner_status ?? null,
      name: row.name,
      visibility: row.visibility,
      display_code: row.display_code ?? null,
      raw_display_code: row.raw_display_code ?? null,
      moderation_status: row.moderation_status || "unreviewed",
      moderation_reason: row.moderation_reason ?? null,
      moderated_at: row.moderated_at ?? null,
      deleted_at: row.deleted_at ?? null,
      is_published: Boolean(row.published_at),
      published_at: row.published_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

export async function handleListSupport(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || "";
  const search = params.q || "";

  let whereClause = "";
  const queryParams: any[] = [limit, offset];

  if (status && status !== "all") {
    whereClause = "WHERE st.status = $3";
    queryParams.push(status === "new" ? "open" : status);
  }
  if (params.id) {
    whereClause = `WHERE st.id = $3`;
    queryParams.splice(2, queryParams.length, params.id);
  }
  if (search) {
    whereClause = whereClause
      ? `${whereClause} AND st.subject ILIKE $${queryParams.length + 1}`
      : `WHERE st.subject ILIKE $${queryParams.length + 1}`;
    queryParams.push(`%${search}%`);
  }

  const rows = await query(
    `SELECT st.id, st.user_id, st.email, st.subject, st.category, st.priority, st.status,
            st.message, st.assigned_to, st.internal_note, st.resolution, st.closed_at,
            st.created_at, st.updated_at, u.email as user_email,
            p.account_code, p.display_name, p.username,
            ap.account_code as assignee_account_code, ap.display_name as assignee_display_name, ap.username as assignee_username
     FROM public.support_tickets st
     LEFT JOIN public.users u ON u.id = st.user_id
     LEFT JOIN public.profiles p ON p.user_id = st.user_id
     LEFT JOIN public.profiles ap ON ap.user_id = st.assigned_to
     ${whereClause}
     ORDER BY st.created_at DESC
     LIMIT $1 OFFSET $2`,
    queryParams,
  );

  const countParams = queryParams.slice(2);
  const countWhere = whereClause.replace(
    /\$(\d+)/g,
    (_, index) => `$${Number(index) - 2}`,
  );
  const [countRow] = await query(
    `SELECT COUNT(*) as count FROM public.support_tickets st ${countWhere}`,
    countParams,
  );
  const total = parseInt(countRow?.count || "0");
  if (!ctx) return ok({ tickets: rows });
  const messages = await query(
    `SELECT id,ticket_id,sender_user_id,sender_kind,body,attachment_name,attachment_url,created_at
    FROM public.support_ticket_messages WHERE ticket_id = ANY($1::uuid[]) ORDER BY created_at,id`,
    [rows.map((row) => row.id)],
  );

  return ok({
    staff: await staffSession(ctx),
    tickets: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      email: row.email ?? row.user_email ?? null,
      messages: messages.filter((message) => message.ticket_id === row.id),
      subject: row.subject,
      category: row.category,
      priority: row.priority || "normal",
      status:
        row.status === "open"
          ? "new"
          : row.status === "resolved"
            ? "closed"
            : row.status,
      message: row.message ?? "",
      assigned_to: row.assigned_to ?? null,
      internal_note: row.internal_note ?? null,
      resolution: row.resolution ?? null,
      closed_at: row.closed_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: {
        account_code: row.account_code ?? null,
        display_name: row.display_name ?? row.user_email ?? null,
        username: row.username ?? null,
      },
      assignee: {
        account_code: row.assignee_account_code ?? null,
        display_name: row.assignee_display_name ?? null,
        username: row.assignee_username ?? null,
      },
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

export async function handleListReports(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || "";
  const search = params.q || "";
  const conditions: string[] = [];
  const queryParams: any[] = [limit, offset];
  let paramIdx = 3;
  if (params.id) {
    conditions.push(`r.id = $${paramIdx++}`);
    queryParams.push(params.id);
  }
  if (status && status !== "all") {
    conditions.push(`r.status = $${paramIdx++}`);
    queryParams.push(status);
  }
  if (search) {
    conditions.push(
      `(q.name ILIKE $${paramIdx} OR r.reason ILIKE $${paramIdx} OR q.display_code::text ILIKE $${paramIdx})`,
    );
    queryParams.push(`%${search}%`);
  }
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const rows = await query(
    `SELECT r.id, r.quiz_id, r.reporter_user_id, r.reason, r.comment, r.status,
            r.assigned_to, r.resolution, r.resolved_at, r.created_at, r.updated_at,
            q.name as quiz_name, q.display_code::text as quiz_display_code, u.email as reporter_email,
            owner.account_code as quiz_owner_account_code, owner.display_name as quiz_owner_display_name, owner.username as quiz_owner_username,
            reporter.account_code as reporter_account_code, reporter.display_name as reporter_display_name, reporter.username as reporter_username,
            assignee.account_code as assignee_account_code, assignee.display_name as assignee_display_name, assignee.username as assignee_username
     FROM public.quiz_reports r
     LEFT JOIN public.quizzes q ON q.id = r.quiz_id
     LEFT JOIN public.users u ON u.id = r.reporter_user_id
     LEFT JOIN public.profiles owner ON owner.user_id = q.user_id
     LEFT JOIN public.profiles reporter ON reporter.user_id = r.reporter_user_id
     LEFT JOIN public.profiles assignee ON assignee.user_id = r.assigned_to
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    queryParams,
  );

  const countParams = queryParams.slice(2);
  const countWhere = whereClause.replace(
    /\$(\d+)/g,
    (_, index) => `$${Number(index) - 2}`,
  );
  const [countRow] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_reports r LEFT JOIN public.quizzes q ON q.id = r.quiz_id ${countWhere}`,
    countParams,
  );
  const total = parseInt(countRow?.count || "0");
  if (!ctx) return ok({ reports: rows });

  return ok({
    staff: await staffSession(ctx),
    reports: rows.map((row) => ({
      id: row.id,
      quiz_id: row.quiz_id,
      reporter_user_id: row.reporter_user_id ?? null,
      reason: row.reason,
      comment: row.comment ?? null,
      status: row.status,
      assigned_to: row.assigned_to ?? null,
      resolution: row.resolution ?? null,
      resolved_at: row.resolved_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      quiz_name: row.quiz_name ?? null,
      quiz_display_code: row.quiz_display_code ?? null,
      quiz_owner: {
        account_code: row.quiz_owner_account_code ?? null,
        display_name: row.quiz_owner_display_name ?? null,
        username: row.quiz_owner_username ?? null,
      },
      reporter: {
        account_code: row.reporter_account_code ?? null,
        display_name: row.reporter_display_name ?? row.reporter_email ?? null,
        username: row.reporter_username ?? null,
      },
      assignee: {
        account_code: row.assignee_account_code ?? null,
        display_name: row.assignee_display_name ?? null,
        username: row.assignee_username ?? null,
      },
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

export async function handleFinances(event?: any, ctx?: AdminStaffContext) {
  const params = event?.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1),
    limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (params.status && params.status !== "all") {
    values.push(params.status);
    conditions.push(`p.status=$${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    conditions.push(
      `(p.id::text ILIKE $${values.length} OR p.description ILIKE $${values.length} OR p.provider_payment_id ILIKE $${values.length})`,
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const metrics = await queryOne(
    `SELECT COUNT(*)::int AS total,
   COALESCE(SUM(amount_kopecks) FILTER(WHERE p.status IN ('succeeded','refunded')),0)::bigint AS revenue,
   COALESCE(SUM(amount_kopecks) FILTER(WHERE p.status='refunded'),0)::bigint AS refunds
   FROM public.payments p ${where}`,
    values,
  );
  const active = await queryOne(
    `SELECT COUNT(*)::int AS count FROM public.subscriptions WHERE status='active' AND current_period_end>now()`,
  );
  const rows = await query(
    `SELECT p.*,pr.account_code,pr.display_name,pr.username FROM public.payments p
   LEFT JOIN public.profiles pr ON pr.user_id=p.user_id ${where}
   ORDER BY p.created_at DESC,p.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, (page - 1) * limit],
  );
  return ok({
    staff: ctx ? await staffSession(ctx) : null,
    metrics: {
      revenue_kopecks: Number(metrics?.revenue || 0),
      refunds_kopecks: Number(metrics?.refunds || 0),
      net_revenue_kopecks:
        Number(metrics?.revenue || 0) - Number(metrics?.refunds || 0),
      active_subscriptions: active?.count || 0,
    },
    limitations: ["recorded_full_refunds_only"],
    payments: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      provider: row.provider,
      external_id: row.external_id ?? row.provider_payment_id ?? null,
      status: row.status,
      amount_kopecks: Number(row.amount_kopecks),
      currency: row.currency,
      receipt_url: row.receipt_url ?? null,
      description: row.description ?? null,
      created_at: row.created_at,
      user: {
        account_code: row.account_code ?? null,
        display_name: row.display_name ?? null,
        username: row.username ?? null,
      },
    })),
    meta: listMeta(page, limit, Number(metrics?.total || 0), params.q || ""),
    generated_at: new Date().toISOString(),
  });
}

export async function handleAuditLog(event: any) {
  const params = event.queryStringParameters || {};
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));

  const rows = await auditRows(limit);

  return ok({ audit: rows });
}

export async function handlePromocodes(event: any, ctx: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const search = params.q || "";
  const whereClause = search ? "WHERE code ILIKE $3" : "";
  const queryParams = search ? [limit, offset, `%${search}%`] : [limit, offset];
  const rows = await query(
    `SELECT code, plan_id, is_active, max_uses, used_count, valid_from, valid_until, created_at
     FROM public.promo_codes
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    queryParams,
  );
  const [countRow] = await query(
    `SELECT COUNT(*) as count FROM public.promo_codes ${search ? "WHERE code ILIKE $1" : ""}`,
    search ? [`%${search}%`] : [],
  );

  return ok({
    staff: await staffSession(ctx),
    promocodes: rows.map((row) => ({ ...row, discount_pct: 100 })),
    meta: listMeta(page, limit, Number(countRow?.count || 0), search),
    generated_at: new Date().toISOString(),
  });
}

async function auditRows(limit: number) {
  const rows = await query(
    `SELECT a.id,a.actor_user_id,p.account_code AS actor_account_code,
   p.display_name AS actor_display_name,a.action,a.permission,a.target_type,a.target_id,a.outcome,
   COALESCE(a.payload,'{}'::jsonb) AS details,a.ip_address AS ip,a.request_id,a.created_at
   FROM public.admin_audit_log a LEFT JOIN public.profiles p ON p.user_id=a.actor_user_id
   ORDER BY a.created_at DESC,a.id DESC LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({
    ...row,
    actor_account_code:
      row.actor_account_code == null ? null : Number(row.actor_account_code),
  }));
}

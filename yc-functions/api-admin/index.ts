import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';
import { requireAdminStaff, writeAdminAudit, hasPermission, type AdminStaffContext } from '../_shared/admin';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'GET' && httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();

    let ctx: AdminStaffContext;
    try {
      ctx = await requireAdminStaff(user.id);
    } catch (e: any) {
      if (e.code === 'not_admin_staff') return forbidden();
      throw e;
    }

    const ip = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null;
    const userAgent = event.headers?.['user-agent']?.slice(0, 500) || null;

    if (httpMethod === 'GET') {
      switch (pathParameters?.action) {
        case 'session':
          return await handleSession(ctx, user.email);
        case 'overview':
          return await handleOverview(ctx);
        case 'stats':
          return await handleStats();
        case 'dashboard':
          return await handleDashboard();
        case 'users':
          return await handleListUsers(event, ctx);
        case 'quizzes':
          return await handleListQuizzes(event, ctx);
        case 'support':
          return await handleListSupport(event, ctx);
        case 'reports':
          return await handleListReports(event, ctx);
        case 'finances':
          return await handleFinances(event, ctx);
        case 'promocodes':
          return await handlePromocodes(event, ctx);
        case 'audit':
          return await handleAuditLog(event);
        default:
          return notFound();
      }
    }

    if (httpMethod === 'POST') {
      switch (pathParameters?.action) {
        case 'update-user':
          return await handleUpdateUser(body, ctx, ip, userAgent);
        case 'user-status':
          return await handleUserStatus(body, ctx, ip, userAgent);
        case 'block-user':
          return await handleBlockUser(body, ctx, ip, userAgent);
        case 'moderate-quiz':
        case 'quiz-moderation':
          return await handleModerateQuiz(body, ctx, ip, userAgent);
        case 'support/reply':
        case 'support-reply':
          return await handleSupportReply(body, ctx, ip, userAgent);
        case 'support/update-status':
        case 'support-status':
          return await handleSupportUpdateStatus(body, ctx, ip, userAgent);
        case 'reports/update':
        case 'report-status':
          return await handleReportUpdate(body, ctx, ip, userAgent);
        case 'grant-pro':
          return await handleGrantPro(body, ctx, ip, userAgent);
        case 'promocode-create':
          return await handlePromocodeCreate(body, ctx, ip, userAgent);
        case 'promocode-toggle':
          return await handlePromocodeToggle(body, ctx, ip, userAgent);
        case 'promocode-delete':
          return await handlePromocodeDelete(event, ctx, ip, userAgent);
        default:
          return notFound();
      }
    }

    return notFound();
  } catch (error) {
    console.error('Admin error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function handleStats() {
  const [userCount] = await query('SELECT COUNT(*) as count FROM public.users');
  const [quizCount] = await query('SELECT COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL');
  const [resultCount] = await query('SELECT COUNT(*) as count FROM public.quiz_results');
  const [proCount] = await query(
    `SELECT COUNT(*) as count FROM public.subscriptions WHERE status = 'active'`,
  );
  const [ticketCount] = await query(
    `SELECT COUNT(*) as count FROM public.support_tickets WHERE status != 'closed'`,
  );

  return ok({
    users: parseInt(userCount?.count || '0'),
    quizzes: parseInt(quizCount?.count || '0'),
    results: parseInt(resultCount?.count || '0'),
    pro_subscriptions: parseInt(proCount?.count || '0'),
    open_tickets: parseInt(ticketCount?.count || '0'),
  });
}

async function handleDashboard() {
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
    new_users_7d: parseInt(newUsers7d?.count || '0'),
    new_users_30d: parseInt(newUsers30d?.count || '0'),
    new_quizzes_7d: parseInt(newQuizzes7d?.count || '0'),
    results_7d: parseInt(results7d?.count || '0'),
    revenue_30d_kopecks: parseInt(revenue30d?.total || '0'),
  });
}

async function staffSession(ctx: AdminStaffContext, email?: string | null) {
  const profile = await queryOne(
    `SELECT account_code FROM public.profiles WHERE user_id = $1`,
    [ctx.userId],
  );
  return {
    user_id: ctx.userId,
    email: email ?? null,
    role: ctx.role,
    permissions: ctx.permissions,
    account_code: Number(profile?.account_code || 0),
    idle_timeout_minutes: 30,
    current_aal: 'aal2',
    ip_restricted: false,
  };
}

async function handleSession(ctx: AdminStaffContext, email?: string | null) {
  return ok({ staff: await staffSession(ctx, email), mfa_required: false });
}

function listMeta(page: number, limit: number, total: number, q = '') {
  return { page, limit, total, has_more: page * limit < total, query: q };
}

async function handleOverview(ctx: AdminStaffContext) {
  const staff = await staffSession(ctx);
  const [usersTotal] = await query('SELECT COUNT(*) as count FROM public.users');
  const [usersActive30d] = await query(`SELECT COUNT(*) as count FROM public.profiles WHERE last_active_at >= now() - interval '30 days'`);
  const [usersNew24h] = await query(`SELECT COUNT(*) as count FROM public.users WHERE created_at >= now() - interval '24 hours'`);
  const [quizzesTotal] = await query(`SELECT COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL`);
  const [quizzesNew24h] = await query(`SELECT COUNT(*) as count FROM public.quizzes WHERE created_at >= now() - interval '24 hours' AND deleted_at IS NULL`);
  const [usersBlocked] = await query(`SELECT COUNT(*) as count FROM public.profiles WHERE status = 'blocked' OR blocked_until > now()`);
  const [pendingModeration] = await query(`SELECT COUNT(*) as count FROM public.quizzes WHERE moderation_status IN ('unreviewed', 'reviewing') AND deleted_at IS NULL`);
  const [staffActive] = await query(`SELECT COUNT(*) as count FROM public.admin_staff WHERE is_active = true`);
  const [subsActive] = await query(`SELECT COUNT(*) as count FROM public.subscriptions WHERE status = 'active' AND current_period_end > now()`);
  const [subsAdmin] = await query(`SELECT COUNT(*) as count FROM public.entitlements WHERE source = 'admin' AND valid_until > now()`);
  const [completionsTotal] = await query(`SELECT COUNT(*) as count FROM public.quiz_results`);
  const [completions24h] = await query(`SELECT COUNT(*) as count FROM public.quiz_results WHERE created_at >= now() - interval '24 hours'`);
  const [reportsOpen] = await query(`SELECT COUNT(*) as count FROM public.quiz_reports WHERE status NOT IN ('closed', 'rejected')`);
  const [supportOpen] = await query(`SELECT COUNT(*) as count FROM public.support_tickets WHERE status != 'closed'`);
  const visibilityRows = await query(`SELECT visibility, COUNT(*) as count FROM public.quizzes WHERE deleted_at IS NULL GROUP BY visibility`);
  const planRows = await query(`SELECT plan_id, COUNT(*) as count FROM public.subscriptions WHERE status = 'active' GROUP BY plan_id`);
  const recentActions = await query(`SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 10`);

  const visibility = { private: 0, unlisted: 0, public: 0 };
  for (const row of visibilityRows) {
    if (row.visibility in visibility) visibility[row.visibility as keyof typeof visibility] = Number(row.count || 0);
  }
  const plans = { pro_monthly: 0, pro_yearly: 0, admin_granted: Number(subsAdmin?.count || 0) };
  for (const row of planRows) {
    if (row.plan_id === 'pro_monthly' || row.plan_id === 'pro_yearly') {
      plans[row.plan_id as 'pro_monthly' | 'pro_yearly'] = Number(row.count || 0);
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
      subscriptions_active: Number(subsActive?.count || 0),
      subscriptions_admin_granted: Number(subsAdmin?.count || 0),
      quiz_completions_total: Number(completionsTotal?.count || 0),
      quiz_completions_24h: Number(completions24h?.count || 0),
      reports_open: Number(reportsOpen?.count || 0),
      support_open: Number(supportOpen?.count || 0),
    },
    trend_7d: [],
    breakdown: { quizzes_by_visibility: visibility, subscriptions_by_plan: plans },
    recent_actions: recentActions,
    unavailable_sources: [],
    generated_at: new Date().toISOString(),
  });
}

async function handleListUsers(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const search = params.q || '';

  let whereClause = '';
  let countWhereClause = '';
  const queryParams: any[] = [limit, offset];

  if (search) {
    whereClause = `WHERE u.email ILIKE $3`;
    countWhereClause = `WHERE u.email ILIKE $1`;
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
    `SELECT COUNT(*) as count FROM public.users u ${countWhereClause}`,
    search ? [`%${search}%`] : [],
  );

  const total = parseInt(countRow?.count || '0');
  if (!ctx) return ok({ users: rows, total, page, limit });

  return ok({
    staff: await staffSession(ctx),
    users: rows.map((row) => ({
      id: row.id,
      account_code: Number(row.account_code || 0),
      username: row.username ?? null,
      display_name: row.display_name ?? row.email ?? null,
      status: row.profile_status || 'active',
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

async function handleListQuizzes(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || '';
  const visibility = params.visibility || '';
  const search = params.q || '';

  const conditions: string[] = ['q.deleted_at IS NULL'];
  const queryParams: any[] = [limit, offset];
  let paramIdx = 3;

  if (status) {
    conditions.push(`q.moderation_status = $${paramIdx}`);
    queryParams.push(status);
    paramIdx++;
  }
  if (visibility && visibility !== 'all') {
    conditions.push(`q.visibility = $${paramIdx}`);
    queryParams.push(visibility);
    paramIdx++;
  }
  if (search) {
    conditions.push(`q.name ILIKE $${paramIdx}`);
    queryParams.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const rows = await query(
    `SELECT q.id, q.user_id, q.name, q.visibility, q.moderation_status,
            q.moderation_reason, q.moderated_at, q.created_at, q.updated_at,
            q.deleted_at, q.published_at,
            NULL::bigint as raw_display_code,
            NULL::text as display_code,
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
    `SELECT COUNT(*) as count FROM public.quizzes q WHERE ${countConditions.join(' AND ')}`,
    countParams,
  );

  const total = parseInt(countRow?.count || '0');
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
      moderation_status: row.moderation_status || 'unreviewed',
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

async function handleListSupport(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || '';
  const search = params.q || '';

  let whereClause = '';
  const queryParams: any[] = [limit, offset];

  if (status && status !== 'all') {
    whereClause = 'WHERE st.status = $3';
    queryParams.push(status);
  }
  if (search) {
    whereClause = whereClause ? `${whereClause} AND st.subject ILIKE $${queryParams.length + 1}` : `WHERE st.subject ILIKE $${queryParams.length + 1}`;
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
  const countWhere = whereClause.replace(/\$(\d+)/g, (_, index) => `$${Number(index) - 2}`);
  const [countRow] = await query(`SELECT COUNT(*) as count FROM public.support_tickets st ${countWhere}`, countParams);
  const total = parseInt(countRow?.count || '0');
  if (!ctx) return ok({ tickets: rows });

  return ok({
    staff: await staffSession(ctx),
    tickets: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      email: row.email ?? row.user_email ?? null,
      subject: row.subject,
      category: row.category,
      priority: row.priority || 'normal',
      status: row.status === 'open' ? 'new' : row.status === 'resolved' ? 'closed' : row.status,
      message: row.message ?? '',
      assigned_to: row.assigned_to ?? null,
      internal_note: row.internal_note ?? null,
      resolution: row.resolution ?? null,
      closed_at: row.closed_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: { account_code: row.account_code ?? null, display_name: row.display_name ?? row.user_email ?? null, username: row.username ?? null },
      assignee: { account_code: row.assignee_account_code ?? null, display_name: row.assignee_display_name ?? null, username: row.assignee_username ?? null },
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

async function handleListReports(event: any, ctx?: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status || '';
  const search = params.q || '';
  const conditions: string[] = [];
  const queryParams: any[] = [limit, offset];
  let paramIdx = 3;
  if (status && status !== 'all') {
    conditions.push(`r.status = $${paramIdx++}`);
    queryParams.push(status);
  }
  if (search) {
    conditions.push(`(q.name ILIKE $${paramIdx} OR r.reason ILIKE $${paramIdx})`);
    queryParams.push(`%${search}%`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await query(
    `SELECT r.id, r.quiz_id, r.reporter_user_id, r.reason, r.comment, r.status,
            r.assigned_to, r.resolution, r.resolved_at, r.created_at, r.updated_at,
            q.name as quiz_name, u.email as reporter_email,
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
  const countWhere = whereClause.replace(/\$(\d+)/g, (_, index) => `$${Number(index) - 2}`);
  const [countRow] = await query(`SELECT COUNT(*) as count FROM public.quiz_reports r LEFT JOIN public.quizzes q ON q.id = r.quiz_id ${countWhere}`, countParams);
  const total = parseInt(countRow?.count || '0');
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
      quiz_display_code: null,
      quiz_owner: { account_code: row.quiz_owner_account_code ?? null, display_name: row.quiz_owner_display_name ?? null, username: row.quiz_owner_username ?? null },
      reporter: { account_code: row.reporter_account_code ?? null, display_name: row.reporter_display_name ?? row.reporter_email ?? null, username: row.reporter_username ?? null },
      assignee: { account_code: row.assignee_account_code ?? null, display_name: row.assignee_display_name ?? null, username: row.assignee_username ?? null },
    })),
    meta: listMeta(page, limit, total, search),
    generated_at: new Date().toISOString(),
  });
}

async function handleFinances(event?: any, ctx?: AdminStaffContext) {
  const [totalRevenue] = await query(
    `SELECT COALESCE(SUM(amount_kopecks), 0) as total FROM public.payments WHERE status = 'succeeded'`,
  );
  const [revenue30d] = await query(
    `SELECT COALESCE(SUM(amount_kopecks), 0) as total FROM public.payments WHERE status = 'succeeded' AND created_at >= now() - interval '30 days'`,
  );
  const [activeSubs] = await query(
    `SELECT COUNT(*) as count FROM public.subscriptions WHERE status = 'active'`,
  );
  const [paymentCount] = await query(
    `SELECT COUNT(*) as count FROM public.payments WHERE status = 'succeeded'`,
  );

  const summary = {
    total_revenue_kopecks: parseInt(totalRevenue?.total || '0'),
    revenue_30d_kopecks: parseInt(revenue30d?.total || '0'),
    active_subscriptions: parseInt(activeSubs?.count || '0'),
    total_payments: parseInt(paymentCount?.count || '0'),
  };
  if (!ctx) return ok(summary);

  const params = event?.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT p.*, pr.account_code, pr.display_name, pr.username
     FROM public.payments p
     LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return ok({
    staff: await staffSession(ctx),
    metrics: {
      revenue_kopecks: summary.total_revenue_kopecks,
      refunds_kopecks: 0,
      net_revenue_kopecks: summary.total_revenue_kopecks,
      active_subscriptions: summary.active_subscriptions,
    },
    payments: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      provider: row.provider,
      external_id: row.external_id ?? null,
      status: row.status,
      amount_kopecks: Number(row.amount_kopecks || 0),
      currency: row.currency || 'RUB',
      receipt_url: row.receipt_url ?? null,
      description: row.description ?? null,
      created_at: row.created_at,
      user: { account_code: row.account_code ?? null, display_name: row.display_name ?? null, username: row.username ?? null },
    })),
    meta: listMeta(page, limit, parseInt(paymentCount?.count || '0')),
    generated_at: new Date().toISOString(),
  });
}

async function handleAuditLog(event: any) {
  const params = event.queryStringParameters || {};
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));

  const rows = await query(
    `SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );

  return ok({ audit: rows });
}

async function handlePromocodes(event: any, ctx: AdminStaffContext) {
  const params = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const search = params.q || '';
  const whereClause = search ? 'WHERE code ILIKE $3' : '';
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
    `SELECT COUNT(*) as count FROM public.promo_codes ${search ? 'WHERE code ILIKE $1' : ''}`,
    search ? [`%${search}%`] : [],
  );

  return ok({
    staff: await staffSession(ctx),
    promocodes: rows.map((row) => ({ ...row, discount_pct: 100 })),
    meta: listMeta(page, limit, Number(countRow?.count || 0), search),
    generated_at: new Date().toISOString(),
  });
}

async function handlePromocodeCreate(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { code, plan_id, valid_until, max_uses } = JSON.parse(body);
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !plan_id) return badRequest('code and plan_id are required');
  if (!['pro_monthly', 'pro_yearly'].includes(plan_id)) return badRequest('Invalid plan_id');

  const row = await queryOne(
    `INSERT INTO public.promo_codes (code, plan_id, valid_from, valid_until, max_uses, is_active)
     VALUES ($1, $2, now(), $3, $4, true)
     RETURNING code, plan_id, is_active, max_uses, used_count, valid_from, valid_until, created_at`,
    [normalizedCode, plan_id, valid_until || null, max_uses ?? null],
  );

  await writeAdminAudit(ctx, {
    action: 'create_promocode',
    targetType: 'promo_code',
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

async function handlePromocodeToggle(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { code, is_active } = JSON.parse(body);
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || typeof is_active !== 'boolean') return badRequest('code and is_active are required');

  const row = await queryOne(
    `UPDATE public.promo_codes
     SET is_active = $2
     WHERE code = $1
     RETURNING code, plan_id, is_active, max_uses, used_count, valid_from, valid_until, created_at`,
    [normalizedCode, is_active],
  );
  if (!row) return notFound();

  await writeAdminAudit(ctx, {
    action: 'toggle_promocode',
    targetType: 'promo_code',
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

async function handlePromocodeDelete(event: any, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const normalizedCode = String(event.queryStringParameters?.code || '').trim().toUpperCase();
  if (!normalizedCode) return badRequest('code is required');

  await query(`DELETE FROM public.promo_codes WHERE code = $1`, [normalizedCode]);
  await writeAdminAudit(ctx, {
    action: 'delete_promocode',
    targetType: 'promo_code',
    targetId: normalizedCode,
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), ok: true, generated_at: new Date().toISOString() });
}

async function handleUpdateUser(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { user_id, role } = JSON.parse(body);
  if (!user_id || !role) return badRequest('user_id and role are required');
  if (!['user', 'admin'].includes(role)) return badRequest('Invalid role');

  await query(
    `UPDATE public.users SET role = $1, updated_at = now() WHERE id = $2`,
    [role, user_id],
  );

  await writeAdminAudit(ctx, {
    action: 'update_user_role',
    targetType: 'user',
    targetId: user_id,
    details: { role },
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), ok: true, generated_at: new Date().toISOString() });
}

async function handleBlockUser(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { user_id, blocked, reason, duration_hours } = JSON.parse(body);
  if (!user_id) return badRequest('user_id is required');

  let blockedUntil = null;
  if (blocked) {
    const hours = duration_hours || 24;
    blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  await query(
    `INSERT INTO public.profiles (user_id, account_code, blocked_until, block_reason)
     VALUES ($1, lpad((floor(random() * 1000000))::int::text, 6, '0'), $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET blocked_until = $2, block_reason = $3, updated_at = now()`,
    [user_id, blockedUntil, blocked ? (reason || 'Blocked by admin') : null],
  );

  await writeAdminAudit(ctx, {
    action: blocked ? 'block_user' : 'unblock_user',
    targetType: 'user',
    targetId: user_id,
    details: { blocked, reason, duration_hours },
    ip,
    userAgent,
  });

  return ok({ updated: true, blocked_until: blockedUntil });
}

async function handleUserStatus(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { user_id, status, blocked_until, reason } = JSON.parse(body);
  if (!user_id || !status) return badRequest('user_id and status are required');
  if (!['active', 'temporarily_blocked', 'blocked'].includes(status)) return badRequest('Invalid status');

  await query(
    `INSERT INTO public.profiles (user_id, account_code, status, blocked_until, block_reason)
     VALUES ($1, lpad((floor(random() * 1000000))::int::text, 6, '0'), $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET status = $2, blocked_until = $3, block_reason = $4, updated_at = now()`,
    [user_id, status, blocked_until || null, reason || null],
  );

  await writeAdminAudit(ctx, {
    action: 'update_user_status',
    targetType: 'user',
    targetId: user_id,
    details: { status, blocked_until: blocked_until || null, reason: reason || null },
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
    user: row ? {
      id: row.id,
      account_code: Number(row.account_code || 0),
      username: row.username ?? null,
      display_name: row.display_name ?? row.email ?? null,
      status: row.profile_status || 'active',
      blocked_until: row.blocked_until ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      last_active_at: row.last_active_at ?? null,
      quiz_count: Number(row.quiz_count || 0),
    } : null,
    generated_at: new Date().toISOString(),
  });
}

async function handleModerateQuiz(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { quiz_id, moderation_status, moderation_reason, reason } = JSON.parse(body);
  if (!quiz_id || !moderation_status) return badRequest('quiz_id and moderation_status are required');

  await query(
    `UPDATE public.quizzes
     SET moderation_status = $1, moderation_reason = $2, moderated_at = now(), updated_at = now()
     WHERE id = $3`,
    [moderation_status, moderation_reason || reason || null, quiz_id],
  );

  await writeAdminAudit(ctx, {
    action: 'moderate_quiz',
    targetType: 'quiz',
    targetId: quiz_id,
    details: { moderation_status, moderation_reason: moderation_reason || reason || null },
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), quiz: null, generated_at: new Date().toISOString() });
}

async function handleSupportReply(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { ticket_id, message, body: messageBody } = JSON.parse(body);
  const replyText = message || messageBody;
  if (!ticket_id || !replyText) return badRequest('ticket_id and message are required');

  const row = await queryOne(
    `INSERT INTO public.support_ticket_messages (ticket_id, sender_id, sender_user_id, sender_kind, body, message, is_staff)
     VALUES ($1, $2, $2, 'admin', $3, $3, true)
     RETURNING id, ticket_id, sender_user_id, sender_kind, body, message, is_staff, created_at`,
    [ticket_id, ctx.userId, replyText],
  );

  await query(
    `UPDATE public.support_tickets SET updated_at = now() WHERE id = $1`,
    [ticket_id],
  );

  await writeAdminAudit(ctx, {
    action: 'support_reply',
    targetType: 'support_ticket',
    targetId: ticket_id,
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), message: row, generated_at: new Date().toISOString() });
}

async function handleSupportUpdateStatus(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { ticket_id, status } = JSON.parse(body);
  if (!ticket_id || !status) return badRequest('ticket_id and status are required');
  if (!['new', 'in_progress', 'waiting_user', 'closed'].includes(status)) {
    return badRequest('Invalid status');
  }

  const dbStatus = status === 'new' ? 'open' : status;
  await query(
    `UPDATE public.support_tickets SET status = $1, updated_at = now() ${dbStatus === 'closed' ? ', closed_at = now()' : ''} WHERE id = $2`,
    [dbStatus, ticket_id],
  );

  await writeAdminAudit(ctx, {
    action: 'support_update_status',
    targetType: 'support_ticket',
    targetId: ticket_id,
    details: { status },
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), ok: true, generated_at: new Date().toISOString() });
}

async function handleReportUpdate(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { report_id, status, resolution } = JSON.parse(body);
  if (!report_id || !status) return badRequest('report_id and status are required');

  await query(
    `UPDATE public.quiz_reports SET status = $1, resolution = $2, updated_at = now() WHERE id = $3`,
    [status, resolution || null, report_id],
  );

  await writeAdminAudit(ctx, {
    action: 'update_report',
    targetType: 'quiz_report',
    targetId: report_id,
    details: { status, resolution },
    ip,
    userAgent,
  });

  return ok({ staff: await staffSession(ctx), ok: true, generated_at: new Date().toISOString() });
}

async function handleGrantPro(body: string, ctx: AdminStaffContext, ip: string | null, userAgent: string | null) {
  const { user_id, days, plan: requestedPlan, reason } = JSON.parse(body);
  if (!user_id) return badRequest('user_id is required');

  const rawDays = Number(days ?? (requestedPlan === 'pro_yearly' ? 365 : 30));
  if (!Number.isFinite(rawDays) || rawDays <= 0) return badRequest('invalid_days');
  const clampedDays = Math.max(1, Math.min(365, Math.trunc(rawDays)));

  const planId = requestedPlan === 'pro_yearly' || requestedPlan === 'pro_monthly'
    ? requestedPlan
    : (clampedDays >= 300 ? 'pro_yearly' : 'pro_monthly');
  const plan = await queryOne(`SELECT * FROM public.plans WHERE id = $1`, [planId]);
  if (!plan) return badRequest('Plan not found');

  const validUntil = new Date(Date.now() + clampedDays * 24 * 60 * 60 * 1000).toISOString();

  await query(
    `INSERT INTO public.entitlements (user_id, plan, features, valid_until, source)
     VALUES ($1, 'pro', $2, $3, 'admin')
     ON CONFLICT (user_id) DO UPDATE SET plan = 'pro', features = $2, valid_until = $3, source = 'admin'`,
    [user_id, JSON.stringify(plan.features || {}), validUntil],
  );

  await query(
    `INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, 'active', now(), $3, false)
     ON CONFLICT (user_id) DO UPDATE SET plan_id = $2, status = 'active', current_period_start = now(), current_period_end = $3, cancel_at_period_end = false`,
    [user_id, planId, validUntil],
  );

  await writeAdminAudit(ctx, {
    action: 'grant_pro',
    targetType: 'user',
    targetId: user_id,
    details: { days: clampedDays, plan: planId, reason: reason || null },
    ip,
    userAgent,
  });

  return ok({
    staff: await staffSession(ctx),
    grant: { user_id, plan: planId, valid_until: validUntil, reason: reason || null },
    generated_at: new Date().toISOString(),
  });
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

function forbidden() {
  return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'Forbidden' }) };
}

function badRequest(message: string) {
  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function notFound() {
  return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Not found' }) };
}

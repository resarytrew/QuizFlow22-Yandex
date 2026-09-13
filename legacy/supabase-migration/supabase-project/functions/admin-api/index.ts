// supabase/functions/admin-api/index.ts
// Authenticated administrative API. All reads and mutations are permission
// gated here; the frontend never talks to admin tables directly.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import {
  AdminAuthError,
  requireAdminRequest,
  writeAdminAudit,
  type AdminStaffContext,
} from '../_shared/admin.ts';

interface CountResult {
  count: number | null;
  error: { message: string } | null;
}

interface AuditListRow {
  id: number;
  actor_user_id: string | null;
  action: string;
  permission: string | null;
  target_type: string | null;
  target_id: string | null;
  outcome: 'success' | 'denied' | 'failed';
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

type QuizVisibility = 'private' | 'unlisted' | 'public';
type ProfileStatus = 'active' | 'temporarily_blocked' | 'blocked';
type QuizModerationStatus =
  | 'unreviewed'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'blocked'
  | 'hidden'
  | 'deleted';
type ReportStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'closed';
type SupportStatus = 'new' | 'in_progress' | 'waiting_user' | 'closed';

interface AdminListParams {
  page: number;
  limit: number;
  offset: number;
  query: string;
}

interface ProfileListRow {
  id: string;
  account_code: number;
  username: string | null;
  display_name: string | null;
  status: ProfileStatus;
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

interface QuizListRow {
  id: string;
  user_id: string;
  name: string;
  visibility: QuizVisibility;
  moderation_status: QuizModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  deleted_at: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QuizCodeRow {
  quiz_id: string;
  visibility: QuizVisibility;
  display_code: number;
}

interface OwnerProfileRow {
  id: string;
  account_code: number;
  username: string | null;
  display_name: string | null;
  status: string;
}

interface ReportListRow {
  id: string;
  quiz_id: string;
  reporter_user_id: string | null;
  reason: string;
  comment: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportListRow {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  category: string;
  priority: string;
  status: SupportStatus;
  message: string;
  assigned_to: string | null;
  internal_note: string | null;
  resolution: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentListRow {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  external_id: string | null;
  status: string;
  amount_kopecks: number;
  currency: string;
  receipt_url: string | null;
  description: string | null;
  created_at: string;
}

const MAX_LIST_LIMIT = 50;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_STATUSES = new Set<ProfileStatus>([
  'active',
  'temporarily_blocked',
  'blocked',
]);
const QUIZ_MODERATION_STATUSES = new Set<QuizModerationStatus>([
  'unreviewed',
  'reviewing',
  'approved',
  'rejected',
  'blocked',
  'hidden',
  'deleted',
]);
const REPORT_STATUSES = new Set<ReportStatus>([
  'new',
  'reviewing',
  'approved',
  'rejected',
  'closed',
]);
const SUPPORT_STATUSES = new Set<SupportStatus>([
  'new',
  'in_progress',
  'waiting_user',
  'closed',
]);

function publicContext(context: AdminStaffContext) {
  return {
    user_id: context.userId,
    email: context.email,
    role: context.role,
    permissions: context.permissions,
    account_code: context.accountCode,
    idle_timeout_minutes: context.idleTimeoutMinutes,
    current_aal: context.currentAal,
    ip_restricted: context.allowedIps.length > 0,
  };
}

function exactCount(result: CountResult): number {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export function dashboardDayRange(daysAgo: number, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysAgo);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    date: start.toISOString().slice(0, 10),
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function safeLikePattern(value: string): string {
  return `%${value.replace(/[%_\\]/g, '\\$&')}%`;
}

export function isSixDigitAccountCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function parseAdminListParams(url: URL): AdminListParams {
  const rawPage = Number(url.searchParams.get('page') ?? '1');
  const rawLimit = Number(url.searchParams.get('limit') ?? '20');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIST_LIMIT)
    : 20;
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    query,
  };
}

export function formatQuizDisplayCode(
  visibility: QuizVisibility,
  displayCode: number | null,
): string | null {
  if (displayCode === null || !Number.isFinite(displayCode)) return null;
  const width = visibility === 'private' ? 2 : visibility === 'unlisted' ? 3 : 4;
  return String(displayCode).padStart(width, '0');
}

function listMeta(params: AdminListParams, total: number) {
  return {
    page: params.page,
    limit: params.limit,
    total,
    has_more: params.offset + params.limit < total,
    query: params.query,
  };
}

function stringField(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const parsed = await req.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AdminAuthError(400, 'invalid_json');
  }
  return parsed as Record<string, unknown>;
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new AdminAuthError(400, `invalid_${field}`);
  }
  return value;
}

function serializeUser(row: ProfileListRow, quizCount: number) {
  return {
    id: row.id,
    account_code: row.account_code,
    username: row.username,
    display_name: row.display_name,
    status: row.status,
    blocked_until: row.blocked_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_active_at: row.last_active_at,
    quiz_count: quizCount,
  };
}

function serializeQuiz(
  quiz: QuizListRow,
  code: QuizCodeRow | null,
  owner: OwnerProfileRow | null,
) {
  return {
    id: quiz.id,
    owner_user_id: quiz.user_id,
    owner_account_code: owner?.account_code ?? null,
    owner_display_name: owner?.display_name ?? null,
    owner_username: owner?.username ?? null,
    owner_status: owner?.status ?? null,
    name: quiz.name,
    visibility: quiz.visibility,
    display_code: formatQuizDisplayCode(
      quiz.visibility,
      code?.display_code ?? null,
    ),
    raw_display_code: code?.display_code ?? null,
    moderation_status: quiz.moderation_status,
    moderation_reason: quiz.moderation_reason,
    moderated_at: quiz.moderated_at,
    deleted_at: quiz.deleted_at,
    is_published: quiz.is_published,
    published_at: quiz.published_at,
    created_at: quiz.created_at,
    updated_at: quiz.updated_at,
  };
}

function profileSummary(profile: OwnerProfileRow | null) {
  return {
    account_code: profile?.account_code ?? null,
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
  };
}

async function handleSession(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { context } = await requireAdminRequest(req, {
    requireAal2: false,
    permission: 'admin.access',
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      mfa_required: context.currentAal !== 'aal2',
    },
    200,
    origin,
  );
}

async function handleOverview(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'dashboard.read',
  });
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersResult,
    activeUsersResult,
    newUsersResult,
    quizzesResult,
    newQuizzesResult,
    blockedUsersResult,
    pendingModerationResult,
    staffResult,
    activeSubscriptionsResult,
    adminGrantedResult,
    completionsResult,
    newCompletionsResult,
    privateQuizzesResult,
    unlistedQuizzesResult,
    publicQuizzesResult,
    monthlySubscriptionsResult,
    yearlySubscriptionsResult,
    openReportsResult,
    openSupportResult,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_active_at', monthAgo),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    admin.from('quizzes').select('id', { count: 'exact', head: true }),
    admin
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'active'),
    admin
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['unreviewed', 'reviewing']),
    admin
      .from('admin_staff')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_active', true),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('current_period_end', new Date(now).toISOString()),
    admin
      .from('entitlements')
      .select('user_id', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .eq('source', 'admin')
      .or(`valid_until.is.null,valid_until.gt.${new Date(now).toISOString()}`),
    admin.from('quiz_results').select('id', { count: 'exact', head: true }),
    admin
      .from('quiz_results')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    admin
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'private'),
    admin
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'unlisted'),
    admin
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'public'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('plan_id', 'pro_monthly')
      .gt('current_period_end', new Date(now).toISOString()),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('plan_id', 'pro_yearly')
      .gt('current_period_end', new Date(now).toISOString()),
    admin
      .from('quiz_reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'reviewing']),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress', 'waiting_user']),
  ]);

  const counts: CountResult[] = [
    usersResult,
    activeUsersResult,
    newUsersResult,
    quizzesResult,
    newQuizzesResult,
    blockedUsersResult,
    pendingModerationResult,
    staffResult,
    activeSubscriptionsResult,
    adminGrantedResult,
    completionsResult,
    newCompletionsResult,
    privateQuizzesResult,
    unlistedQuizzesResult,
    publicQuizzesResult,
    monthlySubscriptionsResult,
    yearlySubscriptionsResult,
    openReportsResult,
    openSupportResult,
  ];
  const failed = counts.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  const trendRanges = Array.from({ length: 7 }, (_, index) =>
    dashboardDayRange(6 - index, new Date(now))
  );
  const trendCounts = await Promise.all(
    trendRanges.map(async (range) => {
      const [users, quizzes, completions] = await Promise.all([
        admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', range.start)
          .lt('created_at', range.end),
        admin
          .from('quizzes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', range.start)
          .lt('created_at', range.end),
        admin
          .from('quiz_results')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', range.start)
          .lt('created_at', range.end),
      ]);
      return {
        date: range.date,
        users: exactCount(users),
        quizzes: exactCount(quizzes),
        completions: exactCount(completions),
      };
    }),
  );

  let recentActions: Array<AuditListRow & {
    actor_account_code: number | null;
    actor_display_name: string | null;
  }> = [];
  if (context.permissions.includes('audit.read')) {
    const auditResult = await admin
      .from('admin_audit_log')
      .select(
        'id, actor_user_id, action, permission, target_type, target_id, outcome, details, ip, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(10);
    if (auditResult.error) throw new Error(auditResult.error.message);
    const auditRows = (auditResult.data ?? []) as AuditListRow[];
    const actorIds = [...new Set(
      auditRows
        .map((row) => row.actor_user_id)
        .filter((id): id is string => Boolean(id)),
    )];
    const actors = new Map<string, OwnerProfileRow>();
    if (actorIds.length > 0) {
      const actorResult = await admin
        .from('profiles')
        .select('id, account_code, username, display_name, status')
        .in('id', actorIds);
      if (actorResult.error) throw new Error(actorResult.error.message);
      for (const actor of (actorResult.data ?? []) as OwnerProfileRow[]) {
        actors.set(actor.id, actor);
      }
    }
    recentActions = auditRows.map((row) => ({
      ...row,
      actor_account_code: row.actor_user_id
        ? actors.get(row.actor_user_id)?.account_code ?? null
        : null,
      actor_display_name: row.actor_user_id
        ? actors.get(row.actor_user_id)?.display_name ??
          actors.get(row.actor_user_id)?.username ??
          null
        : null,
    }));
  }

  await Promise.all([
    admin
      .from('admin_staff')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', context.userId),
    writeAdminAudit(admin, req, context, {
      action: 'admin_dashboard_opened',
      permission: 'dashboard.read',
    }),
  ]);

  return jsonResponse(
    {
      staff: publicContext(context),
      metrics: {
        users_total: exactCount(usersResult),
        users_active_30d: exactCount(activeUsersResult),
        users_new_24h: exactCount(newUsersResult),
        quizzes_total: exactCount(quizzesResult),
        quizzes_new_24h: exactCount(newQuizzesResult),
        users_blocked: exactCount(blockedUsersResult),
        quizzes_pending_moderation: exactCount(pendingModerationResult),
        staff_active: exactCount(staffResult),
        subscriptions_active: exactCount(activeSubscriptionsResult),
        subscriptions_admin_granted: exactCount(adminGrantedResult),
        quiz_completions_total: exactCount(completionsResult),
        quiz_completions_24h: exactCount(newCompletionsResult),
        reports_open: exactCount(openReportsResult),
        support_open: exactCount(openSupportResult),
      },
      trend_7d: trendCounts,
      breakdown: {
        quizzes_by_visibility: {
          private: exactCount(privateQuizzesResult),
          unlisted: exactCount(unlistedQuizzesResult),
          public: exactCount(publicQuizzesResult),
        },
        subscriptions_by_plan: {
          pro_monthly: exactCount(monthlySubscriptionsResult),
          pro_yearly: exactCount(yearlySubscriptionsResult),
          admin_granted: exactCount(adminGrantedResult),
        },
      },
      recent_actions: recentActions,
      unavailable_sources: [],
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handleUsers(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'users.read',
  });
  const params = parseAdminListParams(new URL(req.url));

  let query = admin
    .from('profiles')
    .select(
      'id, account_code, username, display_name, status, blocked_until, created_at, updated_at, last_active_at',
      { count: 'exact' },
    );

  if (params.query) {
    if (isSixDigitAccountCode(params.query)) {
      query = query.eq('account_code', Number(params.query));
    } else {
      query = query.ilike('display_name', safeLikePattern(params.query));
    }
  }

  const usersResult = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (usersResult.error) throw new Error(usersResult.error.message);

  const rows = (usersResult.data ?? []) as ProfileListRow[];
  const ids = rows.map((row) => row.id);
  const quizCounts = new Map<string, number>();
  if (ids.length > 0) {
    const quizzesResult = await admin
      .from('quizzes')
      .select('user_id')
      .in('user_id', ids);
    if (quizzesResult.error) throw new Error(quizzesResult.error.message);
    for (const row of (quizzesResult.data ?? []) as Array<{ user_id: string }>) {
      quizCounts.set(row.user_id, (quizCounts.get(row.user_id) ?? 0) + 1);
    }
  }

  await writeAdminAudit(admin, req, context, {
    action: 'admin_users_listed',
    permission: 'users.read',
    details: { page: params.page, limit: params.limit, q: params.query || null },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      users: rows.map((row) => serializeUser(row, quizCounts.get(row.id) ?? 0)),
      meta: listMeta(params, usersResult.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function matchingQuizIdsByNumericQuery(
  admin: SupabaseClient,
  query: string,
  visibility: QuizVisibility | null,
): Promise<string[] | null> {
  if (!/^\d+$/.test(query)) return null;
  const numeric = Number(query);
  if (!Number.isSafeInteger(numeric)) return [];

  let codeQuery = admin
    .from('quiz_display_codes')
    .select('quiz_id')
    .eq('display_code', numeric);
  if (visibility) codeQuery = codeQuery.eq('visibility', visibility);

  const codeResult = await codeQuery;
  if (codeResult.error) throw new Error(codeResult.error.message);
  const ids = new Set(
    ((codeResult.data ?? []) as Array<{ quiz_id: string }>).map((row) => row.quiz_id),
  );

  if (isSixDigitAccountCode(query)) {
    const ownerResult = await admin
      .from('profiles')
      .select('id')
      .eq('account_code', numeric);
    if (ownerResult.error) throw new Error(ownerResult.error.message);
    const ownerIds = ((ownerResult.data ?? []) as Array<{ id: string }>).map(
      (row) => row.id,
    );
    if (ownerIds.length > 0) {
      let ownerQuizQuery = admin
        .from('quizzes')
        .select('id')
        .in('user_id', ownerIds);
      if (visibility) ownerQuizQuery = ownerQuizQuery.eq('visibility', visibility);
      const ownerQuizResult = await ownerQuizQuery;
      if (ownerQuizResult.error) throw new Error(ownerQuizResult.error.message);
      for (const row of (ownerQuizResult.data ?? []) as Array<{ id: string }>) {
        ids.add(row.id);
      }
    }
  }

  return [...ids];
}

async function handleQuizzes(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'quizzes.read',
  });
  const url = new URL(req.url);
  const params = parseAdminListParams(url);
  const visibilityParam = url.searchParams.get('visibility');
  const visibility =
    visibilityParam === 'private' ||
    visibilityParam === 'unlisted' ||
    visibilityParam === 'public'
      ? visibilityParam
      : null;

  const matchedIds = params.query
    ? await matchingQuizIdsByNumericQuery(admin, params.query, visibility)
    : null;

  if (matchedIds && matchedIds.length === 0) {
    return jsonResponse(
      {
        staff: publicContext(context),
        quizzes: [],
        meta: listMeta(params, 0),
        generated_at: new Date().toISOString(),
      },
      200,
      origin,
    );
  }

  let query = admin
    .from('quizzes')
    .select(
      'id, user_id, name, visibility, moderation_status, moderation_reason, moderated_at, deleted_at, is_published, published_at, created_at, updated_at',
      { count: 'exact' },
    );
  if (visibility) query = query.eq('visibility', visibility);
  if (matchedIds) query = query.in('id', matchedIds);
  else if (params.query) query = query.ilike('name', safeLikePattern(params.query));

  const quizzesResult = await query
    .order('updated_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (quizzesResult.error) throw new Error(quizzesResult.error.message);

  const quizzes = (quizzesResult.data ?? []) as QuizListRow[];
  const quizIds = quizzes.map((quiz) => quiz.id);
  const ownerIds = [...new Set(quizzes.map((quiz) => quiz.user_id))];
  const codeByQuiz = new Map<string, QuizCodeRow>();
  const ownerById = new Map<string, OwnerProfileRow>();

  if (quizIds.length > 0) {
    const codesResult = await admin
      .from('quiz_display_codes')
      .select('quiz_id, visibility, display_code')
      .in('quiz_id', quizIds);
    if (codesResult.error) throw new Error(codesResult.error.message);
    for (const row of (codesResult.data ?? []) as QuizCodeRow[]) {
      codeByQuiz.set(`${row.quiz_id}:${row.visibility}`, row);
    }
  }

  if (ownerIds.length > 0) {
    const ownersResult = await admin
      .from('profiles')
      .select('id, account_code, username, display_name, status')
      .in('id', ownerIds);
    if (ownersResult.error) throw new Error(ownersResult.error.message);
    for (const row of (ownersResult.data ?? []) as OwnerProfileRow[]) {
      ownerById.set(row.id, row);
    }
  }

  await writeAdminAudit(admin, req, context, {
    action: 'admin_quizzes_listed',
    permission: 'quizzes.read',
    details: {
      page: params.page,
      limit: params.limit,
      q: params.query || null,
      visibility,
    },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      quizzes: quizzes.map((quiz) => {
        const code = codeByQuiz.get(`${quiz.id}:${quiz.visibility}`) ?? null;
        const owner = ownerById.get(quiz.user_id) ?? null;
        return serializeQuiz(quiz, code, owner);
      }),
      meta: listMeta(params, quizzesResult.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function loadUserQuizCount(
  admin: SupabaseClient,
  userId: string,
): Promise<number> {
  const result = await admin
    .from('quizzes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

async function handleUserStatus(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'users.manage',
  });
  const body = await readJsonObject(req);
  const userId = requireUuid(body.user_id, 'user_id');
  const status = body.status;
  if (typeof status !== 'string' || !PROFILE_STATUSES.has(status as ProfileStatus)) {
    throw new AdminAuthError(400, 'invalid_status');
  }
  if (userId === context.userId && status !== 'active') {
    throw new AdminAuthError(400, 'cannot_block_self');
  }

  const nextStatus = status as ProfileStatus;
  const blockedUntil =
    nextStatus === 'temporarily_blocked'
      ? stringField(body.blocked_until, 64)
      : null;
  if (nextStatus === 'temporarily_blocked') {
    const time = blockedUntil ? new Date(blockedUntil).getTime() : NaN;
    if (!Number.isFinite(time) || time <= Date.now()) {
      throw new AdminAuthError(400, 'invalid_blocked_until');
    }
  }
  const reason = nextStatus === 'active' ? null : stringField(body.reason, 500);

  const updateResult = await admin
    .from('profiles')
    .update({
      status: nextStatus,
      blocked_until: blockedUntil,
      block_reason: reason,
    })
    .eq('id', userId)
    .select(
      'id, account_code, username, display_name, status, blocked_until, created_at, updated_at, last_active_at',
    )
    .maybeSingle();
  if (updateResult.error) throw new Error(updateResult.error.message);
  const profile = updateResult.data as ProfileListRow | null;
  if (!profile) throw new AdminAuthError(404, 'user_not_found');

  const quizCount = await loadUserQuizCount(admin, userId);
  await writeAdminAudit(admin, req, context, {
    action: nextStatus === 'active' ? 'admin_user_unblocked' : 'admin_user_blocked',
    permission: 'users.manage',
    targetType: 'user',
    targetId: userId,
    details: {
      status: nextStatus,
      blocked_until: blockedUntil,
      reason,
    },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      user: serializeUser(profile, quizCount),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function loadQuizResponse(
  admin: SupabaseClient,
  quizId: string,
): Promise<ReturnType<typeof serializeQuiz>> {
  const quizResult = await admin
    .from('quizzes')
    .select(
      'id, user_id, name, visibility, moderation_status, moderation_reason, moderated_at, deleted_at, is_published, published_at, created_at, updated_at',
    )
    .eq('id', quizId)
    .maybeSingle();
  if (quizResult.error) throw new Error(quizResult.error.message);
  const quiz = quizResult.data as QuizListRow | null;
  if (!quiz) throw new AdminAuthError(404, 'quiz_not_found');

  const [codeResult, ownerResult] = await Promise.all([
    admin
      .from('quiz_display_codes')
      .select('quiz_id, visibility, display_code')
      .eq('quiz_id', quiz.id)
      .eq('visibility', quiz.visibility)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, account_code, username, display_name, status')
      .eq('id', quiz.user_id)
      .maybeSingle(),
  ]);
  if (codeResult.error) throw new Error(codeResult.error.message);
  if (ownerResult.error) throw new Error(ownerResult.error.message);

  return serializeQuiz(
    quiz,
    (codeResult.data as QuizCodeRow | null) ?? null,
    (ownerResult.data as OwnerProfileRow | null) ?? null,
  );
}

async function handleQuizModeration(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'quizzes.moderate',
  });
  const body = await readJsonObject(req);
  const quizId = requireUuid(body.quiz_id, 'quiz_id');
  const status = body.moderation_status;
  if (
    typeof status !== 'string' ||
    !QUIZ_MODERATION_STATUSES.has(status as QuizModerationStatus)
  ) {
    throw new AdminAuthError(400, 'invalid_moderation_status');
  }
  const moderationStatus = status as QuizModerationStatus;
  const reason = stringField(body.reason, 800);
  const shouldHide =
    moderationStatus === 'rejected' ||
    moderationStatus === 'blocked' ||
    moderationStatus === 'hidden' ||
    moderationStatus === 'deleted';
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    moderation_status: moderationStatus,
    moderation_reason: reason,
    moderated_by: context.userId,
    moderated_at: now,
    deleted_at: moderationStatus === 'deleted' ? now : null,
  };
  if (shouldHide) {
    patch.visibility = 'private';
    patch.is_published = false;
    patch.published_at = null;
  }

  const updateResult = await admin
    .from('quizzes')
    .update(patch)
    .eq('id', quizId)
    .select('id')
    .maybeSingle();
  if (updateResult.error) throw new Error(updateResult.error.message);
  if (!updateResult.data) throw new AdminAuthError(404, 'quiz_not_found');

  const quiz = await loadQuizResponse(admin, quizId);
  await writeAdminAudit(admin, req, context, {
    action: `admin_quiz_${moderationStatus}`,
    permission: 'quizzes.moderate',
    targetType: 'quiz',
    targetId: quizId,
    details: {
      moderation_status: moderationStatus,
      reason,
      hidden_from_gallery: shouldHide,
    },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      quiz,
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function loadProfilesByIds(
  admin: SupabaseClient,
  ids: Array<string | null>,
): Promise<Map<string, OwnerProfileRow>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const result = new Map<string, OwnerProfileRow>();
  if (uniqueIds.length === 0) return result;
  const profiles = await admin
    .from('profiles')
    .select('id, account_code, username, display_name, status')
    .in('id', uniqueIds);
  if (profiles.error) throw new Error(profiles.error.message);
  for (const profile of (profiles.data ?? []) as OwnerProfileRow[]) {
    result.set(profile.id, profile);
  }
  return result;
}

async function handleReports(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'reports.read',
  });
  const url = new URL(req.url);
  const params = parseAdminListParams(url);
  const rawStatus = url.searchParams.get('status');
  const status = rawStatus && REPORT_STATUSES.has(rawStatus as ReportStatus)
    ? rawStatus as ReportStatus
    : null;

  let query = admin
    .from('quiz_reports')
    .select(
      'id, quiz_id, reporter_user_id, reason, comment, status, assigned_to, resolution, resolved_at, created_at, updated_at',
      { count: 'exact' },
    );
  if (status) query = query.eq('status', status);
  if (params.query) {
    query = query.or(
      `reason.ilike.${safeLikePattern(params.query)},comment.ilike.${safeLikePattern(params.query)}`,
    );
  }
  const reportsResult = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (reportsResult.error) throw new Error(reportsResult.error.message);
  const reports = (reportsResult.data ?? []) as ReportListRow[];
  const quizIds = [...new Set(reports.map((report) => report.quiz_id))];
  const quizById = new Map<string, QuizListRow>();
  const codeByQuiz = new Map<string, QuizCodeRow>();
  if (quizIds.length > 0) {
    const [quizzesResult, codesResult] = await Promise.all([
      admin
        .from('quizzes')
        .select(
          'id, user_id, name, visibility, moderation_status, moderation_reason, moderated_at, deleted_at, is_published, published_at, created_at, updated_at',
        )
        .in('id', quizIds),
      admin
        .from('quiz_display_codes')
        .select('quiz_id, visibility, display_code')
        .in('quiz_id', quizIds),
    ]);
    if (quizzesResult.error) throw new Error(quizzesResult.error.message);
    if (codesResult.error) throw new Error(codesResult.error.message);
    for (const quiz of (quizzesResult.data ?? []) as QuizListRow[]) {
      quizById.set(quiz.id, quiz);
    }
    for (const code of (codesResult.data ?? []) as QuizCodeRow[]) {
      codeByQuiz.set(`${code.quiz_id}:${code.visibility}`, code);
    }
  }
  const profiles = await loadProfilesByIds(admin, [
    ...reports.map((report) => report.reporter_user_id),
    ...reports.map((report) => report.assigned_to),
    ...[...quizById.values()].map((quiz) => quiz.user_id),
  ]);

  await writeAdminAudit(admin, req, context, {
    action: 'admin_reports_listed',
    permission: 'reports.read',
    details: { page: params.page, status, q: params.query || null },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      reports: reports.map((report) => {
        const quiz = quizById.get(report.quiz_id) ?? null;
        const code = quiz
          ? codeByQuiz.get(`${quiz.id}:${quiz.visibility}`) ?? null
          : null;
        return {
          ...report,
          quiz_name: quiz?.name ?? null,
          quiz_display_code: quiz
            ? formatQuizDisplayCode(quiz.visibility, code?.display_code ?? null)
            : null,
          quiz_owner: profileSummary(quiz ? profiles.get(quiz.user_id) ?? null : null),
          reporter: profileSummary(
            report.reporter_user_id
              ? profiles.get(report.reporter_user_id) ?? null
              : null,
          ),
          assignee: profileSummary(
            report.assigned_to ? profiles.get(report.assigned_to) ?? null : null,
          ),
        };
      }),
      meta: listMeta(params, reportsResult.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handleReportStatus(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'reports.manage',
  });
  const body = await readJsonObject(req);
  const reportId = requireUuid(body.report_id, 'report_id');
  const rawStatus = body.status;
  if (typeof rawStatus !== 'string' || !REPORT_STATUSES.has(rawStatus as ReportStatus)) {
    throw new AdminAuthError(400, 'invalid_report_status');
  }
  const status = rawStatus as ReportStatus;
  const resolution = stringField(body.resolution, 1200);
  const terminal = status === 'approved' || status === 'rejected' || status === 'closed';
  const update = await admin
    .from('quiz_reports')
    .update({
      status,
      assigned_to: context.userId,
      resolution,
      resolved_at: terminal ? new Date().toISOString() : null,
    })
    .eq('id', reportId)
    .select('id')
    .maybeSingle();
  if (update.error) throw new Error(update.error.message);
  if (!update.data) throw new AdminAuthError(404, 'report_not_found');
  await writeAdminAudit(admin, req, context, {
    action: `admin_report_${status}`,
    permission: 'reports.manage',
    targetType: 'report',
    targetId: reportId,
    details: { status, resolution },
  });
  return jsonResponse(
    { staff: publicContext(context), ok: true, generated_at: new Date().toISOString() },
    200,
    origin,
  );
}

async function handleSupport(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'support.read',
  });
  const url = new URL(req.url);
  const params = parseAdminListParams(url);
  const rawStatus = url.searchParams.get('status');
  const status = rawStatus && SUPPORT_STATUSES.has(rawStatus as SupportStatus)
    ? rawStatus as SupportStatus
    : null;
  let query = admin
    .from('support_tickets')
    .select(
      'id, user_id, email, subject, category, priority, status, message, assigned_to, internal_note, resolution, closed_at, created_at, updated_at',
      { count: 'exact' },
    );
  if (status) query = query.eq('status', status);
  if (params.query) {
    query = query.or(
      `subject.ilike.${safeLikePattern(params.query)},email.ilike.${safeLikePattern(params.query)}`,
    );
  }
  const ticketsResult = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (ticketsResult.error) throw new Error(ticketsResult.error.message);
  const tickets = (ticketsResult.data ?? []) as SupportListRow[];
  const profiles = await loadProfilesByIds(admin, [
    ...tickets.map((ticket) => ticket.user_id),
    ...tickets.map((ticket) => ticket.assigned_to),
  ]);
  const ticketIds = tickets.map((ticket) => ticket.id);
  const messagesByTicket = new Map<string, unknown[]>();
  if (ticketIds.length > 0) {
    const messagesResult = await admin
      .from('support_ticket_messages')
      .select(
        'id, ticket_id, sender_user_id, sender_kind, body, attachment_name, attachment_url, created_at',
      )
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true });
    if (messagesResult.error) throw new Error(messagesResult.error.message);
    for (const message of messagesResult.data ?? []) {
      const ticketId = String(message.ticket_id);
      messagesByTicket.set(ticketId, [
        ...(messagesByTicket.get(ticketId) ?? []),
        message,
      ]);
    }
  }

  await writeAdminAudit(admin, req, context, {
    action: 'admin_support_listed',
    permission: 'support.read',
    details: { page: params.page, status, q: params.query || null },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      tickets: tickets.map((ticket) => ({
        ...ticket,
        user: profileSummary(ticket.user_id ? profiles.get(ticket.user_id) ?? null : null),
        assignee: profileSummary(
          ticket.assigned_to ? profiles.get(ticket.assigned_to) ?? null : null,
        ),
        messages: messagesByTicket.get(ticket.id) ?? [],
      })),
      meta: listMeta(params, ticketsResult.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handleSupportReply(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'support.manage',
  });
  const body = await readJsonObject(req);
  const ticketId = requireUuid(body.ticket_id, 'ticket_id');
  const messageBody = stringField(body.body, 4000);
  if (!messageBody) throw new AdminAuthError(400, 'invalid_support_message');
  const ticketResult = await admin
    .from('support_tickets')
    .select('id, status')
    .eq('id', ticketId)
    .maybeSingle();
  if (ticketResult.error) throw new Error(ticketResult.error.message);
  if (!ticketResult.data) throw new AdminAuthError(404, 'support_ticket_not_found');
  if (ticketResult.data.status === 'closed') {
    throw new AdminAuthError(400, 'support_ticket_closed');
  }
  const insertResult = await admin
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_user_id: context.userId,
      sender_kind: 'staff',
      body: messageBody,
    })
    .select(
      'id, ticket_id, sender_user_id, sender_kind, body, attachment_name, attachment_url, created_at',
    )
    .single();
  if (insertResult.error) throw new Error(insertResult.error.message);
  const updateResult = await admin
    .from('support_tickets')
    .update({ status: 'waiting_user', assigned_to: context.userId })
    .eq('id', ticketId);
  if (updateResult.error) throw new Error(updateResult.error.message);
  await writeAdminAudit(admin, req, context, {
    action: 'admin_support_replied',
    permission: 'support.manage',
    targetType: 'support_ticket',
    targetId: ticketId,
  });
  return jsonResponse(
    {
      staff: publicContext(context),
      message: insertResult.data,
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handleSupportStatus(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'support.manage',
  });
  const body = await readJsonObject(req);
  const ticketId = requireUuid(body.ticket_id, 'ticket_id');
  const rawStatus = body.status;
  if (typeof rawStatus !== 'string' || !SUPPORT_STATUSES.has(rawStatus as SupportStatus)) {
    throw new AdminAuthError(400, 'invalid_support_status');
  }
  const status = rawStatus as SupportStatus;
  const internalNote = stringField(body.internal_note, 2000);
  const resolution = stringField(body.resolution, 2000);
  const update = await admin
    .from('support_tickets')
    .update({
      status,
      assigned_to: context.userId,
      internal_note: internalNote,
      resolution,
      closed_at: status === 'closed' ? new Date().toISOString() : null,
    })
    .eq('id', ticketId)
    .select('id')
    .maybeSingle();
  if (update.error) throw new Error(update.error.message);
  if (!update.data) throw new AdminAuthError(404, 'support_ticket_not_found');
  await writeAdminAudit(admin, req, context, {
    action: `admin_support_${status}`,
    permission: 'support.manage',
    targetType: 'support_ticket',
    targetId: ticketId,
    details: { status, internal_note: internalNote, resolution },
  });
  return jsonResponse(
    { staff: publicContext(context), ok: true, generated_at: new Date().toISOString() },
    200,
    origin,
  );
}

async function handlePromocodes(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'promocodes.manage',
  });
  const params = parseAdminListParams(new URL(req.url));

  const query = admin
    .from('promo_codes')
    .select('code, plan_id, discount_pct, valid_from, valid_until, max_uses, used_count, is_active, created_at', { count: 'exact' });

  if (params.query) {
    query.ilike('code', safeLikePattern(params.query));
  }

  const result = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (result.error) throw new Error(result.error.message);

  return jsonResponse(
    {
      staff: publicContext(context),
      promocodes: result.data ?? [],
      meta: listMeta(params, result.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handlePromocodeCreate(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'promocodes.manage',
  });
  const body = await readJsonObject(req);

  const code = stringField(body.code, 20);
  if (!code || !/^[a-zA-Z0-9\-]{4,20}$/.test(code)) {
    throw new AdminAuthError(400, 'invalid_code');
  }

  const plan = body.plan_id;
  if (plan !== 'pro_monthly' && plan !== 'pro_yearly') {
    throw new AdminAuthError(400, 'invalid_plan');
  }

  const maxUses =
    body.max_uses !== null && body.max_uses !== undefined
      ? Number(body.max_uses)
      : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    throw new AdminAuthError(400, 'invalid_max_uses');
  }

  const validUntil = stringField(body.valid_until, 64) ?? null;
  if (validUntil !== null && isNaN(new Date(validUntil).getTime())) {
    throw new AdminAuthError(400, 'invalid_valid_until');
  }

  const insertResult = await admin.from('promo_codes').insert({
    code: code.toUpperCase(),
    plan_id: plan,
    discount_pct: 100,
    valid_from: new Date().toISOString(),
    valid_until: validUntil,
    max_uses: maxUses,
    used_count: 0,
    is_active: true,
  }).select('code, plan_id, discount_pct, valid_from, valid_until, max_uses, used_count, is_active, created_at')
    .single();
  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      throw new AdminAuthError(409, 'code_exists');
    }
    throw new Error(insertResult.error.message);
  }

  await writeAdminAudit(admin, req, context, {
    action: 'admin_promocode_created',
    permission: 'promocodes.manage',
    targetType: 'promo_code',
    targetId: code.toUpperCase(),
    details: { plan_id: plan, max_uses: maxUses, valid_until: validUntil },
  });

  return jsonResponse(
    { staff: publicContext(context), promocode: insertResult.data, generated_at: new Date().toISOString() },
    200,
    origin,
  );
}

async function handlePromocodeToggle(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'promocodes.manage',
  });
  const body = await readJsonObject(req);

  const code = stringField(body.code, 20);
  if (!code) throw new AdminAuthError(400, 'invalid_code');

  const isActive = body.is_active === true;

  const updateResult = await admin
    .from('promo_codes')
    .update({ is_active: isActive })
    .eq('code', code)
    .select('code, plan_id, discount_pct, valid_from, valid_until, max_uses, used_count, is_active, created_at')
    .maybeSingle();
  if (updateResult.error) throw new Error(updateResult.error.message);
  if (!updateResult.data) throw new AdminAuthError(404, 'promocode_not_found');

  return jsonResponse(
    { staff: publicContext(context), promocode: updateResult.data, generated_at: new Date().toISOString() },
    200,
    origin,
  );
}

async function handlePromocodeDelete(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'promocodes.manage',
  });
  const body = await readJsonObject(req);

  const code = stringField(body.code, 20);
  if (!code) throw new AdminAuthError(400, 'invalid_code');

  const existing = await admin.from('promo_codes').select('code').eq('code', code).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) throw new AdminAuthError(404, 'promocode_not_found');

  const delResult = await admin.from('promo_codes').delete().eq('code', code);
  if (delResult.error) throw new Error(delResult.error.message);

  await writeAdminAudit(admin, req, context, {
    action: 'admin_promocode_deleted',
    permission: 'promocodes.manage',
    targetType: 'promo_code',
    targetId: code,
  });

  return jsonResponse(
    { staff: publicContext(context), ok: true, generated_at: new Date().toISOString() },
    200,
    origin,
  );
}

async function handleGrantPro(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'billing.grant',
  });

  let body: {
    user_id?: unknown;
    plan?: unknown;
    reason?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    throw new AdminAuthError(400, 'invalid_json');
  }

  const userId = body.user_id;
  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    throw new AdminAuthError(400, 'invalid_user_id');
  }

  const profileResult = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (!profileResult.data) throw new AdminAuthError(404, 'user_not_found');

  const plan = body.plan;
  if (plan !== 'pro_monthly' && plan !== 'pro_yearly') {
    throw new AdminAuthError(400, 'invalid_plan');
  }

  const reasonRaw = typeof body.reason === 'string' ? body.reason : null;
  const reason = reasonRaw
    ? reasonRaw.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500)
    : null;

  const days = plan === 'pro_yearly' ? 365 : 30;
  const validUntil = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: planRow } = await admin
    .from('plans')
    .select('id, features')
    .eq('id', plan)
    .single();
  if (!planRow) {
    throw new AdminAuthError(500, 'plan_not_found');
  }

  const { error: entErr } = await admin.from('entitlements').upsert(
    {
      user_id: userId,
      plan: 'pro',
      features: planRow.features,
      source: 'admin',
      valid_until: validUntil,
    },
    { onConflict: 'user_id' },
  );
  if (entErr) {
    console.error('[admin-api] grant-pro entitlement upsert failed:', entErr.message);
    throw new AdminAuthError(500, 'db_error');
  }

  const now = new Date().toISOString();
  const { error: subErr } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      plan_id: plan,
      status: 'active',
      current_period_start: now,
      current_period_end: validUntil,
      cancel_at_period_end: false,
    },
    { onConflict: 'user_id' },
  );
  if (subErr) {
    console.error('[admin-api] grant-pro subscription upsert failed:', subErr.message);
  }

  await writeAdminAudit(admin, req, context, {
    action: 'grant_pro',
    permission: 'billing.grant',
    targetType: 'user',
    targetId: userId,
    details: { plan, valid_until: validUntil, reason },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      grant: {
        user_id: userId,
        plan,
        valid_until: validUntil,
        reason,
      },
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

async function handleFinances(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin');
  const { admin, context } = await requireAdminRequest(req, {
    permission: 'finance.read',
  });
  const url = new URL(req.url);
  const params = parseAdminListParams(url);
  const status = stringField(url.searchParams.get('status'), 40);
  let query = admin
    .from('payments')
    .select(
      'id, user_id, plan_id, provider, external_id, status, amount_kopecks, currency, receipt_url, description, created_at',
      { count: 'exact' },
    );
  if (status && status !== 'all') query = query.eq('status', status);
  if (params.query) {
    query = query.or(
      `external_id.ilike.${safeLikePattern(params.query)},description.ilike.${safeLikePattern(params.query)}`,
    );
  }
  const paymentsResult = await query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);
  const payments = (paymentsResult.data ?? []) as PaymentListRow[];
  const profiles = await loadProfilesByIds(admin, payments.map((payment) => payment.user_id));
  const [succeededResult, refundedResult, activeSubscriptionsResult] = await Promise.all([
    admin.from('payments').select('amount_kopecks').eq('status', 'succeeded'),
    admin.from('payments').select('amount_kopecks').eq('status', 'refunded'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString()),
  ]);
  if (succeededResult.error) throw new Error(succeededResult.error.message);
  if (refundedResult.error) throw new Error(refundedResult.error.message);
  const revenue = (succeededResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_kopecks ?? 0),
    0,
  );
  const refunds = (refundedResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount_kopecks ?? 0),
    0,
  );

  await writeAdminAudit(admin, req, context, {
    action: 'admin_finances_listed',
    permission: 'finance.read',
    details: { page: params.page, status, q: params.query || null },
  });

  return jsonResponse(
    {
      staff: publicContext(context),
      metrics: {
        revenue_kopecks: revenue,
        refunds_kopecks: refunds,
        net_revenue_kopecks: Math.max(0, revenue - refunds),
        active_subscriptions: exactCount(activeSubscriptionsResult),
      },
      payments: payments.map((payment) => ({
        ...payment,
        user: profileSummary(profiles.get(payment.user_id) ?? null),
      })),
      meta: listMeta(params, paymentsResult.count ?? 0),
      generated_at: new Date().toISOString(),
    },
    200,
    origin,
  );
}

export async function handleAdminApiRequest(req: Request): Promise<Response> {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  const origin = req.headers.get('Origin');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, origin);
  }

  try {
    const action = new URL(req.url).searchParams.get('action') ?? 'session';
    if (req.method === 'GET') {
      if (action === 'session') return await handleSession(req);
      if (action === 'overview') return await handleOverview(req);
      if (action === 'users') return await handleUsers(req);
      if (action === 'quizzes') return await handleQuizzes(req);
      if (action === 'reports') return await handleReports(req);
      if (action === 'support') return await handleSupport(req);
      if (action === 'finances') return await handleFinances(req);
      if (action === 'promocodes') return await handlePromocodes(req);
    }
    if (req.method === 'POST') {
      if (action === 'user-status') return await handleUserStatus(req);
      if (action === 'quiz-moderation') return await handleQuizModeration(req);
      if (action === 'report-status') return await handleReportStatus(req);
      if (action === 'support-status') return await handleSupportStatus(req);
      if (action === 'support-reply') return await handleSupportReply(req);
      if (action === 'grant-pro') return await handleGrantPro(req);
      if (action === 'promocode-create') return await handlePromocodeCreate(req);
      if (action === 'promocode-toggle') return await handlePromocodeToggle(req);
      if (action === 'promocode-delete') return await handlePromocodeDelete(req);
    }
    return jsonResponse({ error: 'not_found' }, 404, origin);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return jsonResponse({ error: error.code }, error.status, origin);
    }
    console.error(
      '[admin-api] request failed:',
      error instanceof Error ? error.message : error,
    );
    return jsonResponse({ error: 'internal_error' }, 500, origin);
  }
}

if (import.meta.main) {
  Deno.serve(handleAdminApiRequest);
}

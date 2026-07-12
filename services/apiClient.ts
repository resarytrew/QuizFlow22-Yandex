import type {
  AdminFinancesParams,
  AdminFinancesResponse,
  AdminGrantProPayload,
  AdminGrantProResponse,
  AdminModerateQuizPayload,
  AdminModerateQuizResponse,
  AdminOperationResponse,
  AdminOverview,
  AdminPromocodeCreatePayload,
  AdminPromocodeItem,
  AdminPromocodesResponse,
  AdminPromocodeTogglePayload,
  AdminQuizzesParams,
  AdminQuizzesResponse,
  AdminReportsParams,
  AdminReportsResponse,
  AdminSessionResponse,
  AdminStaffSession,
  AdminSupportParams,
  AdminSupportResponse,
  AdminUpdateUserStatusPayload,
  AdminUpdateUserStatusResponse,
  AdminUsersParams,
  AdminUsersResponse,
  PublicQuiz,
  QuizData,
  QuizResult,
  QuizSession,
  SubscriptionStatus,
  SupportTicketCategory,
  SupportTicketMessage,
  UserSupportTicket,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '')).replace(/\/$/, '');

type QueryValue = string | number | boolean | null | undefined;
type QuizMutationPayload = Partial<Pick<Quiz, 'name' | 'visibility' | 'is_favorite' | 'quiz_data'>> & Record<string, unknown>;
type ResultMutationPayload = Record<string, unknown>;
type AiProxyPayload = {
  model: string;
  prompt: string;
  type: 'json' | 'text';
  expectJson: boolean;
};
type BillingEntitlementResponse = {
  tier: 'free' | 'pro';
  status?: SubscriptionStatus;
  current_period_end?: string | null;
  quizzes_limit: number | null;
  ai_questions_limit: number;
  has_media_upload?: boolean;
  yookassa_subscription_id?: string | null;
};
type AdminSupportReplyResponse = { staff: AdminStaffSession; message: SupportTicketMessage; generated_at: string };
type AdminPromocodeMutationResponse = { staff: AdminStaffSession; promocode: AdminPromocodeItem; generated_at: string };
type PublicQuizFallbackRow = Pick<PublicQuiz, 'id' | 'name' | 'quiz_data' | 'created_at' | 'published_at' | 'visibility' | 'is_favorite'>;

function withQuery(path: string, params?: object): string {
  const entries = Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return path;
  const query = new URLSearchParams();
  for (const [key, value] of entries as Array<[string, QueryValue]>) query.set(key, String(value));
  return `${path}?${query.toString()}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE) {
    throw new Error('VITE_API_URL is not configured');
  }

  const { supabase } = await import('./supabaseClient');
  let token: string | undefined;
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function listPublicQuizzesWithFallback(): Promise<PublicQuiz[]> {
  try {
    return await apiRequest<PublicQuiz[]>('/quizzes?public=true');
  } catch (apiError) {
    console.warn('[apiClient] Public gallery API failed, using Supabase fallback', apiError);

    const { supabase, isSupabaseReady } = await import('./supabaseClient');
    if (!isSupabaseReady || !supabase) throw apiError;

    const { data, error } = await supabase
      .from('quizzes')
      .select('id,name,quiz_data,created_at,published_at,visibility,is_favorite')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw apiError;

    const rows = (data ?? []) as PublicQuizFallbackRow[];
    return rows.map((quiz) => ({
      ...quiz,
      published_at: quiz.published_at || quiz.created_at,
      is_published: Boolean(quiz.published_at),
    }));
  }
}

interface Quiz {
  id: string;
  name: string;
  visibility: string;
  is_favorite: boolean;
  quiz_data: QuizData;
  created_at: string;
  updated_at: string;
}

interface AssetItem {
  name: string;
  key: string;
  url: string;
  type: 'image' | 'audio' | 'video';
  created_at: string;
  folder: string;
}

export const api = {
  // ─── Quizzes ────────────────────────────────────────────────
  listQuizzes: () => apiRequest<Quiz[]>('/quizzes'),
  getQuiz: (id: string) => apiRequest<Quiz>(`/quizzes/${id}`),
  createQuiz: (data: QuizMutationPayload) => apiRequest<Quiz>('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateQuiz: (id: string, data: QuizMutationPayload) => apiRequest<Quiz>(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteQuiz: (id: string) => apiRequest<void>(`/quizzes/${id}`, {
    method: 'DELETE',
  }),
  listPublicQuizzes: listPublicQuizzesWithFallback,

  // ─── Results ────────────────────────────────────────────────
  saveResult: (data: ResultMutationPayload) => apiRequest<{ id: string; score: number }>('/results', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getQuizAnalytics: (quizId: string) => apiRequest<{ sessions: QuizSession[]; results: QuizResult[] }>(
    withQuery('/results', { quiz_id: quizId }),
  ),

  // ─── Billing ────────────────────────────────────────────────
  createCheckout: (plan: string) => apiRequest<{ confirmation_url: string; payment_id: string; amount: number; currency: string }>('/billing/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  }),
  getEntitlement: () => apiRequest<BillingEntitlementResponse>('/billing/get-entitlement', {
    method: 'POST',
  }),
  cancelSubscription: () => apiRequest<{ ok: boolean; current_period_end: string; cancel_at_period_end: boolean }>('/billing/cancel-subscription', {
    method: 'POST',
  }),
  redeemPromo: (code: string) => apiRequest<{ ok: true; grant: { plan: string; valid_until: string } }>('/billing/redeem-promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),

  // ─── AI ─────────────────────────────────────────────────────
  aiProxy: (payload: AiProxyPayload, signal?: AbortSignal) => apiRequest<{ result: string; used: number; limit: number }>('/ai-proxy', {
    method: 'POST',
    signal,
    body: JSON.stringify(payload),
  }),

  // ─── Upload ─────────────────────────────────────────────────
  getUploadUrl: (filename: string, contentType: string) =>
    apiRequest<{ uploadUrl: string; publicUrl: string; key: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ action: 'upload-url', filename, contentType }),
    }),
  listAssets: (path = '') => apiRequest<{ assets: AssetItem[] }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ action: 'list', path }),
  }),
  deleteAsset: (key: string) => apiRequest<{ deleted: true }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', key }),
  }),
  moveAsset: (sourceKey: string, targetPath: string) => apiRequest<{ moved: true; asset: AssetItem }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ action: 'move', sourceKey, targetPath }),
  }),
  createAssetFolder: (path: string) => apiRequest<{ created: true }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ action: 'create-folder', path }),
  }),

  // ─── Support ────────────────────────────────────────────────
  listSupportTickets: () => apiRequest<UserSupportTicket[]>('/support/tickets'),
  listSupportMessages: (ticketId: string) => apiRequest<SupportTicketMessage[]>(`/support/tickets/${ticketId}/messages`),
  createSupportTicket: (input: {
    email: string | null;
    subject: string;
    category: SupportTicketCategory;
    message: string;
  }) => apiRequest<UserSupportTicket>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  sendSupportMessage: (ticketId: string, body: string) => apiRequest<SupportTicketMessage>(`/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }),

  // ─── Admin ─────────────────────────────────────────────────
  adminSession: () => apiRequest<AdminSessionResponse>('/admin/session'),
  adminOverview: () => apiRequest<AdminOverview>('/admin/overview'),
  adminUsers: (params?: AdminUsersParams) => apiRequest<AdminUsersResponse>(withQuery('/admin/users', params)),
  adminQuizzes: (params?: AdminQuizzesParams) => apiRequest<AdminQuizzesResponse>(withQuery('/admin/quizzes', params)),
  adminReports: (params?: AdminReportsParams) => apiRequest<AdminReportsResponse>(withQuery('/admin/reports', params)),
  adminSupport: (params?: AdminSupportParams) => apiRequest<AdminSupportResponse>(withQuery('/admin/support', params)),
  adminFinances: (params?: AdminFinancesParams) => apiRequest<AdminFinancesResponse>(withQuery('/admin/finances', params)),
  updateAdminUserStatus: (payload: AdminUpdateUserStatusPayload) => apiRequest<AdminUpdateUserStatusResponse>('/admin/user-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  moderateAdminQuiz: (payload: AdminModerateQuizPayload) => apiRequest<AdminModerateQuizResponse>('/admin/quiz-moderation', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateAdminReportStatus: (payload: { report_id: string; status: string; resolution?: string }) => apiRequest<AdminOperationResponse>('/admin/report-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateAdminSupportStatus: (payload: { ticket_id: string; status: string; internal_note?: string; resolution?: string }) => apiRequest<AdminOperationResponse>('/admin/support-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  replyToAdminSupport: (payload: { ticket_id: string; body: string }) => apiRequest<AdminSupportReplyResponse>('/admin/support-reply', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  grantAdminPro: (payload: AdminGrantProPayload) => apiRequest<AdminGrantProResponse>('/admin/grant-pro', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  adminPromocodes: (params?: AdminUsersParams) => apiRequest<AdminPromocodesResponse>(withQuery('/admin/promocodes', params)),
  createAdminPromocode: (payload: AdminPromocodeCreatePayload) => apiRequest<AdminPromocodeMutationResponse>('/admin/promocode-create', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  toggleAdminPromocode: (payload: AdminPromocodeTogglePayload) => apiRequest<AdminPromocodeMutationResponse>('/admin/promocode-toggle', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteAdminPromocode: (code: string) => apiRequest<AdminOperationResponse>(withQuery('/admin/promocode-delete', { code }), {
    method: 'POST',
  }),
};

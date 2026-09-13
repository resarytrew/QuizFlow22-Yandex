import { create } from 'zustand';
import {
  fetchAdminOverview,
  fetchAdminFinances,
  fetchAdminQuizzes,
  fetchAdminReports,
  fetchAdminSession,
  fetchAdminSupport,
  fetchAdminUsers,
  grantAdminPro,
  moderateAdminQuiz,
  replyToAdminSupport,
  updateAdminUserStatus,
  updateAdminReportStatus,
  updateAdminSupportStatus,
  fetchAdminPromocodes,
  createAdminPromocode,
  toggleAdminPromocode,
  deleteAdminPromocode,
} from '../services/adminApi';
import type {
  AdminGrantProPayload,
  AdminGrantProResponse,
  AdminModerateQuizPayload,
  AdminModerateQuizResponse,
  AdminFinancesParams,
  AdminFinancesResponse,
  AdminOverview,
  AdminPromocodeCreatePayload,
  AdminPromocodeItem,
  AdminPromocodesResponse,
  AdminQuizzesParams,
  AdminQuizzesResponse,
  AdminReportsParams,
  AdminReportsResponse,
  AdminReportStatus,
  AdminStaffSession,
  AdminSupportParams,
  AdminSupportResponse,
  AdminSupportStatus,
  AdminUpdateUserStatusPayload,
  AdminUpdateUserStatusResponse,
  AdminUsersParams,
  AdminUsersResponse,
} from '../types';

interface AdminStoreState {
  staff: AdminStaffSession | null;
  overview: AdminOverview | null;
  users: AdminUsersResponse | null;
  quizzes: AdminQuizzesResponse | null;
  reports: AdminReportsResponse | null;
  support: AdminSupportResponse | null;
  finances: AdminFinancesResponse | null;
  promocodes: AdminPromocodesResponse | null;
  isSessionLoading: boolean;
  isOverviewLoading: boolean;
  isUsersLoading: boolean;
  isQuizzesLoading: boolean;
  isReportsLoading: boolean;
  isSupportLoading: boolean;
  isFinancesLoading: boolean;
  isPromocodesLoading: boolean;
  isGrantingPro: boolean;
  error: string | null;
  refreshSession: () => Promise<AdminStaffSession>;
  loadOverview: (force?: boolean) => Promise<AdminOverview>;
  loadUsers: (params?: AdminUsersParams) => Promise<AdminUsersResponse>;
  loadQuizzes: (params?: AdminQuizzesParams) => Promise<AdminQuizzesResponse>;
  loadReports: (params?: AdminReportsParams) => Promise<AdminReportsResponse>;
  loadSupport: (params?: AdminSupportParams) => Promise<AdminSupportResponse>;
  loadFinances: (params?: AdminFinancesParams) => Promise<AdminFinancesResponse>;
  loadPromocodes: (params?: AdminUsersParams) => Promise<AdminPromocodesResponse>;
  createPromocode: (payload: AdminPromocodeCreatePayload) => Promise<AdminPromocodeItem>;
  togglePromocode: (code: string, isActive: boolean) => Promise<AdminPromocodeItem>;
  deletePromocode: (code: string) => Promise<void>;
  updateReportStatus: (
    reportId: string,
    status: AdminReportStatus,
    resolution?: string | null,
  ) => Promise<void>;
  updateSupportStatus: (
    ticketId: string,
    status: AdminSupportStatus,
    note?: string | null,
  ) => Promise<void>;
  replySupport: (ticketId: string, body: string) => Promise<void>;
  updateUserStatus: (
    payload: AdminUpdateUserStatusPayload,
  ) => Promise<AdminUpdateUserStatusResponse>;
  moderateQuiz: (
    payload: AdminModerateQuizPayload,
  ) => Promise<AdminModerateQuizResponse>;
  grantPro: (payload: AdminGrantProPayload) => Promise<AdminGrantProResponse>;
  reset: () => void;
}

const initialState = {
  staff: null as AdminStaffSession | null,
  overview: null as AdminOverview | null,
  users: null as AdminUsersResponse | null,
  quizzes: null as AdminQuizzesResponse | null,
  reports: null as AdminReportsResponse | null,
  support: null as AdminSupportResponse | null,
  finances: null as AdminFinancesResponse | null,
  promocodes: null as AdminPromocodesResponse | null,
  isSessionLoading: false,
  isOverviewLoading: false,
  isUsersLoading: false,
  isQuizzesLoading: false,
  isReportsLoading: false,
  isSupportLoading: false,
  isFinancesLoading: false,
  isPromocodesLoading: false,
  isGrantingPro: false,
  error: null as string | null,
};

const grantKeys = new Map<string,string>();

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  ...initialState,

  refreshSession: async () => {
    set({ isSessionLoading: true, error: null });
    try {
      const response = await fetchAdminSession();
      set({ staff: response.staff, isSessionLoading: false });
      return response.staff;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_session_failed';
      set({
        staff: null,
        isSessionLoading: false,
        error: message,
      });
      throw error;
    }
  },

  loadOverview: async (force = false) => {
    const cached = get().overview;
    if (cached && !force) return cached;

    set({ isOverviewLoading: true, error: null });
    try {
      const overview = await fetchAdminOverview();
      set({
        overview,
        isOverviewLoading: false,
      });
      return overview;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_overview_failed';
      set({ isOverviewLoading: false, error: message });
      throw error;
    }
  },

  loadUsers: async (params = {}) => {
    set({ isUsersLoading: true, error: null });
    try {
      const users = await fetchAdminUsers(params);
      set({
        users,
        isUsersLoading: false,
      });
      return users;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_users_failed';
      set({ isUsersLoading: false, error: message });
      throw error;
    }
  },

  loadQuizzes: async (params = {}) => {
    set({ isQuizzesLoading: true, error: null });
    try {
      const quizzes = await fetchAdminQuizzes(params);
      set({
        quizzes,
        isQuizzesLoading: false,
      });
      return quizzes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_quizzes_failed';
      set({ isQuizzesLoading: false, error: message });
      throw error;
    }
  },

  loadReports: async (params = {}) => {
    set({ isReportsLoading: true, error: null });
    try {
      const reports = await fetchAdminReports(params);
      set({ reports, isReportsLoading: false });
      return reports;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_reports_failed';
      set({ isReportsLoading: false, error: message });
      throw error;
    }
  },

  loadSupport: async (params = {}) => {
    set({ isSupportLoading: true, error: null });
    try {
      const support = await fetchAdminSupport(params);
      set({ support, isSupportLoading: false });
      return support;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_support_failed';
      set({ isSupportLoading: false, error: message });
      throw error;
    }
  },

  loadFinances: async (params = {}) => {
    set({ isFinancesLoading: true, error: null });
    try {
      const finances = await fetchAdminFinances(params);
      set({ finances, isFinancesLoading: false });
      return finances;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_finances_failed';
      set({ isFinancesLoading: false, error: message });
      throw error;
    }
  },

  loadPromocodes: async (params = {}) => {
    set({ isPromocodesLoading: true, error: null });
    try {
      const promocodes = await fetchAdminPromocodes(params);
      set({ promocodes, isPromocodesLoading: false });
      return promocodes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocodes_failed';
      set({ isPromocodesLoading: false, error: message });
      throw error;
    }
  },

  createPromocode: async (payload) => {
    if (get().isPromocodesLoading) throw new Error('operation_in_progress');
    set({ isPromocodesLoading: true, error: null });
    try {
      const response = await createAdminPromocode(payload);
      set((state) => ({
        promocodes: state.promocodes
          ? { ...state.promocodes, promocodes: [response.promocode, ...state.promocodes.promocodes] }
          : state.promocodes,
        isPromocodesLoading: false,
      }));
      return response.promocode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocode_create_failed';
      set({ isPromocodesLoading: false, error: message });
      throw error;
    }
  },

  togglePromocode: async (code, isActive) => {
    if (get().isPromocodesLoading) throw new Error('operation_in_progress');
    set({isPromocodesLoading:true,error:null});
    try {
      const response = await toggleAdminPromocode({ code, is_active: isActive });
      set((state) => ({
        isPromocodesLoading:false,
        promocodes: state.promocodes
          ? {
              ...state.promocodes,
              promocodes: state.promocodes.promocodes.map((p) =>
                p.code === code ? response.promocode : p,
              ),
            }
          : state.promocodes,
      }));
      return response.promocode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocode_toggle_failed';
      set({ isPromocodesLoading:false,error: message });
      throw error;
    }
  },

  deletePromocode: async (code) => {
    if (get().isPromocodesLoading) throw new Error('operation_in_progress');
    set({isPromocodesLoading:true,error:null});
    try {
      await deleteAdminPromocode(code);
      set((state) => ({
        isPromocodesLoading:false,
        promocodes: state.promocodes
          ? {
              ...state.promocodes,
              promocodes: state.promocodes.promocodes.filter((p) => p.code !== code),
            }
          : state.promocodes,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocode_delete_failed';
      set({ isPromocodesLoading:false,error: message });
      throw error;
    }
  },

  updateReportStatus: async (reportId, status, resolution = null) => {
    if (get().isReportsLoading) throw new Error('operation_in_progress');
    set({ isReportsLoading: true, error: null });
    try {
      const response = await updateAdminReportStatus({ report_id: reportId, status, resolution: resolution ?? undefined });
      set((state) => ({
        reports: state.reports
          ? {
              ...state.reports,
              reports: state.reports.reports.map((report) =>
                report.id === reportId ? response.report
                  : report,
              ),
            }
          : null,
        isReportsLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_report_update_failed';
      set({ isReportsLoading: false, error: message });
      throw error;
    }
  },

  updateSupportStatus: async (ticketId, status, note = null) => {
    if (get().isSupportLoading) throw new Error('operation_in_progress');
    set({ isSupportLoading: true, error: null });
    try {
      const response = await updateAdminSupportStatus({
        ticket_id: ticketId,
        status,
        internal_note: status === 'closed' ? undefined : note ?? undefined,
        resolution: status === 'closed' ? (note ?? undefined) : undefined,
      });
      set((state) => ({
        support: state.support
          ? {
              ...state.support,
              tickets: state.support.tickets.map((ticket) =>
                ticket.id === ticketId ? response.ticket
                  : ticket,
              ),
            }
          : null,
        isSupportLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_support_update_failed';
      set({ isSupportLoading: false, error: message });
      throw error;
    }
  },

  replySupport: async (ticketId, body) => {
    if (get().isSupportLoading) throw new Error('operation_in_progress');
    set({ isSupportLoading: true, error: null });
    try {
      const response = await replyToAdminSupport({ ticket_id: ticketId, body });
      set((state) => ({
        support: state.support
          ? {
              ...state.support,
              tickets: state.support.tickets.map((ticket) =>
                ticket.id === ticketId ? response.ticket
                  : ticket,
              ),
            }
          : null,
        isSupportLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_support_reply_failed';
      set({ isSupportLoading: false, error: message });
      throw error;
    }
  },

  updateUserStatus: async (payload) => {
    if (get().isUsersLoading) throw new Error('operation_in_progress');
    set({ isUsersLoading: true, error: null });
    try {
      const response = await updateAdminUserStatus(payload);
      set((state) => ({
        users: state.users
          ? {
              ...state.users,
              users: state.users.users.map((user) =>
                user.id === response.user.id ? response.user : user,
              ),
              generated_at: response.generated_at,
            }
          : state.users,
        isUsersLoading: false,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_user_update_failed';
      set({ isUsersLoading: false, error: message });
      throw error;
    }
  },

  moderateQuiz: async (payload) => {
    if (get().isQuizzesLoading) throw new Error('operation_in_progress');
    set({ isQuizzesLoading: true, error: null });
    try {
      const response = await moderateAdminQuiz(payload);
      set((state) => ({
        quizzes: state.quizzes
          ? {
              ...state.quizzes,
              quizzes: state.quizzes.quizzes.map((quiz) =>
                quiz.id === response.quiz.id ? response.quiz : quiz,
              ),
              generated_at: response.generated_at,
            }
          : state.quizzes,
        isQuizzesLoading: false,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_quiz_update_failed';
      set({ isQuizzesLoading: false, error: message });
      throw error;
    }
  },

  grantPro: async (payload) => {
    if (get().isGrantingPro) throw new Error('operation_in_progress');
    const signature = JSON.stringify(payload);
    const key = payload.idempotency_key || grantKeys.get(signature) || crypto.randomUUID();
    grantKeys.set(signature,key);
    set({ isGrantingPro: true, error: null });
    try {
      const response = await grantAdminPro({ ...payload, idempotency_key:key });
      grantKeys.delete(signature);
      set({ isGrantingPro: false });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_grant_pro_failed';
      set({ isGrantingPro: false, error: message });
      throw error;
    }
  },

  reset: () => { grantKeys.clear(); set(initialState); },
}));

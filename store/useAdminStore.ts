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
        staff: overview.staff,
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
        staff: users.staff,
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
        staff: quizzes.staff,
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
      set({ staff: reports.staff, reports, isReportsLoading: false });
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
      set({ staff: support.staff, support, isSupportLoading: false });
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
      set({ staff: finances.staff, finances, isFinancesLoading: false });
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
      set({ staff: promocodes.staff, promocodes, isPromocodesLoading: false });
      return promocodes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocodes_failed';
      set({ isPromocodesLoading: false, error: message });
      throw error;
    }
  },

  createPromocode: async (payload) => {
    set({ isPromocodesLoading: true, error: null });
    try {
      const response = await createAdminPromocode(payload);
      set((state) => ({
        staff: response.staff,
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
    set({ error: null });
    try {
      const response = await toggleAdminPromocode({ code, is_active: isActive });
      set((state) => ({
        staff: response.staff,
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
      set({ error: message });
      throw error;
    }
  },

  deletePromocode: async (code) => {
    set({ error: null });
    try {
      await deleteAdminPromocode(code);
      set((state) => ({
        promocodes: state.promocodes
          ? {
              ...state.promocodes,
              promocodes: state.promocodes.promocodes.filter((p) => p.code !== code),
            }
          : state.promocodes,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_promocode_delete_failed';
      set({ error: message });
      throw error;
    }
  },

  updateReportStatus: async (reportId, status, resolution = null) => {
    set({ isReportsLoading: true, error: null });
    try {
      await updateAdminReportStatus({ report_id: reportId, status, resolution: resolution ?? undefined });
      set((state) => ({
        reports: state.reports
          ? {
              ...state.reports,
              reports: state.reports.reports.map((report) =>
                report.id === reportId
                  ? {
                      ...report,
                      status,
                      resolution,
                      resolved_at: ['approved', 'rejected', 'closed'].includes(status)
                        ? new Date().toISOString()
                        : null,
                    }
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
    set({ isSupportLoading: true, error: null });
    try {
      await updateAdminSupportStatus({
        ticket_id: ticketId,
        status,
        internal_note: note ?? undefined,
        resolution: status === 'closed' ? (note ?? undefined) : undefined,
      });
      set((state) => ({
        support: state.support
          ? {
              ...state.support,
              tickets: state.support.tickets.map((ticket) =>
                ticket.id === ticketId
                  ? {
                      ...ticket,
                      status,
                      internal_note: note,
                      resolution: status === 'closed' ? note : ticket.resolution,
                      closed_at: status === 'closed' ? new Date().toISOString() : null,
                    }
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
    set({ isSupportLoading: true, error: null });
    try {
      const response = await replyToAdminSupport({ ticket_id: ticketId, body });
      set((state) => ({
        support: state.support
          ? {
              ...state.support,
              tickets: state.support.tickets.map((ticket) =>
                ticket.id === ticketId
                  ? {
                      ...ticket,
                      status: 'waiting_user',
                      messages: [...(ticket.messages ?? []), response.message],
                    }
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
    set({ isUsersLoading: true, error: null });
    try {
      const response = await updateAdminUserStatus(payload);
      set((state) => ({
        staff: response.staff,
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
    set({ isQuizzesLoading: true, error: null });
    try {
      const response = await moderateAdminQuiz(payload);
      set((state) => ({
        staff: response.staff,
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
    set({ isGrantingPro: true, error: null });
    try {
      const response = await grantAdminPro(payload);
      set({ isGrantingPro: false });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'admin_grant_pro_failed';
      set({ isGrantingPro: false, error: message });
      throw error;
    }
  },

  reset: () => set(initialState),
}));

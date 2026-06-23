import { api } from './apiClient';
import type {
  AdminFinancesParams,
  AdminFinancesResponse,
  AdminGrantProPayload,
  AdminGrantProResponse,
  AdminModerateQuizPayload,
  AdminModerateQuizResponse,
  AdminOperationResponse,
  AdminPromocodeCreatePayload,
  AdminPromocodeItem,
  AdminPromocodesResponse,
  AdminPromocodeTogglePayload,
  AdminQuizzesParams,
  AdminQuizzesResponse,
  AdminReportsParams,
  AdminReportsResponse,
  AdminSessionResponse,
  AdminSupportParams,
  AdminSupportResponse,
  AdminUpdateUserStatusPayload,
  AdminUpdateUserStatusResponse,
  AdminUsersParams,
  AdminUsersResponse,
  SupportTicketMessage,
} from '../types';

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

export async function fetchAdminSession(): Promise<AdminSessionResponse> {
  return api.adminSession();
}

export async function fetchAdminOverview() {
  return api.adminOverview();
}

export async function fetchAdminUsers(params?: AdminUsersParams): Promise<AdminUsersResponse> {
  return api.adminUsers(params);
}

export async function fetchAdminQuizzes(params?: AdminQuizzesParams): Promise<AdminQuizzesResponse> {
  return api.adminQuizzes(params);
}

export async function fetchAdminReports(params?: AdminReportsParams): Promise<AdminReportsResponse> {
  return api.adminReports(params);
}

export async function updateAdminReportStatus(payload: { report_id: string; status: string; resolution?: string }): Promise<AdminOperationResponse> {
  return api.updateAdminReportStatus(payload);
}

export async function fetchAdminSupport(params?: AdminSupportParams): Promise<AdminSupportResponse> {
  return api.adminSupport(params);
}

export async function updateAdminSupportStatus(payload: { ticket_id: string; status: string; internal_note?: string; resolution?: string }): Promise<AdminOperationResponse> {
  return api.updateAdminSupportStatus(payload);
}

export async function replyToAdminSupport(payload: { ticket_id: string; body: string }): Promise<{ staff: any; message: SupportTicketMessage; generated_at: string }> {
  return api.replyToAdminSupport(payload);
}

export async function fetchAdminFinances(params?: AdminFinancesParams): Promise<AdminFinancesResponse> {
  return api.adminFinances(params);
}

export async function grantAdminPro(payload: AdminGrantProPayload): Promise<AdminGrantProResponse> {
  return api.grantAdminPro(payload);
}

export async function fetchAdminPromocodes(params?: AdminUsersParams): Promise<AdminPromocodesResponse> {
  return api.adminPromocodes(params);
}

export async function createAdminPromocode(payload: AdminPromocodeCreatePayload): Promise<{ staff: any; promocode: AdminPromocodeItem; generated_at: string }> {
  return api.createAdminPromocode(payload);
}

export async function toggleAdminPromocode(payload: AdminPromocodeTogglePayload): Promise<{ staff: any; promocode: AdminPromocodeItem; generated_at: string }> {
  return api.toggleAdminPromocode(payload);
}

export async function deleteAdminPromocode(code: string): Promise<AdminOperationResponse> {
  return api.deleteAdminPromocode(code);
}

export async function moderateAdminQuiz(payload: AdminModerateQuizPayload): Promise<AdminModerateQuizResponse> {
  return api.moderateAdminQuiz(payload);
}

export async function updateAdminUserStatus(payload: AdminUpdateUserStatusPayload): Promise<AdminUpdateUserStatusResponse> {
  return api.updateAdminUserStatus(payload);
}

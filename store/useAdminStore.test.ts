import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  fetchAdminSession: vi.fn(),
  fetchAdminUsers: vi.fn(),
  updateAdminReportStatus: vi.fn(),
  updateAdminSupportStatus: vi.fn(),
  replyToAdminSupport: vi.fn(),
  grantAdminPro: vi.fn(),
}));
vi.mock("../services/adminApi", () => api);
import { useAdminStore } from "./useAdminStore";
import type { AdminReportsResponse, AdminSupportResponse } from "../types";
const staff = {
  user_id: "staff",
  email: "admin@test.invalid",
  role: "admin" as const,
  permissions: ["admin.access"],
  account_code: 123456,
  idle_timeout_minutes: 30,
  current_aal: "mfa" as const,
  ip_restricted: false,
};
beforeEach(() => {
  useAdminStore.getState().reset();
  vi.clearAllMocks();
});
describe("administrative store contracts", () => {
  it("only refreshSession writes staff, even when a legacy list response carries stale staff", async () => {
    api.fetchAdminSession.mockResolvedValue({ staff });
    await useAdminStore.getState().refreshSession();
    api.fetchAdminUsers.mockResolvedValue({
      staff: { ...staff, email: null, current_aal: "normal" },
      users: [],
    });
    await useAdminStore.getState().loadUsers();
    expect(useAdminStore.getState().staff).toBe(staff);
  });
  it("uses the server report and support entities instead of client dates/statuses", async () => {
    const report = {
      id: "report",
      status: "closed",
      resolved_at: "2020-01-01T00:00:00.000Z",
    };
    const ticket = {
      id: "ticket",
      status: "waiting_user",
      internal_note: "saved",
      messages: [],
      closed_at: null,
    };
    useAdminStore.setState({
      reports: { reports: [{ id: "report" }] } as AdminReportsResponse,
      support: { tickets: [{ id: "ticket" }] } as AdminSupportResponse,
    });
    api.updateAdminReportStatus.mockResolvedValue({ report });
    await useAdminStore.getState().updateReportStatus("report", "closed");
    expect(useAdminStore.getState().reports!.reports[0]).toBe(report);
    api.replyToAdminSupport.mockResolvedValue({ ticket });
    await useAdminStore.getState().replySupport("ticket", "message");
    expect(useAdminStore.getState().support!.tickets[0]).toBe(ticket);
  });
  it("reuses the grant key after an uncertain failure and rejects duplicate clicks", async () => {
    const payload = { user_id: "user", plan: "pro_monthly" as const };
    api.grantAdminPro
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ grant: {} });
    await expect(useAdminStore.getState().grantPro(payload)).rejects.toThrow(
      "network unavailable",
    );
    await useAdminStore.getState().grantPro(payload);
    expect(api.grantAdminPro.mock.calls[0][0].idempotency_key).toBe(
      api.grantAdminPro.mock.calls[1][0].idempotency_key,
    );
    useAdminStore.setState({ isGrantingPro: true });
    await expect(useAdminStore.getState().grantPro(payload)).rejects.toThrow(
      "operation_in_progress",
    );
    expect(api.grantAdminPro).toHaveBeenCalledTimes(2);
  });
});

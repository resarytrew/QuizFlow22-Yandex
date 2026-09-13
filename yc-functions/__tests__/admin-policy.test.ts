import { describe, it, expect } from "vitest";
import {
  ADMIN_ROUTES,
  ROLE_PERMISSIONS,
  isAccountBlocked,
} from "../_shared/admin-policy";
import { ipAllowed } from "../_shared/admin";
import {
  GrantProSchema,
  validateAdminEntity,
} from "../_shared/admin-contracts";
describe("admin policy boundaries", () => {
  it("does not grant inherited object keys or unknown permissions", () => {
    expect(Object.hasOwn(ADMIN_ROUTES, "POST constructor")).toBe(false);
    expect(ROLE_PERMISSIONS.support).not.toContain("billing.grant");
    expect(ROLE_PERMISSIONS.admin).not.toContain("staff.manage");
  });
  it("handles temporary expiry and malformed expiry conservatively", () => {
    expect(isAccountBlocked("blocked", null)).toBe(true);
    expect(isAccountBlocked("temporarily_blocked", "invalid")).toBe(true);
    expect(
      isAccountBlocked(
        "temporarily_blocked",
        "2020-01-01",
        Date.parse("2021-01-01"),
      ),
    ).toBe(false);
  });
  it("checks IPv4/IPv6 addresses and subnets", () => {
    expect(ipAllowed("10.0.2.1", ["10.0.0.0/8"])).toBe(true);
    expect(ipAllowed("192.168.0.1", ["10.0.0.0/8"])).toBe(false);
    expect(ipAllowed("::1", ["::1/128"])).toBe(true);
    expect(ipAllowed(undefined, ["10.0.0.0/8"])).toBe(false);
  });
  it("rejects null mutation entities and invalid grant durations", () => {
    expect(() => validateAdminEntity({ quiz: null })).toThrow();
    expect(
      GrantProSchema.safeParse({ user_id: "not-a-uuid", days: 30 }).success,
    ).toBe(false);
    expect(
      GrantProSchema.safeParse({
        user_id: "12345678-1234-4234-8234-123456789012",
        days: 0,
      }).success,
    ).toBe(false);
  });
});

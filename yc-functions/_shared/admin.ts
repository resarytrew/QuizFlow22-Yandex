import { query, queryOne } from "./db";
import { ROLE_PERMISSIONS } from "./admin-policy";
import { BlockList, isIP } from "node:net";
import type { AuthUser } from "./auth";

export type AdminRole = "owner" | "admin" | "moderator" | "support";

export interface AdminStaffContext {
  userId: string;
  role: AdminRole;
  permissions: string[];
  user?: AuthUser;
  requestId?: string;
  permission?: string;
  allowedIps?: string[];
  idleTimeoutMinutes?: number;
}

interface StaffRow {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  allowed_ips: string[] | null;
  idle_timeout_minutes: number;
}

export class AdminAuthError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = "AdminAuthError";
    this.status = status;
    this.code = code;
  }
}

export async function requireAdminStaff(
  userId: string,
  user?: AuthUser,
  ip?: string | null,
): Promise<AdminStaffContext> {
  const staff = await queryOne<StaffRow>(
    `SELECT user_id, role, is_active, allowed_ips, idle_timeout_minutes FROM public.admin_staff WHERE user_id = $1 AND is_active = true`,
    [userId],
  );
  if (!staff) throw new AdminAuthError(403, "not_admin_staff");
  if (staff.allowed_ips?.length && !ipAllowed(ip, staff.allowed_ips))
    throw new AdminAuthError(403, "ip_restricted");
  if (user?.sessionId) {
    const session = await queryOne(
      `UPDATE public.auth_sessions SET admin_last_seen_at = now()
      WHERE id = $1 AND (admin_last_seen_at IS NULL OR admin_last_seen_at > now() - ($2 * interval '1 minute')) RETURNING id`,
      [user.sessionId, staff.idle_timeout_minutes || 30],
    );
    if (!session) throw new AdminAuthError(401, "admin_session_expired");
  }

  const roleRows = await query<{ permission: string }>(
    `SELECT permission FROM public.admin_role_permissions WHERE role = $1`,
    [staff.role],
  );
  const overrideRows = await query<{ permission: string; granted: boolean }>(
    `SELECT permission, granted FROM public.admin_staff_permissions WHERE user_id = $1`,
    [userId],
  );

  const known: readonly string[] = ROLE_PERMISSIONS.owner;
  const permissions = new Set(
    roleRows
      .map((r) => r.permission)
      .filter((permission) => known.includes(permission)),
  );
  for (const o of overrideRows) {
    if (o.granted && known.includes(o.permission))
      permissions.add(o.permission);
    else permissions.delete(o.permission);
  }

  return {
    userId: staff.user_id,
    user,
    allowedIps: staff.allowed_ips ?? [],
    idleTimeoutMinutes: staff.idle_timeout_minutes || 30,
    role: staff.role,
    permissions: [...permissions].sort(),
  };
}

export function hasPermission(
  ctx: AdminStaffContext,
  permission: string,
): boolean {
  return ctx.permissions.includes(permission);
}

export async function writeAdminAudit(
  ctx: AdminStaffContext,
  entry: {
    action: string;
    permission?: string;
    targetType?: string;
    targetId?: string;
    outcome?: "success" | "denied" | "failed";
    details?: Record<string, unknown>;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  try {
    await query(
      `INSERT INTO public.admin_audit_log
       (actor_user_id, actor_fingerprint, action, permission, target_type, target_id, outcome, payload, ip_address, user_agent, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        ctx.userId || null,
        ctx.userId ? `user:${ctx.userId}` : "service:billing-admin",
        entry.action,
        entry.permission ?? ctx.permission ?? null,
        entry.targetType ?? null,
        entry.targetId ?? null,
        entry.outcome ?? "success",
        JSON.stringify(entry.details ?? {}),
        entry.ip ?? null,
        entry.userAgent ?? null,
        ctx.requestId ?? null,
      ],
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_audit_write_failed",
        request_id: ctx.requestId,
        code: (error as { code?: string }).code || "unknown",
      }),
    );
    throw new AdminAuthError(500, "audit_write_failed");
  }
}

export function ipAllowed(
  ip: string | null | undefined,
  ranges: string[],
): boolean {
  if (!ip || !isIP(ip)) return false;
  const list = new BlockList();
  try {
    for (const range of ranges) {
      const [address, prefix] = range.split("/");
      const family = isIP(address) === 6 ? "ipv6" : "ipv4";
      if (!isIP(address)) return false;
      if (prefix === undefined) list.addAddress(address, family);
      else list.addSubnet(address, Number(prefix), family);
    }
    return list.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");
  } catch {
    return false;
  }
}
export async function recordAdminFailure(
  ctx: AdminStaffContext,
  code: string,
  denied: boolean,
) {
  try {
    await writeAdminAudit(ctx, {
      action: ctx.permission || "admin_request",
      outcome: denied ? "denied" : "failed",
      details: { code },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_audit_unavailable",
        request_id: ctx.requestId,
        code,
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}

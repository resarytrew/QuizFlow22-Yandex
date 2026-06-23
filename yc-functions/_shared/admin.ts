import { query, queryOne } from './db';

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'support';

export interface AdminStaffContext {
  userId: string;
  role: AdminRole;
  permissions: string[];
}

interface StaffRow {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
}

export class AdminAuthError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = 'AdminAuthError';
    this.status = status;
    this.code = code;
  }
}

export async function requireAdminStaff(userId: string): Promise<AdminStaffContext> {
  const staff = await queryOne<StaffRow>(
    `SELECT user_id, role, is_active FROM public.admin_staff WHERE user_id = $1 AND is_active = true`,
    [userId],
  );
  if (!staff) throw new AdminAuthError(403, 'not_admin_staff');

  const roleRows = await query<{ permission: string }>(
    `SELECT permission FROM public.admin_role_permissions WHERE role = $1`,
    [staff.role],
  );
  const overrideRows = await query<{ permission: string; granted: boolean }>(
    `SELECT permission, granted FROM public.admin_staff_permissions WHERE user_id = $1`,
    [userId],
  );

  const permissions = new Set(roleRows.map((r) => r.permission));
  for (const o of overrideRows) {
    if (o.granted) permissions.add(o.permission);
    else permissions.delete(o.permission);
  }

  return {
    userId: staff.user_id,
    role: staff.role,
    permissions: [...permissions].sort(),
  };
}

export function hasPermission(ctx: AdminStaffContext, permission: string): boolean {
  return ctx.permissions.includes(permission);
}

export async function writeAdminAudit(
  ctx: AdminStaffContext,
  entry: {
    action: string;
    permission?: string;
    targetType?: string;
    targetId?: string;
    outcome?: 'success' | 'denied' | 'failed';
    details?: Record<string, unknown>;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  try {
    await query(
      `INSERT INTO public.admin_audit_log
       (actor_user_id, actor_fingerprint, action, permission, target_type, target_id, outcome, details, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      ctx.userId,
      `user:${ctx.userId}`,
      entry.action,
      entry.permission ?? null,
      entry.targetType ?? null,
      entry.targetId ?? null,
      entry.outcome ?? 'success',
      JSON.stringify(entry.details ?? {}),
      entry.ip ?? null,
      entry.userAgent ?? null,
    ],
  );
  } catch (err) {
    console.error('[admin-audit] insert failed:', err instanceof Error ? err.message : err);
  }
}

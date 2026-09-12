// supabase/functions/_shared/admin.ts
// Shared authentication and authorization helpers for trusted admin endpoints.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getUserFromRequest, type AuthedUser } from './auth.ts';
import { createAdminClient, createUserClient } from './supabase.ts';

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'support';
export type AuthenticatorLevel = 'aal1' | 'aal2';

export interface AdminStaffContext {
  userId: string;
  email: string | null;
  role: AdminRole;
  permissions: string[];
  accountCode: number;
  idleTimeoutMinutes: number;
  currentAal: AuthenticatorLevel | null;
  allowedIps: string[];
}

interface StaffRow {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  allowed_ips: string[] | null;
  idle_timeout_minutes: number;
}

interface ProfileRow {
  account_code: number;
  status: 'active' | 'temporarily_blocked' | 'blocked';
  blocked_until: string | null;
}

interface PermissionRow {
  permission: string;
}

interface PermissionOverrideRow {
  permission: string;
  granted: boolean;
}

interface JwtPayload {
  aal?: unknown;
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

function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') && header.length > 7
    ? header.slice(7)
    : null;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

export function getJwtAuthenticatorLevel(
  authorizationHeader: string | null,
): AuthenticatorLevel | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
    return parsed.aal === 'aal1' || parsed.aal === 'aal2'
      ? parsed.aal
      : null;
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || null;
}

function normalizeIp(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
  return trimmed.replace(/\/(?:32|128)$/, '');
}

export function isClientIpAllowed(
  clientIp: string | null,
  allowedIps: readonly string[] | null,
): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  if (!clientIp) return false;
  const normalizedClient = normalizeIp(clientIp);
  return allowedIps.some((allowed) => normalizeIp(allowed) === normalizedClient);
}

export function mergePermissions(
  rolePermissions: readonly string[],
  overrides: readonly PermissionOverrideRow[],
): string[] {
  const permissions = new Set(rolePermissions);
  for (const override of overrides) {
    if (override.granted) permissions.add(override.permission);
    else permissions.delete(override.permission);
  }
  return [...permissions].sort();
}

function isProfileBlocked(profile: ProfileRow): boolean {
  if (profile.status === 'blocked') return true;
  if (profile.status !== 'temporarily_blocked') return false;
  if (!profile.blocked_until) return true;
  return new Date(profile.blocked_until).getTime() > Date.now();
}

async function loadPermissions(
  admin: SupabaseClient,
  userId: string,
  role: AdminRole,
): Promise<string[]> {
  const [roleResult, overrideResult] = await Promise.all([
    admin
      .from('admin_role_permissions')
      .select('permission')
      .eq('role', role),
    admin
      .from('admin_staff_permissions')
      .select('permission, granted')
      .eq('user_id', userId),
  ]);

  if (roleResult.error || overrideResult.error) {
    console.error(
      '[admin-auth] permission lookup failed',
      roleResult.error?.message ?? overrideResult.error?.message,
    );
    throw new AdminAuthError(500, 'permission_lookup_failed');
  }

  const rolePermissions = ((roleResult.data ?? []) as PermissionRow[])
    .map((row) => row.permission);
  const overrides = (overrideResult.data ?? []) as PermissionOverrideRow[];
  return mergePermissions(rolePermissions, overrides);
}

async function loadStaffContext(
  admin: SupabaseClient,
  user: AuthedUser,
  currentAal: AuthenticatorLevel | null,
  clientIp: string | null,
): Promise<AdminStaffContext> {
  const [staffResult, profileResult] = await Promise.all([
    admin
      .from('admin_staff')
      .select('user_id, role, is_active, allowed_ips, idle_timeout_minutes')
      .eq('user_id', user.id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('account_code, status, blocked_until')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (staffResult.error || profileResult.error) {
    console.error(
      '[admin-auth] staff lookup failed',
      staffResult.error?.message ?? profileResult.error?.message,
    );
    throw new AdminAuthError(500, 'staff_lookup_failed');
  }

  const staff = staffResult.data as StaffRow | null;
  const profile = profileResult.data as ProfileRow | null;
  if (!staff || !staff.is_active) {
    throw new AdminAuthError(403, 'not_admin_staff');
  }
  if (!profile) {
    throw new AdminAuthError(403, 'profile_missing');
  }
  if (isProfileBlocked(profile)) {
    throw new AdminAuthError(403, 'account_blocked');
  }

  const allowedIps = staff.allowed_ips ?? [];
  if (!isClientIpAllowed(clientIp, allowedIps)) {
    throw new AdminAuthError(403, 'ip_not_allowed');
  }

  const permissions = await loadPermissions(admin, user.id, staff.role);
  return {
    userId: user.id,
    email: user.email,
    role: staff.role,
    permissions,
    accountCode: profile.account_code,
    idleTimeoutMinutes: staff.idle_timeout_minutes,
    currentAal,
    allowedIps,
  };
}

export async function requireAdminRequest(
  req: Request,
  options: {
    requireAal2?: boolean;
    permission?: string;
  } = {},
): Promise<{ admin: SupabaseClient; context: AdminStaffContext }> {
  const token = tokenFromRequest(req);
  if (!token) throw new AdminAuthError(401, 'unauthorized');

  const userClient = createUserClient(req.headers.get('Authorization'));
  const user = await getUserFromRequest(req, userClient);
  if (!user) throw new AdminAuthError(401, 'unauthorized');

  const currentAal = getJwtAuthenticatorLevel(
    req.headers.get('Authorization'),
  );
  const admin = createAdminClient();
  const context = await loadStaffContext(
    admin,
    user,
    currentAal,
    getClientIp(req),
  );

  if (options.requireAal2 !== false && currentAal !== 'aal2') {
    throw new AdminAuthError(403, 'mfa_required');
  }
  if (
    options.permission &&
    !context.permissions.includes(options.permission)
  ) {
    throw new AdminAuthError(403, 'permission_denied');
  }

  return { admin, context };
}

export async function writeAdminAudit(
  admin: SupabaseClient,
  req: Request,
  context: AdminStaffContext,
  entry: {
    action: string;
    permission?: string;
    targetType?: string;
    targetId?: string;
    outcome?: 'success' | 'denied' | 'failed';
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const userAgent = req.headers
    .get('user-agent')
    ?.replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 500) ?? null;

  const { error } = await admin.from('admin_audit_log').insert({
    actor_user_id: context.userId,
    actor_fingerprint: `user:${context.userId}`,
    action: entry.action,
    permission: entry.permission ?? null,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    outcome: entry.outcome ?? 'success',
    details: entry.details ?? {},
    ip: getClientIp(req),
    user_agent: userAgent,
  });

  if (error) {
    console.error('[admin-audit] insert failed:', error.message);
  }
}


import { queryOne } from "../_shared/db";
import type { AuthUser } from "../_shared/auth";
import type { AdminStaffContext } from "../_shared/admin";
import { corsHeaders } from "../_shared/cors";
import { validateAdminEntity } from "../_shared/admin-contracts";
export async function staffSession(
  ctx: AdminStaffContext,
  user?: Pick<AuthUser, "email" | "authLevel"> | null,
) {
  user = user ?? ctx.user;
  const profile = await queryOne(
    `SELECT account_code FROM public.profiles WHERE user_id = $1`,
    [ctx.userId],
  );
  return {
    user_id: ctx.userId,
    email: user?.email ?? null,
    role: ctx.role,
    permissions: ctx.permissions,
    account_code: Number(profile?.account_code || 0),
    idle_timeout_minutes: ctx.idleTimeoutMinutes ?? 30,
    current_aal: user?.authLevel || "normal",
    ip_restricted: Boolean(ctx.allowedIps?.length),
  };
}

export async function handleSession(ctx: AdminStaffContext, user: AuthUser) {
  return ok({
    staff: await staffSession(ctx, user),
    mfa_required: user.authLevel !== "mfa",
  });
}

export function listMeta(page: number, limit: number, total: number, q = "") {
  return { page, limit, total, has_more: page * limit < total, query: q };
}

export function ok(data: any, status = 200) {
  data = validateAdminEntity(JSON.parse(JSON.stringify(data)));
  return {
    statusCode: status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export function unauthorized() {
  return {
    statusCode: 401,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "Unauthorized" }),
  };
}

export function forbidden() {
  return {
    statusCode: 403,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "Forbidden" }),
  };
}

export function mfaRequired() {
  return {
    statusCode: 403,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ error: "mfa_required" }),
  };
}

export function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function notFound() {
  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ error: "Not found" }),
  };
}

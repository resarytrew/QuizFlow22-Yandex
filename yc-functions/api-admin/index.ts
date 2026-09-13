import { handleSession, notFound, unauthorized } from "./responses";
import {
  handlePromocodeCreate,
  handlePromocodeToggle,
  handlePromocodeDelete,
  handleUpdateUser,
  handleBlockUser,
  handleUserStatus,
  handleModerateQuiz,
  handleSupportReply,
  handleSupportUpdateStatus,
  handleReportUpdate,
  handleGrantPro,
} from "./mutations";
import {
  handleStats,
  handleDashboard,
  handleOverview,
  handleListUsers,
  handleListQuizzes,
  handleListSupport,
  handleListReports,
  handleFinances,
  handleAuditLog,
  handlePromocodes,
} from "./read-models";
import { MutationSchemas } from "../_shared/admin-contracts";
import { randomUUID } from "node:crypto";
import { ADMIN_ROUTES } from "../_shared/admin-policy";
import { verifyAuth, type AuthUser } from "../_shared/auth";
import { withTransaction } from "../_shared/db";
import { corsHeaders, handleCors } from "../_shared/cors";
import {
  requireAdminStaff,
  hasPermission,
  recordAdminFailure,
  AdminAuthError,
  type AdminStaffContext,
} from "../_shared/admin";

async function dispatchAdmin(event: any) {
  const { httpMethod, headers, body, pathParameters } = event;

  if (httpMethod === "OPTIONS") return handleCors(event);

  if (httpMethod !== "GET" && httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: "Method not allowed",
    };
  }

  const requestId = randomUUID();
  let auditContext: AdminStaffContext | undefined;
  try {
    const user = await verifyAuth(event);
    if (!user) return unauthorized();

    auditContext = {
      userId: user.id,
      role: "support",
      permissions: [],
      requestId,
    };
    const ctx = await requireAdminStaff(
      user.id,
      user,
      event.requestContext?.http?.sourceIp ||
        event.requestContext?.identity?.sourceIp,
    );

    auditContext = ctx;
    ctx.requestId = requestId;
    const action = pathParameters?.action || "";
    const permission = ADMIN_ROUTES[`${httpMethod} ${action}`];
    ctx.permission = permission;
    if (!permission) return notFound();
    if (!hasPermission(ctx, "admin.access") || !hasPermission(ctx, permission))
      throw new AdminAuthError(403, "permission_denied");
    const ip =
      event.requestContext?.http?.sourceIp ||
      event.requestContext?.identity?.sourceIp ||
      null;
    const userAgent = event.headers?.["user-agent"]?.slice(0, 500) || null;

    if (httpMethod === "GET") {
      switch (pathParameters?.action) {
        case "session":
          return await handleSession(ctx, user);
        case "overview":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleOverview(ctx);
        case "stats":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleStats(ctx);
        case "dashboard":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleDashboard(ctx);
        case "users":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleListUsers(event, ctx);
        case "quizzes":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleListQuizzes(event, ctx);
        case "support":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleListSupport(event, ctx);
        case "reports":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleListReports(event, ctx);
        case "finances":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleFinances(event, ctx);
        case "promocodes":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handlePromocodes(event, ctx);
        case "audit":
          if (!isMfaSatisfied(user))
            throw new AdminAuthError(403, "mfa_required");
          return await handleAuditLog(event);
        default:
          return notFound();
      }
    }

    if (httpMethod === "POST") {
      if (!isMfaSatisfied(user)) throw new AdminAuthError(403, "mfa_required");

      const schema =
        MutationSchemas[action === "support/reply" ? "support-reply" : action];
      if (schema && !schema.safeParse(JSON.parse(body || "{}")).success)
        throw new AdminAuthError(400, "invalid_request");
      const perform = async () => {
        switch (pathParameters?.action) {
          case "update-user":
            return await handleUpdateUser(body, ctx, ip, userAgent);
          case "user-status":
            return await handleUserStatus(body, ctx, ip, userAgent);
          case "block-user":
            return await handleBlockUser(body, ctx, ip, userAgent);
          case "moderate-quiz":
          case "quiz-moderation":
            return await handleModerateQuiz(body, ctx, ip, userAgent);
          case "support/reply":
          case "support-reply":
            return await handleSupportReply(body, ctx, ip, userAgent);
          case "support/update-status":
          case "support-status":
            return await handleSupportUpdateStatus(body, ctx, ip, userAgent);
          case "reports/update":
          case "report-status":
            return await handleReportUpdate(body, ctx, ip, userAgent);
          case "grant-pro":
            return await handleGrantPro(body, ctx, ip, userAgent);
          case "promocode-create":
            return await handlePromocodeCreate(body, ctx, ip, userAgent);
          case "promocode-toggle":
            return await handlePromocodeToggle(body, ctx, ip, userAgent);
          case "promocode-delete":
            return await handlePromocodeDelete(event, ctx, ip, userAgent);
          default:
            return notFound();
        }
      };
      return await withTransaction(async () => {
        const result = await perform();
        if (result.statusCode >= 400)
          throw new AdminAuthError(
            result.statusCode,
            JSON.parse(result.body).error,
          );
        return {
          ...result,
          headers: { ...result.headers, "X-Request-ID": requestId },
        };
      });
    }

    return notFound();
  } catch (error) {
    const dbCode = (error as { code?: string }).code;
    const status =
      error instanceof AdminAuthError
        ? error.status
        : error instanceof SyntaxError ||
            ["22P02", "23514", "22007"].includes(dbCode || "")
          ? 400
          : ["23505", "23503"].includes(dbCode || "")
            ? 409
            : (error as { status?: number }).status || 500;
    const code =
      error instanceof AdminAuthError
        ? error.code
        : status === 400
          ? "invalid_request"
          : status === 409
            ? "conflict_or_entity_in_use"
            : (error as { code?: string }).code === "account_blocked"
              ? "account_blocked"
              : "internal_error";
    if (auditContext)
      await recordAdminFailure(auditContext, code, status < 500);
    console.error(
      JSON.stringify({ event: "admin_error", request_id: requestId, code }),
    );
    return {
      statusCode: status,
      headers: { ...corsHeaders(), "X-Request-ID": requestId },
      body: JSON.stringify({ error: code, request_id: requestId }),
    };
  }
}

function isMfaSatisfied(user: AuthUser): boolean {
  return user.authLevel === "mfa";
}

export async function handler(event: Parameters<typeof dispatchAdmin>[0]) {
  const response = await dispatchAdmin(event);
  const headers: Record<string, string> = response.headers;
  const id = headers["X-Request-ID"] || randomUUID();
  return {
    ...response,
    headers: {
      ...response.headers,
      "X-Request-ID": id,
      "Cache-Control": "no-store",
    },
  };
}

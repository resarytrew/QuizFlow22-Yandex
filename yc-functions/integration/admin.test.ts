import { handler as serviceGrantHandler } from "../billing-admin-grant-pro";
import { handler as redeemHandler } from "../billing-redeem-promo";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getPool, query, queryOne } from "../_shared/db";
import { handler } from "../api-admin";
import { handler as supportHandler } from "../api-support";
import { handler as quizHandler } from "../api-quizzes";
import { handler as billingHandler } from "../api-billing";
import { createSession, elevateCurrentSession } from "../_shared/session";
import { grantPro } from "../_shared/grant-pro";
import { ROLE_PERMISSIONS, ADMIN_ROUTES } from "../_shared/admin-policy";
import { requireAdminStaff } from "../_shared/admin";

if (process.env.PG_DATABASE !== "quizflow_admin_test")
  throw new Error(
    "Integration tests require isolated PG_DATABASE=quizflow_admin_test",
  );
process.env.SESSION_PEPPER = "integration-session-pepper";
process.env.PG_DISABLE_SSL = "true";
const users: Record<string, string> = {},
  cookies: Record<string, string> = {};
const event = (
  role: string,
  method: string,
  action: string,
  payload?: unknown,
  params: Record<string, string> = {},
) => ({
  httpMethod: method,
  headers: { cookie: cookies[role] },
  pathParameters: { action },
  body: JSON.stringify(payload || {}),
  queryStringParameters: params,
  requestContext: { http: { sourceIp: "127.0.0.1" } },
});
const call = async (
  role: string,
  method: string,
  action: string,
  payload?: unknown,
  params?: Record<string, string>,
) => {
  const result = await handler(event(role, method, action, payload, params));
  return { status: result.statusCode, data: JSON.parse(result.body) };
};
let quizId: string, ticketId: string, reportId: string;
beforeAll(async () => {
  await query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  for (const file of [
    "../yc_migration.sql",
    "migrations/003_quizflow_auth.sql",
    "migrations/004_admin_stabilization.sql",
  ])
    await query(readFileSync(file, "utf8"));
  // Upgrade is rerunnable without losing rows or overwriting overrides.
  await query(readFileSync("migrations/004_admin_stabilization.sql", "utf8"));
  for (const role of ["owner", "admin", "moderator", "support", "user"]) {
    const id = randomUUID();
    users[role] = id;
    await query("INSERT INTO public.users(id,email) VALUES($1,$2)", [
      id,
      role + "@test.invalid",
    ]);
    await query(
      "INSERT INTO public.profiles(user_id,account_code) VALUES($1,$2)",
      [id, String(100000 + Object.keys(users).length)],
    );
    if (role !== "user")
      await query(
        "INSERT INTO public.admin_staff(user_id,role) VALUES($1,$2)",
        [id, role],
      );
    const raw = await createSession(id, {});
    cookies[role] = "qf_session=" + raw;
    await elevateCurrentSession({ headers: { cookie: cookies[role] } });
  }
  quizId = (await queryOne(
    "INSERT INTO public.quizzes(user_id,name) VALUES($1,'Integration quiz') RETURNING id",
    [users.user],
  ))!.id;
  ticketId = (await queryOne(
    "INSERT INTO public.support_tickets(user_id,subject,message) VALUES($1,'Integration support','First question') RETURNING id",
    [users.user],
  ))!.id;
  reportId = (await queryOne(
    "INSERT INTO public.quiz_reports(quiz_id,reporter_user_id,reason) VALUES($1,$2,'other') RETURNING id",
    [quizId, users.user],
  ))!.id;
}, 30000);
afterAll(async () => {
  await getPool().end();
});

describe("admin PostgreSQL contracts", () => {
  it("seeds the exact shared role matrix", async () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const rows = await query(
        "SELECT permission FROM public.admin_role_permissions WHERE role=$1",
        [role],
      );
      expect(rows.map((x) => x.permission).sort()).toEqual(
        [...permissions].sort(),
      );
    }
  });
  it("denies every ungranted route and alias before mutations or input validation", async () => {
    for (const role of ["moderator", "support"])
      for (const [route, permission] of Object.entries(ADMIN_ROUTES)) {
        if (
          (
            ROLE_PERMISSIONS[
              role as "moderator" | "support"
            ] as readonly string[]
          ).includes(permission)
        )
          continue;
        const [method, action] = route.split(" ");
        const result = await call(role, method, action, {});
        expect(result.status, role + " " + route).toBe(403);
      }
  });
  it("applies explicit permission overrides and inactive staff", async () => {
    await query(
      "INSERT INTO public.admin_staff_permissions(user_id,permission,granted) VALUES($1,'billing.grant',false)",
      [users.admin],
    );
    expect((await call("admin", "POST", "grant-pro", {})).status).toBe(403);
    await query("DELETE FROM public.admin_staff_permissions WHERE user_id=$1", [
      users.admin,
    ]);
    await query(
      "UPDATE public.admin_staff SET is_active=false WHERE user_id=$1",
      [users.support],
    );
    expect((await call("support", "GET", "support")).status).toBe(403);
    await query(
      "UPDATE public.admin_staff SET is_active=true WHERE user_id=$1",
      [users.support],
    );
  });
  it("requires MFA except session and enforces trusted IP and idle expiry", async () => {
    await query(
      "UPDATE public.auth_sessions SET mfa_verified_at=NULL WHERE user_id=$1",
      [users.admin],
    );
    expect((await call("admin", "GET", "session")).status).toBe(200);
    expect((await call("admin", "GET", "users")).data.error).toBe(
      "mfa_required",
    );
    await elevateCurrentSession({ headers: { cookie: cookies.admin } });
    await query(
      "UPDATE public.admin_staff SET allowed_ips=ARRAY['10.0.0.0/8'] WHERE user_id=$1",
      [users.admin],
    );
    const forged = event("admin", "GET", "users");
    forged.headers = {
      ...forged.headers,
      "x-forwarded-for": "10.0.0.1",
    } as typeof forged.headers;
    expect((await handler(forged)).statusCode).toBe(403);
    await query(
      "UPDATE public.admin_staff SET allowed_ips=NULL WHERE user_id=$1",
      [users.admin],
    );
    await query(
      "UPDATE public.auth_sessions SET admin_last_seen_at=now()-interval '1 hour' WHERE user_id=$1",
      [users.admin],
    );
    expect((await call("admin", "GET", "users")).data.error).toBe(
      "admin_session_expired",
    );
    await query(
      "UPDATE public.auth_sessions SET admin_last_seen_at=NULL WHERE user_id=$1",
      [users.admin],
    );
  });
  it("returns complete quiz DTO and the same state on reload", async () => {
    const result = await call("moderator", "POST", "quiz-moderation", {
      quiz_id: quizId,
      moderation_status: "approved",
    });
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data.quiz.id).toBe(quizId);
    const list = await call("moderator", "GET", "quizzes");
    expect(list.data.quizzes[0]).toMatchObject(result.data.quiz);
    expect(
      (
        await call("moderator", "POST", "moderate-quiz", {
          quiz_id: randomUUID(),
          moderation_status: "approved",
        })
      ).status,
    ).toBe(404);
  });
  it("rolls back a mutation when audit insertion fails", async () => {
    await query(
      "ALTER TABLE public.admin_audit_log ADD CONSTRAINT integration_reject_success CHECK(action <> 'moderate_quiz') NOT VALID",
    );
    expect(
      (
        await call("moderator", "POST", "quiz-moderation", {
          quiz_id: quizId,
          moderation_status: "blocked",
        })
      ).status,
    ).toBe(500);
    expect(
      (await queryOne(
        "SELECT moderation_status FROM public.quizzes WHERE id=$1",
        [quizId],
      ))!.moderation_status,
    ).toBe("approved");
    await query(
      "ALTER TABLE public.admin_audit_log DROP CONSTRAINT integration_reject_success",
    );
  });
  it("persists support status, private notes and history without leaking notes", async () => {
    let result = await call("support", "POST", "support-status", {
      ticket_id: ticketId,
      status: "in_progress",
      internal_note: "private staff note",
    });
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data.ticket.internal_note).toBe("private staff note");
    result = await call("support", "POST", "support-reply", {
      ticket_id: ticketId,
      body: "Reply from support",
    });
    expect(result.status, JSON.stringify(result.data)).toBe(200);
    expect(result.data.ticket.status).toBe("waiting_user");
    expect(result.data.ticket.messages[0].sender_kind).toBe("staff");
    const reload = await call("support", "GET", "support");
    expect(reload.data.tickets[0].messages).toHaveLength(1);
    const userList = await supportHandler(event("user", "GET", ""));
    expect(userList.body).not.toContain("private staff note");
    const userReply = await supportHandler({
      ...event("user", "POST", "", { body: "User response" }),
      pathParameters: { ticketId },
    });
    expect(userReply.statusCode).toBe(201);
    expect(
      (await queryOne("SELECT status FROM public.support_tickets WHERE id=$1", [
        ticketId,
      ]))!.status,
    ).toBe("in_progress");
    result = await call("support", "POST", "support-status", {
      ticket_id: ticketId,
      status: "closed",
      resolution: "Done",
    });
    expect(result.data.ticket.closed_at).toBeTruthy();
    expect(
      (
        await call("support", "POST", "support-reply", {
          ticket_id: ticketId,
          body: "Late reply",
        })
      ).status,
    ).toBe(409);
    result = await call("support", "POST", "support-status", {
      ticket_id: ticketId,
      status: "new",
    });
    expect(result.data.ticket.closed_at).toBeNull();
  });
  it("persists report resolution and clears the completion date when reopened", async () => {
    const done = await call("moderator", "POST", "report-status", {
      report_id: reportId,
      status: "closed",
      resolution: "Reviewed",
    });
    expect(done.status, JSON.stringify(done.data)).toBe(200);
    expect(done.data.report.resolved_at).toBeTruthy();
    const open = await call("moderator", "POST", "reports/update", {
      report_id: reportId,
      status: "reviewing",
    });
    expect(open.data.report.resolved_at).toBeNull();
  });
  it("grants once under concurrency, rolls back with audit and preserves paid subscription fields", async () => {
    const actor = await requireAdminStaff(users.owner);
    const sub = await queryOne(
      "INSERT INTO public.subscriptions(user_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end,payment_method_id) VALUES($1,'pro_monthly','active',now(),now()+interval '30 days',true,'test-method') RETURNING *",
      [users.user],
    );
    const body = {
      user_id: users.user,
      days: 30,
      idempotency_key: randomUUID(),
    };
    const [a, b] = await Promise.all([
      grantPro(body, actor, null, null),
      grantPro(body, actor, null, null),
    ]);
    expect(a).toEqual(b);
    expect(Date.parse(a.valid_until)).toBeGreaterThan(
      Date.now() + 59 * 86400000,
    );
    expect(
      await queryOne("SELECT * FROM public.subscriptions WHERE id=$1", [
        sub!.id,
      ]),
    ).toEqual(sub);
    await expect(
      grantPro({ ...body, days: 31 }, actor, null, null),
    ).rejects.toMatchObject({ status: 409 });
    const before = await queryOne(
      "SELECT * FROM public.entitlements WHERE user_id=$1",
      [users.user],
    );
    await query(
      "ALTER TABLE public.admin_audit_log ADD CONSTRAINT integration_reject_grant CHECK(action <> 'grant_pro') NOT VALID",
    );
    await expect(
      grantPro({ ...body, idempotency_key: randomUUID() }, actor, null, null),
    ).rejects.toThrow();
    expect(
      await queryOne("SELECT * FROM public.entitlements WHERE user_id=$1", [
        users.user,
      ]),
    ).toEqual(before);
    await query(
      "ALTER TABLE public.admin_audit_log DROP CONSTRAINT integration_reject_grant",
    );
    await query(
      "UPDATE public.subscriptions SET status='expired',current_period_start=now()-interval '31 days',current_period_end=now()-interval '1 second' WHERE id=$1",
      [sub!.id],
    );
    await query("SELECT public.refresh_effective_entitlement($1)", [
      users.user,
    ]);
    expect(
      (await queryOne("SELECT * FROM public.entitlements WHERE user_id=$1", [
        users.user,
      ]))!.plan,
    ).toBe("pro");
  });
  it("blocks work immediately but permits support and cancellation, including temporary expiry", async () => {
    expect(
      (
        await call("admin", "POST", "user-status", {
          user_id: users.user,
          status: "blocked",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await quizHandler({
          ...event("user", "POST", "", { name: "Denied" }),
          pathParameters: {},
        })
      ).statusCode,
    ).toBe(403);
    expect((await supportHandler(event("user", "GET", ""))).statusCode).toBe(
      200,
    );
    expect(
      (await billingHandler(event("user", "POST", "get-entitlement")))
        .statusCode,
    ).toBe(200);
    expect(
      (await billingHandler(event("user", "POST", "cancel-subscription")))
        .statusCode,
    ).not.toBe(403);
    await query(
      "UPDATE public.profiles SET status='temporarily_blocked',blocked_until=now()-interval '1 second' WHERE user_id=$1",
      [users.user],
    );
    expect(
      (await quizHandler({ ...event("user", "GET", ""), pathParameters: {} }))
        .statusCode,
    ).toBe(200);
  });
  it("uses identical finance filters for rows, totals and revenue", async () => {
    for (const [status, amount] of [
      ["succeeded", 1000],
      ["refunded", 200],
      ["pending", 900],
    ] as const)
      await query(
        "INSERT INTO public.payments(user_id,plan_id,status,amount_kopecks,description) VALUES($1,$2,$3,$4,$5)",
        [users.user, "pro_monthly", status, amount, "integration-finance"],
      );
    const all = await call("admin", "GET", "finances", undefined, {
      q: "integration-finance",
      limit: "1",
    });
    expect(all.data.meta.total).toBe(3);
    expect(all.data.payments).toHaveLength(1);
    expect(all.data.metrics).toMatchObject({
      revenue_kopecks: 1200,
      refunds_kopecks: 200,
      net_revenue_kopecks: 1000,
    });
    const refund = await call("admin", "GET", "finances", undefined, {
      status: "refunded",
    });
    expect(refund.data.meta.total).toBe(1);
    expect(refund.data.payments[0].status).toBe("refunded");
  });
  it("keeps staff MFA/email in compatibility responses and validates promocodes", async () => {
    const list = await call("admin", "GET", "users");
    expect(list.data.staff).toMatchObject({
      email: "admin@test.invalid",
      current_aal: "mfa",
    });
    expect(
      (
        await call("admin", "POST", "promocode-create", {
          code: "TEST",
          plan_id: "pro_monthly",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call("admin", "POST", "promocode-toggle", {
          code: "TEST",
          is_active: false,
        })
      ).data.promocode.is_active,
    ).toBe(false);
    expect(
      (await call("admin", "POST", "promocode-delete", {}, { code: "TEST" }))
        .status,
    ).toBe(200);
  });
  it("shares the grant transaction with the service endpoint and preserves grants when redeeming a promo", async () => {
    process.env.BILLING_ADMIN_SECRET = "integration-admin-secret";
    const request = {
      httpMethod: "POST",
      headers: { "x-admin-secret": "integration-admin-secret" },
      body: JSON.stringify({
        user_id: users.user,
        days: 30,
        idempotency_key: randomUUID(),
      }),
    };
    const first = await serviceGrantHandler(request),
      second = await serviceGrantHandler(request);
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual(JSON.parse(second.body));
    const until = JSON.parse(first.body).valid_until;
    await query(
      "INSERT INTO public.promo_codes(code,plan_id,max_uses) VALUES('REDEEM-TEST','pro_monthly',1)",
    );
    const redeemed = await redeemHandler(
      event("user", "POST", "", { code: "REDEEM-TEST" }),
    );
    expect(redeemed.statusCode, redeemed.body).toBe(200);
    expect(
      Date.parse(JSON.parse(redeemed.body).grant.valid_until),
    ).toBeGreaterThan(Date.parse(until));
    expect(
      (await redeemHandler(event("user", "POST", "", { code: "REDEEM-TEST" })))
        .statusCode,
    ).toBe(400);
    expect(
      (await queryOne(
        "SELECT used_count FROM public.promo_codes WHERE code='REDEEM-TEST'",
      ))!.used_count,
    ).toBe(1);
  });
  it("does not expose finance or audit through support dashboard aliases", async () => {
    expect(
      (await call("support", "GET", "dashboard")).data.revenue_30d_kopecks,
    ).toBeNull();
    expect(
      (await call("support", "GET", "overview")).data.recent_actions,
    ).toEqual([]);
    expect((await call("user", "GET", "users")).status).toBe(403);
  });
});

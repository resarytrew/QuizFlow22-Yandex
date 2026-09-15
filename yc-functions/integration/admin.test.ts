import { applyConfirmedPayment } from "../_shared/payment-application";
import { handler as serviceGrantHandler } from "../billing-admin-grant-pro";
import { handler as redeemHandler } from "../billing-redeem-promo";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
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
    "migrations/005_admin_workspace.sql",
    "migrations/006_gallery_moderation.sql",
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

describe("administrative workspace", () => {
  it("shows billing only to permitted staff and accepts missing profiles", async () => {
    const id = randomUUID();
    await query("INSERT INTO public.users(id,email) VALUES($1,$2)", [
      id,
      id + "@test.invalid",
    ]);
    const admin = await call("owner", "GET", "user-workspace", undefined, {
      user_id: id,
    });
    expect(admin.status).toBe(200);
    expect(admin.data.workspace.account.missing_profile).toBe(true);
    const moderator = await call(
      "moderator",
      "GET",
      "user-workspace",
      undefined,
      { user_id: id },
    );
    expect(moderator.data.workspace.access).toBeNull();
    expect(moderator.data.workspace.payments).toEqual([]);
    expect((await call("owner", "GET", "attention")).status).toBe(200);
  });
  it("applies a confirmed payment once under concurrency and keeps manual access", async () => {
    const id = randomUUID(),
      paymentId = randomUUID(),
      providerId = randomUUID();
    await query("INSERT INTO public.users(id,email) VALUES($1,$2)", [
      id,
      id + "@test.invalid",
    ]);
    await query(
      "INSERT INTO public.payments(id,user_id,plan_id,amount_kopecks,provider_payment_id) VALUES($1,$2,'pro_monthly',39900,$3)",
      [paymentId, id, providerId],
    );
    const provider = {
      id: providerId,
      status: "succeeded" as const,
      paid: true,
      amount: { value: "399.00", currency: "RUB" as const },
      metadata: { user_id: id, plan_id: "pro_monthly" },
    };
    await expect(
      applyConfirmedPayment(
        paymentId,
        { ...provider, amount: { value: "1.00", currency: "RUB" } },
        "test",
      ),
    ).rejects.toThrow("payment_mismatch");
    await expect(
      applyConfirmedPayment(
        paymentId,
        { ...provider, refunded_amount: { value: "399.00", currency: "RUB" } },
        "test",
      ),
    ).rejects.toThrow("payment_not_confirmed");
    const manual = await grantPro(
      { user_id: id, days: 90, idempotency_key: randomUUID() },
      await requireAdminStaff(users.owner),
      null,
      null,
    );
    const results = await Promise.all([
      applyConfirmedPayment(paymentId, provider, "test"),
      applyConfirmedPayment(paymentId, provider, "test"),
    ]);
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect(
      new Date(
        (await queryOne(
          "SELECT valid_until FROM public.entitlements WHERE user_id=$1",
          [id],
        ))!.valid_until,
      ).toISOString(),
    ).toBe(manual.valid_until);
    expect(
      (
        await queryOne(
          "SELECT count(*)::int AS n FROM public.payment_applications WHERE payment_id=$1",
          [paymentId],
        )
      )?.n,
    ).toBe(1);
    expect(
      (
        await queryOne(
          "SELECT plan FROM public.entitlements WHERE user_id=$1",
          [id],
        )
      )?.plan,
    ).toBe("pro");
  });
  it("keeps notes private and assigns a ticket", async () => {
    const note = await call("support", "POST", "support-note", {
      ticket_id: ticketId,
      body: "Private investigation",
    });
    expect(note.status).toBe(200);
    const assign = await call("support", "POST", "support-assign", {
      ticket_id: ticketId,
      user_id: users.support,
    });
    expect(assign.status).toBe(200);
    expect(
      (
        await queryOne(
          "SELECT assigned_to FROM public.support_tickets WHERE id=$1",
          [ticketId],
        )
      )?.assigned_to,
    ).toBe(users.support);
    const workspace = await call(
      "support",
      "GET",
      "user-workspace",
      undefined,
      { user_id: users.user },
    );
    expect(workspace.status).toBe(200);
    expect(
      workspace.data.workspace.notes.some(
        (n: { body: string }) => n.body === "Private investigation",
      ),
    ).toBe(true);
  });
});

describe("payment recovery and support compensation", () => {
  it("checks provider status and rolls back recovery when audit fails", async () => {
    const id = randomUUID(),
      paymentId = randomUUID(),
      providerId = randomUUID();
    await query("INSERT INTO public.users(id,email) VALUES($1,$2)", [
      id,
      id + "@test.invalid",
    ]);
    await query(
      "INSERT INTO public.payments(id,user_id,plan_id,amount_kopecks,provider_payment_id) VALUES($1,$2,'pro_monthly',39900,$3)",
      [paymentId, id, providerId],
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            id: providerId,
            status: "succeeded",
            paid: true,
            amount: { value: "399.00", currency: "RUB" },
            metadata: { user_id: id },
          }),
        }),
    );
    try {
      const check = await call("owner", "POST", "payment-check", {
        payment_id: paymentId,
      });
      expect(check.status).toBe(200);
      expect(check.data.result.provider_status).toBe("succeeded");
      expect(
        (
          await queryOne("SELECT status FROM public.payments WHERE id=$1", [
            paymentId,
          ])
        )?.status,
      ).toBe("pending");
      await query(
        "CREATE FUNCTION public.fail_recovery_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='payment-restore' THEN RAISE EXCEPTION 'test'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_recovery_audit BEFORE INSERT ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION public.fail_recovery_audit()",
      );
      try {
        expect(
          (
            await call("owner", "POST", "payment-restore", {
              payment_id: paymentId,
            })
          ).status,
        ).toBe(500);
      } finally {
        await query(
          "DROP TRIGGER fail_recovery_audit ON public.admin_audit_log; DROP FUNCTION public.fail_recovery_audit()",
        );
      }
      expect(
        (
          await queryOne(
            "SELECT count(*)::int AS n FROM public.payment_applications WHERE payment_id=$1",
            [paymentId],
          )
        )?.n,
      ).toBe(0);
      expect(
        (
          await queryOne("SELECT status FROM public.payments WHERE id=$1", [
            paymentId,
          ])
        )?.status,
      ).toBe("pending");
      expect(
        (
          await call("owner", "POST", "payment-restore", {
            payment_id: paymentId,
          })
        ).data.result.applied,
      ).toBe(true);
      expect(
        (
          await call("owner", "POST", "payment-restore", {
            payment_id: paymentId,
          })
        ).data.result.already_applied,
      ).toBe(true);
      expect(
        (
          await call("support", "POST", "payment-restore", {
            payment_id: paymentId,
          })
        ).status,
      ).toBe(403);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("issues a restricted one-use promo with repeat protection", async () => {
    const body = {
      ticket_id: ticketId,
      days: 17,
      body: "Incident compensation",
      idempotency_key: randomUUID(),
    };
    const first = await call("owner", "POST", "support-promo", body);
    expect(first.status, JSON.stringify(first.data)).toBe(200);
    expect(
      (await call("owner", "POST", "support-promo", body)).data.result.code,
    ).toBe(first.data.result.code);
    expect(
      (await call("owner", "POST", "support-promo", { ...body, days: 18 }))
        .status,
    ).toBe(409);
    const wrong = await redeemHandler(
      event("admin", "POST", "", { code: first.data.result.code }),
    );
    expect(wrong.statusCode).toBe(400);
    const right = await redeemHandler(
      event("user", "POST", "", { code: first.data.result.code }),
    );
    expect(right.statusCode).toBe(200);
    expect(
      (
        await redeemHandler(
          event("user", "POST", "", { code: first.data.result.code }),
        )
      ).statusCode,
    ).toBe(400);
    const userTickets = await supportHandler(event("user", "GET", ""));
    expect(userTickets.body).not.toContain("Private investigation");
    expect((await call("support", "GET", "support-staff")).status).toBe(200);
    expect(
      (
        await call("support", "GET", "support", undefined, {
          mine: "true",
          unanswered: "true",
        })
      ).status,
    ).toBe(200);
  });
});

it("retries failed webhooks and grants only after capture", async () => {
  const id = randomUUID(),
    paymentId = randomUUID(),
    providerId = randomUUID();
  await query("INSERT INTO public.users(id,email) VALUES($1,$2)", [
    id,
    id + "@test.invalid",
  ]);
  await query(
    "INSERT INTO public.payments(id,user_id,plan_id,amount_kopecks,provider_payment_id,save_payment_method) VALUES($1,$2,'pro_monthly',39900,$3,true)",
    [paymentId, id, providerId],
  );
  const payment = {
    id: providerId,
    status: "waiting_for_capture",
    paid: true,
    amount: { value: "399.00", currency: "RUB" },
    payment_method: { id: "saved-test", saved: true },
  };
  const mock = vi
    .fn()
    .mockRejectedValueOnce(new Error("test offline"))
    .mockImplementation(async () => ({ ok: true, json: async () => payment }));
  vi.stubGlobal("fetch", mock);
  const notify = (kind: string) =>
    billingHandler(
      event("user", "POST", "yookassa-webhook", {
        type: "notification",
        event: kind,
        object: { id: providerId },
      }),
    );
  try {
    expect((await notify("payment.succeeded")).statusCode).toBe(500);
    expect((await notify("payment.waiting_for_capture")).statusCode).toBe(200);
    expect(
      await queryOne("SELECT id FROM public.subscriptions WHERE user_id=$1", [
        id,
      ]),
    ).toBeNull();
    payment.status = "succeeded";
    expect((await notify("payment.succeeded")).statusCode).toBe(200);
    expect((await notify("payment.succeeded")).statusCode).toBe(200);
    expect(
      (
        await queryOne(
          "SELECT count(*)::int AS n FROM public.payment_applications WHERE payment_id=$1",
          [paymentId],
        )
      )?.n,
    ).toBe(1);
    const sub = await queryOne(
      "SELECT payment_method_id,cancel_at_period_end FROM public.subscriptions WHERE user_id=$1",
      [id],
    );
    expect(sub?.payment_method_id).toBe("saved-test");
    expect(sub?.cancel_at_period_end).toBe(false);
    expect(
      (
        await queryOne(
          "SELECT error FROM public.webhook_events WHERE external_id=$1",
          [providerId],
        )
      )?.error,
    ).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('serves compact gallery cards while preserving complete quiz detail',async()=>{
 const huge={nodes:[{id:'q',type:'questionNode',data:{question:'Q',payload:'x'.repeat(1200000)}}],edges:[],description:'Gallery test',templateId:'classic',keywords:['test']};
 const quiz=await queryOne("INSERT INTO public.quizzes(user_id,name,visibility,quiz_data,moderation_status) VALUES($1,'Large gallery test','public',$2,'approved') RETURNING id",[users.user,JSON.stringify(huge)]);
 await call('owner','POST','quiz-moderation',{quiz_id:quiz!.id,moderation_status:'approved'});
 const listing=await quizHandler(event('user','GET','',undefined,{public:'true',summary:'true'}));
 expect(listing.statusCode).toBe(200);expect(Buffer.byteLength(listing.body)).toBeLessThan(100000);
 const card=JSON.parse(listing.body).find((q:{id:string})=>q.id===quiz!.id);
 expect(card.is_summary).toBe(true);expect(card.question_count).toBe(1);expect(card.quiz_data.nodes).toEqual([]);expect(card.quiz_data.description).toBe('Gallery test');
 const detail=await quizHandler({...event('user','GET',''),pathParameters:{id:quiz!.id}});
 expect(JSON.parse(detail.body).quiz_data).toEqual(huge);
});

it('requires admin approval before any gallery exposure, including after edits and copies', async () => {
  const create = await quizHandler(event('user', 'POST', '', {
    name: 'Needs moderation', visibility: 'public', moderation_status: 'approved',
    published_at: new Date().toISOString(), is_favorite: true,
    quiz_data: { nodes: [], edges: [], description: 'Original' },
  }));
  expect(create.statusCode).toBe(201);
  const quiz = JSON.parse(create.body);
  expect(quiz.moderation_status).toBe('unreviewed');
  expect(quiz.published_at).toBeNull();
  const listed = async () => {
    for (const summary of ['true', 'false']) {
      const response = await quizHandler(event('user', 'GET', '', undefined, { public: 'true', summary }));
      expect(response.statusCode).toBe(200);
      if (JSON.parse(response.body).some((q: { id: string }) => q.id === quiz.id)) return true;
    }
    return false;
  };
  expect(await listed()).toBe(false);
  for (const status of ['reviewing', 'rejected', 'blocked', 'hidden', 'unreviewed']) {
    expect((await call('owner', 'POST', 'quiz-moderation', { quiz_id: quiz.id, moderation_status: status })).status).toBe(200);
    expect(await listed()).toBe(false);
  }
  const approve = async () => {
    expect((await call('moderator', 'POST', 'quiz-moderation', { quiz_id: quiz.id, moderation_status: 'approved' })).status).toBe(200);
    expect(await listed()).toBe(true);
    const row = await queryOne('SELECT moderated_by, published_at FROM public.quizzes WHERE id=$1', [quiz.id]);
    expect(row!.moderated_by).toBe(users.moderator);
    expect(row!.published_at).not.toBeNull();
  };
  await approve();
  const update = (payload: unknown) => quizHandler({ ...event('user', 'PUT', '', payload), pathParameters: { id: quiz.id } });
  await update({ is_favorite: true });
  expect(await listed()).toBe(true);
  await update({ name: 'Edited after approval', moderation_status: 'approved' });
  expect(await listed()).toBe(false);
  expect((await queryOne('SELECT published_at FROM public.quizzes WHERE id=$1', [quiz.id]))!.published_at).toBeNull();
  await approve();
  await update({ quiz_data: { nodes: [], edges: [], description: 'Changed content' } });
  expect(await listed()).toBe(false);
  const draft = await quizHandler(event('user', 'POST', '', { name: 'New draft' }));
  expect(JSON.parse(draft.body)).toMatchObject({ visibility: 'private', moderation_status: 'unreviewed', published_at: null });
  // Missing legacy moderation values also fail closed.
  await query('UPDATE public.quizzes SET moderation_status=NULL WHERE id=$1', [quiz.id]);
  expect(await listed()).toBe(false);
});

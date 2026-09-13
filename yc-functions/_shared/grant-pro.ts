import { createHash } from "node:crypto";
import { GrantProSchema } from "./admin-contracts";
import { query, queryOne, withTransaction } from "./db";
import {
  AdminAuthError,
  writeAdminAudit,
  type AdminStaffContext,
} from "./admin";

export async function grantPro(
  input: unknown,
  actor: AdminStaffContext,
  ip: string | null,
  userAgent: string | null,
) {
  const parsed = GrantProSchema.safeParse(input);
  if (!parsed.success) throw new AdminAuthError(400, "invalid_grant");
  const body = parsed.data;
  const days = body.days ?? (body.plan === "pro_yearly" ? 365 : 30);
  const plan = body.plan ?? (days >= 300 ? "pro_yearly" : "pro_monthly");
  const payload = {
    user_id: body.user_id,
    days,
    plan,
    reason: body.reason ?? null,
  };
  const actorKey = actor.userId || "service:billing-admin";
  // Legacy callers without a key are deduplicated for the transition release.
  const key =
    body.idempotency_key ??
    createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return withTransaction(async () => {
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      actorKey + ":" + key,
    ]);
    const user = await queryOne(
      "SELECT id FROM public.users WHERE id=$1 FOR UPDATE",
      [body.user_id],
    );
    if (!user) throw new AdminAuthError(404, "user_not_found");
    const prior = await queryOne(
      "SELECT *, request_payload = $3::jsonb AS matches FROM public.admin_pro_grants WHERE actor_key=$1 AND idempotency_key=$2",
      [actorKey, key, JSON.stringify(payload)],
    );
    if (prior) {
      if (!prior.matches) throw new AdminAuthError(409, "idempotency_conflict");
      return {
        user_id: prior.user_id,
        plan: prior.plan_id,
        valid_until: new Date(prior.valid_until).toISOString(),
        reason: prior.reason,
      };
    }
    if (!(await queryOne("SELECT id FROM public.plans WHERE id=$1", [plan])))
      throw new AdminAuthError(400, "plan_not_found");
    const row = await queryOne(
      `INSERT INTO public.admin_pro_grants(user_id,actor_key,idempotency_key,request_payload,plan_id,days,reason,valid_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,GREATEST(now(), (public.get_effective_entitlement($1)->>'valid_until')::timestamptz) + ($6::integer * interval '1 day')) RETURNING valid_until`,
      [
        body.user_id,
        actorKey,
        key,
        JSON.stringify(payload),
        plan,
        days,
        body.reason ?? null,
      ],
    );
    await query("SELECT public.refresh_effective_entitlement($1)", [
      body.user_id,
    ]);
    await writeAdminAudit(actor, {
      action: "grant_pro",
      permission: "billing.grant",
      targetType: "user",
      targetId: body.user_id,
      details: { ...payload, idempotency_key: key },
      ip,
      userAgent,
    });
    return {
      user_id: body.user_id,
      plan,
      valid_until: new Date(row!.valid_until).toISOString(),
      reason: body.reason ?? null,
    };
  });
}

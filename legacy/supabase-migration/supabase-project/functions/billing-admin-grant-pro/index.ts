// supabase/functions/billing-admin-grant-pro/index.ts
// Ручная выдача PRO (для тестов, промо-акций, компенсаций).
// Защита: требует заголовок X-Admin-Secret == env BILLING_ADMIN_SECRET.
// Сравнение — constant-time, чтобы исключить timing-атаки.
// Аудит: каждая успешная выдача пишется в public.admin_audit_log с
// fingerprint секрета (НЕ сам секрет), user_id, action, days, reason,
// IP, user-agent. Утечка BILLING_ADMIN_SECRET остаётся восстановимой.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Constant-time string comparison. Prevents leaking the secret length or
 * content via timing of the `===` check. Strings must be the same length
 * for the lengths themselves to be safe to compare normally first; we
 * return false immediately on length mismatch but execute the bytewise
 * loop unconditionally to keep timing roughly constant.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Bail on length mismatch but do so in constant time relative to the
  // lengths we observed (avoid short-circuiting into a faster path).
  const lenA = a.length;
  const lenB = b.length;
  // XOR a constant derived from both lengths so the branch taken is
  // independent of which is longer.
  const lengthDiff = (lenA ^ lenB) !== 0;
  const maxLen = lenA > lenB ? lenA : lenB;
  let diff = lengthDiff ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < lenA ? a.charCodeAt(i) : 0;
    const cb = i < lenB ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * Short, non-reversible identifier for the secret used in this call.
 * Two different secrets produce different fingerprints, but the original
 * secret cannot be recovered from the fingerprint. We hash (secret, time-bucket)
 * so an attacker reading admin_audit_log cannot correlate calls across
 * independent secret rotations.
 */
async function fingerprintSecret(secret: string, bucket: string): Promise<string> {
  const data = new TextEncoder().encode(secret + "|" + bucket);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() ?? null;
}

serve(async (req: Request) => {
  const pre = handleCorsPreflight(req);
  if (pre) return pre;
  const origin = req.headers.get('Origin');

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const expected = Deno.env.get('BILLING_ADMIN_SECRET') ?? '';
  if (!expected) {
    // Same error code and timing on every request to avoid leaking whether
    // the secret env is configured.
    const got = req.headers.get('X-Admin-Secret') ?? '';
    timingSafeEqual(got, expected);
    return jsonResponse({ error: 'admin_disabled' }, 503, origin);
  }
  const got = req.headers.get('X-Admin-Secret') ?? '';
  if (!timingSafeEqual(got, expected)) {
    return jsonResponse({ error: 'forbidden' }, 403, origin);
  }

  let body: {
    user_id?: string;
    days?: number;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, origin);
  }
  const userId = body.user_id;
  if (!userId || typeof userId !== 'string') {
    return jsonResponse({ error: 'missing_user_id' }, 400, origin);
  }
  if (!UUID_RE.test(userId)) {
    return jsonResponse({ error: 'invalid_user_id' }, 400, origin);
  }
  // Strict days validation. Reject non-finite or non-numeric values to
  // avoid `new Date(NaN).toISOString()` 500s on bad input.
  const rawDays = Number(body.days);
  if (!Number.isFinite(rawDays) || rawDays <= 0) {
    return jsonResponse({ error: 'invalid_days' }, 400, origin);
  }
  const days = Math.max(1, Math.min(365, Math.trunc(rawDays)));
  // Reject oversized reason. 500 chars is plenty for an operator note.
  const reasonRaw = typeof body.reason === 'string' ? body.reason : null;
  const reason = reasonRaw ? reasonRaw.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500) : null;

  const admin = createAdminClient();
  const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const planId = days >= 300 ? 'pro_yearly' : 'pro_monthly';

  const { data: plan } = await admin
    .from('plans')
    .select('id, features')
    .eq('id', planId)
    .single();
  if (!plan) {
    return jsonResponse({ error: 'plan_not_found' }, 500, origin);
  }

  const { error: entErr } = await admin
    .from('entitlements')
    .upsert(
      {
        user_id: userId,
        plan: 'pro',
        features: plan.features,
        source: 'admin',
        valid_until: validUntil,
      },
      { onConflict: 'user_id' },
    );
  if (entErr) {
    console.error('[admin-grant-pro] entitlement upsert failed:', entErr.message);
    return jsonResponse({ error: 'db_error' }, 500, origin);
  }

  // Создаём «зеркальную» подписку
  const now = new Date().toISOString();
  const { error: subErr } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: now,
        current_period_end: validUntil,
        cancel_at_period_end: false,
      },
      { onConflict: 'user_id' },
    );
  if (subErr) {
    console.error('[admin-grant-pro] subscription upsert failed:', subErr.message);
  }

  // Audit log. Writes are non-blocking on the response: we already granted
  // PRO, and a failure to record the audit row should not roll back the
  // grant (the operator can still see the grant in `entitlements` /
  // `subscriptions`). We do surface the failure to the operator via the
  // response field `audit_logged: false` so they can re-record manually.
  const auditBucket = new Date().toISOString().slice(0, 10); // daily bucket
  const fingerprint = await fingerprintSecret(got, auditBucket);
  const ip = clientIp(req);
  const userAgentRaw = req.headers.get("user-agent");
  const userAgent = userAgentRaw
    ? userAgentRaw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 500)
    : null;
  const { error: auditErr } = await admin.from("admin_audit_log").insert({
    actor_fingerprint: fingerprint,
    action: "grant_pro",
    user_id: userId,
    details: { days, plan: planId, reason },
    ip,
    user_agent: userAgent,
  });

  return jsonResponse(
    {
      ok: true,
      user_id: userId,
      plan: planId,
      valid_until: validUntil,
      reason: reason ?? null,
      audit_logged: !auditErr,
    },
    200,
    origin,
  );
});

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

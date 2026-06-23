// supabase/functions/csp-report/index.ts
//
// Endpoint for browser-sent Content-Security-Policy violation reports.
// Stores reports in public.csp_reports for periodic review.
//
// The endpoint accepts both application/csp-report and
// application/reports+json (the newer Reporting API).
//
// Defenses:
//   * 32 KB body cap (prevents single-request DoS).
//   * Per-IP per-minute rate limit (10/min) via csp_rate_limit_check RPC
//     (prevents an attacker from filling csp_reports with junk).
//   * user_agent truncated to 500 chars and control chars stripped
//     (avoids log-injection and oversized rows).
//   * CORS preflight handled (legacy Content-Type: application/csp-report
//     and application/reports+json both trigger CORS preflight; without
//     it, cross-origin browsers silently drop the report). Allow-list
//     defaults to permissive (`*`) because the endpoint is anonymous
//     and the browser does not need to authenticate to send a violation
//     report — operators who want to lock it down can set
//     BILLING_ALLOWED_ORIGINS / AI_PROXY_ALLOWED_ORIGINS.
//   * No authentication: browsers submit CSP reports automatically and
//     cannot carry custom headers. The rate limit is the gate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Hard cap on stored report size to avoid filling the DB with junk.
const MAX_BODY_BYTES = 32 * 1024;
const MAX_USER_AGENT_CHARS = 500;
const RATE_LIMIT_PER_MINUTE = 10;

function serve(handler: (req: Request) => Promise<Response>) {
  return Deno.serve(handler);
}

// Strip control chars (CR/LF/NUL/TAB) and clamp to MAX_USER_AGENT_CHARS.
// This prevents log-injection and oversized rows.
function sanitizeUserAgent(raw: string | null): string | null {
  if (!raw) return null;
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x1f\x7f]/g, "").slice(0, MAX_USER_AGENT_CHARS) || null;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  // CORS preflight (legacy Content-Type triggers preflight).
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Per-IP per-minute rate limit. Returns false if the IP is over the cap.
  // Fail-open if the RPC is unreachable: better to store a few extra reports
  // than to drop legitimate violations during a Supabase hiccup. The body
  // cap above is the harder ceiling.
  try {
    const ip = clientIp(req);
    const { data: allowed, error: rlErr } = await supabase.rpc(
      "csp_rate_limit_check",
      { p_ip: ip, p_limit: RATE_LIMIT_PER_MINUTE },
    );
    if (rlErr) {
      console.warn("[csp-report] rate-limit RPC error:", rlErr.message);
    } else if (allowed === false) {
      return new Response("Too many requests", {
        status: 429,
        headers: corsHeaders(origin),
      });
    }
  } catch (e) {
    console.warn("[csp-report] rate-limit check failed:", e instanceof Error ? e.message : e);
  }

  // Don't bother parsing if it's clearly too large.
  const cl = Number(req.headers.get("content-length") ?? "0");
  if (cl > MAX_BODY_BYTES) {
    return new Response("Payload too large", {
      status: 413,
      headers: corsHeaders(origin),
    });
  }

  let raw = "";
  try {
    raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response("Payload too large", {
        status: 413,
        headers: corsHeaders(origin),
      });
    }
  } catch {
    return new Response("Bad request", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  // The browser sends a JSON body. Wrap it as-is into the table.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { unparseable: raw.slice(0, MAX_BODY_BYTES) };
  }

  // Fire-and-forget. The browser doesn't care about the response body
  // for CSP reports — it's a best-effort notification channel.
  const userAgent = sanitizeUserAgent(req.headers.get("user-agent"));
  // Don't await — return 204 quickly so the browser stops retrying.
  supabase
    .from("csp_reports")
    .insert({ report: parsed as unknown as object, user_agent: userAgent })
    .then(({ error }) => {
      if (error) console.warn("[csp-report] insert failed:", error.message);
    });

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
});

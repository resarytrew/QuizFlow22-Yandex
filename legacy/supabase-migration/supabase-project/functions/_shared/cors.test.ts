// supabase/functions/_shared/cors.test.ts
//
// Unit tests for the unified CORS helpers in _shared/cors.ts.
// Covers allow-list logic, `*` wildcard, credentials header, jsonResponse
// shape, and handleCorsPreflight dispatch.
//
// We use a small env-snapshot pattern so each test starts from a known
// state (BILLING_ALLOWED_ORIGINS unset) and restores the previous value
// in the `finally` block. This means tests can run in any order and
// the rest of the suite sees the same env it had before.
//
// Run with:
//   deno test --allow-read supabase/functions/_shared/cors.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { corsHeaders, handleCorsPreflight, jsonResponse } from "./cors.ts";

function snapshotEnv(): { admin: string | null; billing: string | null; ai: string | null } {
  const snap = {
    admin: Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? null,
    billing: Deno.env.get("BILLING_ALLOWED_ORIGINS") ?? null,
    ai: Deno.env.get("AI_PROXY_ALLOWED_ORIGINS") ?? null,
  };
  Deno.env.delete("ADMIN_ALLOWED_ORIGINS");
  return snap;
}

function restoreEnv(snap: { admin: string | null; billing: string | null; ai: string | null }) {
  if (snap.admin === null) Deno.env.delete("ADMIN_ALLOWED_ORIGINS");
  else Deno.env.set("ADMIN_ALLOWED_ORIGINS", snap.admin);
  if (snap.billing === null) Deno.env.delete("BILLING_ALLOWED_ORIGINS");
  else Deno.env.set("BILLING_ALLOWED_ORIGINS", snap.billing);
  if (snap.ai === null) Deno.env.delete("AI_PROXY_ALLOWED_ORIGINS");
  else Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", snap.ai);
}

Deno.test("corsHeaders — empty allow-list, origin null → no Allow-Origin header", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.delete("BILLING_ALLOWED_ORIGINS");
    Deno.env.delete("AI_PROXY_ALLOWED_ORIGINS");
    const h = corsHeaders(null);
    assertEquals(h["Access-Control-Allow-Origin"], undefined);
    // Vary: Origin MUST be present so caches don't accidentally serve
    // the wrong Access-Control-Allow-Origin to a different origin.
    assertEquals(h["Vary"], "Origin");
    // The methods/headers are always present (the preflight response
    // shape is independent of the allow-list).
    assertEquals(
      h["Access-Control-Allow-Methods"],
      "GET, POST, OPTIONS, DELETE",
    );
    assertExists(h["Access-Control-Allow-Headers"]);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — empty allow-list, origin set → no Allow-Origin header", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.delete("BILLING_ALLOWED_ORIGINS");
    Deno.env.delete("AI_PROXY_ALLOWED_ORIGINS");
    const h = corsHeaders("https://app.mykviz.ru");
    assertEquals(h["Access-Control-Allow-Origin"], undefined);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — `*` wildcard, any origin → Allow-Origin reflects origin", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const h = corsHeaders("https://anywhere.example");
    assertEquals(h["Access-Control-Allow-Origin"], "https://anywhere.example");
    // No credentials with `*` (CORS spec forbids the combination).
    assertEquals(h["Access-Control-Allow-Credentials"], undefined);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — `*` wildcard, origin null → Allow-Origin is literal `*`", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const h = corsHeaders(null);
    assertEquals(h["Access-Control-Allow-Origin"], "*");
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — explicit allow-list, matching origin → Allow-Origin = origin + credentials", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set(
      "BILLING_ALLOWED_ORIGINS",
      "https://app.mykviz.ru,https://staging.mykviz.ru",
    );
    const h = corsHeaders("https://app.mykviz.ru");
    assertEquals(h["Access-Control-Allow-Origin"], "https://app.mykviz.ru");
    // Credentials are safe to send when reflecting a specific origin
    // (NOT a wildcard). The browser uses this to decide whether to
    // expose cookies / Authorization headers.
    assertEquals(h["Access-Control-Allow-Credentials"], "true");
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — explicit allow-list, non-matching origin → no Allow-Origin", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.mykviz.ru");
    const h = corsHeaders("https://evil.com");
    assertEquals(h["Access-Control-Allow-Origin"], undefined);
    assertEquals(h["Access-Control-Allow-Credentials"], undefined);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — falls back to AI_PROXY_ALLOWED_ORIGINS when BILLING unset", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.delete("BILLING_ALLOWED_ORIGINS");
    Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", "https://ai.example.com");
    const h = corsHeaders("https://ai.example.com");
    assertEquals(h["Access-Control-Allow-Origin"], "https://ai.example.com");
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders - ADMIN_ALLOWED_ORIGINS takes precedence over app fallbacks", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("ADMIN_ALLOWED_ORIGINS", "https://admin.example.com");
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://billing.example.com");
    Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", "https://ai.example.com");
    const h = corsHeaders("https://admin.example.com");
    assertEquals(h["Access-Control-Allow-Origin"], "https://admin.example.com");
    const h2 = corsHeaders("https://billing.example.com");
    assertEquals(h2["Access-Control-Allow-Origin"], undefined);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — BILLING_ALLOWED_ORIGINS takes precedence over AI_PROXY_…", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://billing.example.com");
    Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", "https://ai.example.com");
    // AI origin would have been allowed by AI_PROXY_… but BILLING takes
    // precedence and the AI origin is NOT in that list.
    const h = corsHeaders("https://ai.example.com");
    assertEquals(h["Access-Control-Allow-Origin"], undefined);
    // Billing origin IS allowed.
    const h2 = corsHeaders("https://billing.example.com");
    assertEquals(h2["Access-Control-Allow-Origin"], "https://billing.example.com");
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("corsHeaders — empty string in allow-list is filtered out", () => {
  const snap = snapshotEnv();
  try {
    // Trailing comma + whitespace = an empty entry. The helper
    // trims+filters so an empty entry does not accidentally allow
    // every origin.
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://a.com, ,https://b.com,");
    const h = corsHeaders("");
    assertEquals(h["Access-Control-Allow-Origin"], undefined);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("jsonResponse — serializes body as JSON, sets Content-Type, merges CORS + extra", async () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.example.com");
    const res = jsonResponse({ hello: "world" }, 200, "https://app.example.com", { "X-Test": "1" });
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "application/json; charset=utf-8");
    assertEquals(res.headers.get("X-Test"), "1");
    assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://app.example.com");
    assertEquals(await res.json(), { hello: "world" });
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("jsonResponse — extra headers win over default CORS when keys collide", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    // Caller can override Access-Control-Allow-Origin by passing it in
    // `extra`. This is intentional — some endpoints need a custom
    // value (e.g. for Vary-based caching).
    const res = jsonResponse(null, 200, null, {
      "Access-Control-Allow-Origin": "https://override.example",
    });
    assertEquals(
      res.headers.get("Access-Control-Allow-Origin"),
      "https://override.example",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("handleCorsPreflight — OPTIONS → 204 with CORS headers", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.mykviz.ru");
    const req = new Request("https://functions.example/save-quiz-result", {
      method: "OPTIONS",
      headers: { Origin: "https://app.mykviz.ru" },
    });
    const res = handleCorsPreflight(req);
    assertExists(res);
    assertEquals(res!.status, 204);
    assertEquals(
      res!.headers.get("Access-Control-Allow-Origin"),
      "https://app.mykviz.ru",
    );
    assertExists(res!.headers.get("Access-Control-Allow-Methods"));
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("handleCorsPreflight — non-OPTIONS → returns null (no preflight handling)", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const req = new Request("https://functions.example/x", { method: "POST" });
    const res = handleCorsPreflight(req);
    assertEquals(res, null);
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("handleCorsPreflight — OPTIONS with non-allowed origin → no Allow-Origin header", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.mykviz.ru");
    const req = new Request("https://functions.example/x", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.com" },
    });
    const res = handleCorsPreflight(req);
    assertExists(res);
    assertEquals(res!.status, 204);
    assertEquals(res!.headers.get("Access-Control-Allow-Origin"), null);
  } finally {
    restoreEnv(snap);
  }
});

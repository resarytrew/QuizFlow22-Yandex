// supabase/functions/billing-create-checkout/index.test.ts
//
// Unit tests for the open-redirect guards in billing-create-checkout:
//
//   - safeReturnPath(p): validates a `returnPath` payload from the
//     client so that a malicious caller cannot construct a return URL
//     pointing to an attacker-controlled host (open-redirect / phishing
//     via YooKassa confirmation_url).
//   - resolveAllowedSiteOrigin(req, originHeader): validates the
//     request `Origin` against the BILLING_ALLOWED_ORIGINS /
//     AI_PROXY_ALLOWED_ORIGINS env-driven allow-list so the same open-
//     redirect attack cannot succeed via the host portion of the
//     return URL.
//
// Both helpers are pure functions and tested in isolation. The full
// `serve` handler is intentionally not unit-tested here — it depends on
// createUserClient/createAdminClient which would require env setup +
// HTTP stubbing. The end-to-end happy path is covered by the deployed
// environment + manual smoke tests.
//
// Run with:
//   deno test --allow-read --allow-env supabase/functions/billing-create-checkout/index.test.ts

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { resolveAllowedSiteOrigin, safeReturnPath } from "./index.ts";

// ---------------------------------------------------------------------------
// safeReturnPath — happy paths
// ---------------------------------------------------------------------------

Deno.test("safeReturnPath — /billing/return is allowed", () => {
  assertEquals(safeReturnPath("/billing/return"), "/billing/return");
});

Deno.test("safeReturnPath — /billing/return?foo=bar is allowed (query string)", () => {
  assertEquals(safeReturnPath("/billing/return?foo=bar"), "/billing/return?foo=bar");
});

Deno.test("safeReturnPath — /billing/return#section is allowed (fragment)", () => {
  // Fragments are fine because the return URL is `${origin}/#${path}` —
  // i.e. the path becomes the hash part of the site URL. A malicious
  // fragment like `#/evil` would still be a same-site redirect.
  assertEquals(safeReturnPath("/billing/return#section"), "/billing/return#section");
});

Deno.test("safeReturnPath — nested path /foo/bar is allowed", () => {
  assertEquals(safeReturnPath("/foo/bar"), "/foo/bar");
});

Deno.test("safeReturnPath — root / is allowed", () => {
  assertEquals(safeReturnPath("/"), "/");
});

Deno.test("safeReturnPath — percent-encoded chars are allowed", () => {
  assertEquals(safeReturnPath("/path%20with%20space"), "/path%20with%20space");
});

// ---------------------------------------------------------------------------
// safeReturnPath — rejected inputs
// ---------------------------------------------------------------------------

Deno.test("safeReturnPath — null → null", () => {
  assertEquals(safeReturnPath(null), null);
});

Deno.test("safeReturnPath — undefined → null", () => {
  assertEquals(safeReturnPath(undefined), null);
});

Deno.test("safeReturnPath — empty string → null", () => {
  assertEquals(safeReturnPath(""), null);
});

Deno.test("safeReturnPath — non-string input (number) → null", () => {
  assertEquals(safeReturnPath(42), null);
});

Deno.test("safeReturnPath — non-string input (object) → null", () => {
  assertEquals(safeReturnPath({ evil: true }), null);
});

Deno.test("safeReturnPath — relative path (no leading slash) → null", () => {
  assertEquals(safeReturnPath("billing/return"), null);
  assertEquals(safeReturnPath("evil.com/path"), null);
});

Deno.test("safeReturnPath — protocol-relative //evil.com → null", () => {
  // The check is `startsWith('//')` — the most classic open-redirect
  // pattern (//evil.com/foo is interpreted as a protocol-relative
  // URL by the browser).
  assertEquals(safeReturnPath("//evil.com/foo"), null);
});

Deno.test("safeReturnPath — absolute URL http://evil.com → null", () => {
  assertEquals(safeReturnPath("http://evil.com"), null);
  assertEquals(safeReturnPath("https://evil.com"), null);
});

Deno.test("safeReturnPath — javascript: URL → null", () => {
  // Doesn't start with '/' anyway, but worth a test for defense in depth.
  assertEquals(safeReturnPath("javascript:alert(1)"), null);
});

Deno.test("safeReturnPath — CRLF in path → null (header injection)", () => {
  // The check is /[\r\n\\]/. Header injection would let an attacker
  // split headers via CRLF in the URL.
  assertEquals(safeReturnPath("/foo\r\nLocation: evil.com"), null);
  assertEquals(safeReturnPath("/foo\nLocation: evil.com"), null);
  assertEquals(safeReturnPath("/foo\rLocation: evil.com"), null);
});

Deno.test("safeReturnPath — backslash variants → null", () => {
  // Browsers normalize \ to / in some contexts; a backslash trick like
  // "/\\evil.com" can be interpreted as "//evil.com" by certain
  // parsers. Reject it.
  assertEquals(safeReturnPath("/\\evil.com"), null);
  assertEquals(safeReturnPath("/\\/evil.com"), null);
  assertEquals(safeReturnPath("/\\\\evil.com\\foo"), null);
});

Deno.test("safeReturnPath — non-ASCII chars → null", () => {
  // The regex /^[\x20-\x7E/]+$/ only allows printable ASCII + '/'.
  // Cyrillic / emoji would fail.
  assertEquals(safeReturnPath("/billing/возврат"), null);
  assertEquals(safeReturnPath("/billing/🎉"), null);
  assertEquals(safeReturnPath("/café"), null);
});

Deno.test("safeReturnPath — overlong path (>200 chars) → null", () => {
  // DoS guard — a multi-MB returnPath in a JWT-encoded return URL would
  // bloat the YooKassa confirmation_url.
  const p = "/" + "a".repeat(200);
  assertEquals(safeReturnPath(p), null);
});

Deno.test("safeReturnPath — path with tab character → null", () => {
  // Tab is 0x09, which is inside the 0x20-0x7E range... wait no,
  // 0x09 < 0x20, so the printable-ASCII regex would reject it. ✓
  assertEquals(safeReturnPath("/foo\tbar"), null);
});

Deno.test("safeReturnPath — control character in path → null", () => {
  assertEquals(safeReturnPath("/foo\x00bar"), null); // null byte
  assertEquals(safeReturnPath("/foo\x07bar"), null); // bell
});

// ---------------------------------------------------------------------------
// resolveAllowedSiteOrigin — env-driven allow-list
// ---------------------------------------------------------------------------

Deno.test("resolveAllowedSiteOrigin — empty allow-list + Origin header → null", () => {
  // No env var set, no explicit allow-list — refuse rather than
  // constructing a return URL with arbitrary Origin. This is the
  // "fail closed" default.
  const snap = snapshotEnv();
  try {
    Deno.env.delete("BILLING_ALLOWED_ORIGINS");
    Deno.env.delete("AI_PROXY_ALLOWED_ORIGINS");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://app.example.com"),
      null,
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — explicit allow-list, matching Origin → Origin", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.example.com");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://app.example.com"),
      "https://app.example.com",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — explicit allow-list, non-matching Origin → null", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://app.example.com");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://evil.com"),
      null,
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — wildcard '*' + valid https Origin → Origin", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://anywhere.example.com"),
      "https://anywhere.example.com",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — wildcard '*' + null Origin → null", () => {
  // Wildcard only reflects valid http(s) origins; if the caller didn't
  // send an Origin, we can't construct a return URL.
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, null),
      null,
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — wildcard '*' + non-http(s) Origin → null", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "*");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "javascript:alert(1)"),
      null,
    );
    assertEquals(
      resolveAllowedSiteOrigin(req, "file:///etc/passwd"),
      null,
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — multi-entry allow-list, partial match → null", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set(
      "BILLING_ALLOWED_ORIGINS",
      "https://a.example.com,https://b.example.com",
    );
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://c.example.com"),
      null,
    );
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://a.example.com"),
      "https://a.example.com",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — falls back to AI_PROXY_ALLOWED_ORIGINS", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.delete("BILLING_ALLOWED_ORIGINS");
    Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", "https://app.example.com");
    const req = new Request("https://example.com/");
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://app.example.com"),
      "https://app.example.com",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — BILLING takes precedence over AI_PROXY", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "https://billing-allowed.example.com");
    Deno.env.set("AI_PROXY_ALLOWED_ORIGINS", "https://ai-allowed.example.com");
    const req = new Request("https://example.com/");
    // AI origin should NOT be accepted (it's not in BILLING list).
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://ai-allowed.example.com"),
      null,
    );
    // Billing origin IS accepted.
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://billing-allowed.example.com"),
      "https://billing-allowed.example.com",
    );
  } finally {
    restoreEnv(snap);
  }
});

Deno.test("resolveAllowedSiteOrigin — whitespace-only entries are filtered", () => {
  const snap = snapshotEnv();
  try {
    Deno.env.set("BILLING_ALLOWED_ORIGINS", "  ,  ,");
    const req = new Request("https://example.com/");
    // Whitespace-only list → empty list → fail closed.
    assertEquals(
      resolveAllowedSiteOrigin(req, "https://app.example.com"),
      null,
    );
  } finally {
    restoreEnv(snap);
  }
});

// ---------------------------------------------------------------------------
// env snapshot helpers (shared with cors.test.ts)
// ---------------------------------------------------------------------------

function snapshotEnv(): Record<string, string | undefined> {
  return {
    BILLING_ALLOWED_ORIGINS: Deno.env.get("BILLING_ALLOWED_ORIGINS") ?? undefined,
    AI_PROXY_ALLOWED_ORIGINS: Deno.env.get("AI_PROXY_ALLOWED_ORIGINS") ?? undefined,
  };
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  Deno.env.delete("BILLING_ALLOWED_ORIGINS");
  Deno.env.delete("AI_PROXY_ALLOWED_ORIGINS");
  for (const [k, v] of Object.entries(snap)) {
    if (v !== undefined) Deno.env.set(k, v);
  }
}

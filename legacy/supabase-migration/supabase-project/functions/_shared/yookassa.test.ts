// supabase/functions/_shared/yookassa.test.ts
//
// Unit tests for the YooKassa IP-allow-list helper in
// _shared/yookassa.ts. Covers IPv4 literal matches, IPv4 CIDR ranges
// (/27, /25, /32 boundaries), IPv6 literal handling, malformed input
// rejection, and the X-Forwarded-For parsing in getClientIp.
//
// The billing-yookassa-webhook uses isYookassaIp as defense-in-depth
// (layer 2) on top of the shared-secret check (layer 1). A bug here
// would either (a) silently drop legitimate webhooks from YooKassa's
// edge nodes, or (b) let an attacker with a spoofed X-Forwarded-For
// header bypass the IP gate. Both are bad outcomes — the test suite
// is intentionally exhaustive.
//
// Run with:
//   deno test --allow-read supabase/functions/_shared/yookassa.test.ts

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { getClientIp, isYookassaIp } from "./yookassa.ts";

// ---------------------------------------------------------------------------
// isYookassaIp — IPv4 literal entries in the allow-list
// ---------------------------------------------------------------------------

Deno.test("isYookassaIp — exact IPv4 literal match (77.75.156.11)", () => {
  assertEquals(isYookassaIp("77.75.156.11"), true);
});

Deno.test("isYookassaIp — exact IPv4 literal match (77.75.156.35)", () => {
  assertEquals(isYookassaIp("77.75.156.35"), true);
});

Deno.test("isYookassaIp — exact IPv4 literal (77.75.154.72)", () => {
  assertEquals(isYookassaIp("77.75.154.72"), true);
});

Deno.test("isYookassaIp — IPv4 literal miss (close but not in list)", () => {
  assertEquals(isYookassaIp("77.75.156.10"), false);
  assertEquals(isYookassaIp("77.75.156.12"), false);
  assertEquals(isYookassaIp("77.75.156.99"), false);
});

// ---------------------------------------------------------------------------
// isYookassaIp — IPv4 CIDR ranges
// ---------------------------------------------------------------------------

Deno.test("isYookassaIp — /27 range first address (185.71.76.0)", () => {
  // 185.71.76.0/27 covers 185.71.76.0..185.71.76.31
  assertEquals(isYookassaIp("185.71.76.0"), true);
});

Deno.test("isYookassaIp — /27 range last address (185.71.76.31)", () => {
  assertEquals(isYookassaIp("185.71.76.31"), true);
});

Deno.test("isYookassaIp — /27 range middle (185.71.76.15)", () => {
  assertEquals(isYookassaIp("185.71.76.15"), true);
});

Deno.test("isYookassaIp — /27 range out of range (185.71.76.32)", () => {
  assertEquals(isYookassaIp("185.71.76.32"), false);
});

Deno.test("isYookassaIp — /25 range first address (77.75.153.0)", () => {
  // 77.75.153.0/25 covers 77.75.153.0..77.75.153.127
  assertEquals(isYookassaIp("77.75.153.0"), true);
});

Deno.test("isYookassaIp — /25 range last address (77.75.153.127)", () => {
  assertEquals(isYookassaIp("77.75.153.127"), true);
});

Deno.test("isYookassaIp — /25 range out of range (77.75.153.128)", () => {
  assertEquals(isYookassaIp("77.75.153.128"), false);
});

Deno.test("isYookassaIp — different /27 (185.71.77.x)", () => {
  assertEquals(isYookassaIp("185.71.77.0"), true);
  assertEquals(isYookassaIp("185.71.77.10"), true);
  assertEquals(isYookassaIp("185.71.77.31"), true);
  assertEquals(isYookassaIp("185.71.77.32"), false);
});

// ---------------------------------------------------------------------------
// isYookassaIp — IPv6 (literal-only in MVP)
// ---------------------------------------------------------------------------

Deno.test("isYookassaIp — IPv6 CIDR in allow-list is literal-only (no range match)", () => {
  // The MVP only does literal matching for IPv6 (no CIDR for v6).
  // The 2a02:5180::/32 entry is NOT matched by the code: the code
  // checks `YOOKASSA_IPS.includes(ip)`, so the literal "2a02:5180::/32"
  // is the only thing that would match, not "2a02:5180::1". The
  // helper returns false for individual addresses in the /32.
  // This is a known limitation — IPv6 CIDR support is P1 work.
  assertEquals(isYookassaIp("2a02:5180::1"), false);
  assertEquals(isYookassaIp("2a02:5180::"), false);
});

Deno.test("isYookassaIp — IPv6 out of list (2a02:5181::1)", () => {
  assertEquals(isYookassaIp("2a02:5181::1"), false);
});

Deno.test("isYookassaIp — non-YooKassa IPv6 is rejected", () => {
  assertEquals(isYookassaIp("2001:db8::1"), false);
});

// ---------------------------------------------------------------------------
// isYookassaIp — malformed / edge inputs
// ---------------------------------------------------------------------------

Deno.test("isYookassaIp — null input → false", () => {
  assertEquals(isYookassaIp(null), false);
});

Deno.test("isYookassaIp — empty string → false", () => {
  assertEquals(isYookassaIp(""), false);
});

Deno.test("isYookassaIp — IPv4 with out-of-range octet → false", () => {
  // 256.0.0.0 is not a valid IPv4 (octet > 255).
  assertEquals(isYookassaIp("256.0.0.0"), false);
  assertEquals(isYookassaIp("1.2.3.999"), false);
});

Deno.test("isYookassaIp — IPv4 with too few parts → false", () => {
  assertEquals(isYookassaIp("1.2.3"), false);
  assertEquals(isYookassaIp("1.2"), false);
  assertEquals(isYookassaIp("1"), false);
});

Deno.test("isYookassaIp — IPv4 with non-numeric parts → false", () => {
  assertEquals(isYookassaIp("not.an.ip.addr"), false);
  assertEquals(isYookassaIp("1.2.3.x"), false);
  assertEquals(isYookassaIp("a.b.c.d"), false);
});

Deno.test("isYookassaIp — IPv4 with too many parts → false", () => {
  assertEquals(isYookassaIp("1.2.3.4.5"), false);
});

Deno.test("isYookassaIp — IPv4 with negative number → false", () => {
  assertEquals(isYookassaIp("1.2.3.-1"), false);
});

Deno.test("isYookassaIp — empty parts (1..3) → false", () => {
  // String.split('.') yields ['', '1', '2', '3'] for ".1.2.3" — the
  // first octet is empty → not a valid IP.
  assertEquals(isYookassaIp(".1.2.3"), false);
  assertEquals(isYookassaIp("1.2.3."), false);
});

Deno.test("isYookassaIp — NaN octet (1.2.3.NaN) → false", () => {
  // Number(undefined) === NaN → caught by the range check.
  assertEquals(isYookassaIp("1.2.3.NaN"), false);
});

// ---------------------------------------------------------------------------
// getClientIp — X-Forwarded-For parsing
// ---------------------------------------------------------------------------

Deno.test("getClientIp — first IP in X-Forwarded-For is returned", () => {
  const req = new Request("https://example.com/", {
    headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test("getClientIp — X-Forwarded-For without spaces is also split", () => {
  const req = new Request("https://example.com/", {
    headers: { "x-forwarded-for": "1.2.3.4,5.6.7.8" },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test("getClientIp — single X-Forwarded-For value", () => {
  const req = new Request("https://example.com/", {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test("getClientIp — falls back to X-Real-IP when XFF absent", () => {
  const req = new Request("https://example.com/", {
    headers: { "x-real-ip": "1.2.3.4" },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test("getClientIp — XFF takes precedence over X-Real-IP", () => {
  // In a real proxy chain XFF is the canonical source. X-Real-IP is a
  // fallback used by some setups (e.g. nginx with `set_real_ip_from`).
  // The helper prefers XFF; the operator is expected to configure the
  // proxy to send at most one value in XFF if they want X-Real-IP.
  const req = new Request("https://example.com/", {
    headers: {
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    },
  });
  assertEquals(getClientIp(req), "1.1.1.1");
});

Deno.test("getClientIp — neither header present → null", () => {
  const req = new Request("https://example.com/");
  assertEquals(getClientIp(req), null);
});

Deno.test("getClientIp — empty XFF falls back to X-Real-IP", () => {
  // Empty XFF is treated as absent. The helper does `xff.split(',')[0]`
  // which yields "" for an empty string, but then the `if (xff)` check
  // in the implementation would return null... let me verify.
  // Actually, looking at the source: `if (xff) return xff.split(',')[0].trim();`
  // An empty string is falsy → falls through to x-real-ip. OK.
  const req = new Request("https://example.com/", {
    headers: {
      "x-forwarded-for": "",
      "x-real-ip": "1.2.3.4",
    },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

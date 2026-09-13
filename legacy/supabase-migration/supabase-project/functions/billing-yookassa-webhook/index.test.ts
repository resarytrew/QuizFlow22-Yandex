// supabase/functions/billing-yookassa-webhook/index.test.ts
//
// Unit tests for the 4-layer webhook validation in
// billing-yookassa-webhook. The function takes untrusted input from
// the public internet and must reject every common attack before
// touching the database. The layers:
//
//   1. Shared secret in ?key= (hashed mode preferred, raw fallback
//      for legacy, 503 if neither is configured).
//   2. IP allow-list (defense-in-depth, bypassable via XFF spoofing).
//   3. Body size cap (32 KB, pre-parse via Content-Length + post-read).
//   4. JSON shape (type=notification, event present, object.id set).
//
// All four are unit-tested in isolation. The downstream DB work
// (dedup, processPaymentEvent, atomic grant) requires a Supabase
// stub and is covered by integration / smoke tests.
//
// Run with:
//   deno test --allow-read --allow-env supabase/functions/billing-yookassa-webhook/index.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { validateWebhookRequest } from "./index.ts";

const VALID_PAYLOAD = JSON.stringify({
  type: "notification",
  event: "payment.succeeded",
  object: { id: "pay-123" },
});

// ---------------------------------------------------------------------------
// Layer 1 — shared secret
// ---------------------------------------------------------------------------

Deno.test("validateWebhookRequest — no secret configured → 503 webhook_disabled", async () => {
  const req = new Request("https://example.com/webhook?key=anything", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {});
  assertExists(res);
  assertEquals(res!.ok, false);
  if (res!.ok) return; // TS narrowing
  assertEquals(res!.response.status, 503);
  assertEquals((await res!.response.json()).error, "webhook_disabled");
});

Deno.test("validateWebhookRequest — wrong secret in raw mode → 403 forbidden", async () => {
  const req = new Request("https://example.com/webhook?key=wrong", {
    method: "POST",
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, { webhookSecret: "right-secret" });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 403);
  assertEquals((await res!.response.json()).error, "forbidden");
});

Deno.test("validateWebhookRequest — correct secret in raw mode → ok", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    body: VALID_PAYLOAD,
  });
  // skipIpCheck to bypass layer 2; this test only covers layer 1.
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
    skipIpCheck: true,
  });
  assertEquals(res!.ok, true);
  if (!res!.ok) return;
  assertEquals(res!.externalId, "pay-123");
  assertEquals(res!.payload.event, "payment.succeeded");
});

Deno.test("validateWebhookRequest — wrong secret in hashed mode → 403 forbidden", async () => {
  // Compute SHA-256 of "right-secret" using the same helper the
  // webhook uses (sha256Hex from _shared/crypto.ts). We import it
  // here to keep this test self-contained.
  const { sha256Hex } = await import("../_shared/crypto.ts");
  const rightHash = await sha256Hex("right-secret");
  const req = new Request("https://example.com/webhook?key=wrong", {
    method: "POST",
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecretHash: rightHash,
    skipIpCheck: true,
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 403);
});

Deno.test("validateWebhookRequest — correct secret in hashed mode → ok", async () => {
  const { sha256Hex } = await import("../_shared/crypto.ts");
  const hash = await sha256Hex("the-secret");
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecretHash: hash,
    skipIpCheck: true,
  });
  assertEquals(res!.ok, true);
});

Deno.test("validateWebhookRequest — hashed mode takes precedence over raw", async () => {
  // When both are configured, the hashed mode wins. The raw secret
  // would NOT match a key that hashes to the expected hash. (This is
  // deliberate: it lets operators rotate from raw to hashed without
  // a window where the wrong key matches.)
  const { sha256Hex } = await import("../_shared/crypto.ts");
  const hash = await sha256Hex("hashed-secret");
  const req = new Request("https://example.com/webhook?key=raw-secret", {
    method: "POST",
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "raw-secret", // matches ?key= but hashed mode ignores it
    webhookSecretHash: hash,
    skipIpCheck: true,
  });
  // Hashed mode is on; the key "raw-secret" does NOT hash to the
  // expected hash, so it should be rejected.
  assertEquals(res!.ok, false);
});

// ---------------------------------------------------------------------------
// Layer 2 — IP allow-list
// ---------------------------------------------------------------------------

Deno.test("validateWebhookRequest — IP not in YooKassa allow-list → 403 forbidden_ip", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
    // skipIpCheck: false (default)
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 403);
  assertEquals((await res!.response.json()).error, "forbidden_ip");
});

Deno.test("validateWebhookRequest — IP in YooKassa allow-list → ok", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" }, // literal in list
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, true);
});

Deno.test("validateWebhookRequest — skipIpCheck=true bypasses IP gate", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" }, // definitely not YooKassa
    body: VALID_PAYLOAD,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
    skipIpCheck: true,
  });
  assertEquals(res!.ok, true);
});

// ---------------------------------------------------------------------------
// Layer 3 — body size
// ---------------------------------------------------------------------------

Deno.test("validateWebhookRequest — Content-Length > 32 KB → 413 payload_too_large", async () => {
  // Content-Length lies — we reject before reading. The body itself
  // is empty here; the size cap is based on the header.
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: {
      "x-forwarded-for": "77.75.156.11",
      "content-length": "100000",
    },
    body: "",
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 413);
  assertEquals((await res!.response.json()).error, "payload_too_large");
});

Deno.test("validateWebhookRequest — body length > 32 KB (post-read) → 413", async () => {
  // Adversary lies about Content-Length (or omits it) and the actual
  // body is over 32 KB. The post-read check catches it.
  const big = "a".repeat(40 * 1024);
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: big,
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 413);
});

// ---------------------------------------------------------------------------
// Layer 4 — JSON shape
// ---------------------------------------------------------------------------

Deno.test("validateWebhookRequest — invalid JSON → 400 invalid_json", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: "{not json",
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 400);
  assertEquals((await res!.response.json()).error, "invalid_json");
});

Deno.test("validateWebhookRequest — type !== 'notification' → 400 not_a_notification", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: JSON.stringify({ type: "ping", event: "ping", object: { id: "1" } }),
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 400);
  assertEquals((await res!.response.json()).error, "not_a_notification");
});

Deno.test("validateWebhookRequest — missing event → 400 not_a_notification", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: JSON.stringify({ type: "notification", object: { id: "1" } }),
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 400);
});

Deno.test("validateWebhookRequest — missing object.id → 400 missing_object_id", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: JSON.stringify({ type: "notification", event: "payment.succeeded" }),
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, false);
  if (res!.ok) return;
  assertEquals(res!.response.status, 400);
  assertEquals((await res!.response.json()).error, "missing_object_id");
});

Deno.test("validateWebhookRequest — happy path → ok with parsed payload + externalId", async () => {
  const req = new Request("https://example.com/webhook?key=the-secret", {
    method: "POST",
    headers: { "x-forwarded-for": "77.75.156.11" },
    body: JSON.stringify({
      type: "notification",
      event: "payment.canceled",
      object: { id: "pay-abc-456" },
    }),
  });
  const res = await validateWebhookRequest(req, {
    webhookSecret: "the-secret",
  });
  assertEquals(res!.ok, true);
  if (!res!.ok) return;
  assertEquals(res!.externalId, "pay-abc-456");
  assertEquals(res!.payload.event, "payment.canceled");
  assertEquals(res!.payload.type, "notification");
});


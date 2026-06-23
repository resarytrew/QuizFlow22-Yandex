// supabase/functions/_shared/crypto.test.ts
//
// Unit tests for the cryptographic helpers in _shared/crypto.ts.
// We import the production module directly (rather than re-declaring
// the algorithm) so the test is a real regression test — if the
// production implementation changes, the tests follow.

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  sha256Hex,
  timingSafeEqual,
  verifyHashedSecret,
} from "./crypto.ts";

Deno.test("timingSafeEqual — equal strings pass", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
});

Deno.test("timingSafeEqual — different strings fail", () => {
  assertEquals(timingSafeEqual("abc", "abd"), false);
});

Deno.test("timingSafeEqual — different length fails", () => {
  assertEquals(timingSafeEqual("abc", "abcd"), false);
  assertEquals(timingSafeEqual("abcd", "abc"), false);
});

Deno.test("timingSafeEqual — empty strings equal", () => {
  assertEquals(timingSafeEqual("", ""), true);
});

Deno.test("timingSafeEqual — non-string inputs fail", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(timingSafeEqual(123 as any, "abc"), false);
  // deno-lint-ignore no-explicit-any
  assertEquals(timingSafeEqual("abc", null as any), false);
});

Deno.test("timingSafeEqual — UUID-shaped strings work", () => {
  const u = "550e8400-e29b-41d4-a716-446655440000";
  const u2 = "550e8400-e29b-41d4-a716-446655440000";
  const u3 = "550e8400-e29b-41d4-a716-446655440001";
  assertEquals(timingSafeEqual(u, u2), true);
  assertEquals(timingSafeEqual(u, u3), false);
});

Deno.test("sha256Hex — empty string short-circuits to empty output (by design)", async () => {
  // The function returns "" on empty input rather than the SHA-256 of
  // empty. This is a deliberate guard: callers (verifyHashedSecret)
  // use the empty-output as a "no input" signal and reject the call
  // before doing the compare. Documented in the function comment.
  assertEquals(await sha256Hex(""), "");
});

Deno.test("sha256Hex — known-vector (abc)", async () => {
  // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
  assertEquals(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

Deno.test("sha256Hex — known-vector (longer string)", async () => {
  // SHA-256("The quick brown fox jumps over the lazy dog")
  //   = d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592
  assertEquals(
    await sha256Hex("The quick brown fox jumps over the lazy dog"),
    "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
  );
});

Deno.test("sha256Hex — returns 64 lowercase hex chars", async () => {
  const out = await sha256Hex("any input here");
  assertEquals(out.length, 64);
  assertEquals(out, out.toLowerCase());
  assertExists(out.match(/^[0-9a-f]{64}$/));
});

Deno.test("sha256Hex — different inputs produce different digests", async () => {
  const a = await sha256Hex("alpha");
  const b = await sha256Hex("beta");
  assertEquals(a === b, false);
});

Deno.test("verifyHashedSecret — matches with correct hash", async () => {
  const secret = "test-webhook-secret-2026";
  const hash = await sha256Hex(secret);
  assertEquals(await verifyHashedSecret(secret, hash), true);
});

Deno.test("verifyHashedSecret — rejects wrong secret", async () => {
  const hash = await sha256Hex("real-secret");
  assertEquals(await verifyHashedSecret("wrong-secret", hash), false);
});

Deno.test("verifyHashedSecret — rejects empty provided", async () => {
  const hash = await sha256Hex("any");
  assertEquals(await verifyHashedSecret("", hash), false);
});

Deno.test("verifyHashedSecret — rejects malformed expected hash", async () => {
  assertEquals(await verifyHashedSecret("x", ""), false);
  assertEquals(await verifyHashedSecret("x", "too-short"), false);
  assertEquals(await verifyHashedSecret("x", "Z".repeat(64)), false);
  assertEquals(await verifyHashedSecret("x", "0".repeat(63)), false);
  assertEquals(await verifyHashedSecret("x", "0".repeat(65)), false);
});

Deno.test("verifyHashedSecret — accepts uppercase hex hash (case-insensitive)", async () => {
  const secret = "case-test";
  const hash = await sha256Hex(secret);
  assertEquals(await verifyHashedSecret(secret, hash.toUpperCase()), true);
});

Deno.test("verifyHashedSecret — provides length-constant compare (timing property)", async () => {
  // We can't reliably measure timing in unit tests (CI noise), but we
  // can verify the contract: both digests are 64 chars, so the inner
  // timingSafeEqual always runs 64 iterations regardless of the
  // length of `provided`. This is what we WANT for the security
  // property: a short secret shouldn't be faster to reject than a long
  // one.
  const hash = await sha256Hex("a");
  // Both must return false (wrong secrets) — but the time is bounded
  // by the 64-char compare, not by |provided|.
  assertEquals(await verifyHashedSecret("", hash), false);
  assertEquals(await verifyHashedSecret("a", hash), true);
  assertEquals(await verifyHashedSecret("a".repeat(10000), hash), false);
});

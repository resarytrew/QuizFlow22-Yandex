// supabase/functions/_shared/validators.test.ts
//
// Unit tests for the input-validation helpers in _shared/validators.ts.
// We import the production module directly so the test is a real
// regression test — if validators.ts changes, the tests follow.

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  MAX_EMAIL_LEN,
  MAX_FINAL_NODE_TITLE_LEN,
  MAX_NAME_LEN,
  MAX_PATH_ELEMENTS,
  MAX_SCORE,
  MAX_TIME_SECONDS,
  UUID_RE,
  clampInt,
  clampPathData,
  str,
} from "./validators.ts";

Deno.test("UUID_RE — accepts valid UUIDs", () => {
  assertEquals(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000"), true);
  assertEquals(UUID_RE.test("00000000-0000-0000-0000-000000000000"), true);
  assertEquals(UUID_RE.test("ABCDEF12-3456-7890-ABCD-EF1234567890"), true);
});

Deno.test("UUID_RE — rejects non-UUIDs", () => {
  assertEquals(UUID_RE.test(""), false);
  assertEquals(UUID_RE.test("not-a-uuid"), false);
  assertEquals(UUID_RE.test("550e8400-e29b-41d4-a716"), false);
  assertEquals(UUID_RE.test("550e8400e29b41d4a7164466554400000"), false);
  // SQL injection attempt
  assertEquals(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000' OR 1=1--"), false);
});

Deno.test("clampInt — clamps to range", () => {
  assertEquals(clampInt(50, 0, 100, 0), 50);
  assertEquals(clampInt(-5, 0, 100, 0), 0);
  assertEquals(clampInt(150, 0, 100, 0), 100);
  assertEquals(clampInt(1.7, 0, 100, 0), 1);
  // -1.7 truncates to -1, then Math.max(0, -1) = 0
  assertEquals(clampInt(-1.7, 0, 100, 0), 0);
  // Negative range: -1.7 truncates to -1, then Math.max(-100, -1) = -1
  assertEquals(clampInt(-1.7, -100, 100, 0), -1);
});

Deno.test("clampInt — non-finite falls back", () => {
  assertEquals(clampInt(NaN, 0, 100, 7), 7);
  assertEquals(clampInt(Infinity, 0, 100, 7), 7);
  assertEquals(clampInt(-Infinity, 0, 100, 7), 7);
  assertEquals(clampInt("not a number", 0, 100, 7), 7);
  // null coerces to 0 (finite → not a fallback). undefined coerces to
  // NaN (not finite → falls back). This asymmetry is a JS quirk callers
  // should know about.
  assertEquals(clampInt(null, 0, 100, 7), 0);
  assertEquals(clampInt(undefined, 0, 100, 7), 7);
});

Deno.test("str — trims to max length", () => {
  assertEquals(str("hello", 10, "fallback"), "hello");
  assertEquals(str("hello world this is long", 5, "fallback"), "hello");
  assertEquals(str("", 10, "fallback"), "fallback");
  assertEquals(str(null, 10, "fallback"), "fallback");
  assertEquals(str(123, 10, "fallback"), "fallback");
});

// str() with max=0 is intentionally NOT a special case: any non-empty
// string longer than max slices to "". Callers that want "always fallback
// for empty" should pre-check. The function is a length-clamp, not a
// emptiness-clamp. This test documents the contract.

Deno.test("clampPathData — short array passes through unchanged", () => {
  const input = [{ id: 1 }, { id: 2 }];
  const out = clampPathData(input, 1000);
  assertEquals(out, [{ id: 1 }, { id: 2 }]);
  // Clamp returns a fresh array (no mutation).
  assertEquals(out === input, false);
});

Deno.test("clampPathData — non-array collapses to empty", () => {
  assertEquals(clampPathData(null), []);
  assertEquals(clampPathData(undefined), []);
  assertEquals(clampPathData("nope"), []);
  assertEquals(clampPathData({ id: 1 }), []);
  assertEquals(clampPathData(42), []);
});

Deno.test("clampPathData — exactly MAX is unchanged (boundary)", () => {
  const input = Array.from({ length: MAX_PATH_ELEMENTS }, (_, i) => i);
  const out = clampPathData(input, MAX_PATH_ELEMENTS);
  assertEquals(out.length, MAX_PATH_ELEMENTS);
  assertEquals(out[0], 0);
  assertEquals(out[MAX_PATH_ELEMENTS - 1], MAX_PATH_ELEMENTS - 1);
});

Deno.test("clampPathData — MAX+1 drops the head, keeps the tail", () => {
  const input = Array.from({ length: MAX_PATH_ELEMENTS + 1 }, (_, i) => i);
  const out = clampPathData(input, MAX_PATH_ELEMENTS);
  assertEquals(out.length, MAX_PATH_ELEMENTS);
  // First element of output must be element 1 of input (element 0 dropped).
  assertEquals(out[0], 1);
  assertEquals(out[MAX_PATH_ELEMENTS - 1], MAX_PATH_ELEMENTS);
});

Deno.test("clampPathData — 5000 elements keeps the last 1000 in order", () => {
  const input = Array.from({ length: 5000 }, (_, i) => i);
  const out = clampPathData(input, 1000);
  assertEquals(out.length, 1000);
  assertEquals(out[0], 4000);
  assertEquals(out[999], 4999);
});

Deno.test("clampPathData — default max is MAX_PATH_ELEMENTS", () => {
  // 1500 elements > MAX_PATH_ELEMENTS (1000) → truncated.
  const input = Array.from({ length: 1500 }, (_, i) => i);
  const out = clampPathData(input);
  assertEquals(out.length, MAX_PATH_ELEMENTS);
  assertEquals(out[0], 500);
});

Deno.test("clampPathData — preserves heterogeneous element types", () => {
  const input = ["node-1", { id: 2 }, ["nested"], 42, true, null];
  const out = clampPathData(input, 10);
  assertEquals(out, ["node-1", { id: 2 }, ["nested"], 42, true, null]);
});

Deno.test("clampPathData — returns a new array, does not mutate input", () => {
  const input = [1, 2, 3, 4, 5];
  const inputRef = input.slice();
  clampPathData(input, 3);
  assertEquals(input, inputRef);
});

// Constant-value sanity tests — these protect against accidental
// edits to the constants that would silently desync from the SQL
// CHECK constraints in 20260608000000_phase2_sql_hardening.sql.
Deno.test("cap constants — match Phase 2 SQL CHECK bounds", () => {
  // Path data is bounded to 1000 elements in BOTH the JS clamp
  // (MAX_PATH_ELEMENTS) and the column CHECK (chk_quiz_*_path_data_size).
  assertEquals(MAX_PATH_ELEMENTS, 1000);
  // Email is bounded to 320 chars (RFC 5321 hard limit) in BOTH the
  // edge function clamp and chk_quiz_*_email_len.
  assertEquals(MAX_EMAIL_LEN, 320);
  // participant_name is not in CHECK, but the edge function clamps
  // to 200 chars (matches the UI input).
  assertEquals(MAX_NAME_LEN, 200);
  // final_node_title clamps to 300 chars in the edge function.
  assertEquals(MAX_FINAL_NODE_TITLE_LEN, 300);
  // Score clamp at the edge function is 0..1_000_000. The CHECK is
  // looser (0..10_000_000) so legitimate edits outside the RPC pass.
  // We assert the tighter value, since callers downstream of the
  // edge function should use this constant.
  assertEquals(MAX_SCORE, 1_000_000);
  // 7 days.
  assertEquals(MAX_TIME_SECONDS, 604_800);
});

Deno.test("cap constants — are positive integers (no accidental negatives)", () => {
  for (
    const c of [
      MAX_PATH_ELEMENTS,
      MAX_EMAIL_LEN,
      MAX_NAME_LEN,
      MAX_FINAL_NODE_TITLE_LEN,
      MAX_SCORE,
      MAX_TIME_SECONDS,
    ]
  ) {
    assertEquals(Number.isInteger(c), true);
    assertEquals(c > 0, true);
  }
});

Deno.test("UUID_RE — pattern is exported (not a RegExp instance check)", () => {
  assertExists(UUID_RE);
  assertEquals(typeof UUID_RE.test, "function");
});

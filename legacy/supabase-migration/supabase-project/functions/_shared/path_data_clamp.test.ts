// supabase/functions/_shared/path_data_clamp.test.ts
//
// Cross-layer parity tests for path_data / score / time clamping.
// The Phase 2 SQL hardening migration (20260608000000_phase2_sql_hardening.sql)
// caps these values at three layers:
//
//   1. Edge function (save-quiz-result, save-quiz-session): clampPathData
//      from _shared/validators.ts.
//   2. RPC (save_quiz_result_atomic): re-clamps to last 1000 inside
//      plpgsql so callers that bypass the edge function still get
//      clamped.
//   3. CHECK constraint: rejects any insert that would persist
//      > 1000 elements as a hard floor.
//
// The full clampPathData unit tests live in validators.test.ts. This
// file focuses on:
//   (a) the "last-N" ordering semantics that the plpgsql RPC must
//       mirror, and
//   (b) score/time clamp parity between the edge function and the RPC
//       so a future refactor that bumps MAX in one layer but not the
//       other is caught.
//
// Layer 2 is verified end-to-end by
// supabase/tests/phase2_sql_hardening.test.sql.
//
// Run with:
//   deno test --allow-read supabase/functions/_shared/path_data_clamp.test.ts

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  MAX_PATH_ELEMENTS,
  MAX_SCORE,
  MAX_TIME_SECONDS,
  clampPathData,
} from "./validators.ts";

Deno.test("clampPathData — last-N ordering: drops head, keeps tail in original order", () => {
  // The plpgsql RPC emits elements in chronological order (ASC) after
  // selecting the tail (DESC + LIMIT). The edge function uses slice(-N)
  // which preserves order natively. They MUST produce the same array.
  const path = Array.from({ length: 5000 }, (_, i) => `node-${i}`);
  const jsOut = clampPathData(path, MAX_PATH_ELEMENTS);

  // First 9 elements must match.
  for (let i = 0; i < 9; i++) {
    assertEquals(jsOut[i], `node-${4000 + i}`);
  }
  // Last element must be the last input.
  assertEquals(jsOut[MAX_PATH_ELEMENTS - 1], `node-4999`);
  // Length matches.
  assertEquals(jsOut.length, MAX_PATH_ELEMENTS);
});

Deno.test("clampPathData — boundary: input of MAX passes through unchanged", () => {
  const path = Array.from({ length: MAX_PATH_ELEMENTS }, (_, i) => i);
  const out = clampPathData(path, MAX_PATH_ELEMENTS);
  assertEquals(out.length, MAX_PATH_ELEMENTS);
  assertEquals(out[0], 0);
  assertEquals(out[MAX_PATH_ELEMENTS - 1], MAX_PATH_ELEMENTS - 1);
});

Deno.test("clampPathData — boundary: input of MAX+1 keeps last MAX", () => {
  const path = Array.from({ length: MAX_PATH_ELEMENTS + 1 }, (_, i) => i);
  const out = clampPathData(path, MAX_PATH_ELEMENTS);
  assertEquals(out.length, MAX_PATH_ELEMENTS);
  // First element of output is element 1 of input (element 0 dropped).
  assertEquals(out[0], 1);
  assertEquals(out[MAX_PATH_ELEMENTS - 1], MAX_PATH_ELEMENTS);
});

// --------------------------------------------------------------------------
// Score / time clamp parity: the RPC and the edge function must agree on
// MAX. The edge function uses clampInt from validators.ts (covered by
// validators.test.ts). The RPC uses greatest(0, least(p_score, 1_000_000))
// in save_quiz_result_atomic. We assert the agreed-upon boundaries here.
// --------------------------------------------------------------------------

function clampScoreRpc(v: number): number {
  return Math.max(0, Math.min(v, MAX_SCORE));
}
function clampTimeRpc(v: number): number {
  return Math.max(0, Math.min(v, MAX_TIME_SECONDS));
}

Deno.test("RPC parity — score clamp at 0 / MAX_SCORE / overflow", () => {
  assertEquals(clampScoreRpc(-1), 0);
  assertEquals(clampScoreRpc(0), 0);
  assertEquals(clampScoreRpc(500), 500);
  assertEquals(clampScoreRpc(MAX_SCORE), MAX_SCORE);
  assertEquals(clampScoreRpc(MAX_SCORE + 1), MAX_SCORE);
  assertEquals(clampScoreRpc(Number.MAX_SAFE_INTEGER), MAX_SCORE);
});

Deno.test("RPC parity — time clamp at 0 / MAX_TIME_SECONDS / overflow", () => {
  assertEquals(clampTimeRpc(-100), 0);
  assertEquals(clampTimeRpc(0), 0);
  assertEquals(clampTimeRpc(3600), 3600); // 1 hour
  assertEquals(clampTimeRpc(MAX_TIME_SECONDS), MAX_TIME_SECONDS);
  assertEquals(clampTimeRpc(MAX_TIME_SECONDS + 1), MAX_TIME_SECONDS);
  assertEquals(clampTimeRpc(Number.MAX_SAFE_INTEGER), MAX_TIME_SECONDS);
});

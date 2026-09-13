// supabase/functions/save-quiz-result/index.test.ts
//
// Unit tests for validateResultBody in save-quiz-result. The function
// guards every result write with: (1) a valid quiz_id, (2) a valid
// session_id, (3) a non-empty session_token. A bug here would either
// let an attacker forge results for a quiz they never played (no
// session_token check) or break legitimate saves (rejection of valid
// UUIDs).
//
// The downstream DB lookups (quiz.is_published, session.quiz_id
// match, session_token constant-time compare, atomic RPC) are not
// unit-tested here — they require a Supabase stub. Those checks are
// covered by integration tests in supabase/tests/ and by manual smoke
// tests against staging.
//
// Run with:
//   deno test --allow-read supabase/functions/save-quiz-result/index.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { validateResultBody } from "./index.ts";

const VALID_UUID = "00000000-0000-0000-0000-000000000000";
const VALID_TOKEN = "tok-abc-123";

function makeBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    quiz_id: VALID_UUID,
    session_id: VALID_UUID,
    session_token: VALID_TOKEN,
    score: 50,
    final_node_title: "Done",
    participant_name: "Alice",
    results_data: {},
    path_data: [],
    time_spent_seconds: 30,
    ...overrides,
  };
}

Deno.test("validateResultBody — valid body → ok with extracted fields", () => {
  const res = validateResultBody(makeBody(), null);
  assertEquals(res.ok, true);
  if (!res.ok) return;
  assertEquals(res.data.quiz_id, VALID_UUID);
  assertEquals(res.data.session_id, VALID_UUID);
  assertEquals(res.data.session_token, VALID_TOKEN);
});

Deno.test("validateResultBody — null body → 400", async () => {
  const res = validateResultBody(null, null);
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
  assertEquals((await res.response.json()).error, "valid quiz_id required");
});

Deno.test("validateResultBody — non-object body (string) → 400", async () => {
  const res = validateResultBody("not a body", null);
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
});

Deno.test("validateResultBody — missing quiz_id → 400 valid quiz_id required", async () => {
  const res = validateResultBody(
    makeBody({ quiz_id: undefined }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
  assertEquals((await res.response.json()).error, "valid quiz_id required");
});

Deno.test("validateResultBody — non-UUID quiz_id → 400", async () => {
  const res = validateResultBody(
    makeBody({ quiz_id: "not-a-uuid" }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
});

Deno.test("validateResultBody — numeric quiz_id → 400", async () => {
  // The DB column is uuid; any non-string is rejected before the
  // regex check.
  const res = validateResultBody(
    makeBody({ quiz_id: 12345 }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
});

Deno.test("validateResultBody — missing session_id → 400", async () => {
  const res = validateResultBody(
    makeBody({ session_id: undefined }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
  assertEquals((await res.response.json()).error, "valid session_id required");
});

Deno.test("validateResultBody — non-UUID session_id → 400", async () => {
  const res = validateResultBody(
    makeBody({ session_id: "x" }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
});

Deno.test("validateResultBody — missing session_token → 401 session_token required", async () => {
  const res = validateResultBody(
    makeBody({ session_token: undefined }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 401);
  assertEquals((await res.response.json()).error, "session_token required");
});

Deno.test("validateResultBody — empty session_token → 401", async () => {
  const res = validateResultBody(
    makeBody({ session_token: "" }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 401);
});

Deno.test("validateResultBody — numeric session_token → 401 (non-string)", async () => {
  const res = validateResultBody(
    makeBody({ session_token: 0 }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 401);
});

Deno.test("validateResultBody — error response includes CORS headers (via corsHeaders)", async () => {
  // The body validation function calls jsonResponse which merges
  // CORS headers via corsHeaders(). Without a BILLING_ALLOWED_ORIGINS
  // env, no Access-Control-Allow-Origin is emitted. We just verify
  // the response is a well-formed Response with the expected status.
  const res = validateResultBody(
    makeBody({ quiz_id: "bad" }),
    null,
  );
  assertEquals(res.ok, false);
  if (res.ok) return;
  assertEquals(res.response.status, 400);
  assertEquals(res.response.headers.get("Content-Type"), "application/json; charset=utf-8");
});

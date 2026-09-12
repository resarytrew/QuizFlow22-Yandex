// supabase/functions/_shared/auth.test.ts
//
// Unit tests for getUserFromRequest in _shared/auth.ts.
//
// `getUserFromRequest` is a thin wrapper over `supabase.auth.getUser()`
// that just extracts the user id + email from the Bearer token. The
// test injects a fake `SupabaseClient` so we can run deterministic
// scenarios without hitting a real Supabase project. The fake
// implements just enough of the interface to satisfy the function.
//
// `verifyCronSecret` is tested via _shared/crypto.test.ts (it's
// re-exported from there).
//
// Run with:
//   deno test --allow-read supabase/functions/_shared/auth.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserFromRequest } from "./auth.ts";

// Minimal fake — implements only the surface used by getUserFromRequest.
type FakeGetUserResult = {
  data: { user: { id: string; email: string | null } | null };
  error: { message: string } | null;
};

function fakeClient(handler: (token: string) => FakeGetUserResult): SupabaseClient {
  return {
    auth: {
      getUser: (token: string) => Promise.resolve(handler(token)),
    },
  // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test("getUserFromRequest — no Authorization header → null", async () => {
  const req = new Request("https://example.com/x");
  const client = fakeClient(() => {
    throw new Error("should not be called");
  });
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — empty Authorization header → null", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "" },
  });
  const client = fakeClient(() => {
    throw new Error("should not be called");
  });
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — non-Bearer scheme (Basic) → null", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Basic dXNlcjpwYXNz" },
  });
  const client = fakeClient(() => {
    throw new Error("should not be called");
  });
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — 'Bearer ' with empty token → null", async () => {
  // The header value is exactly the string "Bearer " (no token after).
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Bearer " },
  });
  const client = fakeClient(() => {
    throw new Error("should not be called");
  });
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — valid Bearer → returns {id, email}", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Bearer jwt.token.value" },
  });
  const client = fakeClient((token) => ({
    data: {
      user: {
        id: "11111111-2222-3333-4444-555555555555",
        email: "user@example.com",
      },
    },
    error: null,
  }));
  const result = await getUserFromRequest(req, client);
  assertExists(result);
  assertEquals(result!.id, "11111111-2222-3333-4444-555555555555");
  assertEquals(result!.email, "user@example.com");
});

Deno.test("getUserFromRequest — valid Bearer, no email → {id, email: null}", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Bearer jwt-no-email" },
  });
  const client = fakeClient(() => ({
    data: {
      user: { id: "user-1", email: null as unknown as string },
    },
    error: null,
  }));
  const result = await getUserFromRequest(req, client);
  assertExists(result);
  assertEquals(result!.id, "user-1");
  assertEquals(result!.email, null);
});

Deno.test("getUserFromRequest — supabase.auth.getUser returns error → null", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Bearer bad-token" },
  });
  const client = fakeClient(() => ({
    data: { user: null },
    error: { message: "Invalid JWT" },
  }));
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — supabase.auth.getUser returns no user → null", async () => {
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "Bearer expired-token" },
  });
  const client = fakeClient(() => ({
    data: { user: null as unknown as { id: string; email: string } },
    error: null,
  }));
  assertEquals(await getUserFromRequest(req, client), null);
});

Deno.test("getUserFromRequest — case-sensitive scheme check (lowercase 'bearer' → null)", async () => {
  // The implementation checks `startsWith('Bearer ')` (capital B).
  // Lowercase 'bearer' is technically a valid auth scheme per RFC 7235
  // but we deliberately don't accept it to keep the check simple.
  const req = new Request("https://example.com/x", {
    headers: { Authorization: "bearer jwt" },
  });
  const client = fakeClient(() => {
    throw new Error("should not be called");
  });
  assertEquals(await getUserFromRequest(req, client), null);
});

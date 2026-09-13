// supabase/functions/_shared/free_tier_defaults.test.ts
//
// Locks in the shape of the free-tier entitlement so the value cannot
// drift silently. The free-tier literal is referenced by
// billing-yookassa-webhook and billing-auto-renew when reverting a
// user's entitlement on subscription cancel / lapse. If the shape
// changes, the entitlement.matrix in Phase 4 work would also need to
// update.

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  FREE_TIER_FEATURES,
  getFreeTierFeatures,
} from "./free_tier_defaults.ts";

Deno.test("FREE_TIER_FEATURES — shape is stable (3 free quizzes, basic AI, no extras)", () => {
  assertEquals(FREE_TIER_FEATURES, {
    max_quizzes: 3,
    ai_tier: "basic",
    hide_branding: false,
    premium_templates: false,
    unlimited_logic: false,
  });
});

Deno.test("FREE_TIER_FEATURES — max_quizzes is 3 (matches Phase 2 marketing copy)", () => {
  assertEquals(FREE_TIER_FEATURES.max_quizzes, 3);
});

Deno.test("FREE_TIER_FEATURES — ai_tier is the literal 'basic'", () => {
  assertEquals(FREE_TIER_FEATURES.ai_tier, "basic");
});

Deno.test("FREE_TIER_FEATURES — all boolean flags are false (no PRO features for free)", () => {
  assertEquals(FREE_TIER_FEATURES.hide_branding, false);
  assertEquals(FREE_TIER_FEATURES.premium_templates, false);
  assertEquals(FREE_TIER_FEATURES.unlimited_logic, false);
});

Deno.test("getFreeTierFeatures — returns a fresh object on every call (callers can mutate)", () => {
  const a = getFreeTierFeatures();
  const b = getFreeTierFeatures();
  assertEquals(a === b, false);
  assertEquals(a, b); // structural equality
});

Deno.test("getFreeTierFeatures — mutating the returned object does not poison the constant", () => {
  const a = getFreeTierFeatures();
  // deno-lint-ignore no-explicit-any
  (a as any).max_quizzes = 9999;
  const b = getFreeTierFeatures();
  assertEquals(b.max_quizzes, 3);
});

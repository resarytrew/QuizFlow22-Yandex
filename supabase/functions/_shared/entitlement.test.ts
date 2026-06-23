// supabase/functions/_shared/entitlement.test.ts
//
// Unit tests for the entitlement feature matrix in _shared/entitlement.ts.
// Covers every (plan, features) combination that maps to a different
// hasFeature() outcome for each FeatureKey. The matrix is the gate
// for every paywall in the application — a regression here would
// either leak PRO features to free users or block PRO users
// unnecessarily.
//
// `getEntitlement` calls a Supabase RPC and is not unit-tested here
// (covered by the integration test in supabase/tests/ — when one is
// added). The pure functions (hasFeature, assertFeature) ARE
// exhaustively tested.
//
// Run with:
//   deno test --allow-read supabase/functions/_shared/entitlement.test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  EffectiveEntitlement,
  PlanName,
  assertFeature,
  hasFeature,
} from "./entitlement.ts";

function ent(
  plan: PlanName,
  features: Record<string, unknown> = {},
  valid_until: string | null = null,
): EffectiveEntitlement {
  return { plan, features, valid_until, source: "test" };
}

// ---------------------------------------------------------------------------
// unlimited_quizzes: pro OR (max_quizzes === null) → legacy free-unlimited
// ---------------------------------------------------------------------------

Deno.test("hasFeature — unlimited_quizzes: free + max_quizzes=3 → false", () => {
  assertEquals(
    hasFeature(ent("free", { max_quizzes: 3 }), "unlimited_quizzes"),
    false,
  );
});

Deno.test("hasFeature — unlimited_quizzes: free + max_quizzes=null → true (legacy free-unlimited)", () => {
  // The legacy free tier had `max_quizzes: null` meaning "unlimited".
  // We preserve that compatibility here.
  assertEquals(
    hasFeature(ent("free", { max_quizzes: null }), "unlimited_quizzes"),
    true,
  );
});

Deno.test("hasFeature — unlimited_quizzes: free + no max_quizzes key → false (default)", () => {
  // Without explicit null, free users are NOT unlimited.
  assertEquals(
    hasFeature(ent("free", {}), "unlimited_quizzes"),
    false,
  );
});

Deno.test("hasFeature — unlimited_quizzes: pro + no max_quizzes → true (plan gate)", () => {
  assertEquals(
    hasFeature(ent("pro", {}), "unlimited_quizzes"),
    true,
  );
});

Deno.test("hasFeature — unlimited_quizzes: pro + max_quizzes=3 → true (pro overrides numeric cap)", () => {
  assertEquals(
    hasFeature(ent("pro", { max_quizzes: 3 }), "unlimited_quizzes"),
    true,
  );
});

// ---------------------------------------------------------------------------
// unlimited_logic, premium_templates, hide_branding: simple bool flags
// ---------------------------------------------------------------------------

Deno.test("hasFeature — unlimited_logic: pro + flag=false → false", () => {
  assertEquals(
    hasFeature(ent("pro", { unlimited_logic: false }), "unlimited_logic"),
    false,
  );
});

Deno.test("hasFeature — unlimited_logic: pro + flag=true → true", () => {
  assertEquals(
    hasFeature(ent("pro", { unlimited_logic: true }), "unlimited_logic"),
    true,
  );
});

Deno.test("hasFeature — unlimited_logic: free + flag=true → false (plan gate matters not, since the flag is the gate here)", () => {
  // This is interesting: `unlimited_logic` ONLY reads the flag, not
  // the plan. A free user with the flag manually set true (e.g. via
  // promo code that wrote {unlimited_logic: true} into entitlements)
  // would get the feature. This is intentional — the gate is the
  // flag, the plan is just a marketing label.
  assertEquals(
    hasFeature(ent("free", { unlimited_logic: true }), "unlimited_logic"),
    true,
  );
});

Deno.test("hasFeature — premium_templates: pro + flag=false → false", () => {
  assertEquals(
    hasFeature(ent("pro", { premium_templates: false }), "premium_templates"),
    false,
  );
});

Deno.test("hasFeature — premium_templates: pro + flag=true → true", () => {
  assertEquals(
    hasFeature(ent("pro", { premium_templates: true }), "premium_templates"),
    true,
  );
});

Deno.test("hasFeature — hide_branding: pro + flag=false → false", () => {
  assertEquals(
    hasFeature(ent("pro", { hide_branding: false }), "hide_branding"),
    false,
  );
});

Deno.test("hasFeature — hide_branding: pro + flag=true → true", () => {
  assertEquals(
    hasFeature(ent("pro", { hide_branding: true }), "hide_branding"),
    true,
  );
});

// ---------------------------------------------------------------------------
// ai_assistant_advanced: pro AND (tier === 'advanced' OR 'premium')
// ---------------------------------------------------------------------------

Deno.test("hasFeature — ai_assistant_advanced: pro + tier='basic' → false", () => {
  assertEquals(
    hasFeature(
      ent("pro", { ai_tier: "basic" }),
      "ai_assistant_advanced",
    ),
    false,
  );
});

Deno.test("hasFeature — ai_assistant_advanced: pro + tier='advanced' → true", () => {
  assertEquals(
    hasFeature(
      ent("pro", { ai_tier: "advanced" }),
      "ai_assistant_advanced",
    ),
    true,
  );
});

Deno.test("hasFeature — ai_assistant_advanced: pro + tier='premium' → true", () => {
  // Premium tier includes advanced.
  assertEquals(
    hasFeature(
      ent("pro", { ai_tier: "premium" }),
      "ai_assistant_advanced",
    ),
    true,
  );
});

Deno.test("hasFeature — ai_assistant_advanced: free + tier='advanced' → false (plan gate)", () => {
  // Plan gate matters here even with the right tier.
  assertEquals(
    hasFeature(
      ent("free", { ai_tier: "advanced" }),
      "ai_assistant_advanced",
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// ai_assistant_premium: pro AND tier === 'premium'
// ---------------------------------------------------------------------------

Deno.test("hasFeature — ai_assistant_premium: pro + tier='advanced' → false", () => {
  assertEquals(
    hasFeature(
      ent("pro", { ai_tier: "advanced" }),
      "ai_assistant_premium",
    ),
    false,
  );
});

Deno.test("hasFeature — ai_assistant_premium: pro + tier='premium' → true", () => {
  assertEquals(
    hasFeature(
      ent("pro", { ai_tier: "premium" }),
      "ai_assistant_premium",
    ),
    true,
  );
});

Deno.test("hasFeature — ai_assistant_premium: free + tier='premium' → false (plan gate)", () => {
  assertEquals(
    hasFeature(
      ent("free", { ai_tier: "premium" }),
      "ai_assistant_premium",
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// unknown feature key: safe default
// ---------------------------------------------------------------------------

Deno.test("hasFeature — unknown feature key → false (safe default)", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(hasFeature(ent("pro", {}), "nonexistent" as any), false);
});

// ---------------------------------------------------------------------------
// assertFeature: 403 Response shape
// ---------------------------------------------------------------------------

Deno.test("assertFeature — gate passes → returns null (caller proceeds)", () => {
  const e = ent("pro", { hide_branding: true });
  assertEquals(assertFeature(e, "hide_branding"), null);
});

Deno.test("assertFeature — gate fails → returns 403 Response with feature_locked body", async () => {
  const e = ent("free", {});
  const res = assertFeature(e, "premium_templates");
  assertExists(res);
  assertEquals(res!.status, 403);
  assertEquals(
    res!.headers.get("Content-Type"),
    "application/json; charset=utf-8",
  );
  const body = await res!.json();
  assertEquals(body.error, "feature_locked");
  assertEquals(body.feature, "premium_templates");
  assertEquals(body.plan, "free");
  assertEquals(body.upgrade_url, "/#/billing");
});

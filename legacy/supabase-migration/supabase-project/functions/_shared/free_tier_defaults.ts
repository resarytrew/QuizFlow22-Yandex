// supabase/functions/_shared/free_tier_defaults.ts
//
// Centralised defaults for the "free" entitlement shape. Multiple edge
// functions (billing-yookassa-webhook, billing-auto-renew) need to
// revert a user's entitlement to free on subscription cancel / lapse.
// Previously each callsite inlined its own copy of the literal — easy
// to drift. This module is the single source of truth.
//
// Phase 3 roadmap item: "Free-tier feature flags в БД вместо хардкода
// в TS". Full DB-driven config is a future migration; for now we keep
// the literal in TS but in ONE place. When the feature_flags table
// lands, this module's `getFreeTierFeatures()` will read from there
// with a TS fallback.

export const FREE_TIER_FEATURES = {
  max_quizzes: 3,
  ai_tier: "basic" as const,
  hide_branding: false,
  premium_templates: false,
  unlimited_logic: false,
} as const;

export type FreeTierFeatures = typeof FREE_TIER_FEATURES;

/**
 * Returns a fresh object so callers can mutate (e.g. for SQL RPC args)
 * without affecting the exported constant. The shape mirrors
 * `entitlements.features` jsonb.
 */
export function getFreeTierFeatures(): FreeTierFeatures {
  return { ...FREE_TIER_FEATURES };
}

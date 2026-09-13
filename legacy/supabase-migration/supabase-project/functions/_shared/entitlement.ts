// supabase/functions/_shared/entitlement.ts
// Чтение эффективного entitlement и проверка фичей.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type PlanName = 'free' | 'pro';

export interface EffectiveEntitlement {
  plan: PlanName;
  features: Record<string, unknown>;
  valid_until: string | null;
  source: string;
}

export type FeatureKey =
  | 'unlimited_quizzes'
  | 'unlimited_logic'
  | 'premium_templates'
  | 'hide_branding'
  | 'ai_assistant_advanced'
  | 'ai_assistant_premium';

const FEATURE_MATRIX: Record<FeatureKey, (e: EffectiveEntitlement) => boolean> = {
  unlimited_quizzes: (e) =>
    e.plan === 'pro' || (e.features.max_quizzes === null),
  unlimited_logic: (e) => Boolean(e.features.unlimited_logic),
  premium_templates: (e) => Boolean(e.features.premium_templates),
  hide_branding: (e) => Boolean(e.features.hide_branding),
  ai_assistant_advanced: (e) => {
    const tier = e.features.ai_tier;
    return e.plan === 'pro' && (tier === 'advanced' || tier === 'premium');
  },
  ai_assistant_premium: (e) => {
    const tier = e.features.ai_tier;
    return e.plan === 'pro' && tier === 'premium';
  },
};

/** Получает эффективный entitlement пользователя из БД. */
export async function getEntitlement(
  admin: SupabaseClient,
  userId: string,
): Promise<EffectiveEntitlement> {
  const { data, error } = await admin.rpc('get_effective_entitlement', {
    p_user_id: userId,
  });
  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { plan: 'free', features: {}, valid_until: null, source: 'system' };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    plan: (row.plan ?? 'free') as PlanName,
    features: (row.features ?? {}) as Record<string, unknown>,
    valid_until: row.valid_until ?? null,
    source: row.source ?? 'system',
  };
}

export function hasFeature(
  e: EffectiveEntitlement,
  feature: FeatureKey,
): boolean {
  const check = FEATURE_MATRIX[feature];
  return check ? check(e) : false;
}

/** Бросает 403 Response, если у пользователя нет требуемой фичи. */
export function assertFeature(
  e: EffectiveEntitlement,
  feature: FeatureKey,
): Response | null {
  if (hasFeature(e, feature)) return null;
  const body = {
    error: 'feature_locked',
    feature,
    plan: e.plan,
    upgrade_url: '/#/billing',
  };
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

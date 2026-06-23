// components/Paywall.tsx
// Обёртка: показывает fallback, если фича недоступна в текущем плане.
// Fallback по умолчанию — компактная карточка UpgradeCard.

import React from 'react';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { BillingError } from '../services/billingService';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import toast from 'react-hot-toast';

export type PaywallFeature =
  | 'unlimited_quizzes'
  | 'unlimited_logic'
  | 'premium_templates'
  | 'hide_branding'
  | 'ai_assistant_advanced';

interface PaywallProps {
  feature: PaywallFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Если true — fallback всегда виден (для превью) */
  forceShow?: boolean;
}

const FEATURE_LABELS: Record<PaywallFeature, string> = {
  unlimited_quizzes: 'Безлимитные квизы',
  unlimited_logic: 'Логические ноды и автоматизация',
  premium_templates: 'Премиум-шаблоны',
  hide_branding: 'Скрытие брендинга Поток',
  ai_assistant_advanced: 'AI-помощник PRO',
};

export const hasFeature = (
  plan: 'free' | 'pro',
  features: Record<string, unknown>,
  feature: PaywallFeature,
): boolean => {
  if (plan === 'pro') return true;
  switch (feature) {
    case 'unlimited_quizzes':
      return features.max_quizzes === null;
    case 'unlimited_logic':
      return Boolean(features.unlimited_logic);
    case 'premium_templates':
      return Boolean(features.premium_templates);
    case 'hide_branding':
      return Boolean(features.hide_branding);
    case 'ai_assistant_advanced':
      return features.ai_tier === 'advanced' || features.ai_tier === 'premium';
    default:
      return false;
  }
};

const Paywall: React.FC<PaywallProps> = ({ feature, children, fallback, forceShow }) => {
  const ent = useEntitlementStore((s) => s.entitlement);
  const allowed = hasFeature(ent.plan, ent.features, feature);

  if (allowed && !forceShow) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <UpgradeInline feature={feature} featureLabel={FEATURE_LABELS[feature]} />
  );
};

const UpgradeInline: React.FC<{ feature: PaywallFeature; featureLabel: string }> = ({
  feature,
  featureLabel,
}) => {
  const nav = useAppNavigation();
  return (
    <div className="my-2 p-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 4l1.5 4.5L11 9 6.5 9.5 5 14l-1.5-4.5L-1 9l4.5-.5L5 4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900">PRO · {featureLabel}</div>
        <div className="text-xs text-slate-600">Доступно в платной подписке</div>
      </div>
      <button
        type="button"
        onClick={() => nav.goToBilling()}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:from-indigo-700 hover:to-purple-700 transition-all"
      >
        Оформить
      </button>
    </div>
  );
};

export const useShowPaywallOnError = () => {
  const nav = useAppNavigation();
  return (err: unknown) => {
    if (err instanceof BillingError && err.status === 403) {
      const body = err.body as { error?: string; upgrade_url?: string } | null;
      if (body?.error === 'feature_locked' || body?.error === 'model_locked') {
        toast.error('Доступно только в PRO');
        if (body.upgrade_url) nav.goToBilling();
        return true;
      }
    }
    return false;
  };
};

export default Paywall;

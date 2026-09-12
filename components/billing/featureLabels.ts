// components/billing/featureLabels.ts
// Маппинг plan.features (jsonb) → человекочитаемые строки + константа FREE_PLAN.
// FREE_PLAN не хранится в public.plans, поэтому собирается на клиенте из FREE_ENTITLEMENT.

import type { Plan, PlanId } from '../../types';

export interface DerivedFeature {
  key: string;
  label: string;
  /** true — PRO-фича включена; false — для FREE показывается крестиком с тем же label. */
  enabled: boolean;
}

export interface DerivedPlan {
  id: PlanId | 'free';
  /** Короткое имя ("Бесплатно", "PRO · Месяц"). */
  name: string;
  /** Подзаголовок-описание (1 строка). */
  tagline: string;
  /** Полное описание (1–2 строки под ценой). */
  description: string;
  period: 'month' | 'year' | 'forever';
  price_kopecks: number;
  /** 'pro' если платный; 'free' если нет. */
  tier: 'free' | 'pro';
  features: Record<string, unknown>;
  /** Фичи в порядке отрисовки. */
  derived: DerivedFeature[];
}

const RUB = (kopecks: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100);

const RUB_PER_MONTH = (kopecks: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 12 / 100);

/** Считаем, сколько экономит годовой план относительно помесячной оплаты. */
export function computeYearlySavings(yearlyKopecks: number, monthlyKopecks: number): {
  amountKopecks: number;
  percent: number;
  formattedAmount: string;
  formattedPercent: string;
} {
  const baseline = monthlyKopecks * 12;
  const amount = Math.max(0, baseline - yearlyKopecks);
  const percent = baseline > 0 ? Math.round((amount / baseline) * 100) : 0;
  return {
    amountKopecks: amount,
    percent,
    formattedAmount: RUB(amount),
    formattedPercent: `${percent}%`,
  };
}

export function formatPrice(kopecks: number): string {
  return RUB(kopecks);
}

/** Помесячная стоимость годового плана. */
export function formatYearlyMonthlyEquivalent(yearlyKopecks: number): string {
  return RUB_PER_MONTH(yearlyKopecks);
}

// ---------- FREE ----------

export const FREE_PLAN: DerivedPlan = {
  id: 'free',
  name: 'Бесплатно',
  tagline: 'Чтобы попробовать и собрать первый квиз',
  description: 'Подходит, чтобы спокойно разобраться в редакторе и сделать первые материалы без оплаты.',
  period: 'forever',
  price_kopecks: 0,
  tier: 'free',
  features: {
    max_quizzes: 3,
    ai_tier: 'basic',
    hide_branding: false,
    premium_templates: false,
    unlimited_logic: false,
  },
  derived: [
    { key: 'max_quizzes', label: 'Можно создать до 3 квизов', enabled: true },
    { key: 'unlimited_logic', label: 'Основные вопросы и простые переходы между экранами', enabled: true },
    { key: 'premium_templates', label: 'Базовые шаблоны оформления', enabled: true },
    { key: 'ai_tier', label: 'Помощник для первых идей и черновиков', enabled: true },
    { key: 'hide_branding', label: 'В опубликованном квизе остаётся подпись сервиса', enabled: true },
  ],
};

// ---------- PRO ----------

const PRO_TAGLINES: Record<PlanId, { tagline: string; description: string }> = {
  pro_monthly: {
    tagline: 'На месяц — если нужно больше возможностей прямо сейчас',
    description: 'Для активной работы: создавайте сколько угодно квизов, делайте ветвящиеся сценарии, используйте красивые шаблоны и публикуйте без подписи сервиса.',
  },
  pro_yearly: {
    tagline: 'На год — выгоднее для регулярной работы',
    description: 'Те же возможности PRO на весь год: без ограничений по количеству квизов, с оформлением, помощником для текстов и экономией по сравнению с оплатой каждый месяц.',
  },
};

function deriveProFeatures(plan: Plan): DerivedFeature[] {
  const f = plan.features;
  const aiTier = f.ai_tier === 'premium' ? 'premium' : f.ai_tier === 'advanced' ? 'advanced' : 'basic';
  return [
    { key: 'max_quizzes', label: 'Создавайте столько квизов, сколько нужно', enabled: f.max_quizzes === null },
    { key: 'unlimited_logic', label: 'Делайте разные пути прохождения и сложные сценарии', enabled: Boolean(f.unlimited_logic) },
    { key: 'premium_templates', label: 'Используйте больше готовых вариантов оформления', enabled: Boolean(f.premium_templates) },
    {
      key: 'ai_tier',
      label: aiTier === 'premium'
        ? 'Расширенная помощь с идеями, вопросами и текстами'
        : aiTier === 'advanced'
          ? 'Помощь с идеями, вопросами и текстами'
          : 'Помощник для первых идей и черновиков',
      enabled: aiTier !== 'basic',
    },
    { key: 'hide_branding', label: 'Публикуйте квизы без подписи сервиса', enabled: Boolean(f.hide_branding) },
  ];
}

export function deriveProPlan(plan: Plan): DerivedPlan {
  const t = PRO_TAGLINES[plan.id as PlanId] ?? { tagline: '', description: '' };
  return {
    id: plan.id,
    name: plan.name,
    tagline: t.tagline,
    description: t.description,
    period: plan.period,
    price_kopecks: plan.price_kopecks,
    tier: 'pro',
    features: plan.features,
    derived: deriveProFeatures(plan),
  };
}

/** Собирает все тарифы в порядке: Free → Monthly → Yearly. */
export function buildAllPlans(proPlans: Plan[]): DerivedPlan[] {
  const monthly = proPlans.find((p) => p.id === 'pro_monthly');
  const yearly = proPlans.find((p) => p.id === 'pro_yearly');
  const list: DerivedPlan[] = [FREE_PLAN];
  if (monthly) list.push(deriveProPlan(monthly));
  if (yearly) list.push(deriveProPlan(yearly));
  return list;
}

/**
 * Хардкод PRO-тарифов для неавторизованных пользователей (LandingPage, etc).
 * Источник истины — схема тарифов в Yandex PostgreSQL, дубликат для
 * случая, когда `useEntitlementStore.plans` ещё не загружен. При появлении
 * public-эндпоинта для `plans` это можно убрать.
 */
export const HARDCODED_PRO_PLANS: Plan[] = [
  {
    id: 'pro_monthly',
    name: 'PRO · Месяц',
    period: 'month',
    price_kopecks: 39900,
    currency: 'RUB',
    sort_order: 1,
    features: {
      max_quizzes: null,
      ai_tier: 'advanced',
      hide_branding: true,
      premium_templates: true,
      unlimited_logic: true,
    },
  },
  {
    id: 'pro_yearly',
    name: 'PRO · Год',
    period: 'year',
    price_kopecks: 349000,
    currency: 'RUB',
    sort_order: 2,
    features: {
      max_quizzes: null,
      ai_tier: 'premium',
      hide_branding: true,
      premium_templates: true,
      unlimited_logic: true,
      discount_vs_monthly: '27%',
    },
  },
];

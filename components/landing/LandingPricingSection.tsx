// components/landing/LandingPricingSection.tsx
// Секция тарифов на главной (LandingPage). Светлая "бумажная" стилистика лендинга:
// тёплый фон, янтарные линии, мягкие тени. PricingCard рендерится в theme="light".
//
// 3 тарифа в ряд: Free (слева) → PRO Месяц (центр) → PRO Год (справа) —
// чтобы пользователь мог сравнить их на одной витрине.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import PricingCard, { type BadgeKind } from '../billing/PricingCard';
import {
  buildAllPlans,
  computeYearlySavings,
  type DerivedPlan,
  HARDCODED_PRO_PLANS,
} from '../billing/featureLabels';
import { useUIStore } from '../../store/useUIStore';
import { useAppNavigation } from '@/src/router/useAppNavigation';

const SECTION_STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const LandingPricingSection: React.FC = () => {
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);
  const nav = useAppNavigation();

  // Тарифы собираем из хардкода (для неавторизованных посетителей лендинга).
  const allPlans: DerivedPlan[] = useMemo(() => buildAllPlans(HARDCODED_PRO_PLANS), []);
  const monthly = allPlans.find((p) => p.id === 'pro_monthly') ?? null;
  const yearly = allPlans.find((p) => p.id === 'pro_yearly') ?? null;
  const free = allPlans.find((p) => p.id === 'free') ?? null;
  const monthlyPriceKopecks = monthly?.price_kopecks ?? null;

  const yearlySavings = useMemo(() => {
    if (!yearly || monthlyPriceKopecks === null) return null;
    return computeYearlySavings(yearly.price_kopecks, monthlyPriceKopecks);
  }, [yearly, monthlyPriceKopecks]);

  // Клик по CTA: free → AuthModal, PRO → страница биллинга.
  const handleSubscribe = (planId: DerivedPlan['id']) => {
    if (planId === 'free') {
      setAuthModalOpen(true);
      return;
    }
    nav.goToBilling();
  };

  if (!free || !monthly || !yearly) return null;

  // 3 карточки в порядке: Free → Monthly → Yearly.
  const cards: Array<{ plan: DerivedPlan; badge: BadgeKind }> = [
    { plan: free, badge: null },
    { plan: monthly, badge: 'popular' },
    { plan: yearly, badge: 'bestValue' },
  ];

  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden text-stone-950"
      aria-labelledby="pricing-heading"
    >
      {/* Светлый фон с теми же бумажными эффектами, что и в Hero лендинга. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_64%_at_50%_0%,rgba(251,191,36,0.18),transparent_64%),linear-gradient(180deg,rgba(255,250,240,0.62),rgba(239,228,210,0.62))]" />
        <div className="absolute inset-0 opacity-[0.10] bg-noise mix-blend-multiply" />
        <div
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-25 blur-[100px]"
          style={{ background: 'conic-gradient(from 180deg, #fbbf24, #f97316, #be6b45, #d6a24a, #fbbf24)' }}
        />
        <div
          className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[80px]"
          style={{ background: 'radial-gradient(circle, #7c6f57, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(120,53,15,0.45) 1px, transparent 0)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-24 lg:py-32">
        {/* Heading. */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-700/45" />
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-800/70">
                Тарифы
              </span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-700/45" />
            </div>
            <h2
              id="pricing-heading"
              className="text-[clamp(2rem,5vw,4rem)] leading-[1.1] font-bold tracking-tight font-serif"
            >
              Выберите свой{' '}
              <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-rose-700">
                ритм
              </span>
            </h2>
            <p className="mt-5 text-lg text-stone-600 leading-relaxed">
              Начните бесплатно, а когда понадобится больше свободы — подключите PRO:
              без лимита на квизы, с красивыми шаблонами и помощником для текстов.
            </p>
          </motion.div>
        </div>

        {/* Pricing cards: Free + PRO Месяц + PRO Год. */}
        <motion.div
          variants={SECTION_STAGGER}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1100px] mx-auto"
        >
          {cards.map(({ plan, badge }) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              badge={badge}
              isCurrent={false}
              busy={false}
              monthlyPriceKopecks={monthlyPriceKopecks}
              onSubscribe={handleSubscribe}
              theme="light"
            />
          ))}
        </motion.div>

        {/* Доп. инфо: 54-ФЗ + отмена. */}
        <p className="mt-10 text-center text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
          Оплата через ЮKassa · Чеки автоматически (54-ФЗ) · Отмена в один клик,
          доступ сохраняется до конца оплаченного периода
        </p>

        {/* Ссылка на полную страницу сравнения. */}
        {yearlySavings && (
          <div className="mt-4 text-center text-sm text-stone-600">
            Подробное сравнение —{' '}
            <button
              type="button"
              onClick={() => nav.goToBilling()}
              className="font-semibold text-amber-800 hover:text-amber-700 underline-offset-2 hover:underline"
            >
              на странице тарифов
            </button>
            .
          </div>
        )}
      </div>
    </section>
  );
};

export default LandingPricingSection;

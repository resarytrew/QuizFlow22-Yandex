// components/billing/PricingCard.tsx
// Карточка одного тарифа. Поддерживает две темы: 'light' (для лендинга)
// и 'dark' (для страницы оплаты). Используется в обоих контекстах.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import MagneticButton from '../MagneticButton';
import { useCard3D } from '../../hooks/useCard3D';
import {
  type DerivedPlan,
  formatPrice,
  formatYearlyMonthlyEquivalent,
  computeYearlySavings,
} from './featureLabels';

export type BadgeKind = 'popular' | 'bestValue' | 'current' | null;
export type CardTheme = 'light' | 'dark';

export interface PricingCardProps {
  plan: DerivedPlan;
  badge: BadgeKind;
  isCurrent: boolean;
  busy: boolean;
  /** Помесячная цена (для сравнения на годовом тарифе). */
  monthlyPriceKopecks: number | null;
  onSubscribe: (planId: DerivedPlan['id']) => void;
  /** Тема оформления. По умолчанию 'light' (используется в BillingPage). */
  theme?: CardTheme;
  /** На лендинге Free ведёт к регистрации, на странице биллинга это информационный тариф. */
  freeActionable?: boolean;
}

// ============================================
// Тема: LIGHT (для LandingPage)
// ============================================
const LIGHT_BADGE: Record<NonNullable<BadgeKind>, { className: string; label: string }> = {
  popular: { label: 'Гибкий выбор', className: 'bg-stone-950 text-amber-100' },
  bestValue: { label: 'Выгодно', className: 'bg-gradient-to-r from-amber-300 to-orange-400 text-stone-950' },
  current: { label: 'Текущий', className: 'bg-stone-900 text-white' },
};

// ============================================
// Тема: DARK (для LandingPage)
// ============================================
const DARK_BADGE: Record<NonNullable<BadgeKind>, { className: string; label: string }> = {
  popular: { label: 'Гибкий выбор', className: 'bg-white text-black' },
  bestValue: { label: 'Выгодно', className: 'bg-gradient-to-r from-amber-300 to-orange-400 text-black' },
  current: { label: 'Ваш тариф', className: 'bg-emerald-300 text-black' },
};

const CheckIcon: React.FC<{ tone: 'light' | 'dark' }> = ({ tone }) => (
  <svg
    className={`w-4 h-4 shrink-0 ${tone === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const MinusIcon: React.FC<{ tone: 'light' | 'dark' }> = ({ tone }) => (
  <svg
    className={`w-4 h-4 shrink-0 ${tone === 'dark' ? 'text-white/20' : 'text-gray-300'}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const cardEntry = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  badge,
  isCurrent,
  busy,
  monthlyPriceKopecks,
  onSubscribe,
  theme = 'light',
  freeActionable = true,
}) => {
  const isFree = plan.tier === 'free';
  const isYearly = plan.period === 'year';
  const isDark = theme === 'dark';
  const { onMouseMove, onMouseLeave, style } = useCard3D({ disabled: isCurrent });

  const savings = useMemo(() => {
    if (!isYearly || monthlyPriceKopecks === null) return null;
    return computeYearlySavings(plan.price_kopecks, monthlyPriceKopecks);
  }, [isYearly, monthlyPriceKopecks, plan.price_kopecks]);

  // ============================================
  // Тема-зависимые стили
  // ============================================
  const containerTone = (() => {
    if (isDark) {
      // DARK theme
      if (isCurrent) {
        return {
          border: 'border-amber-400/60',
          shadow: 'shadow-[0_8px_30px_rgba(251,191,36,0.18)]',
          ring: 'ring-1 ring-amber-400/20',
        };
      }
      if (isYearly) {
        return {
          border: 'border-amber-300/45',
          shadow: 'shadow-[0_28px_90px_rgba(251,191,36,0.14)]',
          ring: 'ring-1 ring-amber-300/15',
        };
      }
      if (plan.tier === 'pro') {
        return {
          border: 'border-white/15',
          shadow: 'shadow-[0_18px_55px_rgba(0,0,0,0.32)]',
          ring: 'ring-1 ring-white/[0.04]',
        };
      }
      return {
        border: 'border-white/10',
        shadow: 'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
        ring: 'ring-1 ring-white/5',
      };
    }
    // LIGHT theme
    if (isCurrent) {
      return {
        border: 'border-amber-300/80',
        shadow: 'shadow-[0_8px_30px_rgba(251,191,36,0.18)]',
        ring: 'ring-1 ring-amber-200/60',
      };
    }
    if (isYearly) {
      return {
        border: 'border-amber-400/70',
        shadow: 'shadow-[0_24px_70px_rgba(120,53,15,0.16),0_0_0_1px_rgba(251,191,36,0.10)]',
        ring: 'ring-1 ring-amber-200/70',
      };
    }
    if (plan.tier === 'pro') {
      return {
        border: 'border-amber-900/15',
        shadow: 'shadow-[0_18px_48px_rgba(87,65,42,0.12)]',
        ring: '',
      };
    }
    return {
      border: 'border-stone-900/10',
      shadow: 'shadow-[0_10px_32px_rgba(87,65,42,0.09)]',
      ring: '',
    };
  })();

  const containerBg = isDark
    ? isYearly
      ? 'bg-[linear-gradient(160deg,rgba(251,191,36,0.11),rgba(255,255,255,0.045)_35%,rgba(255,255,255,0.018))] backdrop-blur-xl'
      : 'bg-gradient-to-b from-white/[0.055] to-white/[0.018] backdrop-blur-xl'
    : isYearly
      ? 'bg-[linear-gradient(160deg,rgba(255,251,235,0.98),rgba(255,247,237,0.94)_42%,rgba(250,240,218,0.98))]'
      : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,250,240,0.72))] backdrop-blur-sm';

  // Цвета текста в зависимости от темы.
  const textName = isDark ? 'text-white' : 'text-stone-950';
  const textTagline = isDark ? 'text-white/50' : 'text-stone-600';
  const textPrice = isDark ? 'text-white' : 'text-stone-950';
  const textPriceUnit = isDark ? 'text-white/60' : 'text-stone-500';
  const textPeriod = isDark ? 'text-white/50' : 'text-stone-500';
  const textSavings = isDark ? 'text-emerald-400' : 'text-emerald-700';
  const textDescription = isDark ? 'text-white/60' : 'text-stone-600';
  const textFeature = isDark ? 'text-white/75' : 'text-stone-700';
  const textFeatureOff = isDark ? 'text-white/30' : 'text-stone-400';
  const textDecorationOff = isDark ? 'decoration-white/10' : 'decoration-stone-300';

  // CTA styles
  const ctaClass = (() => {
    const isDisabledState = busy || (isFree && (isCurrent || !freeActionable));
    if (isDisabledState) {
      return isDark
        ? 'bg-white/5 text-white/30 cursor-not-allowed'
        : 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    if (isFree) {
      // Free: на dark-теме — белая кнопка, чтобы «Начать бесплатно» был реальным CTA,
      // а не призрачной ссылкой. На light-теме остаётся «текущий» стиль (gray gradient),
      // потому что Free в BillingPage показывается как «уже ваш».
      return isDark
        ? 'text-black bg-white hover:bg-white/90 shadow-md shadow-white/10 hover:shadow-lg hover:shadow-white/20'
        : 'text-white bg-stone-900 hover:bg-stone-800 shadow-md shadow-stone-900/15 hover:shadow-lg hover:shadow-stone-900/20';
    }
    if (isYearly) {
      return isDark
        ? 'text-black bg-gradient-to-r from-amber-300 to-orange-400 shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/40'
        : 'text-stone-950 bg-gradient-to-r from-amber-300 to-orange-400 shadow-md shadow-amber-700/20 hover:from-amber-200 hover:to-orange-300 hover:shadow-lg hover:shadow-amber-700/28';
    }
    // Monthly
    return isDark
      ? 'text-black bg-white shadow-md shadow-white/10 hover:bg-amber-50 hover:shadow-lg hover:shadow-white/20'
      : 'text-stone-950 bg-amber-100 hover:bg-amber-200 shadow-md shadow-amber-900/10 hover:shadow-lg hover:shadow-amber-900/16';
  })();

  const ctaLabel = (() => {
    if (busy) return 'Перенаправляем…';
    if (isCurrent) return isFree ? 'Текущий тариф' : 'Продлить подписку';
    if (isFree) {
      if (!freeActionable) return 'Доступен всегда';
      return isDark ? 'Начать бесплатно' : 'Включено в FREE';
    }
    return 'Оформить подписку';
  })();

  const ctaDisabled = busy || (isFree && (isCurrent || !freeActionable));

  // Spotlight overlay color follows the warm landing palette in both themes.
  const spotlightColor = isDark ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.12)';

  return (
    <motion.div
      variants={cardEntry}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      aria-current={isCurrent ? 'true' : undefined}
      className={`
        relative group
        flex flex-col
        rounded-[1.8rem_0.7rem_1.8rem_0.7rem] border ${containerTone.border} ${containerTone.ring}
        ${containerBg}
        ${containerTone.shadow}
        transition-[box-shadow,transform,border-color] duration-300
        ${isYearly ? 'lg:-translate-y-3' : ''}
      `}
    >
      {!isDark && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(120,53,15,0.32) 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
          aria-hidden="true"
        />
      )}
      {/* Spotlight overlay (только если эффект не выключен). */}
      {!isCurrent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            background: `radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Бейджи: «Популярный» / «Выгодно» / «Текущий» (квадратные, не pill). */}
      {badge && (
        <span
          className={`absolute -top-3 left-6 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] rounded-sm ${
            (isDark ? DARK_BADGE : LIGHT_BADGE)[badge].className
          }`}
        >
          {(isDark ? DARK_BADGE : LIGHT_BADGE)[badge].label}
        </span>
      )}

      <div className="relative p-6 md:p-7 flex flex-col flex-1">
        {/* Header: name + tagline. */}
        <header className="mb-4">
          <h3 className={`font-serif text-2xl font-semibold leading-tight ${textName}`}>{plan.name}</h3>
          {plan.tagline && (
            <p className={`mt-1 text-sm leading-snug ${textTagline}`}>{plan.tagline}</p>
          )}
        </header>

        {/* Price block. */}
        <div className="mb-5">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-5xl font-extrabold tracking-tight ${textPrice}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {isFree ? '0' : formatPrice(plan.price_kopecks).replace(' ', '\u00a0')}
            </span>
            {!isFree && (
              <span className={`text-base font-semibold ${textPriceUnit}`}>₽</span>
            )}
          </div>
          <p className={`text-sm mt-1 ${textPeriod}`}>
            {plan.period === 'month' && 'за месяц, списывается ежемесячно'}
            {plan.period === 'year' && `за год, помесячно — ${formatYearlyMonthlyEquivalent(plan.price_kopecks)}`}
            {plan.period === 'forever' && 'навсегда, без карты'}
          </p>
          {savings && (
            <p className={`text-sm font-semibold mt-2 ${textSavings}`}>
              Экономите {savings.formattedAmount} · {savings.formattedPercent}
            </p>
          )}
        </div>

        {/* Description (для PRO). */}
        {plan.description && (
          <p className={`text-sm mb-5 leading-relaxed ${textDescription}`}>{plan.description}</p>
        )}

        {/* Features. */}
        <ul className="space-y-2.5 text-sm mb-6 flex-1">
          {plan.derived.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5">
              {f.enabled ? <CheckIcon tone={theme} /> : <MinusIcon tone={theme} />}
              <span className={`${f.enabled ? textFeature : `${textFeatureOff} line-through ${textDecorationOff}`}`}>
                {f.label}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA. */}
        <MagneticButton
          onClick={() => onSubscribe(plan.id)}
          disabled={ctaDisabled}
          aria-label={`${ctaLabel}: ${plan.name}`}
          className={`
            w-fit max-w-full px-5 py-3 rounded-xl font-bold text-sm
            inline-flex items-center justify-center
            transition-all duration-200
            focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
            ${isDark ? 'focus-visible:ring-offset-[#0a0a0c]' : 'focus-visible:ring-offset-white'}
            ${ctaClass}
          `}
        >
          <span className="whitespace-nowrap">{ctaLabel}</span>
          {!ctaDisabled && !isFree && <ArrowIcon />}
        </MagneticButton>
      </div>
    </motion.div>
  );
};

export default React.memo(PricingCard);

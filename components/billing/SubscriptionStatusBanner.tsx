// components/billing/SubscriptionStatusBanner.tsx
// Баннер текущей подписки. Виден только если ent.plan === 'pro'.
// Прогресс-бар + cancel-кнопка.

import React from 'react';
import { motion } from 'framer-motion';
import type { Plan, Subscription } from '../../types';
import SubscriptionProgress from './SubscriptionProgress';

interface SubscriptionStatusBannerProps {
  subscription: Subscription;
  plans: Plan[];
  onCancel: () => void;
  cancelling: boolean;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
  plans,
  onCancel,
  cancelling,
}) => {
  const planName = plans.find((p) => p.id === subscription.plan_id)?.name ?? subscription.plan_id;
  const isCancellingAtPeriodEnd = subscription.cancel_at_period_end;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[1180px] mx-auto mb-10 overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem]
                 border border-amber-300/20 bg-white/[0.045] p-6 md:p-7 backdrop-blur-xl
                 shadow-[0_24px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 text-black
                           text-[10px] font-extrabold px-2.5 py-1 rounded-sm uppercase tracking-[0.18em]">
            Активно
          </span>
          {isCancellingAtPeriodEnd && (
            <span className="inline-flex items-center rounded-md text-[11px] px-2.5 py-1
                             bg-rose-400/10 text-rose-300 border border-rose-300/15 font-semibold uppercase tracking-wider">
              Истекает
            </span>
          )}
          <p className="text-sm text-white/55">
            Тариф <strong className="text-white">{planName}</strong> действует до{' '}
            <strong className="text-white">{formatDate(subscription.current_period_end)}</strong>
          </p>
        </div>
        {!isCancellingAtPeriodEnd && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm font-semibold
                       text-white/55 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white
                       disabled:opacity-50 transition-colors
                       focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
                       focus-visible:ring-offset-[#09090b]"
          >
            {cancelling ? 'Отменяем…' : 'Отменить подписку'}
          </button>
        )}
      </header>
      <SubscriptionProgress
        start={subscription.current_period_start}
        end={subscription.current_period_end}
      />
    </motion.section>
  );
};

export default SubscriptionStatusBanner;

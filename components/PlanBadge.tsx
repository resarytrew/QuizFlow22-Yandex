// components/PlanBadge.tsx
// Маленький бейдж PRO/Free в Header и на карточках.

import React from 'react';
import { useEntitlementStore } from '../store/useEntitlementStore';

interface PlanBadgeProps {
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const PlanBadge: React.FC<PlanBadgeProps> = ({ size = 'sm', showLabel = true }) => {
  const ent = useEntitlementStore((s) => s.entitlement);
  const loading = useEntitlementStore((s) => s.loading);
  const isPro = ent.plan === 'pro';

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  if (loading && !ent) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-400 ${sizeClass}`}>
        …
      </span>
    );
  }

  if (isPro) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm ${sizeClass}`}
        title={`PRO до ${ent.valid_until ? new Date(ent.valid_until).toLocaleDateString('ru-RU') : ''}`}
      >
        <svg className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 4l1.5 4.5L11 9 6.5 9.5 5 14l-1.5-4.5L-1 9l4.5-.5L5 4z" />
        </svg>
        {showLabel ? 'PRO' : null}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${sizeClass}`}
    >
      Free
    </span>
  );
};

export default PlanBadge;

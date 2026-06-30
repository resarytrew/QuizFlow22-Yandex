// components/billing/SubscriptionProgress.tsx
// Тонкий прогресс-бар «оплачено до X».

import React from 'react';

interface SubscriptionProgressProps {
  start: string;
  end: string;
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

const SubscriptionProgress: React.FC<SubscriptionProgressProps> = ({ start, end }) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return null;
  }
  const pct = clamp(((now - s) / (e - s)) * 100, 0, 100);
  const isEnding = pct > 85;
  return (
    <div
      className="mt-4 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          isEnding
            ? 'bg-gradient-to-r from-orange-500 to-red-500'
            : 'bg-gradient-to-r from-amber-400 to-orange-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default SubscriptionProgress;

// components/billing/EmptyPayments.tsx
// Empty state для истории платежей.

import React from 'react';

const EmptyPayments: React.FC = () => (
  <div className="px-5 py-14 flex flex-col items-center text-center">
    <div className="w-14 h-14 rounded-[1.2rem_0.45rem_1.2rem_0.45rem] bg-amber-300/[0.08]
                    border border-amber-300/15 flex items-center justify-center mb-4">
      <svg className="w-7 h-7 text-amber-300/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m-7-9h10a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
      </svg>
    </div>
    <p className="text-sm font-semibold text-white">Платежей пока нет</p>
    <p className="text-sm text-white/35 mt-1 max-w-xs">
      Здесь появятся ваши чеки после первой оплаты.
    </p>
  </div>
);

export default EmptyPayments;

// components/billing/PaymentHistoryList.tsx
// Список платежей в стиле «квитанций» (gallery-style list, не striped table).

import React from 'react';
import type { Payment } from '../../types';
import { formatPrice } from './featureLabels';
import EmptyPayments from './EmptyPayments';

interface PaymentHistoryListProps {
  payments: Payment[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  waiting_for_capture: 'Ожидает списания',
  succeeded: 'Оплачен',
  canceled: 'Отменён',
  refunded: 'Возврат',
  active: 'Активна',
  past_due: 'Просрочена',
  expired: 'Истекла',
};

const STATUS_TONE: Record<string, string> = {
  succeeded: 'bg-emerald-400/10 text-emerald-300 border border-emerald-300/15',
  canceled: 'bg-rose-400/10 text-rose-300 border border-rose-300/15',
  refunded: 'bg-rose-400/10 text-rose-300 border border-rose-300/15',
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const ExternalLinkIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const PaymentRow: React.FC<{ payment: Payment }> = ({ payment }) => {
  const tone = STATUS_TONE[payment.status] ?? 'bg-amber-300/10 text-amber-300 border border-amber-300/15';
  const label = STATUS_LABELS[payment.status] ?? payment.status;
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-white/[0.035] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/85 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDateTime(payment.created_at)}
          </span>
          <span className="text-white/15">·</span>
          <span className="text-white/40 truncate">{payment.description ?? '—'}</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-white tabular-nums shrink-0">
        {formatPrice(payment.amount_kopecks)}
      </span>
      <span
        className={`inline-flex items-center rounded-md text-[11px] px-2 py-0.5 font-semibold uppercase tracking-wider shrink-0 ${tone}`}
      >
        {label}
      </span>
      <div className="w-16 text-right shrink-0">
        {payment.receipt_url ? (
          <a
            href={payment.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 text-xs font-semibold"
            title="Открыть чек"
          >
            Чек <ExternalLinkIcon />
          </a>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>
    </div>
  );
};

const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({ payments }) => {
  return (
    <section className="max-w-[1180px] mx-auto">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300/65">Документы</p>
          <h2 className="font-serif text-2xl font-semibold text-white">История платежей</h2>
        </div>
        <p className="hidden sm:block text-xs text-white/30">Чеки открываются в новой вкладке</p>
      </div>
      <div className="overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem] border border-white/[0.08]
                      bg-white/[0.035] shadow-[0_24px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]
                      divide-y divide-white/[0.06] backdrop-blur-xl">
        {payments.length === 0 ? (
          <EmptyPayments />
        ) : (
          payments.map((p) => <PaymentRow key={p.id} payment={p} />)
        )}
      </div>
    </section>
  );
};

export default PaymentHistoryList;

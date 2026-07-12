import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { PaymentStatus } from '../../types';

const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Ожидает',
  waiting_for_capture: 'Подтверждение',
  succeeded: 'Оплачен',
  canceled: 'Отменён',
  refunded: 'Возврат',
};

function rubles(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(kopecks / 100);
}

const AdminFinancesPage: React.FC = () => {
  const data = useAdminStore((s) => s.finances);
  const loading = useAdminStore((s) => s.isFinancesLoading);
  const load = useAdminStore((s) => s.loadFinances);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void load({ page, limit: 25, q: submitted, status }).catch(() => undefined);
  }, [load, page, status, submitted]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(query.trim());
    setPage(1);
  };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300/70">Биллинг</p>
          <h1 className="mt-3 font-lora text-4xl font-bold md:text-6xl">Финансы</h1>
          <p className="mt-3 text-sm text-white/50">Платежи ЮKassa, возвраты и активные подписки.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-2xl gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2">
          <input name="components-admin-adminfinancespage-45-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID платежа или описание" className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" />
          <select name="components-admin-adminfinancespage-46-select" value={status} onChange={(e) => { setStatus(e.target.value as PaymentStatus | 'all'); setPage(1); }} className="rounded-full border border-white/10 bg-black/40 px-4 text-sm">
            <option value="all">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-black">Найти</button>
        </form>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Выручка', data ? rubles(data.metrics.revenue_kopecks) : '—'],
          ['Возвраты', data ? rubles(data.metrics.refunds_kopecks) : '—'],
          ['Чистая выручка', data ? rubles(data.metrics.net_revenue_kopecks) : '—'],
          ['Активные подписки', data?.metrics.active_subscriptions ?? '—'],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/10 to-transparent p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
            <p className="mt-4 font-lora text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-white/35">
              <tr><th className="p-4">Платёж</th><th className="p-4">Аккаунт</th><th className="p-4">Тариф</th><th className="p-4">Сумма</th><th className="p-4">Статус</th><th className="p-4">Дата</th><th className="p-4">Чек</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data?.payments ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td className="p-4"><p className="font-mono text-xs">{payment.external_id ?? payment.id}</p><p className="mt-1 text-xs text-white/30">{payment.provider}</p></td>
                  <td className="p-4">#{payment.user.account_code ?? '—'}</td>
                  <td className="p-4">{payment.plan_id}</td>
                  <td className="p-4 font-lora text-lg font-bold">{rubles(payment.amount_kopecks)}</td>
                  <td className="p-4"><span className="rounded-full border border-white/10 px-3 py-1 text-xs">{statusLabels[payment.status] ?? payment.status}</span></td>
                  <td className="p-4 text-white/45">{new Date(payment.created_at).toLocaleString('ru-RU')}</td>
                  <td className="p-4">{payment.receipt_url ? <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-amber-200 underline">Открыть</a> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data?.payments.length === 0 && <div className="p-10 text-center text-white/40">Платежей не найдено.</div>}
        <div className="flex justify-between border-t border-white/10 p-4">
          <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Назад</button>
          <span className="text-sm text-white/40">Страница {page} · всего {data?.meta.total ?? '—'}</span>
          <button disabled={!data?.meta.has_more || loading} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Далее</button>
        </div>
      </section>
    </main>
  );
};

export default AdminFinancesPage;

import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminProPlan } from '../../types';

const planLabels: Record<AdminProPlan, string> = {
  pro_monthly: '1 месяц',
  pro_yearly: '1 год',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

const CreatePromoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const createPromocode = useAdminStore((s) => s.createPromocode);
  const isBusy = useAdminStore((s) => s.isPromocodesLoading);
  const [code, setCode] = useState('');
  const [plan, setPlan] = useState<AdminProPlan>('pro_monthly');
  const [maxUses, setMaxUses] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || !/^[A-Z0-9\-]{4,20}$/.test(trimmed)) {
      setError('Код: 4-20 символов, только латиница, цифры, дефис');
      return;
    }
    try {
      await createPromocode({
        code: trimmed,
        plan_id: plan,
        max_uses: maxUses ? Number(maxUses) : null,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      if (msg === 'code_exists') setError('Такой код уже существует');
      else setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#121015] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">
          Создание
        </div>
        <h2 className="mt-4 font-lora text-3xl font-bold tracking-tight text-white">Новый промокод</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Промокод даёт 100% скидку — бесплатный PRO на 1 месяц или 1 год.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Код</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 20))}
              placeholder="НАПРИМЕР: PRO2026"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10 placeholder:text-white/35"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">План</label>
            <div className="grid grid-cols-2 gap-3">
              {(['pro_monthly', 'pro_yearly'] as AdminProPlan[]).map((p) => (
                <button key={p} type="button" onClick={() => setPlan(p)}
                  className={`rounded-2xl border p-4 text-left transition ${plan === p ? 'border-amber-300 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-black/20 text-white/60 hover:border-white/20'}`}>
                  <div className="text-sm font-bold">{planLabels[p]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Макс. использований (опционально)</label>
            <input
              type="number" min="1" value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Оставить пустым — без лимита"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10 placeholder:text-white/35"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" disabled={isBusy} onClick={handleSubmit}
            className="flex-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3.5 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
            {isBusy ? 'Создаём...' : 'Создать'}
          </button>
          <button type="button" disabled={isBusy} onClick={onClose}
            className="rounded-full border border-white/10 px-6 py-3.5 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPromocodesPage: React.FC = () => {
  const data = useAdminStore((s) => s.promocodes);
  const loading = useAdminStore((s) => s.isPromocodesLoading);
  const load = useAdminStore((s) => s.loadPromocodes);
  const toggle = useAdminStore((s) => s.togglePromocode);
  const remove = useAdminStore((s) => s.deletePromocode);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void load({ page, limit: 25, q: submitted }).catch(() => undefined);
  }, [load, page, submitted]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(query.trim());
    setPage(1);
  };

  const handleToggle = async (code: string, current: boolean) => {
    try { await toggle(code, !current); } catch { /* toast handled by store */ }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Удалить промокод ${code}?`)) return;
    try { await remove(code); } catch { /* toast handled by store */ }
  };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300/70">Биллинг</p>
          <h1 className="mt-3 font-lora text-4xl font-bold md:text-6xl">Промокоды</h1>
          <p className="mt-3 text-sm text-white/50">Создание и управление промокодами на бесплатный PRO.</p>
        </div>
        <div className="flex w-full max-w-2xl gap-3">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по коду"
              className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" />
            <button className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-black">Найти</button>
          </form>
          <button onClick={() => setShowCreate(true)}
            className="rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20">
            + Создать
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-white/35">
              <tr>
                <th className="p-4">Код</th>
                <th className="p-4">План</th>
                <th className="p-4">Скидка</th>
                <th className="p-4">Использован</th>
                <th className="p-4">Лимит</th>
                <th className="p-4">Действует до</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data?.promocodes ?? []).map((promo) => (
                <tr key={promo.code} className="text-white/70">
                  <td className="p-4">
                    <span className="font-mono font-bold text-white">{promo.code}</span>
                  </td>
                  <td className="p-4">{planLabels[promo.plan_id] ?? promo.plan_id}</td>
                  <td className="p-4 font-lora text-lg font-bold text-green-400">100%</td>
                  <td className="p-4">{promo.used_count}</td>
                  <td className="p-4">{promo.max_uses ?? '∞'}</td>
                  <td className="p-4 text-white/45">{promo.valid_until ? formatDate(promo.valid_until) : '—'}</td>
                  <td className="p-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${promo.is_active ? 'border-green-400/30 bg-green-400/10 text-green-200' : 'border-red-400/30 bg-red-500/10 text-red-200'}`}>
                      {promo.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button type="button" disabled={loading} onClick={() => handleToggle(promo.code, promo.is_active)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${promo.is_active ? 'border border-red-300/30 text-red-100' : 'border border-green-400/30 text-green-200'}`}>
                        {promo.is_active ? 'Отключить' : 'Включить'}
                      </button>
                      <button type="button" disabled={loading} onClick={() => handleDelete(promo.code)}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/50 hover:border-red-300/30 hover:text-red-100 disabled:opacity-50">
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data?.promocodes.length === 0 && (
          <div className="p-10 text-center text-sm text-white/45">Промокодов не найдено.</div>
        )}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 disabled:cursor-not-allowed disabled:opacity-35">
            Назад
          </button>
          <span className="text-sm text-white/45">Страница {page}</span>
          <button disabled={!data?.meta.has_more || loading} onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 disabled:cursor-not-allowed disabled:opacity-35">
            Далее
          </button>
        </div>
      </section>

      {showCreate && <CreatePromoModal onClose={() => setShowCreate(false)} />}
    </main>
  );
};

export default AdminPromocodesPage;

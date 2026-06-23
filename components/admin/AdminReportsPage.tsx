import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminReportStatus } from '../../types';

const statuses: Record<AdminReportStatus, string> = {
  new: 'Новая',
  reviewing: 'На проверке',
  approved: 'Подтверждена',
  rejected: 'Отклонена',
  closed: 'Закрыта',
};

const reasons: Record<string, string> = {
  extremism: 'Экстремизм',
  terrorism: 'Терроризм',
  violence: 'Насилие',
  pornography: 'Порнография',
  sexual_content: 'Сексуальный контент',
  harassment: 'Оскорбления',
  hate: 'Разжигание ненависти',
  spam: 'Спам',
  fraud: 'Мошенничество',
  copyright: 'Авторские права',
  misinformation: 'Ложная информация',
  other: 'Другое',
};

const AdminReportsPage: React.FC = () => {
  const data = useAdminStore((s) => s.reports);
  const loading = useAdminStore((s) => s.isReportsLoading);
  const load = useAdminStore((s) => s.loadReports);
  const update = useAdminStore((s) => s.updateReportStatus);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<AdminReportStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void load({ page, limit: 20, q: submitted, status }).catch(() => undefined);
  }, [load, page, status, submitted]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(query.trim());
    setPage(1);
  };

  const decide = async (id: string, next: AdminReportStatus) => {
    const resolution = ['approved', 'rejected', 'closed'].includes(next)
      ? window.prompt('Комментарий к решению', '')
      : null;
    if (resolution === null && next !== 'reviewing') return;
    await update(id, next, resolution).catch(() => undefined);
  };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose-300/70">Модерация</p>
          <h1 className="mt-3 font-lora text-4xl font-bold md:text-6xl">Жалобы</h1>
          <p className="mt-3 max-w-xl text-sm text-white/50">Очередь пользовательских жалоб на публичные квизы.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-2xl gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Причина или комментарий" className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" />
          <select value={status} onChange={(e) => { setStatus(e.target.value as AdminReportStatus | 'all'); setPage(1); }} className="rounded-full border border-white/10 bg-black/40 px-4 text-sm">
            <option value="all">Все статусы</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="rounded-full bg-rose-300 px-5 py-2.5 text-sm font-bold text-black">Найти</button>
        </form>
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]">
        <div className="flex justify-between border-b border-white/10 px-5 py-4">
          <span className="font-bold">Всего: {data?.meta.total ?? '—'}</span>
          {loading && <span className="text-sm text-rose-200">Обновляем...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-white/35">
              <tr><th className="p-4">Жалоба</th><th className="p-4">Квиз</th><th className="p-4">Автор</th><th className="p-4">Отправитель</th><th className="p-4">Статус</th><th className="p-4">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data?.reports ?? []).map((report) => (
                <tr key={report.id}>
                  <td className="p-4">
                    <p className="font-semibold text-white">{reasons[report.reason] ?? report.reason}</p>
                    <p className="mt-1 max-w-xs text-xs text-white/40">{report.comment || 'Без комментария'}</p>
                    <p className="mt-2 text-[10px] text-white/25">{new Date(report.created_at).toLocaleString('ru-RU')}</p>
                  </td>
                  <td className="p-4"><p className="font-semibold">{report.quiz_name ?? 'Удалённый квиз'}</p><p className="mt-1 font-mono text-xs text-violet-200">#{report.quiz_display_code ?? '—'}</p></td>
                  <td className="p-4">#{report.quiz_owner.account_code ?? '—'}</td>
                  <td className="p-4">#{report.reporter.account_code ?? 'аноним'}</td>
                  <td className="p-4"><span className="rounded-full border border-white/10 px-3 py-1 text-xs">{statuses[report.status]}</span></td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={loading} onClick={() => decide(report.id, 'reviewing')} className="rounded-full border border-amber-300/30 px-3 py-1.5 text-xs text-amber-100">В проверку</button>
                      <button disabled={loading} onClick={() => decide(report.id, 'approved')} className="rounded-full bg-rose-300 px-3 py-1.5 text-xs font-bold text-black">Подтвердить</button>
                      <button disabled={loading} onClick={() => decide(report.id, 'rejected')} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">Отклонить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && data?.reports.length === 0 && <div className="p-10 text-center text-white/40">Жалоб пока нет.</div>}
        <div className="flex justify-between border-t border-white/10 p-4">
          <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Назад</button>
          <span className="text-sm text-white/40">Страница {page}</span>
          <button disabled={!data?.meta.has_more || loading} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Далее</button>
        </div>
      </section>
    </main>
  );
};

export default AdminReportsPage;

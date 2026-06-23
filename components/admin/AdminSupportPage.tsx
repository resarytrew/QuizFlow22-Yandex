import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminSupportStatus } from '../../types';

const labels: Record<AdminSupportStatus, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  waiting_user: 'Ожидает пользователя',
  closed: 'Закрыто',
};

const AdminSupportPage: React.FC = () => {
  const data = useAdminStore((s) => s.support);
  const loading = useAdminStore((s) => s.isSupportLoading);
  const load = useAdminStore((s) => s.loadSupport);
  const update = useAdminStore((s) => s.updateSupportStatus);
  const replyToTicket = useAdminStore((s) => s.replySupport);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<AdminSupportStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void load({ page, limit: 20, q: submitted, status }).catch(() => undefined);
  }, [load, page, status, submitted]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(query.trim());
    setPage(1);
  };

  const changeStatus = async (id: string, next: AdminSupportStatus) => {
    const note = window.prompt(next === 'closed' ? 'Решение по обращению' : 'Внутренняя заметка', '');
    if (note === null) return;
    await update(id, next, note).catch(() => undefined);
  };

  const reply = async (id: string) => {
    const body = window.prompt('Ответ пользователю', '');
    if (!body?.trim()) return;
    await replyToTicket(id, body.trim()).catch(() => undefined);
  };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/70">Сервис</p>
          <h1 className="mt-3 font-lora text-4xl font-bold md:text-6xl">Поддержка</h1>
          <p className="mt-3 max-w-xl text-sm text-white/50">Обращения пользователей, приоритеты и внутренние заметки сотрудников.</p>
        </div>
        <form onSubmit={submit} className="flex w-full max-w-2xl gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Тема или email" className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" />
          <select value={status} onChange={(e) => { setStatus(e.target.value as AdminSupportStatus | 'all'); setPage(1); }} className="rounded-full border border-white/10 bg-black/40 px-4 text-sm">
            <option value="all">Все статусы</option>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-black">Найти</button>
        </form>
      </div>

      <div className="grid gap-4">
        {(data?.tickets ?? []).map((ticket) => (
          <article key={ticket.id} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${ticket.priority === 'urgent' ? 'bg-rose-400/15 text-rose-200' : 'bg-white/10 text-white/55'}`}>{ticket.priority}</span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px]">{labels[ticket.status]}</span>
                  <span className="text-xs text-white/30">{ticket.category}</span>
                </div>
                <h2 className="mt-4 text-xl font-bold">{ticket.subject}</h2>
                <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-white/55">{ticket.message}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/35">
                  <span>Аккаунт #{ticket.user.account_code ?? '—'}</span>
                  <span>{ticket.email ?? 'email не указан'}</span>
                  <span>{new Date(ticket.created_at).toLocaleString('ru-RU')}</span>
                </div>
                {ticket.internal_note && <div className="mt-4 rounded-2xl bg-black/20 p-3 text-xs text-amber-100/65">Заметка: {ticket.internal_note}</div>}
                {ticket.messages && ticket.messages.length > 0 && (
                  <div className="mt-5 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3">
                    {ticket.messages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender_kind === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${message.sender_kind === 'user' ? 'bg-white/10 text-white/70' : 'bg-cyan-300 text-cyan-950'}`}>
                          {message.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap content-start gap-2 lg:max-w-56">
                <button disabled={loading || ticket.status === 'closed'} onClick={() => reply(ticket.id)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-black disabled:opacity-35">Ответить</button>
                <button disabled={loading} onClick={() => changeStatus(ticket.id, 'in_progress')} className="rounded-full bg-cyan-300 px-3 py-2 text-xs font-bold text-black">В работу</button>
                <button disabled={loading} onClick={() => changeStatus(ticket.id, 'waiting_user')} className="rounded-full border border-amber-300/30 px-3 py-2 text-xs text-amber-100">Ждём ответ</button>
                <button disabled={loading} onClick={() => changeStatus(ticket.id, 'closed')} className="rounded-full border border-white/15 px-3 py-2 text-xs">Закрыть</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!loading && data?.tickets.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/40">Обращений пока нет.</div>}
      <div className="mt-5 flex justify-between">
        <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Назад</button>
        <span className="text-sm text-white/40">Страница {page} · всего {data?.meta.total ?? '—'}</span>
        <button disabled={!data?.meta.has_more || loading} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-white/10 px-4 py-2 disabled:opacity-30">Далее</button>
      </div>
    </main>
  );
};

export default AdminSupportPage;

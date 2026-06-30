import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  createSupportTicket,
  listMySupportTickets,
  listSupportMessages,
  sendSupportMessage,
} from '../../services/supportService';
import type {
  SupportTicketCategory,
  SupportTicketMessage,
  UserSupportTicket,
} from '../../types';

interface SupportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusLabels = {
  new: 'Новое',
  in_progress: 'В работе',
  waiting_user: 'Нужен ваш ответ',
  closed: 'Закрыто',
} as const;

const categoryLabels: Record<SupportTicketCategory, string> = {
  technical: 'Техническая ошибка',
  quiz: 'Работа с квизом',
  account: 'Аккаунт',
  billing: 'Оплата',
  general: 'Общий вопрос',
  other: 'Другое',
};

const categoryIcons: Record<SupportTicketCategory, React.ReactNode> = {
  technical: (
    <path d="M8.5 3.5 7 5l2 2 1.5-1.5M5.5 8.5 4 10l2 2 1.5-1.5M12.5 7.5 10 10l2 2 2.5-2.5" />
  ),
  quiz: <path d="M4 4.5h8v7H4zM6.5 7h3M6.5 9h2" />,
  account: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3.5 13c.7-2.2 2.2-3.3 4.5-3.3s3.8 1.1 4.5 3.3" />
    </>
  ),
  billing: (
    <>
      <rect x="2.5" y="4" width="11" height="8" rx="2" />
      <path d="M2.5 6.5h11M5 9.5h2" />
    </>
  ),
  general: (
    <>
      <path d="M3 3.5h10v7H7l-3 2v-2H3z" />
      <path d="M5.5 6.5h5M5.5 8.5h3" />
    </>
  ),
  other: (
    <>
      <circle cx="4" cy="8" r=".8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r=".8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
};

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

function formatMoment(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SupportCenterModal: React.FC<SupportCenterModalProps> = ({ isOpen, onClose }) => {
  const session = useAuthStore((state) => state.session);
  const [tickets, setTickets] = useState<UserSupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('technical');
  const [description, setDescription] = useState('');

  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [selectedId, tickets],
  );

  const loadTickets = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const next = await listMySupportTickets();
      setTickets(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
      setIsCreating(next.length === 0);
    } catch {
      setError('Не удалось загрузить обращения. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isOpen) return;
    void loadTickets();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loadTickets, onClose]);

  useEffect(() => {
    if (!selectedId || isCreating) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listSupportMessages(selectedId)
      .then((next) => {
        if (!cancelled) setMessages(next);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить переписку.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCreating, selectedId]);

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || subject.trim().length < 4 || description.trim().length < 10) return;
    setSending(true);
    setError(null);
    try {
      const ticket = await createSupportTicket({
        userId: session.user.id,
        email: session.user.email ?? null,
        subject,
        category,
        message: description,
      });
      setTickets((current) => [ticket, ...current]);
      setSelectedId(ticket.id);
      setIsCreating(false);
      setSubject('');
      setDescription('');
      setMessages(await listSupportMessages(ticket.id));
    } catch {
      setError('Не удалось создать обращение.');
    } finally {
      setSending(false);
    }
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !selected || selected.status === 'closed' || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendSupportMessage(selected.id, session.user.id, reply);
      setMessages((current) => [...current, message]);
      setReply('');
    } catch {
      setError('Сообщение не отправлено.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Центр поддержки"
    >
      <button
        type="button"
        aria-label="Закрыть поддержку"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[6px]"
      />

      <section className="relative grid h-[min(76dvh,720px)] w-full max-w-[1040px] grid-cols-1 overflow-hidden rounded-[28px] border border-white/70 bg-white/85 text-slate-900 shadow-[0_32px_100px_rgba(30,41,59,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-3xl md:grid-cols-[310px_minmax(0,1fr)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.10),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.06),transparent_35%)]" />

        <aside className="relative flex min-h-0 flex-col border-b border-slate-200/70 bg-slate-50/65 md:border-b-0 md:border-r">
          <header className="px-5 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-500">ПОДДЕРЖКА</p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.025em]">Мои обращения</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  setSelectedId(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-indigo-600 text-xl text-white shadow-[0_8px_24px_rgba(79,70,229,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                aria-label="Новое обращение"
              >
                +
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {loading && tickets.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[76px] animate-pulse rounded-2xl bg-slate-200/60" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="mx-2 mt-5 rounded-2xl bg-white/65 px-5 py-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                  <svg viewBox="0 0 16 16" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5">
                    <path d="M3 3.5h10v7H7l-3 2v-2H3z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold">Обращений пока нет</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Создайте первое, и мы поможем разобраться.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {tickets.map((ticket) => {
                  const active = ticket.id === selectedId && !isCreating;
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(ticket.id);
                        setIsCreating(false);
                      }}
                      className={`group w-full rounded-2xl px-4 py-3 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                        active
                          ? 'bg-white shadow-[0_8px_25px_rgba(51,65,85,0.08)]'
                          : 'hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[10px] font-semibold ${active ? 'text-indigo-500' : 'text-slate-400'}`}>
                          #{shortId(ticket.id)}
                        </span>
                        <span className="text-[10px] tabular-nums text-slate-400">{formatMoment(ticket.updated_at)}</span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold text-slate-700">{ticket.subject}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'closed' ? 'bg-slate-300' : 'bg-emerald-400'}`} />
                        {statusLabels[ticket.status]}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="relative flex min-h-0 flex-col">
          <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200/70 px-5 sm:px-7">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-[-0.02em]">
                {isCreating ? 'Новое обращение' : selected ? selected.subject : 'Техническая поддержка'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {isCreating
                  ? 'Обычно отвечаем в течение рабочего дня'
                  : selected
                    ? `${categoryLabels[selected.category]} · #${shortId(selected.id)}`
                    : 'Выберите обращение'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="Закрыть"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7">
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </header>

          {error && (
            <div className="mx-5 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 sm:mx-7">
              {error}
            </div>
          )}

          {isCreating ? (
            <form onSubmit={createTicket} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-7">
              <div className="mx-auto max-w-[660px]">
                <div className="mb-5">
                  <h4 className="text-2xl font-bold tracking-[-0.035em]">С чем помочь?</h4>
                  <p className="mt-1.5 text-sm text-slate-500">Выберите подходящую тему и коротко опишите ситуацию.</p>
                </div>

                <fieldset>
                  <legend className="mb-2.5 text-xs font-semibold text-slate-600">Тип проблемы</legend>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(categoryLabels) as SupportTicketCategory[]).map((value) => {
                      const active = category === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCategory(value)}
                          className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                            active
                              ? 'bg-indigo-600 text-white shadow-[0_7px_18px_rgba(79,70,229,0.20)]'
                              : 'bg-slate-100/90 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        >
                          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45">
                            {categoryIcons[value]}
                          </svg>
                          {categoryLabels[value]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="mt-5 grid gap-2 text-xs font-semibold text-slate-600">
                  Тема
                  <input name="components-support-supportcentermodal-353-input"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={120}
                    placeholder="Например: не сохраняются изменения в квизе"
                    className="rounded-[14px] border border-slate-200 bg-white/75 px-4 py-3.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/80"
                  />
                </label>

                <label className="mt-4 grid gap-2 text-xs font-semibold text-slate-600">
                  Что произошло?
                  <textarea name="components-support-supportcentermodal-364-textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={4000}
                    rows={5}
                    placeholder="Опишите ваши действия, ожидаемый результат и что произошло вместо этого."
                    className="resize-none rounded-[14px] border border-slate-200 bg-white/75 px-4 py-3.5 text-sm font-normal leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/80"
                  />
                </label>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-[11px] tabular-nums text-slate-400">{description.length} / 4000</span>
                  <button
                    disabled={sending || subject.trim().length < 4 || description.trim().length < 10}
                    className="rounded-[14px] bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_9px_25px_rgba(79,70,229,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
                  >
                    {sending ? 'Отправляем…' : 'Отправить обращение'}
                  </button>
                </div>
              </div>
            </form>
          ) : selected ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Создано {formatMoment(selected.created_at)}</p>
                  <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                    selected.status === 'closed'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {statusLabels[selected.status]}
                  </span>
                </div>

                <div className="space-y-4">
                  {messages.map((message) => {
                    const fromUser = message.sender_kind === 'user';
                    if (message.sender_kind === 'system') {
                      return <p key={message.id} className="py-2 text-center text-xs text-slate-400">{message.body}</p>;
                    }
                    return (
                      <div key={message.id} className={`flex ${fromUser ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[82%]">
                          <p className={`mb-1.5 text-[10px] text-slate-400 ${fromUser ? 'text-right' : ''}`}>
                            {fromUser ? 'Вы' : 'Поддержка'} · {formatMoment(message.created_at)}
                          </p>
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            fromUser
                              ? 'rounded-br-md bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.16)]'
                              : 'rounded-bl-md bg-slate-100 text-slate-700'
                          }`}>
                            {message.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!loading && messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400">Переписка пока пуста.</p>
                  )}
                </div>
              </div>

              <form onSubmit={submitReply} className="border-t border-slate-200/70 bg-white/35 p-4 sm:px-7">
                {selected.status === 'closed' ? (
                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">
                    Обращение закрыто. Создайте новое, если проблема вернулась.
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <textarea name="components-support-supportcentermodal-435-textarea"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={2}
                      maxLength={4000}
                      placeholder="Напишите сообщение…"
                      className="min-h-[48px] flex-1 resize-none rounded-[14px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/80"
                    />
                    <button
                      disabled={sending || !reply.trim()}
                      className="h-12 rounded-[14px] bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-35"
                    >
                      Отправить
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-400">
              Выберите обращение слева.
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default SupportCenterModal;

import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminProPlan, AdminUserListItem } from '../../types';

const statusLabels = {
  active: 'Активен',
  temporarily_blocked: 'Временный блок',
  blocked: 'Заблокирован',
} as const;

const planLabels: Record<AdminProPlan, string> = {
  pro_monthly: '1 месяц (390 ₽/мес)',
  pro_yearly: '1 год (3 490 ₽/год)',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

const GrantProModal: React.FC<{
  user: AdminUserListItem;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const grantPro = useAdminStore((s) => s.grantPro);
  const isGranting = useAdminStore((s) => s.isGrantingPro);
  const [plan, setPlan] = useState<AdminProPlan>('pro_monthly');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      await grantPro({
        user_id: user.id,
        plan,
        reason: reason.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при выдаче PRO');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#121015] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">
          Выдача PRO
        </div>
        <h2 className="mt-4 font-lora text-3xl font-bold tracking-tight text-white">
          PRO подписка
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Пользователь <span className="font-semibold text-white">#{user.account_code}</span>
          {' — '}
          {user.display_name || user.username || 'Без имени'}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Срок подписки
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['pro_monthly', 'pro_yearly'] as AdminProPlan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    plan === p
                      ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                      : 'border-white/10 bg-black/20 text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-bold">{planLabels[p]}</div>
                  <div className="mt-1 text-xs text-inherit opacity-60">
                    {p === 'pro_yearly' ? 'Скидка 27%' : 'Ежемесячно'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Причина (опционально)
            </label>
            <textarea name="components-admin-adminuserspage-93-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Например: компенсация за сбой, промо-акция"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10 placeholder:text-white/35 resize-none"
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-white/35">{reason.length}/500</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isGranting}
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3.5 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGranting ? 'Выдаём...' : 'Выдать PRO'}
          </button>
          <button
            type="button"
            disabled={isGranting}
            onClick={onClose}
            className="rounded-full border border-white/10 px-6 py-3.5 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminUsersPage: React.FC = () => {
  const users = useAdminStore((s) => s.users);
  const staff = useAdminStore((s) => s.staff);
  const isLoading = useAdminStore((s) => s.isUsersLoading);
  const error = useAdminStore((s) => s.error);
  const loadUsers = useAdminStore((s) => s.loadUsers);
  const updateUserStatus = useAdminStore((s) => s.updateUserStatus);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [grantTarget, setGrantTarget] = useState<AdminUserListItem | null>(null);

  const canGrantPro = staff?.permissions?.includes('billing.grant') ?? false;

  useEffect(() => {
    void loadUsers({ page, limit: 20, q: submittedQuery }).catch(() => undefined);
  }, [loadUsers, page, submittedQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setPage(1);
  };

  const blockUser = async (
    user: AdminUserListItem,
    mode: 'temporarily_blocked' | 'blocked',
  ) => {
    const reason = window.prompt(
      mode === 'blocked'
        ? `Причина постоянной блокировки аккаунта #${user.account_code}`
        : `Причина временной блокировки аккаунта #${user.account_code}`,
      '',
    );
    if (reason === null) return;
    const blockedUntil =
      mode === 'temporarily_blocked'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    await updateUserStatus({
      user_id: user.id,
      status: mode,
      blocked_until: blockedUntil,
      reason,
    }).catch(() => undefined);
  };

  const unblockUser = async (user: AdminUserListItem) => {
    const confirmed = window.confirm(`Разблокировать аккаунт #${user.account_code}?`);
    if (!confirmed) return;
    await updateUserStatus({
      user_id: user.id,
      status: 'active',
      blocked_until: null,
      reason: null,
    }).catch(() => undefined);
  };

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-4 flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-amber-300/80">
              Этап 3
            </span>
          </div>
          <h1 className="font-lora text-4xl font-bold tracking-tight md:text-6xl">
            Пользователи
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
            Все аккаунты с шестизначными ID, статусами, количеством квизов и
            действиями блокировки. Поиск принимает ID аккаунта или имя профиля.
          </p>
        </div>

        <form
          onSubmit={submitSearch}
          className="flex w-full max-w-xl gap-3 rounded-full border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl"
        >
          <input name="components-admin-adminuserspage-214-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID аккаунта или имя"
            className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200"
          >
            Найти
          </button>
        </form>
      </div>

      {error && !users && (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-100">
          Не удалось загрузить пользователей: {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.065] shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-bold">Реестр аккаунтов</h2>
            <p className="mt-1 text-xs text-white/40">
              Всего: {users?.meta.total ?? '—'}
            </p>
          </div>
          {isLoading && <span className="text-sm text-amber-200">Обновляем...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Профиль</th>
                <th className="px-5 py-4">Статус</th>
                <th className="px-5 py-4">Квизы</th>
                <th className="px-5 py-4">Активность</th>
                <th className="px-5 py-4">Создан</th>
                <th className="px-5 py-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(users?.users ?? []).map((user) => (
                <tr key={user.id} className="text-white/70">
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-amber-300/15 px-3 py-1 font-mono text-amber-200">
                      #{user.account_code}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">
                      {user.display_name || user.username || 'Без имени'}
                    </div>
                    <div className="mt-1 font-mono text-xs text-white/35">
                      {user.id}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                      {statusLabels[user.status]}
                    </span>
                    {user.blocked_until && (
                      <div className="mt-2 text-xs text-red-100/70">
                        до {formatDate(user.blocked_until)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-lora text-2xl font-bold text-white">
                    {user.quiz_count}
                  </td>
                  <td className="px-5 py-4 text-white/45">
                    {formatDate(user.last_active_at)}
                  </td>
                  <td className="px-5 py-4 text-white/45">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {canGrantPro && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setGrantTarget(user)}
                          className="rounded-full bg-gradient-to-r from-amber-300/20 to-orange-400/20 px-3 py-1.5 text-xs font-bold text-amber-200 disabled:opacity-50"
                        >
                          PRO
                        </button>
                      )}
                      {user.status !== 'active' ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => unblockUser(user)}
                          className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-950 disabled:opacity-50"
                        >
                          Разблокировать
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => blockUser(user, 'temporarily_blocked')}
                            className="rounded-full border border-amber-300/30 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-50"
                          >
                            Блок 7 дней
                          </button>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => blockUser(user, 'blocked')}
                            className="rounded-full border border-red-300/30 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-50"
                          >
                            Заблокировать
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && users?.users.length === 0 && (
          <div className="p-10 text-center text-sm text-white/45">
            Ничего не найдено. Попробуйте другой ID или имя.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Назад
          </button>
          <span className="text-sm text-white/45">Страница {page}</span>
          <button
            type="button"
            disabled={!users?.meta.has_more || isLoading}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Далее
          </button>
        </div>
      </section>

      {grantTarget && (
        <GrantProModal user={grantTarget} onClose={() => setGrantTarget(null)} />
      )}
    </main>
  );
};

export default AdminUsersPage;

import React, { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminDashboardTrendPoint, AdminOverviewMetrics } from '../../types';

type MetricKey = keyof AdminOverviewMetrics;

const metricCards: Array<{
  key: MetricKey;
  label: string;
  hint: string;
  tone: 'amber' | 'violet' | 'cyan' | 'rose';
}> = [
  { key: 'users_total', label: 'Все аккаунты', hint: 'За всё время', tone: 'amber' },
  { key: 'users_active_30d', label: 'Активные пользователи', hint: 'За последние 30 дней', tone: 'cyan' },
  { key: 'users_new_24h', label: 'Новые регистрации', hint: 'За последние сутки', tone: 'violet' },
  { key: 'quizzes_total', label: 'Создано квизов', hint: 'За всё время', tone: 'amber' },
  { key: 'quizzes_new_24h', label: 'Новые квизы', hint: 'За последние сутки', tone: 'violet' },
  { key: 'quiz_completions_total', label: 'Прохождения', hint: 'Завершённые сессии', tone: 'cyan' },
  { key: 'subscriptions_active', label: 'Активные подписки', hint: 'Оплаченные PRO', tone: 'amber' },
  { key: 'subscriptions_admin_granted', label: 'Выдано вручную', hint: 'PRO от администратора', tone: 'violet' },
  { key: 'users_blocked', label: 'Заблокированные', hint: 'Включая временные', tone: 'rose' },
  { key: 'quizzes_pending_moderation', label: 'Ожидают проверки', hint: 'Очередь модерации', tone: 'rose' },
  { key: 'reports_open', label: 'Открытые жалобы', hint: 'Новые и на проверке', tone: 'rose' },
  { key: 'support_open', label: 'Обращения', hint: 'Требуют внимания', tone: 'cyan' },
];

const toneClasses = {
  amber: 'from-amber-300/20 to-orange-400/5 text-amber-200 border-amber-300/20',
  violet: 'from-violet-400/20 to-fuchsia-400/5 text-violet-200 border-violet-300/20',
  cyan: 'from-cyan-300/20 to-sky-400/5 text-cyan-200 border-cyan-300/20',
  rose: 'from-rose-400/20 to-red-400/5 text-rose-200 border-rose-300/20',
} as const;

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    admin_dashboard_opened: 'Открыт дашборд',
    admin_users_listed: 'Просмотрены пользователи',
    admin_quizzes_listed: 'Просмотрены квизы',
    admin_user_blocked: 'Аккаунт заблокирован',
    admin_user_unblocked: 'Аккаунт разблокирован',
    admin_quiz_approved: 'Квиз одобрен',
    admin_quiz_reviewing: 'Квиз взят на проверку',
    admin_quiz_rejected: 'Квиз отклонён',
    admin_quiz_hidden: 'Квиз скрыт',
    admin_quiz_blocked: 'Квиз заблокирован',
    admin_quiz_deleted: 'Квиз удалён',
    grant_pro: 'Выдан PRO',
    revoke_pro: 'Отозван PRO',
  };
  return map[action] ?? action;
}

function formatNumber(value: number | null): string {
  return value === null ? '—' : new Intl.NumberFormat('ru-RU').format(value);
}

const MetricCard: React.FC<{
  label: string;
  hint: string;
  value: number | null;
  tone: keyof typeof toneClasses;
}> = ({ label, hint, value, tone }) => (
  <article className={`relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br p-5 ${toneClasses[tone]}`}>
    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-current opacity-[0.06] blur-2xl" />
    <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
    <div className="relative mt-5 flex items-end justify-between gap-3">
      <p className="font-lora text-4xl font-bold leading-none text-white">{formatNumber(value)}</p>
      <span className="mb-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
    </div>
    <p className="relative mt-3 text-xs text-white/40">{hint}</p>
  </article>
);

const TrendChart: React.FC<{ points: AdminDashboardTrendPoint[] }> = ({ points }) => {
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [point.users, point.quizzes, point.completions]),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4 text-xs text-white/50">
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-300" />Регистрации</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-violet-400" />Квизы</span>
        <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" />Прохождения</span>
      </div>
      <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
        {points.map((point) => (
          <div key={point.date} className="flex h-full min-w-0 flex-col justify-end">
            <div className="flex min-h-0 flex-1 items-end justify-center gap-1">
              {[
                ['users', point.users, 'bg-amber-300'],
                ['quizzes', point.quizzes, 'bg-violet-400'],
                ['completions', point.completions, 'bg-cyan-300'],
              ].map(([key, rawValue, color]) => {
                const value = Number(rawValue);
                const height = value === 0 ? 3 : Math.max(8, (value / maximum) * 100);
                return (
                  <div
                    key={String(key)}
                    title={`${value}`}
                    className={`w-2.5 rounded-t-full opacity-85 transition hover:opacity-100 sm:w-4 ${color}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <p className="mt-3 truncate text-center text-[10px] text-white/35">
              {new Date(`${point.date}T00:00:00Z`).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const BreakdownRow: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => (
  <div>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="text-white/55">{label}</span>
      <span className="font-semibold text-white">{formatNumber(value)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${total > 0 ? Math.max(3, (value / total) * 100) : 0}%` }}
      />
    </div>
  </div>
);

const AdminDashboardPage: React.FC = () => {
  const overview = useAdminStore((s) => s.overview);
  const isLoading = useAdminStore((s) => s.isOverviewLoading);
  const error = useAdminStore((s) => s.error);
  const loadOverview = useAdminStore((s) => s.loadOverview);

  useEffect(() => {
    void loadOverview(true).catch(() => undefined);
  }, [loadOverview]);

  const quizTotal = useMemo(() => {
    if (!overview) return 0;
    return Object.values(overview.breakdown.quizzes_by_visibility)
      .reduce((sum, value) => sum + value, 0);
  }, [overview]);

  if (isLoading && !overview) {
    return (
      <main className="p-5 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.06]" />
          ))}
        </div>
      </main>
    );
  }

  if (error && !overview) {
    return (
      <main className="p-5 lg:p-8">
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8">
          <h1 className="font-lora text-3xl font-bold">Не удалось загрузить дашборд</h1>
          <p className="mt-3 text-sm text-red-100/80">{error}</p>
          <button type="button" onClick={() => loadOverview(true)} className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-black">
            Повторить
          </button>
        </div>
      </main>
    );
  }

  if (!overview) return null;

  return (
    <main className="p-5 lg:p-8">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-amber-300/80">
              Центр управления
            </span>
          </div>
          <h1 className="font-lora text-4xl font-bold tracking-tight md:text-6xl">Обзор платформы</h1>
          <p className="mt-3 text-sm text-white/45">
            Данные обновлены {new Date(overview.generated_at).toLocaleString('ru-RU')}
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => loadOverview(true)}
          className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {isLoading ? 'Обновляем…' : 'Обновить данные'}
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ key: metricKey, ...card }) => (
          <MetricCard key={metricKey} {...card} value={overview.metrics[metricKey]} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Динамика</p>
          <h2 className="mb-2 mt-2 text-xl font-bold">Последние семь дней</h2>
          <TrendChart points={overview.trend_7d} />
        </article>

        <div className="grid gap-6">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6">
            <h2 className="text-lg font-bold">Доступ к квизам</h2>
            <div className="mt-6 space-y-5">
              <BreakdownRow label="Личный доступ" value={overview.breakdown.quizzes_by_visibility.private} total={quizTotal} color="bg-amber-300" />
              <BreakdownRow label="По ссылке" value={overview.breakdown.quizzes_by_visibility.unlisted} total={quizTotal} color="bg-violet-400" />
              <BreakdownRow label="Галерея" value={overview.breakdown.quizzes_by_visibility.public} total={quizTotal} color="bg-cyan-300" />
            </div>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6">
            <h2 className="text-lg font-bold">Подписки PRO</h2>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ['Месяц', overview.breakdown.subscriptions_by_plan.pro_monthly],
                ['Год', overview.breakdown.subscriptions_by_plan.pro_yearly],
                ['Вручную', overview.breakdown.subscriptions_by_plan.admin_granted],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-black/20 p-3">
                  <p className="font-lora text-2xl font-bold">{formatNumber(Number(value))}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{label}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Безопасность</p>
              <h2 className="mt-2 text-xl font-bold">Последние действия</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40">audit.read</span>
          </div>
          {overview.recent_actions.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/40">Нет доступных записей аудита.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                  <tr>
                    <th className="px-6 py-4">Действие</th>
                    <th className="px-4 py-4">Сотрудник</th>
                    <th className="px-4 py-4">IP</th>
                    <th className="px-4 py-4">Результат</th>
                    <th className="px-6 py-4 text-right">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {overview.recent_actions.map((entry) => (
                    <tr key={entry.id} className="text-white/60">
                      <td className="px-6 py-4 font-medium text-white">{actionLabel(entry.action)}</td>
                      <td className="px-4 py-4">
                        {entry.actor_display_name ?? (entry.actor_account_code ? `#${entry.actor_account_code}` : 'Система')}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-white/35">{entry.ip ?? '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          entry.outcome === 'success' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                        }`}>
                          {entry.outcome === 'success' ? 'Успешно' : entry.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-white/35">
                        {new Date(entry.created_at).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/10 to-violet-400/5 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/55">Быстрые действия</p>
          <h2 className="mt-2 text-xl font-bold">Операционная работа</h2>
          <div className="mt-6 grid gap-3">
            <Link to="/admin/users" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-amber-300/30 hover:bg-black/30">
              <p className="font-semibold">Пользователи</p>
              <p className="mt-1 text-xs text-white/40">Поиск, статусы и блокировки</p>
            </Link>
            <Link to="/admin/quizzes" className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-violet-300/30 hover:bg-black/30">
              <p className="font-semibold">Квизы</p>
              <p className="mt-1 text-xs text-white/40">Очередь и решения модератора</p>
            </Link>
          </div>
          {overview.unavailable_sources.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-white/40">
              Жалобы и поддержка появятся здесь после подключения соответствующих хранилищ данных.
            </div>
          )}
        </article>
      </section>
    </main>
  );
};

export default AdminDashboardPage;

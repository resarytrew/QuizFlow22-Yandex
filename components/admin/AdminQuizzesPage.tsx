import React, { FormEvent, useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import type {
  AdminQuizListItem,
  AdminQuizModerationStatus,
  QuizVisibility,
} from '../../types';

const visibilityLabels: Record<QuizVisibility, string> = {
  private: 'Личный',
  unlisted: 'По ссылке',
  public: 'Галерея',
};

const moderationLabels: Record<AdminQuizModerationStatus, string> = {
  unreviewed: 'Не проверен',
  reviewing: 'На проверке',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  blocked: 'Заблокирован',
  hidden: 'Скрыт',
  deleted: 'Удалён',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

const AdminQuizzesPage: React.FC = () => {
  const quizzes = useAdminStore((s) => s.quizzes);
  const isLoading = useAdminStore((s) => s.isQuizzesLoading);
  const error = useAdminStore((s) => s.error);
  const loadQuizzes = useAdminStore((s) => s.loadQuizzes);
  const moderateQuiz = useAdminStore((s) => s.moderateQuiz);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [visibility, setVisibility] = useState<QuizVisibility | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadQuizzes({ page, limit: 20, q: submittedQuery, visibility }).catch(() => undefined);
  }, [loadQuizzes, page, submittedQuery, visibility]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setPage(1);
  };

  const applyModeration = async (
    quiz: AdminQuizListItem,
    status: AdminQuizModerationStatus,
  ) => {
    const needsReason = status !== 'approved' && status !== 'reviewing';
    const reason = needsReason
      ? window.prompt(`Причина решения для квиза #${quiz.display_code ?? quiz.id}`, '')
      : '';
    if (reason === null) return;
    if (status === 'deleted') {
      const confirmed = window.confirm(
        'Квиз будет помечен как удалённый и скрыт из галереи. Продолжить?',
      );
      if (!confirmed) return;
    }
    await moderateQuiz({
      quiz_id: quiz.id,
      moderation_status: status,
      reason,
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
            Квизы
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
            Список квизов с ID владельца, ID квиза и модерацией. Формат ID
            зависит от доступа: 2 цифры для личных, 3 для доступа по ссылке,
            4 для галереи.
          </p>
        </div>

        <form
          onSubmit={submitSearch}
          className="grid w-full max-w-3xl gap-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl md:grid-cols-[1fr_180px_auto]"
        >
          <input name="components-admin-adminquizzespage-97-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID квиза, ID аккаунта или название"
            className="min-w-0 rounded-full bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
          />
          <select name="components-admin-adminquizzespage-103-select"
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value as QuizVisibility | 'all');
              setPage(1);
            }}
            className="rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="all">Все доступы</option>
            <option value="private">Личные</option>
            <option value="unlisted">По ссылке</option>
            <option value="public">Галерея</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-200"
          >
            Найти
          </button>
        </form>
      </div>

      {error && !quizzes && (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-100">
          Не удалось загрузить квизы: {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.065] shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-bold">Реестр квизов</h2>
            <p className="mt-1 text-xs text-white/40">
              Всего: {quizzes?.meta.total ?? '—'}
            </p>
          </div>
          {isLoading && <span className="text-sm text-amber-200">Обновляем...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-5 py-4">ID квиза</th>
                <th className="px-5 py-4">Квиз</th>
                <th className="px-5 py-4">Владелец</th>
                <th className="px-5 py-4">Доступ</th>
                <th className="px-5 py-4">Модерация</th>
                <th className="px-5 py-4">Публикация</th>
                <th className="px-5 py-4">Обновлён</th>
                <th className="px-5 py-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(quizzes?.quizzes ?? []).map((quiz) => (
                <tr key={quiz.id} className="text-white/70">
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-violet-300/15 px-3 py-1 font-mono text-violet-100">
                      #{quiz.display_code ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-sm truncate font-semibold text-white">
                      {quiz.name || 'Без названия'}
                    </div>
                    <div className="mt-1 font-mono text-xs text-white/35">
                      {quiz.id}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">
                      #{quiz.owner_account_code ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-white/45">
                      {quiz.owner_display_name || quiz.owner_username || 'Профиль без имени'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                      {visibilityLabels[quiz.visibility]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-violet-200/15 bg-violet-300/10 px-3 py-1 text-xs text-violet-100">
                      {moderationLabels[quiz.moderation_status]}
                    </span>
                    {quiz.moderation_reason && (
                      <div className="mt-2 max-w-xs truncate text-xs text-white/35">
                        {quiz.moderation_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-white/65">
                      {quiz.is_published ? 'Опубликован' : 'Черновик'}
                    </div>
                    <div className="mt-1 text-xs text-white/35">
                      {formatDate(quiz.published_at)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/45">
                    {formatDate(quiz.updated_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => applyModeration(quiz, 'approved')}
                        className="rounded-full bg-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-950 disabled:opacity-50"
                      >
                        Одобрить
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => applyModeration(quiz, 'hidden')}
                        className="rounded-full border border-amber-300/30 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-50"
                      >
                        Скрыть
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => applyModeration(quiz, 'blocked')}
                        className="rounded-full border border-red-300/30 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-50"
                      >
                        Блок
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => applyModeration(quiz, 'deleted')}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/65 disabled:opacity-50"
                      >
                        Soft-delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && quizzes?.quizzes.length === 0 && (
          <div className="p-10 text-center text-sm text-white/45">
            Ничего не найдено. Попробуйте другой ID, название или фильтр доступа.
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
            disabled={!quizzes?.meta.has_more || isLoading}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Далее
          </button>
        </div>
      </section>
    </main>
  );
};

export default AdminQuizzesPage;

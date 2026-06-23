import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { useEntitlementStore } from '../store/useEntitlementStore.ts';
import QuizCard from './QuizCard.tsx';
import { CustomNodeType } from '../types.ts';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import { cancelSubscription } from '../services/billingService';
import SubscriptionProgress from './billing/SubscriptionProgress';
import SupportCenterModal from './support/SupportCenterModal';

type FilterTab = 'all' | 'recent' | 'favorites';
type SortMode = 'date' | 'name';
type ViewMode = 'grid' | 'list';

const SELECT_ARROW_SVG = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2378776e' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.6' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";

const BoltMark: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M13 2 4 13.2h7.1L10 22l10-12.8h-7.2L13 2Z" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" d="m21 21-4.35-4.35" />
    <circle cx="11" cy="11" r="6" />
  </svg>
);

const GridIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="4" y="4" width="6" height="6" rx="1.2" />
    <rect x="14" y="4" width="6" height="6" rx="1.2" />
    <rect x="4" y="14" width="6" height="6" rx="1.2" />
    <rect x="14" y="14" width="6" height="6" rx="1.2" />
  </svg>
);

const ListIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" d="M8 6h12M8 12h12M8 18h12" />
    <path strokeLinecap="round" d="M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);

const FolderIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.1l2 2H18a2.5 2.5 0 0 1 2.5 2.5V17A2.5 2.5 0 0 1 18 19.5H6.5A2.5 2.5 0 0 1 4 17V7.5Z" />
  </svg>
);

const QuestionIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path strokeLinecap="round" d="M9.8 9.7a2.4 2.4 0 1 1 3.3 2.2c-.7.34-1.1.86-1.1 1.6v.15" />
    <path strokeLinecap="round" d="M12 17h.01" />
  </svg>
);

const StarIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3.8 2.45 4.95 5.45.8-3.95 3.85.94 5.42L12 16.25l-4.88 2.57.93-5.42L4.1 9.55l5.45-.8L12 3.8Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" d="M7 4v3M17 4v3M4.5 9h15" />
    <rect x="4.5" y="5.5" width="15" height="14" rx="2.5" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916" />
  </svg>
);

const StatCard = ({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) => (
  <article className="group relative overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-white p-5 shadow-[0_8px_32px_rgba(120,53,15,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(120,53,15,0.12)]">
    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/20 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">{label}</p>
        <p className="mt-4 font-serif text-4xl font-semibold tracking-[-0.04em] text-stone-950 tabular-nums">{value}</p>
        <p className="mt-2 text-xs leading-relaxed text-stone-500">{detail}</p>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem_0.35rem_0.95rem_0.35rem] border border-amber-200 bg-amber-50 text-amber-600">
        {icon}
      </span>
    </div>
  </article>
);

const SkeletonCard: React.FC<{ isList?: boolean }> = ({ isList = false }) => (
  <div className={`overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-white ${isList ? 'flex items-center gap-5 p-5' : 'p-5'}`}>
    {isList ? (
      <>
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-stone-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-stone-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-stone-200" />
      </>
    ) : (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-[1rem_0.35rem_1rem_0.35rem] bg-stone-200" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-stone-200" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-stone-100" />
        <div className="h-10 animate-pulse rounded-xl bg-stone-200" />
      </div>
    )}
  </div>
);

const LoadingState = ({ viewMode }: { viewMode: ViewMode }) => (
  <div className={viewMode === 'grid'
    ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'flex flex-col gap-4'
  }>
    {Array.from({ length: 6 }).map((_, index) => (
      <SkeletonCard key={index} isList={viewMode === 'list'} />
    ))}
  </div>
);

const EmptyState = ({ filterTab, createNewQuiz }: { filterTab: FilterTab; createNewQuiz: () => void }) => (
  <section className="relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-200 bg-white px-6 py-16 text-center shadow-[0_16px_48px_rgba(120,53,15,0.06)]">
    <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/40 blur-[80px]" />
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[1.4rem_0.45rem_1.4rem_0.45rem] border border-amber-200 bg-amber-50 text-amber-500">
      <FolderIcon />
    </div>
    <h3 className="relative mt-7 font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950">
      {filterTab === 'favorites' ? 'Избранные квизы появятся здесь' : 'Создайте первую историю'}
    </h3>
    <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-500">
      {filterTab === 'favorites'
        ? 'Отмечайте важные работы звездой, чтобы быстро возвращаться к ним перед уроком или публикацией.'
        : 'Начните с простого сценария: вступление, несколько развилок и финал. Остальное можно нарастить в редакторе.'}
    </p>
    {filterTab !== 'favorites' && (
      <button
        type="button"
        onClick={createNewQuiz}
        className="relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-extrabold text-black shadow-[0_18px_45px_rgba(251,191,36,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(251,191,36,0.26)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
      >
        <PlusIcon />
        Создать квиз
      </button>
    )}
  </section>
);

const FilterButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
      active
        ? 'bg-amber-300 text-black shadow-[0_10px_30px_rgba(251,191,36,0.18)]'
        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
    }`}
  >
    {children}
  </button>
);

const Dashboard: React.FC = () => {
  const nav = useAppNavigation();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const userQuizzes = useQuizDataStore((s) => s.userQuizzes);
  const isQuizzesLoading = useQuizDataStore((s) => s.isQuizzesLoading);
  const toggleQuizFavorite = useQuizDataStore((s) => s.toggleQuizFavorite);
  const deleteQuiz = useQuizDataStore((s) => s.deleteQuiz);

  const ent = useEntitlementStore((s) => s.entitlement);
  const sub = useEntitlementStore((s) => s.subscription);
  const plans = useEntitlementStore((s) => s.plans);
  const entInitialized = useEntitlementStore((s) => s.initialized);
  const refresh = useEntitlementStore((s) => s.refresh);

  const [cancelling, setCancelling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const [localFavorites, setLocalFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('quiz_favorites');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const createNewQuiz = () => {
    void nav.createAndOpenEditor();
  };

  useEffect(() => {
    const favoriteIds = userQuizzes
      .filter((quiz) => quiz.is_favorite)
      .map((quiz) => quiz.id);
    setLocalFavorites(new Set(favoriteIds));
    localStorage.setItem('quiz_favorites', JSON.stringify(favoriteIds));
  }, [userQuizzes]);

  useEffect(() => {
    if (session?.user?.id && !entInitialized) {
      refresh(session.user.id);
    }
  }, [session, refresh, entInitialized]);

  const handleCancel = async () => {
    if (!window.confirm('Отменить подписку? Доступ сохранится до конца оплаченного периода.')) return;
    setCancelling(true);
    try {
      await cancelSubscription();
      toast.success('Подписка будет отменена в конце периода');
      if (session?.user?.id) await refresh(session.user.id);
    } catch (e) {
      console.error('[dashboard] cancel failed:', e);
      toast.error('Не удалось отменить подписку');
    } finally {
      setCancelling(false);
    }
  };

  const handleToggleFavorite = async (quizId: string) => {
    setLocalFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(quizId)) {
        next.delete(quizId);
      } else {
        next.add(quizId);
      }
      localStorage.setItem('quiz_favorites', JSON.stringify(Array.from(next)));
      return next;
    });

    if (toggleQuizFavorite) {
      await toggleQuizFavorite(quizId);
    }
  };

  const confirmDelete = async () => {
    if (!quizToDelete) return;
    await deleteQuiz(quizToDelete);
    setQuizToDelete(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const getInitials = (email?: string) => {
    if (!email) return 'П';
    return email.charAt(0).toUpperCase();
  };

  const stats = useMemo(() => {
    const totalQuizzes = userQuizzes.length;
    const totalNodes = userQuizzes.reduce((acc, quiz) => acc + (quiz.quiz_data.nodes?.length || 0), 0);
    const totalQuestions = userQuizzes.reduce((acc, quiz) => {
      const questionNodes = quiz.quiz_data.nodes?.filter((n) => (
        n.type === CustomNodeType.Question || n.type === CustomNodeType.MultipleChoice
      )).length || 0;
      return acc + questionNodes;
    }, 0);

    const recentQuizzes = userQuizzes.filter((quiz) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(quiz.created_at) > weekAgo;
    }).length;

    const favoriteQuizzes = userQuizzes.filter((quiz) => quiz.is_favorite).length;

    return {
      totalQuizzes,
      totalQuestions,
      avgNodes: totalQuizzes > 0 ? (totalNodes / totalQuizzes).toFixed(1) : 0,
      recentQuizzes,
      favoriteQuizzes,
    };
  }, [userQuizzes]);

  const filteredAndSortedQuizzes = useMemo(() => {
    let filtered = userQuizzes.filter((quiz) =>
      quiz.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filterTab === 'recent') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter((quiz) => new Date(quiz.created_at) > weekAgo);
    } else if (filterTab === 'favorites') {
      filtered = filtered.filter((quiz) => quiz.is_favorite === true);
    }

    return filtered.sort((a, b) => {
      const aIsFav = a.is_favorite || localFavorites.has(a.id);
      const bIsFav = b.is_favorite || localFavorites.has(b.id);

      if (aIsFav !== bIsFav) {
        return aIsFav ? -1 : 1;
      }

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [userQuizzes, searchTerm, sortBy, filterTab, localFavorites]);

  const displayName = session?.user?.email?.split('@')[0] || 'автор';

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#f5efe3] text-stone-950 overflow-x-hidden flex flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-900/10 bg-[#fffaf0]/86 backdrop-blur-xl shadow-[0_14px_45px_rgba(120,53,15,0.06)]">
        <div className="mx-auto flex h-18 max-w-[1400px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3" title="На главную страницу">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_16px_40px_rgba(251,191,36,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5">
              <BoltMark />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-stone-900">Поток</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">кабинет автора</span>
            </span>
          </Link>

          <nav className="hidden rounded-xl border border-stone-200 bg-white p-1 md:flex" aria-label="Основная навигация">
            <span className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-black shadow-[0_10px_30px_rgba(251,191,36,0.18)]">
              Мои квизы
            </span>
            <Link to="/public" className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
              Галерея
            </Link>
            <Link to="/billing" className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
              Подписка
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-black">
                {getInitials(session?.user?.email)}
              </span>
              <span className="max-w-[180px] truncate text-sm font-semibold text-stone-600">
                {session?.user?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-amber-300 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-28 pt-10 sm:px-6 lg:pt-14">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-[2.2rem_0.75rem_2.2rem_0.75rem] bg-white p-6 shadow-[0_16px_48px_rgba(120,53,15,0.06)] sm:p-8 lg:p-10">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-200/30 blur-[95px]" />
            <div className="absolute bottom-0 left-10 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
            <div className="relative">
              <div className="mb-7 flex items-center gap-4">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">рабочее пространство</span>
              </div>
              <h1 className="max-w-3xl text-balance font-serif text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-stone-950">
                {getGreeting()},<span className="block italic bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">{displayName}</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-500 md:text-lg">
                Здесь собраны ваши интерактивные истории: черновики, избранные сценарии и последние работы. Начните новый квиз или вернитесь к тому, что уже готово к публикации.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={createNewQuiz}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-extrabold text-black shadow-[0_18px_45px_rgba(251,191,36,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(251,191,36,0.27)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  <PlusIcon />
                  Создать квиз
                </button>
                <Link
                  to="/templates"
                  className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-600 transition-all duration-200 hover:border-amber-300 hover:bg-white hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  Открыть шаблоны
                </Link>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-white p-6 shadow-[0_16px_48px_rgba(120,53,15,0.06)]">
            <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-amber-200/30 blur-3xl" />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">статус доступа</p>
            {ent.plan === 'pro' && sub ? (
              <div className="relative mt-5">
                <div className="overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem] border border-amber-200/60 bg-amber-50/60 p-5 md:p-6">
                  <header className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className="bg-gradient-to-r from-amber-300 to-orange-400 text-black text-[10px] font-extrabold px-2.5 py-1 rounded-sm uppercase tracking-[0.18em]">
                        Активно
                      </span>
                      {sub.cancel_at_period_end && (
                        <span className="inline-flex items-center rounded-md text-[11px] px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 font-semibold uppercase tracking-wider">
                          Истекает
                        </span>
                      )}
                      <p className="text-sm text-stone-500">
                        Тариф <strong className="text-stone-900">{plans.find((p) => p.id === sub.plan_id)?.name ?? sub.plan_id}</strong> действует до{' '}
                        <strong className="text-stone-900">{formatDate(sub.current_period_end)}</strong>
                      </p>
                    </div>
                    {!sub.cancel_at_period_end && (
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="px-4 py-2 rounded-lg border border-stone-200 text-sm font-semibold text-stone-500 bg-white hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        {cancelling ? 'Отменяем…' : 'Отменить подписку'}
                      </button>
                    )}
                  </header>
                  <SubscriptionProgress start={sub.current_period_start} end={sub.current_period_end} />
                </div>
              </div>
            ) : (
              <div className="relative mt-5">
                <h2 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950">Free</h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">
                  Базовый режим подходит для первых сценариев. PRO откроет больше квизов, шаблонов и публикаций без лишних ограничений.
                </p>
                <Link
                  to="/billing"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-3 text-sm font-extrabold text-black transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  Посмотреть тарифы
                </Link>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<FolderIcon />} label="квизы" value={stats.totalQuizzes} detail="Все сохранённые сценарии" />
          <StatCard icon={<QuestionIcon />} label="вопросы" value={stats.totalQuestions} detail="Вопросы в ваших квизах" />
          <StatCard icon={<StarIcon />} label="избранное" value={stats.favoriteQuizzes} detail="Быстрый доступ сверху" />
          <StatCard icon={<CalendarIcon />} label="за неделю" value={stats.recentQuizzes} detail={`Среднее узлов: ${stats.avgNodes}`} />
        </section>

        <section className="mt-8 rounded-[1.8rem_0.65rem_1.8rem_0.65rem] bg-white p-4 shadow-[0_16px_48px_rgba(120,53,15,0.06)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex w-fit flex-wrap gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1">
              <FilterButton active={filterTab === 'all'} onClick={() => setFilterTab('all')}>Все</FilterButton>
              <FilterButton active={filterTab === 'recent'} onClick={() => setFilterTab('recent')}>Недавние</FilterButton>
              <FilterButton active={filterTab === 'favorites'} onClick={() => setFilterTab('favorites')}>Избранные</FilterButton>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Найти квиз по названию"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 transition-all duration-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
                />
              </label>

              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMode)}
                  className="min-w-[150px] cursor-pointer appearance-none rounded-xl border border-stone-200 bg-stone-50 bg-no-repeat px-4 py-3 pr-9 text-sm font-semibold text-stone-600 transition-all duration-200 hover:border-amber-300 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
                  style={{ backgroundImage: SELECT_ARROW_SVG, backgroundPosition: 'right 0.65rem center', backgroundSize: '1.35em 1.35em' }}
                >
                  <option value="date">По дате</option>
                  <option value="name">По имени</option>
                </select>

                <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg p-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${viewMode === 'grid' ? 'bg-amber-300 text-black' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'}`}
                    title="Сетка"
                  >
                    <GridIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg p-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${viewMode === 'list' ? 'bg-amber-300 text-black' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'}`}
                    title="Список"
                  >
                    <ListIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          {isQuizzesLoading ? (
            <LoadingState viewMode={viewMode} />
          ) : filteredAndSortedQuizzes.length > 0 ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-sm text-stone-500">
                  Найдено <span className="font-bold text-stone-900">{filteredAndSortedQuizzes.length}</span>
                  {filterTab === 'all' && stats.favoriteQuizzes > 0 && (
                    <span className="ml-2 text-amber-600">
                      избранные закреплены выше
                    </span>
                  )}
                </p>
              </div>
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'flex flex-col gap-4'
              }>
                {filteredAndSortedQuizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    viewMode={viewMode}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={setQuizToDelete}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState filterTab={filterTab} createNewQuiz={createNewQuiz} />
          )}
        </section>
      </main>

      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-[1.6rem_0.55rem_1.6rem_0.55rem] bg-white p-6 text-center shadow-[0_40px_140px_rgba(120,53,15,0.15)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500">
              <TrashIcon />
            </div>
            <h3 className="mt-5 font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Удалить квиз?</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Это действие нельзя отменить. Квиз и связанные результаты будут удалены.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="relative z-10 border-t border-stone-900/10 bg-[#fffaf0]/80">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-semibold text-stone-600">Поток</p>
            <p className="mt-1 text-xs text-stone-400">Рабочее пространство для визуального редактора квизов.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <button type="button" onClick={() => setIsSupportOpen(true)} className="text-sm font-semibold text-stone-500 transition-colors hover:text-stone-900">
              Помощь
            </button>
            <Link to="/docs" className="text-sm font-semibold text-stone-500 transition-colors hover:text-stone-900">
              Документация
            </Link>
            <Link to="/billing" className="text-sm font-semibold text-stone-500 transition-colors hover:text-stone-900">
              Тарифы
            </Link>
          </div>
        </div>
      </footer>

      <SupportCenterModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
};

export default Dashboard;

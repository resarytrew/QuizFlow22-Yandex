import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/apiClient';
import { PublicQuiz } from '../../types.ts';
import PublicQuizCard from './PublicQuizCard.tsx';
import AuthModal from '../modals/AuthModal.tsx';
import { useUIStore } from '../../store/useUIStore';
import BentoGrid from '../ui/BentoGrid.tsx';
import GalleryCard from '../ui/GalleryCard.tsx';
import ScrollToTop from '../ui/ScrollToTop.tsx';
import AnimatedCounter from '../ui/AnimatedCounter.tsx';
import { Link } from '@tanstack/react-router';
import { normalizeQuizKeywords } from '../../utils/quizKeywords';

const PAGE_SIZE = 12;

const templateLabels: Record<string, string> = {
  default: 'Классический', ww2: 'ВОВ', economic: 'Экономика', yandex: 'Яндекс',
  army: 'Армия', science: 'Наука', math: 'Математика', history: 'История', newyear: 'Новый год', screenQuiz: 'Экранная',
};

function getGroupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return 'На этой неделе';
  if (diffDays < 30) return 'В этом месяце';
  return 'Ранее';
}

const PublicQuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const isAuthModalOpen = useUIStore(s => s.isAuthModalOpen);
  const setAuthModalOpen = useUIStore(s => s.setAuthModalOpen);

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listPublicQuizzes();
      setQuizzes((data as PublicQuiz[]) || []);
    } catch (err) {
      console.error('Error fetching public quizzes:', err);
      setError('Не удалось загрузить галерею квизов.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    quizzes.forEach(q => {
      const tid = q.quiz_data?.templateId as string | undefined;
      if (tid && templateLabels[tid]) tags.add(tid);
    });
    return Array.from(tags);
  }, [quizzes]);

  const allKeywords = useMemo(() => {
    const keywords = new Map<string, string>();
    quizzes.forEach((quiz) => {
      normalizeQuizKeywords(quiz.quiz_data?.keywords).forEach((keyword) => {
        const key = keyword.toLocaleLowerCase('ru-RU');
        if (!keywords.has(key)) keywords.set(key, keyword);
      });
    });
    return Array.from(keywords.values()).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase('ru-RU');
    return quizzes.filter(quiz => {
      const keywords = normalizeQuizKeywords(quiz.quiz_data?.keywords);
      const keywordText = keywords.join(' ').toLocaleLowerCase('ru-RU');
      const matchesSearch = quiz.name.toLocaleLowerCase('ru-RU').includes(query) ||
        (quiz.quiz_data?.description || '').toLocaleLowerCase('ru-RU').includes(query) ||
        keywordText.includes(query);
      const matchesTag = selectedTag
        ? (quiz.quiz_data?.templateId as string) === selectedTag
        : true;
      const matchesKeyword = selectedKeyword
        ? keywords.some((keyword) => keyword.toLocaleLowerCase('ru-RU') === selectedKeyword.toLocaleLowerCase('ru-RU'))
        : true;
      return matchesSearch && matchesTag && matchesKeyword;
    });
  }, [quizzes, searchTerm, selectedTag, selectedKeyword]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, selectedTag, selectedKeyword]);

  const groupedQuizzes = useMemo(() => {
    const groups: Record<string, PublicQuiz[]> = {};
    filteredQuizzes.forEach(q => {
      const label = getGroupLabel(q.published_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(q);
    });
    const order = ['Сегодня', 'Вчера', 'На этой неделе', 'В этом месяце', 'Ранее'];
    return order.filter(g => groups[g]).map(g => ({ label: g, items: groups[g] }));
  }, [filteredQuizzes]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + PAGE_SIZE);
      setIsLoadingMore(false);
    }, 400);
  };

  const hasMore = filteredQuizzes.length > visibleCount;
  const visibleGrouped = useMemo(() => {
    let count = 0;
    return groupedQuizzes.map(group => {
      const slice = group.items.slice(0, Math.max(0, visibleCount - count));
      count += slice.length;
      return { ...group, items: slice };
    }).filter(g => g.items.length > 0);
  }, [groupedQuizzes, visibleCount]);

  return (
    <div className="min-h-[100dvh] text-gray-900 font-sans overflow-x-hidden relative"
      style={{
        backgroundColor: '#f8f9fa',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23dce0e9' stroke-width='0.7'%3E%3Cpath d='M40 4L76 40 40 76 4 40z'/%3E%3Cpath d='M40 20L56 40 40 60 24 40z' stroke-width='0.4' opacity='0.5'/%3E%3C/g%3E%3C/svg%3E"), radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)`,
        backgroundSize: '80px 80px, 100% 100%',
        backgroundPosition: '0 0, 0 0',
      }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              П
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">Поток</span>
          </Link>

          <div className="flex-1 max-w-md relative group/search">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200 rounded-3xl blur-lg opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within/search:text-indigo-400 transition-colors z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input name="components-public-publicquizzespage-157-input"
              type="text"
              placeholder="Найти квиз по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="relative w-full bg-gray-50 border border-gray-200/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-lg focus:shadow-indigo-100/50 transition-all duration-300"
            />
          </div>

          <Link
            to="/"
            className="shrink-0 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200"
          >
            Создать свой квиз
          </Link>
        </div>

        {/* Tags bar */}
        {allTags.length > 0 && (
          <div className="max-w-[1400px] mx-auto px-6 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-hide [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
            <button
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                !selectedTag
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              Все
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  tag === selectedTag
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-transparent'
                }`}
              >
                {templateLabels[tag] || tag}
              </button>
            ))}
          </div>
        )}
        {allKeywords.length > 0 && (
          <div className="max-w-[1400px] mx-auto px-6 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-hide [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Ключи</span>
            <button
              onClick={() => setSelectedKeyword(null)}
              className={`shrink-0 px-3 py-1.5 rounded-[0.8rem_0.25rem_0.8rem_0.25rem] border text-xs font-semibold transition-all duration-200 ${
                !selectedKeyword
                  ? 'border-stone-900 bg-stone-950 text-amber-50 shadow-sm'
                  : 'border-stone-200 bg-[#fffaf0] text-stone-500 hover:border-amber-200 hover:text-stone-800'
              }`}
            >
              Все ключевые слова
            </button>
            {allKeywords.map(keyword => (
              <button
                key={keyword.toLocaleLowerCase('ru-RU')}
                onClick={() => setSelectedKeyword(keyword === selectedKeyword ? null : keyword)}
                className={`shrink-0 px-3 py-1.5 rounded-[0.8rem_0.25rem_0.8rem_0.25rem] border text-xs font-semibold transition-all duration-200 ${
                  keyword === selectedKeyword
                    ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-stone-200 bg-[#fffaf0] text-stone-500 hover:border-amber-200 hover:text-stone-800'
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Header info */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-gray-900 via-indigo-600 to-gray-900 bg-clip-text text-transparent">
            Галерея квизов
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-gray-400 text-sm mt-2"
          >
            {isLoading
              ? 'Загрузка...'
              : error
                ? 'Ошибка загрузки'
                : <><AnimatedCounter value={filteredQuizzes.length} /> {filteredQuizzes.length === 1 ? 'квиз' : filteredQuizzes.length < 5 ? 'квиза' : 'квизов'}</>
            }
          </motion.p>
        </motion.div>

        {/* Content states */}
        {isLoading ? (
          <BentoGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <GalleryCard key={i} skeleton />
            ))}
          </BentoGrid>
        ) : error ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-lg text-gray-500 font-medium">{error}</p>
            <button
              onClick={fetchQuizzes}
              className="mt-6 px-5 py-2.5 text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all border border-gray-200"
            >
              Повторить
            </button>
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <>
            {visibleGrouped.map(group => (
              <div key={group.label} className="mb-10">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{group.label}</h2>
                <BentoGrid key={group.label}>
                  {group.items.map(quiz => (
                    <PublicQuizCard key={quiz.id} quiz={quiz} />
                  ))}
                </BentoGrid>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="group relative px-8 py-3 text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className={isLoadingMore ? 'opacity-0' : 'opacity-100'}>
                    Загрузить ещё
                  </span>
                  {isLoadingMore && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg text-gray-400 font-medium">Ничего не найдено</p>
            <p className="text-sm text-gray-300 mt-2 mb-6">Попробуйте изменить параметры поиска</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedTag(null); setSelectedKeyword(null); }}
              className="px-5 py-2.5 text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all border border-gray-200"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </main>

      {/* FAB */}
      <Link
        to="/"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      <footer className="border-t border-gray-200/50">
        <div className="max-w-[1400px] mx-auto px-6 py-8 text-center text-gray-400 text-xs">
          <p>© {new Date().getFullYear()} Поток. Квизы сообщества.</p>
        </div>
      </footer>

      <AuthModal
        id="public-auth-modal"
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <ScrollToTop />
    </div>
  );
};

export default PublicQuizzesPage;

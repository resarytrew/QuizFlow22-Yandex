import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { TEMPLATES } from '../data/templates.ts';
import AuthModal from './modals/AuthModal.tsx';
import BentoGrid from './ui/BentoGrid.tsx';
import GalleryCard from './ui/GalleryCard.tsx';
import ScrollToTop from './ui/ScrollToTop.tsx';
import AnimatedCounter from './ui/AnimatedCounter.tsx';
import { Link } from '@tanstack/react-router';
import { useAppNavigation } from '@/src/router/useAppNavigation';

const ALL_TAGS = Array.from(
  new Set(TEMPLATES.flatMap(t => t.tags))
).sort();

const TemplatesPage: React.FC = () => {
  const session = useAuthStore(s => s.session);
  const nav = useAppNavigation();
  const setPendingTemplate = useQuizDataStore(s => s.setPendingTemplate);
  const setAuthModalOpen = useUIStore(s => s.setAuthModalOpen);
  const isAuthModalOpen = useUIStore(s => s.isAuthModalOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag ? template.tags.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    });
  }, [searchQuery, selectedTag]);

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    if (!session) {
      setPendingTemplate(template.data);
      setAuthModalOpen(true);
      return;
    }
    void nav.createAndOpenEditor(template.data);
  };

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

          <div className="flex-1 max-w-md relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200 rounded-3xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-indigo-400 transition-colors z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="template-search"
              name="template-search"
              type="text"
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative w-full bg-gray-50 border border-gray-200/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-lg focus:shadow-indigo-100/50 transition-all duration-300"
            />
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => setAuthModalOpen(true)} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Войти
            </button>
            <button onClick={() => setAuthModalOpen(true)} className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200">
              Регистрация
            </button>
          </div>
        </div>

        {/* Tags bar */}
        {ALL_TAGS.length > 0 && (
          <div className="max-w-[1400px] mx-auto px-6 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-hide [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
            <button
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                !selectedTag
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              Все
            </button>
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  tag === selectedTag
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-transparent'
                }`}
              >
                {tag}
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
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-gray-900 via-indigo-600 to-gray-900 bg-clip-text text-transparent">
              Галерея шаблонов
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-gray-400 text-sm mt-2"
            >
              <AnimatedCounter value={filteredTemplates.length} /> {filteredTemplates.length === 1 ? 'шаблон' : filteredTemplates.length < 5 ? 'шаблона' : 'шаблонов'}
            </motion.p>
          </div>
        </motion.div>

        {/* Grid */}
        {filteredTemplates.length > 0 ? (
          <BentoGrid>
            {filteredTemplates.map((template, index) => (
              <div key={template.id} onClick={() => handleSelectTemplate(template)} className="cursor-pointer">
                <GalleryCard>
                  {/* Gradient header */}
                  <div className={`h-40 bg-gradient-to-br ${template.gradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-4 left-5">
                      <h3 className="text-xl font-bold text-white drop-shadow-sm">{template.title}</h3>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-3">
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-2">
                      <div className="flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                          Использовать шаблон
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </GalleryCard>
              </div>
            ))}
          </BentoGrid>
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
              onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
              className="px-5 py-2.5 text-sm font-medium bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all border border-gray-200"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200/50">
        <div className="max-w-[1400px] mx-auto px-6 py-8 text-center text-gray-400 text-xs">
          <p>© {new Date().getFullYear()} Поток. Библиотека шаблонов.</p>
        </div>
      </footer>

      <AuthModal id="templates-auth-modal" isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ScrollToTop />
    </div>
  );
};

export default TemplatesPage;

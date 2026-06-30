
import React, { useState } from 'react';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import { Quiz, QuizVisibility } from '../types.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import QuizVisibilityModal from './modals/QuizVisibilityModal.tsx';
import AnalyticsModal from './modals/AnalyticsModal.tsx';

interface Props {
    quiz: Quiz;
    viewMode: 'grid' | 'list';
    onToggleFavorite: (quizId: string) => void;
    onDelete: (quizId: string) => void;
}

function resolveVisibility(quiz: Quiz): QuizVisibility {
    if (quiz.visibility === 'private' || quiz.visibility === 'unlisted' || quiz.visibility === 'public') {
        return quiz.visibility;
    }
    // Back-compat: legacy rows that have no `visibility` column populated
    // (or empty string) fall back to is_published. Server-side triggers
    // guarantee these stay in sync for new rows.
    return quiz.is_published ? 'public' : 'private';
}

const VisibilityBadge: React.FC<{ visibility: QuizVisibility; compact?: boolean }> = ({ visibility, compact }) => {
    const sizeClass = compact ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1 text-[10px]';

    if (visibility === 'public') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50/80 ${sizeClass} font-bold uppercase tracking-[0.14em] text-emerald-700`}
                title="Квиз опубликован и доступен всем"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                В галерее
            </span>
        );
    }
    if (visibility === 'unlisted') {
        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/90 ${sizeClass} font-bold uppercase tracking-[0.14em] text-amber-800`}
                title="Доступен только по прямой ссылке"
            >
                <svg className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                По ссылке
            </span>
        );
    }
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100/80 ${sizeClass} font-bold uppercase tracking-[0.14em] text-stone-600`}
            title="Виден только вам"
        >
            <svg className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
            </svg>
            Только мне
        </span>
    );
};

const ScenarioCover: React.FC = () => (
    <div className="relative h-16 overflow-hidden rounded-[1rem_0.35rem_1rem_0.35rem] border border-stone-200 bg-[#f7f0e3] text-stone-900 shadow-inner">
        <div
            className="absolute inset-0 opacity-60"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(120, 113, 108, 0.22) 1px, transparent 0)', backgroundSize: '14px 14px' }}
        />
        <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-300/25 blur-2xl" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 180 64" fill="none" aria-hidden="true">
            <path d="M18 47h42c18 0 19-27 41-27h61" stroke="rgba(87,83,78,0.28)" strokeWidth="2" strokeLinecap="round" />
            <path d="M23 20h36c14 0 16 18 33 18h31" stroke="rgba(180,83,9,0.34)" strokeWidth="2" strokeLinecap="round" />
            <path d="M116 38h39" stroke="rgba(87,83,78,0.22)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="47" r="3.5" fill="#b45309" />
            <circle cx="101" cy="20" r="3.5" fill="#b45309" />
            <circle cx="155" cy="38" r="3.5" fill="#292524" />
        </svg>
        <span className="absolute bottom-2 left-3 rounded-sm border border-stone-900/10 bg-[#fffaf0]/82 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 backdrop-blur">
            flow map
        </span>
    </div>
);

const ActionButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    tone?: 'default' | 'danger';
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ label, icon, tone = 'default', onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
            tone === 'danger'
                ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-200'
                : 'border-stone-200 bg-[#fffaf0]/70 text-stone-600 hover:border-amber-200 hover:bg-amber-50 hover:text-stone-950 focus-visible:ring-amber-300'
        }`}
    >
        <span className={tone === 'danger' ? 'text-red-500' : 'text-amber-700'}>{icon}</span>
        <span>{label}</span>
    </button>
);

const AnalyticsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);

const AccessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/><path d="M12 12v-4"/><path d="m16 16-2-2-2 2"/><path d="m8 16 2-2 2 2"/><path d="M12 12v4"/></svg>
);

const DuplicateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

const QuizCard: React.FC<Props> = ({ quiz, viewMode, onToggleFavorite, onDelete }) => {
    const nav = useAppNavigation();
    const duplicateQuiz = useQuizDataStore(s => s.duplicateQuiz);
    const analyticsQuizId = useQuizDataStore(s => s.analyticsQuizId);
    const setAnalyticsQuizId = useQuizDataStore(s => s.setAnalyticsQuizId);
    const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);

    const isAnalyticsOpen = analyticsQuizId === quiz.id;

    const nodeCount = quiz.quiz_data.nodes?.length || 0;
    const creationDate = new Date(quiz.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const handleAction = (action: () => void | Promise<unknown>) => (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        void action();
    };

    const commonClasses = "group relative rounded-[1.45rem_0.5rem_1.45rem_0.5rem] border border-stone-200/90 bg-[#fffaf0] shadow-[0_12px_36px_rgba(120,53,15,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_22px_60px_rgba(120,53,15,0.13)] cursor-pointer";
    const favoriteButtonClass = quiz.is_favorite
        ? 'border-amber-200 bg-amber-100 text-amber-700'
        : 'border-stone-200 bg-white/70 text-stone-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700';
    const actions = (
        <>
            <ActionButton label="Аналитика" icon={<AnalyticsIcon />} onClick={handleAction(() => setAnalyticsQuizId(quiz.id))} />
            <ActionButton label="Доступ" icon={<AccessIcon />} onClick={handleAction(() => setIsVisibilityModalOpen(true))} />
            <ActionButton label="Дублировать" icon={<DuplicateIcon />} onClick={handleAction(() => duplicateQuiz(quiz.id))} />
            <ActionButton label="Удалить" icon={<DeleteIcon />} tone="danger" onClick={handleAction(() => onDelete(quiz.id))} />
        </>
    );

    return (
        <>
            {viewMode === 'grid' ? (
                <article className={`${commonClasses} flex flex-col justify-between`} onClick={() => nav.openQuizInEditor(quiz)}>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="p-5">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <ScenarioCover />
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
                                className={`shrink-0 rounded-lg border p-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${favoriteButtonClass}`}
                                aria-label="Переключить избранное"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={quiz.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </button>
                        </div>
                        <div className="flex min-h-[5.8rem] flex-col">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">сценарий</span>
                                <span className="h-px flex-1 bg-stone-200" />
                            </div>
                             <h3 className="line-clamp-2 text-balance font-serif text-[1.45rem] font-semibold leading-[1.02] tracking-[-0.035em] text-stone-950 transition-colors duration-300 group-hover:text-amber-800" title={quiz.name}>
                                {quiz.name}
                            </h3>
                            <div className="mt-auto pt-4">
                                <VisibilityBadge visibility={resolveVisibility(quiz)} compact />
                            </div>
                        </div>
                        <dl className="mt-5 grid grid-cols-[1fr_auto] gap-3 border-t border-stone-200 pt-4 text-sm">
                            <div>
                                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">создан</dt>
                                <dd className="mt-1 font-medium text-stone-600">{creationDate}</dd>
                            </div>
                            <div className="text-right">
                                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">узлы</dt>
                                <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-stone-900">{nodeCount}</dd>
                            </div>
                        </dl>
                    </div>
                    <div className="border-t border-stone-200 bg-[#fbf4e8]/70 px-3 py-3">
                        <div className="grid grid-cols-2 gap-2">
                            {actions}
                        </div>
                    </div>
                </article>
            ) : (
                <article className={`${commonClasses} flex items-center gap-5 p-5`} onClick={() => nav.openQuizInEditor(quiz)}>
                    <div className="w-44 shrink-0">
                        <ScenarioCover />
                    </div>
                    <div className="min-w-0 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                             <h3 className="truncate font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950 transition-colors duration-300 group-hover:text-amber-800" title={quiz.name}>{quiz.name}</h3>
                             <VisibilityBadge visibility={resolveVisibility(quiz)} compact />
                        </div>
                         <p className="mt-2 text-sm font-medium text-stone-500">Создан: {creationDate} <span className="mx-2 text-stone-300">/</span> <span className="font-mono tabular-nums text-stone-700">{nodeCount}</span> узлов</p>
                    </div>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
                        className={`rounded-lg border p-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${favoriteButtonClass}`}
                        aria-label="Переключить избранное"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={quiz.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>
                    <div className="ml-auto grid shrink-0 grid-cols-2 gap-2">
                        {actions}
                    </div>
                </article>
            )}
            
            {isAnalyticsOpen && (
                 <AnalyticsModal
                    isOpen={isAnalyticsOpen}
                    onClose={() => setAnalyticsQuizId(null)}
                    quizId={quiz.id}
                    quizName={quiz.name}
                />
            )}
            {isVisibilityModalOpen && (
                <QuizVisibilityModal
                    isOpen={isVisibilityModalOpen}
                    onClose={() => setIsVisibilityModalOpen(false)}
                    quiz={quiz}
                />
            )}
        </>
    );
};

export default QuizCard;

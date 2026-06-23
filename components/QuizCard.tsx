
import React, { useState, useRef, useEffect } from 'react';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import { Quiz, QuizVisibility } from '../types.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import PreviewModal from './modals/PreviewModal.tsx';
import ShareModal from './modals/ShareModal.tsx';
import QuizVisibilityModal from './modals/QuizVisibilityModal.tsx';
import AnalyticsModal from './modals/AnalyticsModal.tsx';
import { generateQuizHtmlProgrammatically } from '../services/quizGenerator';

interface Props {
    quiz: Quiz;
    viewMode: 'grid' | 'list';
    onToggleFavorite: (quizId: string) => void;
    onDelete: (quizId: string) => void;
}

const ActionsMenu = React.memo(({ quiz, menuRef, isMenuOpen, setIsMenuOpen, loadQuiz, setAnalyticsQuizId, duplicateQuiz, onDelete }: {
    quiz: Quiz;
    menuRef: React.RefObject<HTMLDivElement | null>;
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
    loadQuiz: (quiz: Quiz) => void;
    setAnalyticsQuizId: (id: string | null) => void;
    duplicateQuiz: (id: string) => Promise<string | null>;
    onDelete: (quizId: string) => void;
}) => {
    const ensureQuizLoaded = useQuizDataStore(s => s.ensureQuizLoaded);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);

    const handleAction = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action();
        setIsMenuOpen(false);
    };

    const openPreview = async () => {
        setIsPreviewLoading(true);
        const loadedQuiz = await ensureQuizLoaded(quiz.id);
        setIsPreviewLoading(false);
        if (loadedQuiz) setIsPreviewOpen(true);
    };

    return (
        <>
            <div ref={menuRef} className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                    className="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200/75 py-1.5 z-10 animate-fade-in">
                        <button onClick={handleAction(() => loadQuiz(quiz))} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>Редактировать</button>
                        <button onClick={handleAction(() => setAnalyticsQuizId(quiz.id))} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>Аналитика</button>
                        <button onClick={handleAction(() => setIsVisibilityModalOpen(true))} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/><path d="M12 12v-4"/><path d="m16 16-2-2-2 2"/><path d="m8 16 2-2 2 2"/><path d="M12 12v4"/></svg>Настроить доступ</button>
                        {resolveVisibility(quiz) !== 'private' && <button onClick={handleAction(() => setIsShareModalOpen(true))} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>Поделиться</button>}
                        <button onClick={handleAction(() => duplicateQuiz(quiz.id))} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Дублировать</button>
                        <button disabled={isPreviewLoading} onClick={handleAction(() => { void openPreview(); })} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>{isPreviewLoading ? 'Загрузка...' : 'Предпросмотр'}</button>
                        <div className="my-1 h-px bg-gray-200/75"></div>
                        <button onClick={handleAction(() => onDelete(quiz.id))} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Удалить</button>
                    </div>
                )}
            </div>
            {isPreviewOpen && (
                 <PreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    htmlContent={generateQuizHtmlProgrammatically(
                        quiz.quiz_data.nodes,
                        quiz.quiz_data.edges,
                        quiz.quiz_data.globalTimer,
                        quiz.quiz_data.designSettings,
                        quiz.id,
                        quiz.quiz_data.templateId || 'default',
                        quiz.name,
                        { preview: true }
                    )}
                />
            )}
            {isShareModalOpen && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    quiz={quiz}
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
});

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
    if (visibility === 'public') {
        return (
            <span
                className={`inline-flex items-center gap-1 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} font-semibold rounded-full bg-emerald-100 text-emerald-700`}
                title="Квиз опубликован и доступен всем"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                В галерее
            </span>
        );
    }
    if (visibility === 'unlisted') {
        return (
            <span
                className={`inline-flex items-center gap-1 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} font-semibold rounded-full bg-indigo-100 text-indigo-700`}
                title="Доступен только по прямой ссылке"
            >
                <svg className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                По ссылке
            </span>
        );
    }
    return (
        <span
            className={`inline-flex items-center gap-1 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} font-semibold rounded-full bg-slate-100 text-slate-600`}
            title="Виден только вам"
        >
            <svg className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
            </svg>
            Только мне
        </span>
    );
};

const QuizCard: React.FC<Props> = ({ quiz, viewMode, onToggleFavorite, onDelete }) => {
    const nav = useAppNavigation();
    const duplicateQuiz = useQuizDataStore(s => s.duplicateQuiz);
    const analyticsQuizId = useQuizDataStore(s => s.analyticsQuizId);
    const setAnalyticsQuizId = useQuizDataStore(s => s.setAnalyticsQuizId);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isAnalyticsOpen = analyticsQuizId === quiz.id;

    const nodeCount = quiz.quiz_data.nodes?.length || 0;
    const creationDate = new Date(quiz.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const commonClasses = "bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.03] hover:border-indigo-200 cursor-pointer";

    return (
        <>
            {viewMode === 'grid' ? (
                <div className={commonClasses} onClick={() => nav.openQuizInEditor(quiz)}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-lg flex items-center justify-center`}>
                                <svg className="h-7 w-7 text-indigo-600" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="currentColor"/>
                                    <path d="M12 6L12 12L16 14" stroke="#f8f9fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
                                className={`p-2 rounded-full transition-colors ${quiz.is_favorite ? 'text-orange-500 bg-orange-100' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={quiz.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                             <h3 className="text-lg font-bold text-gray-900 truncate" title={quiz.name}>
                                {quiz.name}
                            </h3>
                            <VisibilityBadge visibility={resolveVisibility(quiz)} compact />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Создан: {creationDate}</p>
                        <p className="text-sm text-gray-500 mt-1">{nodeCount} узлов</p>
                    </div>
                    <div className="border-t border-gray-200/75 px-3 py-2 bg-gray-50/50 rounded-b-xl">
                        <div className="flex items-center justify-end">
                           <ActionsMenu 
                                quiz={quiz}
                                menuRef={menuRef}
                                isMenuOpen={isMenuOpen}
                                setIsMenuOpen={setIsMenuOpen}
                                loadQuiz={nav.openQuizInEditor}
                                setAnalyticsQuizId={setAnalyticsQuizId}
                                duplicateQuiz={duplicateQuiz}
                                onDelete={onDelete}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`${commonClasses} !flex-row !items-center !p-6 gap-6`} onClick={() => nav.openQuizInEditor(quiz)}>
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="h-8 w-8 text-indigo-600" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" fill="currentColor"/>
                            <path d="M12 6L12 12L16 14" stroke="#f8f9fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                             <h3 className="text-lg font-bold text-gray-900 truncate" title={quiz.name}>{quiz.name}</h3>
                             <VisibilityBadge visibility={resolveVisibility(quiz)} compact />
                        </div>
                         <p className="text-sm text-gray-500 mt-1">Создан: {creationDate} &middot; {nodeCount} узлов</p>
                    </div>
                     <button 
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
                        className={`p-2 rounded-full transition-colors ${quiz.is_favorite ? 'text-orange-500 bg-orange-100' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={quiz.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>
                    <div className="ml-auto">
                        <ActionsMenu 
                            quiz={quiz}
                            menuRef={menuRef}
                            isMenuOpen={isMenuOpen}
                            setIsMenuOpen={setIsMenuOpen}
                            loadQuiz={nav.openQuizInEditor}
                            setAnalyticsQuizId={setAnalyticsQuizId}
                            duplicateQuiz={duplicateQuiz}
                            onDelete={onDelete}
                        />
                    </div>
                </div>
            )}
            
            {isAnalyticsOpen && (
                 <AnalyticsModal
                    isOpen={isAnalyticsOpen}
                    onClose={() => setAnalyticsQuizId(null)}
                    quizId={quiz.id}
                    quizName={quiz.name}
                />
            )}
        </>
    );
};

export default QuizCard;

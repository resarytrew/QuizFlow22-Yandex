import React from 'react';
import { useAuthStore } from '../store/useAuthStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { useAppNavigation } from '@/src/router/useAppNavigation';

const MyQuizzes: React.FC = () => {
    const nav = useAppNavigation();
    const session = useAuthStore(s => s.session);
    const userQuizzes = useQuizDataStore(s => s.userQuizzes);
    const isQuizzesLoading = useQuizDataStore(s => s.isQuizzesLoading);
    const deleteQuiz = useQuizDataStore(s => s.deleteQuiz);
    const currentQuizId = useQuizDataStore(s => s.currentQuizId);

    if (!session) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-gray-500 leading-relaxed">Войдите в свой аккаунт, чтобы сохранять и загружать квизы.</p>
            </div>
        );
    }

    const handleDelete = (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        deleteQuiz(quizId);
    }

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-xs font-semibold mb-3 text-gray-400 uppercase tracking-widest px-2">Мои квизы</h2>
            <button 
                onClick={() => nav.createAndOpenEditor()}
                className="w-full flex items-center justify-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-px"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Новый квиз
            </button>

            {isQuizzesLoading ? (
                 <div className="flex-grow flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : userQuizzes.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500 leading-relaxed">У вас пока нет сохраненных квизов.</p>
                </div>
            ) : (
                <ul className="space-y-1.5 flex-grow overflow-y-auto -mr-2 pr-2">
                    {userQuizzes.map(quiz => (
                        <li key={quiz.id}>
                           <button 
                                onClick={() => nav.openQuizInEditor(quiz)}
                                className={`w-full text-left p-2.5 rounded-lg transition-colors group flex items-center justify-between
                                    ${currentQuizId === quiz.id ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                           >
                                <span className="text-sm truncate pr-2">{quiz.name}</span>
                                <span onClick={(e) => handleDelete(e, quiz.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </span>
                           </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MyQuizzes;

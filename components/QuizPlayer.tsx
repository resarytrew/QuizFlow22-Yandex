
import React, { useEffect, useState } from 'react';
import { loadQuizForPlayer } from '../services/loadQuizForPlayer.ts';

interface QuizPlayerProps {
  quizId: string;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quizId }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            // preview=true: движок загружается как <script type="module" src="/__quiz_engine.js">.
            // Иначе inline-движок блокируется строгой CSP родительской страницы
            // (script-src 'self' без unsafe-inline) и пользователь видит пустой шаблон.
            const result = await loadQuizForPlayer(quizId, { preview: true });
            if (cancelled) return;
            if (!result.ok) {
                setError(result.message);
            } else {
                setHtmlContent(result.quiz.html);
            }
            setIsLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [quizId]);

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
                <div className="w-12 h-12 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 font-semibold">Загрузка квиза...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="text-center text-red-600 p-8 bg-white rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Ошибка</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (htmlContent) {
        return (
            <iframe
                srcDoc={htmlContent}
                title="Quiz Player"
                className="w-screen h-screen border-0"
                // allow-same-origin is required for the supabase-js client
                // inside the generated quiz HTML to persist auth tokens
                // and for the postMessage bridge to the parent
                // (window.parent.postMessage handlers in the video
                // player + achievement toasts). User-supplied text in
                // the generated HTML is already sanitized via
                // parseMarkdown (DOMPurify) before injection, so the
                // attack surface is limited to the trusted engine code.
                sandbox="allow-scripts allow-same-origin"
                referrerPolicy="no-referrer"
            />
        );
    }

    return null;
};

export default QuizPlayer;

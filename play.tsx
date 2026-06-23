
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { loadQuizForPlayer } from './services/loadQuizForPlayer.ts';

const QuizPlayer = () => {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            // Поддержка обоих форматов ссылки:
            //   1. https://quiz.example.ru/play.html?play=<id>   (после редиректа с оплаты / из email)
            //   2. https://quiz.example.ru/play.html#<id>         (legacy / share из редактора)
            //   3. https://quiz.example.ru/play#/play/<id>       (HashRouter, на будущее)
            const params = new URLSearchParams(window.location.search);
            const queryId = params.get('play');
            const hashRaw = window.location.hash.replace(/^#\/?/, '');
            const hashId = hashRaw.startsWith('play/')
                ? hashRaw.slice('play/'.length)
                : hashRaw;
            const quizId = (queryId || hashId || '').replace(/[^\w-]/g, '');

            const result = await loadQuizForPlayer(quizId);
            if (!result.ok) {
                setError(result.message);
                return;
            }

            // Update link-preview meta tags so any crawler that runs JS
            // (Telegram in-app browser, Slack unfurl) sees the real
            // quiz name. Static crawlers (Discord, Facebook) see the
            // placeholders from play.html.
            if (result.quiz.quizName) {
                document.title = result.quiz.quizName;
                setMeta('og:title', result.quiz.quizName);
                setMeta('twitter:title', result.quiz.quizName);
            }
            setMeta('og:description', 'Пройдите интерактивный квиз');
            setMeta('twitter:description', 'Пройдите интерактивный квиз');
            setMeta('og:url', window.location.href);

            // Replace the entire page content with the generated quiz.
            // Standalone play page intentionally nukes the React root.
            document.open();
            document.write(result.quiz.html);
            document.close();
        };

        load();
    }, []);

    if (error) {
        return (
            <div style={{ textAlign: 'center', color: '#dc2626', padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ошибка</h2>
                <p>{error}</p>
            </div>
        );
    }

    // The loader is in the HTML, this component only renders the error state.
    return null;
};

function setMeta(property: string, content: string) {
    if (typeof document === "undefined") return;
    let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!el) {
        el = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
    }
    if (el) el.setAttribute("content", content);
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <QuizPlayer />
      </React.StrictMode>
    );
}


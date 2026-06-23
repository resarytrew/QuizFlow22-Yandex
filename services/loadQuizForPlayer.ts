// services/loadQuizForPlayer.ts
//
// Shared loader used by both the in-app QuizPlayer (components/QuizPlayer.tsx)
// and the standalone play.html entrypoint (play.tsx). The two surfaces
// differ in how they render the resulting HTML (iframe srcDoc vs.
// document.write) but the fetch + error handling is identical.

import { api } from './apiClient';
import { generateQuizHtmlProgrammatically } from './quizGenerator';
import { QuizData, QuizVisibility } from '../types';

export type LoadedQuiz = {
  quizId: string;
  quizName: string;
  html: string;
  visibility: QuizVisibility;
};

export type LoadResult =
  | { ok: true; quiz: LoadedQuiz }
  | { ok: false; error: 'invalid_id' | 'not_found' | 'fetch_failed'; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadQuizForPlayer(
  quizId: string,
  options: { preview?: boolean } = {},
): Promise<LoadResult> {
  if (!quizId || !UUID_RE.test(quizId)) {
    return { ok: false, error: 'invalid_id', message: 'ID квиза не найден.' };
  }
  try {
    const data = await api.getQuiz(quizId);
    if (!data?.quiz_data) {
      return { ok: false, error: 'not_found', message: 'Квиз не найден.' };
    }

    const visibility: QuizVisibility = (data.visibility as QuizVisibility) ?? 'public';
    const quizData = data.quiz_data as QuizData;
    const html = generateQuizHtmlProgrammatically(
      quizData.nodes,
      quizData.edges,
      quizData.globalTimer,
      quizData.designSettings,
      quizId,
      quizData.templateId || 'default',
      data.name,
      options,
    );

    return {
      ok: true,
      quiz: { quizId, quizName: data.name ?? '', html, visibility },
    };
  } catch (err) {
    console.error('[loadQuizForPlayer] fetch failed', err);
    return {
      ok: false,
      error: 'fetch_failed',
      message: 'Не удалось загрузить квиз. Возможно, у вас нет прав на его просмотр, или ссылка неверна.',
    };
  }
}

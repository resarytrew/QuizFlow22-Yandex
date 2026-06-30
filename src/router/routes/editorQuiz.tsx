import {
  createRoute,
  redirect,
  notFound,
  Link,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { Route as editorShellRoute } from './editorShell';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { api } from '../../../services/apiClient';

export async function loadQuizForEditor(quizId: string) {
  try {
    return await api.getQuiz(quizId);
  } catch {
    const quizState = useQuizDataStore.getState();
    const cachedQuiz = quizState.userQuizzes.find(
      (quiz) => quiz.id === quizId && quiz.quiz_data_loaded !== false,
    );
    if (cachedQuiz) return cachedQuiz;

    if (quizState.currentQuizId === quizId) {
      const canvasState = useCanvasStore.getState();
      return {
        id: quizId,
        name: quizState.currentQuizName || 'Без названия',
        visibility: quizState.currentQuizVisibility ?? 'public',
        is_published: quizState.currentQuizVisibility === 'public',
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        quiz_data_loaded: true,
        quiz_data: {
          nodes: canvasState.nodes,
          edges: canvasState.edges,
          globalTimer: quizState.globalTimer,
          designSettings: quizState.designSettings,
          templateId: quizState.templateId,
          currentQuizName: quizState.currentQuizName,
        },
      };
    }

    throw notFound();
  }
}

export const Route = createRoute({
  getParentRoute: () => editorShellRoute,
  path: '/editor/$quizId',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ params, context }) => {
    const quiz = await loadQuizForEditor(params.quizId);
    useQuizDataStore.getState().loadQuiz(quiz as any);
    return { quizId: params.quizId };
  },
  component: lazyRouteComponent(() => import('../../../components/QuizEditor')),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Квиз не найден
        </h1>
        <p className="text-gray-500 mb-4">
          Возможно, вы не являетесь его автором.
        </p>
        <Link
          to="/dashboard"
          className="text-indigo-600 hover:underline"
        >
          В мои квизы
        </Link>
      </div>
    </div>
  ),
});

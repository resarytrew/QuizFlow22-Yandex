import {
  createRoute,
  redirect,
  notFound,
  Link,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { Route as editorShellRoute } from './editorShell';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { api } from '../../../services/apiClient';

export async function loadQuizForEditor(quizId: string) {
  try {
    return await api.getQuiz(quizId);
  } catch {
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

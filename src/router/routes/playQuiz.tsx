import {
  createRoute,
  notFound,
  Link,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { z } from 'zod';
import { Route as rootRoute } from './root';
import { api } from '../../../services/apiClient';

export const playSearchSchema = z.object({
  preview: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  startNodeId: z.string().optional(),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LazyQuizPlayer = lazyRouteComponent(
  () => import('../../../components/QuizPlayer')
);

export async function loadQuizForPlayer(quizId: string) {
  if (!UUID_RE.test(quizId)) {
    throw notFound();
  }

  try {
    const data = await api.getQuiz(quizId);
    if (data.visibility !== 'public' && data.visibility !== 'unlisted') throw new Error('not_public');
    return data;
  } catch {
    throw notFound();
  }
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/$quizId',
  validateSearch: playSearchSchema,
  loader: ({ params }) => loadQuizForPlayer(params.quizId),
  component: PlayQuizPage,
  notFoundComponent: PlayQuizNotFound,
});

function PlayQuizPage() {
  const { quizId } = Route.useParams();
  return <LazyQuizPlayer quizId={quizId} />;
}

function PlayQuizNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Квиз не найден</h1>
        <p className="text-gray-500">
          Возможно, он был удалён или ещё не опубликован.
        </p>
        <Link to="/" className="text-indigo-600 hover:underline mt-4 inline-block">
          На главную
        </Link>
      </div>
    </div>
  );
}

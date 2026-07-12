import { createRoute, notFound } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';
import { api } from '../../../services/apiClient';
import PublicScenarioPage from '../../../components/public/PublicScenarioPage';
import type { PublicQuiz } from '../../../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/scenarios/$quizId',
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.quizId)) throw notFound();
    try {
      const quiz = await api.getQuiz(params.quizId) as unknown as PublicQuiz;
      if (quiz.visibility !== 'public') throw new Error('not_public');
      return quiz;
    } catch {
      throw notFound();
    }
  },
  component: PublicScenarioRoutePage,
});

function PublicScenarioRoutePage() {
  return <PublicScenarioPage quiz={Route.useLoaderData()} />;
}

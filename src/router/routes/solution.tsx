import { createRoute, notFound } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';
import SolutionPage from '../../../components/solutions/SolutionPage';
import { getSolutionPage } from '../../seo/seoCatalog';

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/solutions/$solutionId',
  loader: ({ params }) => {
    const page = getSolutionPage(params.solutionId);
    if (!page) throw notFound();
    return page;
  },
  component: SolutionRoutePage,
});

function SolutionRoutePage() {
  const page = Route.useLoaderData();
  return <SolutionPage page={page} />;
}

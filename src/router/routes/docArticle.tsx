import { createRoute, lazyRouteComponent, notFound } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';
import { getSeoPage } from '../../seo/seoCatalog';

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/docs/$docId',
  loader: ({ params }) => {
    if (!getSeoPage(`/docs/${params.docId}/`)) throw notFound();
    return { docId: params.docId };
  },
  component: lazyRouteComponent(() => import('../../../components/Documentation')),
});

import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/templates',
  component: lazyRouteComponent(() => import('../../../components/TemplatesPage')),
});

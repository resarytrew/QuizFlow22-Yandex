import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as adminShellRoute } from './adminShell';

export const Route = createRoute({
  getParentRoute: () => adminShellRoute,
  path: '/quizzes',
  component: lazyRouteComponent(() => import('../../../components/admin/AdminQuizzesPage')),
});

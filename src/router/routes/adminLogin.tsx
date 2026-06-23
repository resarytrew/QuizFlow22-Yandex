import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: lazyRouteComponent(() => import('../../../components/admin/AdminLoginPage')),
});

import { createRoute, redirect, lazyRouteComponent } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/admin/login', replace: true });
    }
  },
  component: lazyRouteComponent(() => import('../../../components/admin/AdminShell')),
});

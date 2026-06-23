import { createRoute, redirect, lazyRouteComponent } from '@tanstack/react-router';
import { Route as appShellRoute } from './appShell';

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/dashboard',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: lazyRouteComponent(() => import('../../../components/Dashboard')),
});

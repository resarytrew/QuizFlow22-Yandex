import { createRoute, redirect, lazyRouteComponent } from '@tanstack/react-router';
import { Route as appShellRoute } from './appShell';

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/', search: { authModal: 'open' } });
    }
  },
  component: lazyRouteComponent(() => import('../../../components/BillingPage')),
});

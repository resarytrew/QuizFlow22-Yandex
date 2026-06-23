import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  component: lazyRouteComponent(
    () => import('../../../components/auth/ResetPasswordPage'),
  ),
});

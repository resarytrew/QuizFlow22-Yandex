import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  validateSearch: z.object({ token: z.string().optional() }),
  component: lazyRouteComponent(
    () => import('../../../components/auth/ResetPasswordPage'),
  ),
});

import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';
import { Route as rootRoute } from './root';

export const authConfirmSearchSchema = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm',
  validateSearch: authConfirmSearchSchema,
  component: lazyRouteComponent(
    () => import('../../../components/auth/EmailConfirmPage')
  ),
});

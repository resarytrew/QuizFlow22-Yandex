import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';
import { Route as rootRoute } from './root';

export const authConfirmSearchSchema = z.object({
  status: z.literal('success').optional(),
  link: z.literal('required').optional(),
  email: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm',
  validateSearch: authConfirmSearchSchema,
  component: lazyRouteComponent(
    () => import('../../../components/auth/EmailConfirmPage')
  ),
});

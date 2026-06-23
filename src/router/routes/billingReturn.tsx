import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { z } from 'zod';
import { Route as rootRoute } from './root';

export const billingReturnSearchSchema = z.object({
  status: z.enum(['success', 'cancel', 'pending']).optional(),
  orderId: z.string().optional(),
  planId: z.string().optional(),
});

export type BillingReturnSearch = z.infer<typeof billingReturnSearchSchema>;

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/return',
  validateSearch: billingReturnSearchSchema,
  component: lazyRouteComponent(
    () => import('../../../components/BillingReturnPage')
  ),
});

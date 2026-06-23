import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { Route as contestRoute } from './contest';

export const Route = createRoute({
  getParentRoute: () => contestRoute,
  path: '/registry',
  component: lazyRouteComponent(
    () => import('../../../components/public/ContestRegistryPage')
  ),
});

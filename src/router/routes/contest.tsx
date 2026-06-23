import { createRoute, Outlet } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';

// /contest — parent route. Children:
//   /            → ContestDashboard (index)
//   /registry    → ContestRegistryPage

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/contest',
  component: ContestLayout,
});

function ContestLayout() {
  return <Outlet />;
}

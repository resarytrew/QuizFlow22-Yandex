import { createRoute, Outlet } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

// ─── Pathless layout: app surface ─────────────────────────────────────────────
// Header + Outlet для авторизованных маршрутов:
// /dashboard, /billing, /billing/return, /editor, /editor/$quizId

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  id: '__appShell',
  component: AppShellLayout,
});

function AppShellLayout() {
  return <Outlet />;
}

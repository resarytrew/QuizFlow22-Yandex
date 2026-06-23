import { createRoute, Outlet } from '@tanstack/react-router';
import { Route as rootRoute } from './root';

// ─── Pathless layout: public surface ─────────────────────────────────────────
// Header (лого, навигация, sign-in/up) + Outlet для публичных маршрутов:
// /, /docs, /guide, /templates, /public, /welcome, /contest*

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  id: '__publicShell',
  component: PublicShellLayout,
});

function PublicShellLayout() {
  return <Outlet />;
}

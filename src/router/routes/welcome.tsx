import { createRoute, redirect } from '@tanstack/react-router';
import { Route as publicShellRoute } from './publicShell';

/**
 * Legacy alias для landing.
 * TODO: Удалить после 2026-09-01.
 * Перед удалением проверить:
 * - нет внешних ссылок на /welcome (Google Analytics, soc media)
 * - все internal links обновлены
 */
export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/welcome',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
  component: () => null,
});

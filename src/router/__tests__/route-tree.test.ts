import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../components/LandingPage', () => ({ default: () => null }));
vi.mock('../../../components/Dashboard', () => ({ default: () => null }));
vi.mock('../../../components/QuizEditor', () => ({ default: () => null }));
vi.mock('../../../components/QuizPlayer', () => ({ default: () => null }));

describe('route tree', () => {
  it('contains unique expected full paths', async () => {
    const { routeTree } = await import('../routeTree');
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      context: {
        auth: {
          initialized: true,
          isAuthenticated: false,
          userId: null,
        },
      },
    });
    const paths = new Set(Object.keys(router.routesByPath));

    expect(paths.size).toBe(Object.keys(router.routesByPath).length);
    for (const path of [
      '/',
      '/dashboard',
      '/billing',
      '/billing/return',
      '/editor',
      '/editor/$quizId',
      '/play/$quizId',
      '/auth/confirm',
      '/auth/reset-password',
      '/contest',
      '/contest/registry',
      '/public',
      '/scenarios/$quizId',
      '/templates',
      '/docs',
      '/docs/$docId',
      '/guide',
      '/solutions/$solutionId',
      '/business',
      '/business/lead-quiz',
      '/business/client-brief',
      '/business/product-selector',
      '/hr/onboarding',
      '/hr/assessment',
      '/education',
      '/events',
      '/admin',
      '/admin/login',
      '/admin/mfa',
      '/admin/users',
      '/admin/quizzes',
      '/admin/reports',
      '/admin/support',
      '/admin/finances',
    ]) {
      expect(paths.has(path), `missing route ${path}`).toBe(true);
    }

    expect(paths.has('/contest/submit')).toBe(false);
  }, 20_000);
});

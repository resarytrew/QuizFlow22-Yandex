import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    redirect: (opts: unknown) => {
      mockRedirect(opts);
      throw new Error('redirect');
    },
  };
});

// Mock the store to avoid importing the full Zustand setup
vi.mock('../../../store/useQuizDataStore', () => ({
  useQuizDataStore: { getState: () => ({}) },
}));

// Mock QuizEditor component (lazy-loaded default)
vi.mock('../../../components/QuizEditor', () => ({
  default: () => null,
}));

describe('auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('dashboard redirects unauthenticated user to /', async () => {
    const { Route } = await import('../routes/dashboard');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/' })
    );
  });

  it('dashboard allows authenticated user', async () => {
    const { Route } = await import('../routes/dashboard');

    let didThrow = false;
    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: true, userId: 'user-1' } },
      });
    } catch {
      didThrow = true;
    }

    expect(didThrow).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('editorQuiz redirects unauthenticated user', async () => {
    const { Route } = await import('../routes/editorQuiz');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/' })
    );
  });

  it('editorNew redirects unauthenticated user', async () => {
    const { Route } = await import('../routes/editorNew');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { initialized: true, isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/' })
    );
  });

  it('billing redirects unauthenticated user to / with ?authModal=open', async () => {
    const { Route } = await import('../routes/billing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/',
        search: { authModal: 'open' },
      })
    );
  });

  it('admin shell redirects unauthenticated user to admin login', async () => {
    const { Route } = await import('../routes/adminShell');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/admin/login',
        replace: true,
      })
    );
  });

  it('admin MFA redirects unauthenticated user to admin login', async () => {
    const { Route } = await import('../routes/adminMfa');

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/admin/login',
        replace: true,
      })
    );
  });
});

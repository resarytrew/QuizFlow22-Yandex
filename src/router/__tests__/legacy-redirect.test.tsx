import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    redirect: (opts: unknown) => {
      mockNavigate(opts);
      throw new Error('redirect');
    },
  };
});

vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: { getState: () => ({ session: null }) },
}));

vi.mock('../../../store/useUIStore', () => ({
  useUIStore: Object.assign(() => vi.fn(), {
    getState: () => ({ setAuthModalOpen: vi.fn() }),
  }),
}));

vi.mock('../../../components/LandingPage', () => ({
  default: () => null,
}));

describe('landing legacy redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects /?play=<uuid> to /play/<uuid>', async () => {
    const { Route } = await import('../routes/landing');

    const UUID = '550e8400-e29b-41d4-a716-446655440000';

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { play: UUID },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/play/$quizId',
        params: { quizId: UUID },
        replace: true,
      })
    );
  });

  it('redirects /?status=success to /billing/return', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { status: 'success' },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/billing/return',
        search: { status: 'success' },
      })
    );
  });

  it('redirects /?token_hash=... to /auth/confirm', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { token_hash: 'abc', type: 'email' },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/auth/confirm',
        search: { token_hash: 'abc', type: 'email' },
      })
    );
  });

  it('redirects /?code=... to /auth/confirm for OAuth callbacks', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { code: 'oauth-code' },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/auth/confirm',
        search: { code: 'oauth-code' },
      })
    );
  });

  it('redirects /?page=guide to /guide', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { page: 'guide' },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/guide',
        replace: true,
      })
    );
  });

  it('does not redirect when no legacy params present', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: {},
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // may or may not throw
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ignores invalid UUID in ?play param', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { play: 'not-a-uuid' },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // may or may not throw
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves auth callback errors when redirecting', async () => {
    const { Route } = await import('../routes/landing');

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: {
          error: 'access_denied',
          error_description: 'Expired link',
        },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/auth/confirm',
        search: expect.objectContaining({
          error: 'access_denied',
          error_description: 'Expired link',
        }),
      })
    );
  });

  it('does not redirect for authModal=open', async () => {
    const { Route } = await import('../routes/landing');

    await (Route.options.beforeLoad as Function)?.({
      search: { authModal: 'open' },
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

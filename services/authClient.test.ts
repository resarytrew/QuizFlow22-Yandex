import { afterEach, describe, expect, it, vi } from 'vitest';
import { authClient } from './authClient';

describe('authClient response validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects an HTML fallback even when it has a 200 status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })));

    await expect(authClient.me()).rejects.toEqual(
      expect.objectContaining({
        message: 'Сервис авторизации временно недоступен.',
        status: 502,
      }),
    );
  });

  it('returns a valid JSON response', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      emailVerified: true,
      role: 'admin',
      authLevel: 'mfa' as const,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ user })));

    await expect(authClient.me()).resolves.toEqual({ user });
  });
});

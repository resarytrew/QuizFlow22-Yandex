import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ execute: vi.fn(), queryOne: vi.fn() }));
vi.mock('../_shared/db', () => db);

import { createSession, hashOpaqueToken, revokeAllSessions, revokeCurrentSession, verifySession } from '../_shared/session';

describe('session persistence', () => {
  beforeEach(() => {
    db.execute.mockReset().mockResolvedValue(1);
    db.queryOne.mockReset();
    process.env.SESSION_PEPPER = 'session-test-pepper';
  });

  it('stores only a SHA-256 token hash', async () => {
    const raw = await createSession('user-1', { headers: { 'user-agent': 'test' } });
    const insert = db.execute.mock.calls[0];
    expect(insert[0]).toContain('INSERT INTO public.auth_sessions');
    expect(insert[1][1]).toBe(hashOpaqueToken(raw));
    expect(insert[1][1]).not.toBe(raw);
  });

  it('validates an active database session and maps MFA elevation', async () => {
    db.queryOne.mockResolvedValue({
      id: 'session-1', user_id: 'user-1', email: 'user@example.com', email_verified_at: new Date().toISOString(),
      role: 'user', mfa_verified_at: new Date().toISOString(), status: 'active', blocked_until: null,
    });
    const user = await verifySession({ headers: { cookie: 'qf_session=raw-token' } });
    expect(db.queryOne.mock.calls[0][1][0]).toBe(hashOpaqueToken('raw-token'));
    expect(user).toMatchObject({ id: 'user-1', authLevel: 'mfa', emailVerified: true });
  });

  it('revokes the current session or every session for a user', async () => {
    await revokeCurrentSession({ headers: { cookie: 'qf_session=raw-token' } });
    expect(db.execute.mock.calls[0][1][0]).toBe(hashOpaqueToken('raw-token'));
    await revokeAllSessions('user-1');
    expect(db.execute.mock.calls[1][1]).toEqual(['user-1']);
  });
});

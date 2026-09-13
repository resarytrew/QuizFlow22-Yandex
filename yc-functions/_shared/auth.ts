import { query } from './db';
import { isAccountBlocked } from './admin-policy';
import { verifySession, type SessionUser } from './session';

export interface AuthUser extends SessionUser {}

export async function verifyAuth(event: {
  headers?: Record<string, string | undefined>;
  requestContext?: Record<string, any>;
}, options: { allowBlocked?: boolean } = {}): Promise<AuthUser | null> {
  try {
    const user = await verifySession(event);
    if (user && !options.allowBlocked && isAccountBlocked(user.accountStatus, user.blockedUntil)) throw new AccountBlockedError();
    return user;
  } catch (error) {
    if (error instanceof AccountBlockedError) throw error;
    console.warn('[auth] session verification failed:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

export async function ensureUser(userId: string, email: string): Promise<void> {
  await query(
    `UPDATE public.users SET email = $2, updated_at = now()
     WHERE id = $1 AND email IS DISTINCT FROM $2`,
    [userId, email],
  );
}

export class AccountBlockedError extends Error {
  readonly status = 403;
  readonly code = 'account_blocked';
  constructor() { super('account_blocked'); }
}

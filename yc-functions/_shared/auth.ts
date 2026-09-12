import { query } from './db';
import { verifySession, type SessionUser } from './session';

export interface AuthUser extends SessionUser {}

export async function verifyAuth(event: {
  headers?: Record<string, string | undefined>;
  requestContext?: Record<string, any>;
}): Promise<AuthUser | null> {
  try {
    return await verifySession(event);
  } catch (error) {
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

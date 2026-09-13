import { createHmac } from 'node:crypto';
import { queryOne } from './db';

function bucketHash(action: string, identifier: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error('OTP_PEPPER not set');
  return createHmac('sha256', pepper).update(`${action}|${identifier.trim().toLowerCase()}`).digest('hex');
}

export async function enforceRateLimit(
  action: string,
  identifier: string | undefined,
  limit: number,
  windowSeconds: number,
  blockSeconds = windowSeconds,
): Promise<void> {
  if (!identifier) return;
  const row = await queryOne<{ attempts: number; blocked: boolean }>(`
    INSERT INTO public.auth_rate_limits
      (bucket_hash, action, window_started_at, attempts, blocked_until, updated_at)
    VALUES ($1, $2, now(), 1, NULL, now())
    ON CONFLICT (bucket_hash) DO UPDATE SET
      action = EXCLUDED.action,
      attempts = CASE
        WHEN auth_rate_limits.window_started_at < now() - ($3 * interval '1 second') THEN 1
        ELSE auth_rate_limits.attempts + 1
      END,
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at < now() - ($3 * interval '1 second') THEN now()
        ELSE auth_rate_limits.window_started_at
      END,
      blocked_until = CASE
        WHEN auth_rate_limits.blocked_until > now() THEN auth_rate_limits.blocked_until
        WHEN auth_rate_limits.window_started_at >= now() - ($3 * interval '1 second')
          AND auth_rate_limits.attempts + 1 > $4 THEN now() + ($5 * interval '1 second')
        ELSE NULL
      END,
      updated_at = now()
    RETURNING attempts, (blocked_until IS NOT NULL AND blocked_until > now()) AS blocked`,
    [bucketHash(action, identifier), action, windowSeconds, limit, blockSeconds],
  );
  if (row?.blocked || (row?.attempts || 0) > limit) {
    const error = new Error('Слишком много попыток. Попробуйте позже.');
    (error as Error & { statusCode?: number }).statusCode = 429;
    throw error;
  }
}

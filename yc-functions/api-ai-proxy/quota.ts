import { randomUUID } from 'node:crypto';
import { query, queryOne, withTransaction } from '../_shared/db';

type Reservation = { allowed: true; id: string; used: number; limit: number }
  | { allowed: false; used: number; limit: number };

/** Reserve a slot before calling the upstream. The per-user lock is held only
 * for the count and insertion, never for the network request. */
export async function reserveQuota(userId: string): Promise<Reservation> {
  return withTransaction(async () => {
    await query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`quizflow-ai-quota:${userId}`]);
    // `now()` is fixed at BEGIN, which can precede the lock by a long time.
    const clock = await queryOne<{ current_time: Date }>('SELECT clock_timestamp() AS current_time');
    if (!clock) throw new Error('Could not read quota clock');
    const usage = await queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM public.ai_rate_limits
       WHERE user_id = $1 AND window_start >= (date_trunc('day', $2::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`,
      [userId, clock.current_time],
    );
    const entitlement = await queryOne<{ plan: string | null }>(
      `SELECT public.get_effective_entitlement($1)->>'plan' AS plan`, [userId],
    );
    const limit = entitlement?.plan === 'pro' ? 200 : 5;
    const used = Number(usage?.count ?? 0);
    if (used >= limit) return { allowed: false, used, limit };
    const id = randomUUID();
    // Some deployed schemas have a feature column and the canonical migration
    // does not. Detect it without an error that would abort the transaction.
    const schema = await queryOne<{ has_feature: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_rate_limits' AND column_name = 'feature'
    ) AS has_feature`);
    if (schema?.has_feature) {
      await query("INSERT INTO public.ai_rate_limits (id, user_id, window_start, feature) VALUES ($1, $2, $3, 'chat')", [id, userId, clock.current_time]);
    } else {
      await query('INSERT INTO public.ai_rate_limits (id, user_id, window_start) VALUES ($1, $2, $3)', [id, userId, clock.current_time]);
    }
    return { allowed: true, id, used: used + 1, limit };
  });
}

export async function releaseQuota(userId: string, id: string): Promise<void> {
  await query('DELETE FROM public.ai_rate_limits WHERE id = $1 AND user_id = $2', [id, userId]);
}

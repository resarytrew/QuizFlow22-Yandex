import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPool, query } from '../_shared/db';
import { releaseQuota, reserveQuota } from '../api-ai-proxy/quota';

// Never reset a database unless it has this exact isolated test name.
if (process.env.PG_DATABASE !== 'quizflow_ai_quota_test') {
  throw new Error('AI quota integration tests require isolated PG_DATABASE=quizflow_ai_quota_test');
}

beforeAll(async () => {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await query(`CREATE TABLE public.ai_rate_limits (
    id uuid PRIMARY KEY, user_id uuid NOT NULL, window_start timestamptz NOT NULL
  )`);
  await query(`CREATE FUNCTION public.get_effective_entitlement(uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"plan":"free"}'::jsonb $$`);
});
afterAll(async () => { await getPool().end(); });

describe('AI quota PostgreSQL concurrency', () => {
  it('serializes concurrent reservations for the same user and compensates only one', async () => {
    const userId = randomUUID();
    const results = await Promise.all(Array.from({ length: 20 }, () => reserveQuota(userId)));
    const allowed = results.filter(result => result.allowed);
    expect(allowed).toHaveLength(5);
    expect(results.filter(result => !result.allowed)).toHaveLength(15);
    expect((await query('SELECT id FROM public.ai_rate_limits WHERE user_id=$1', [userId]))).toHaveLength(5);
    await releaseQuota(randomUUID(), allowed[0].id);
    expect((await reserveQuota(userId)).allowed).toBe(false);
    await releaseQuota(userId, allowed[0].id);
    await releaseQuota(userId, allowed[0].id);
    expect((await reserveQuota(userId)).allowed).toBe(true);
    expect((await reserveQuota(userId)).allowed).toBe(false);
  });

  it('does not count rows from before the UTC day', async () => {
    const userId = randomUUID();
    await query(`INSERT INTO public.ai_rate_limits (id, user_id, window_start)
      VALUES ($1, $2, (date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') - interval '1 second')`, [randomUUID(), userId]);
    const reservation = await reserveQuota(userId);
    expect(reservation).toMatchObject({ allowed: true, used: 1, limit: 5 });
  });
});

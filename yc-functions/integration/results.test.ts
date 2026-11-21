import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getPool, query } from '../_shared/db';

vi.mock('../_shared/auth', () => ({ AccountBlockedError: class extends Error {}, verifyAuth: async () => null, ensureUser: async () => {} }));
import { handler } from '../api-results';

if (process.env.PG_DATABASE !== 'quizflow_results_test') throw new Error('Results tests require isolated PG_DATABASE=quizflow_results_test');
const quizId = randomUUID(), otherId = randomUUID(), ownerId = randomUUID();
beforeAll(async () => {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await query(`CREATE TABLE public.quizzes (id uuid PRIMARY KEY, user_id uuid NOT NULL, visibility text NOT NULL, deleted_at timestamptz)`);
  await query(`CREATE TABLE public.quiz_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL, session_id text UNIQUE NOT NULL,
    user_id uuid, score integer, participant_name text, participant_email text, final_node_title text,
    results_data jsonb, path_data jsonb, time_spent_seconds integer
  )`);
  await query(`INSERT INTO public.quizzes(id,user_id,visibility) VALUES ($1,$3,'public'),($2,$3,'public')`, [quizId, otherId, ownerId]);
});
afterAll(async () => { await getPool().end(); });

const submit = (quiz: string, session: string, score: number) => handler({
  httpMethod: 'POST', headers: {}, requestContext: { http: { sourceIp: '127.0.0.1' } },
  body: JSON.stringify({ quiz_id: quiz, session_id: session, score }),
});

describe('result PostgreSQL conflict protection', () => {
  it('never overwrites an existing result even for concurrent submissions of another quiz', async () => {
    const responses = await Promise.all([submit(quizId, 'same-session', 3), submit(otherId, 'same-session', 999)]);
    expect(responses.map(result => result.statusCode).sort()).toEqual([201, 409]);
    const rows = await query('SELECT quiz_id, score, results_data FROM public.quiz_results WHERE session_id=$1', ['same-session']);
    expect(rows).toHaveLength(1);
    const saved = rows[0];
    expect((saved.quiz_id === quizId && saved.score === 3) || (saved.quiz_id === otherId && saved.score === 999)).toBe(true);
    expect(saved.results_data.score_trust).toBe('unverified');
    expect((await submit(saved.quiz_id, 'same-session', 5000)).statusCode).toBe(409);
    expect((await query('SELECT score FROM public.quiz_results WHERE session_id=$1', ['same-session']))[0].score).toBe(saved.score);
  });
});

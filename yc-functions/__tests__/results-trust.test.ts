import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  quiz: { id: '11111111-1111-4111-8111-111111111111', user_id: 'owner', visibility: 'public' },
  rows: new Map<string, { id: string; score: number; quizId: string; data: Record<string, unknown> }>(),
  queries: [] as Array<{ sql: string; params: unknown[] }>,
}));
vi.mock('../_shared/auth', () => ({ AccountBlockedError: class extends Error {}, verifyAuth: async () => fixtures.user, ensureUser: async () => {} }));
vi.mock('../_shared/cors', () => ({ corsHeaders: () => ({}), handleCors: () => ({ statusCode: 204 }) }));
vi.mock('../_shared/db', () => ({
  query: async (sql: string, params: unknown[] = []) => {
    fixtures.queries.push({ sql, params });
    if (sql.includes('FROM public.quizzes')) return params.length > 1 && params[1] !== fixtures.quiz.user_id ? [] : [fixtures.quiz];
    if (sql.includes('FROM public.quiz_sessions')) return [];
    if (sql.includes('FROM public.quiz_results')) return [{ score: 999, results_data: { score_trust: 'verified' } }];
    if (sql.includes('INSERT INTO public.quiz_results')) {
      const key = String(params[1]);
      const existing = fixtures.rows.get(key);
      if (existing) {
        if (sql.includes('DO UPDATE')) { existing.score = Number(params[3]); return [existing]; }
        return [];
      }
      const row = { id: 'result-id', score: Number(params[3]), quizId: String(params[0]), data: JSON.parse(String(params[7])) };
      fixtures.rows.set(key, row); return [row];
    }
    if (sql.includes('UPDATE public.quiz_sessions')) return [];
    throw new Error(`Unexpected query ${sql}`);
  },
}));

import { handler } from '../api-results';
const post = (payload: Record<string, unknown>) => handler({ httpMethod: 'POST', headers: {}, requestContext: { http: { sourceIp: '127.0.0.1' } }, body: JSON.stringify(payload) });
const quizId = '11111111-1111-4111-8111-111111111111';

describe('untrusted quiz results', () => {
  beforeEach(() => { fixtures.rows.clear(); fixtures.queries.length = 0; fixtures.user = null; fixtures.quiz.visibility = 'public'; });

  it('labels client scores as unverified and does not accept a client trust claim', async () => {
    const response = await post({ quiz_id: quizId, session_id: 'anon-1', score: 42, results_data: { score_trust: 'verified' } });
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).score_trust).toBe('unverified');
    expect(fixtures.rows.get('anon-1')?.data.score_trust).toBe('unverified');
  });

  it('does not overwrite an existing result on a replay', async () => {
    await post({ quiz_id: quizId, session_id: 'same', score: 10 });
    const replay = await post({ quiz_id: quizId, session_id: 'same', score: 999 });
    expect(replay.statusCode).toBe(409);
    expect(fixtures.rows.get('same')?.score).toBe(10);
  });

  it('rejects invalid scores instead of silently clipping them', async () => {
    expect((await post({ quiz_id: quizId, session_id: 'bad', score: -1 })).statusCode).toBe(400);
    expect((await post({ quiz_id: quizId, session_id: 'bad', score: 10000001 })).statusCode).toBe(400);
    expect(fixtures.rows.size).toBe(0);
  });

  it('does not allow a public request to write a private quiz or update another session', async () => {
    fixtures.quiz.visibility = 'private';
    expect((await post({ quiz_id: quizId, session_id: 's', score: 5 })).statusCode).toBe(404);
    fixtures.quiz.visibility = 'public';
    await post({ quiz_id: quizId, session_id: 's', score: 5 });
    expect(fixtures.queries.some(({ sql }) => sql.includes('UPDATE public.quiz_sessions'))).toBe(false);
  });
  it('marks historical results unverified in owner analytics', async () => {
    fixtures.user = { id: 'owner', email: 'owner@example.invalid' };
    const response = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { quiz_id: quizId } });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).results[0]).toMatchObject({ score_trust: 'unverified', results_data: { score_trust: 'unverified' } });
  });

  it('scopes session completion to the current quiz and authenticated user', async () => {
    fixtures.user = { id: 'owner', email: 'owner@example.invalid' };
    await post({ quiz_id: quizId, session_id: 'token', score: 5 });
    const update = fixtures.queries.find(({ sql }) => sql.includes('UPDATE public.quiz_sessions'));
    expect(update?.sql).toContain('quiz_id = $3 AND user_id = $4');
    expect(update?.params.slice(1)).toEqual(['token', quizId, 'owner']);
  });

  it('cannot overwrite a result from a different quiz using the same session ID', async () => {
    await post({ quiz_id: quizId, session_id: 'cross-quiz', score: 10 });
    const otherQuizId = '22222222-2222-4222-8222-222222222222';
    const response = await post({ quiz_id: otherQuizId, session_id: 'cross-quiz', score: 100 });
    expect(response.statusCode).toBe(409);
    expect(fixtures.rows.get('cross-quiz')).toMatchObject({ quizId, score: 10 });
  });

  it('does not mark an authenticated abandoned attempt completed', async () => {
    fixtures.user = { id: 'owner', email: 'owner@example.invalid' };
    await post({ quiz_id: quizId, session_id: 'abandon', score: 0, results_data: { abandoned: true } });
    expect(fixtures.queries.some(({ sql }) => sql.includes('UPDATE public.quiz_sessions'))).toBe(false);
  });

});

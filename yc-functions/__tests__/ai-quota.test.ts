import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const rows = new Map<string, string>();
  const config = { plan: 'free', hasFeature: false };
  let pending: Promise<void> = Promise.resolve();
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('pg_advisory_xact_lock')) return [];
    if (sql.includes('information_schema.columns')) return [{ has_feature: config.hasFeature }];
    if (sql.includes('clock_timestamp')) return [{ current_time: new Date() }];
    if (sql.includes('COUNT(*)')) return [{ count: String(rows.size) }];
    if (sql.includes('get_effective_entitlement')) return [{ plan: config.plan }];
    if (sql.includes('INSERT INTO public.ai_rate_limits')) { rows.set(String(params[0]), String(params[1])); return []; }
    if (sql.includes('DELETE FROM public.ai_rate_limits')) { rows.delete(String(params[0])); return []; }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const withTransaction = async <T>(work: () => Promise<T>): Promise<T> => {
    const previous = pending;
    let release!: () => void;
    pending = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await work(); } finally { release(); }
  };
  return { rows, config, query, withTransaction };
});
vi.mock('../_shared/db', () => ({ query: db.query, queryOne: async (...args: [string, unknown[]]) => (await db.query(...args))[0] ?? null, withTransaction: db.withTransaction }));
vi.mock('../_shared/auth', () => ({ AccountBlockedError: class extends Error {}, verifyAuth: async () => ({ id: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid' }), ensureUser: async () => {} }));
vi.mock('../_shared/cors', () => ({ corsHeaders: () => ({}), handleCors: () => ({ statusCode: 204 }) }));

const event = { httpMethod: 'POST', headers: {}, body: JSON.stringify({ prompt: 'question' }) };
describe('AI quota reservation', () => {
  beforeEach(() => { db.rows.clear(); db.config.plan = 'free'; db.config.hasFeature = false; db.query.mockClear(); vi.stubEnv('OPENROUTER_API_KEY', 'test-only'); vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('limits simultaneous requests before invoking the upstream', async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) }));
    vi.stubGlobal('fetch', fetch);
    const { handler } = await import('../api-ai-proxy');
    const results = await Promise.all(Array.from({ length: 8 }, () => handler(event)));
    expect(results.filter(result => result.statusCode === 200)).toHaveLength(5);
    expect(results.filter(result => result.statusCode === 429)).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(db.rows.size).toBe(5);
  });

  it('releases only the failed reservation when upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'unavailable' })));
    const { handler } = await import('../api-ai-proxy');
    const result = await handler(event);
    expect(result.statusCode).toBe(500);
    expect(db.rows.size).toBe(0);
  });
  it('retains a successful reservation when a concurrent request fails', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) })
      .mockRejectedValueOnce(new Error('connection failed'));
    vi.stubGlobal('fetch', fetch);
    const { handler } = await import('../api-ai-proxy');
    const results = await Promise.all([handler(event), handler(event)]);
    expect(results.map(result => result.statusCode).sort()).toEqual([200, 500]);
    expect(db.rows.size).toBe(1);
  });

  it('preserves the existing pro daily limit', async () => {
    db.config.plan = 'pro';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) })));
    const { handler } = await import('../api-ai-proxy');
    const result = await handler(event);
    expect(JSON.parse(result.body).limit).toBe(200);
  });

  it('supports the deployed schema variant with a feature column', async () => {
    db.config.hasFeature = true;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) })));
    const { handler } = await import('../api-ai-proxy');
    expect((await handler(event)).statusCode).toBe(200);
    expect(db.query.mock.calls.some(([sql]) => sql.includes('window_start, feature'))).toBe(true);
  });

});

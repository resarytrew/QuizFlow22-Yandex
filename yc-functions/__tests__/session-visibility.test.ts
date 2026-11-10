import { beforeEach, describe, expect, it, vi } from 'vitest';
const data = vi.hoisted(() => ({ visibility: 'private', owner: 'owner', created: 0, lookedUp: 0 }));
vi.mock('../_shared/auth', () => ({ AccountBlockedError: class extends Error {}, verifyAuth: async () => ({ id: 'visitor', email: 'visitor@example.invalid' }), ensureUser: async () => {} }));
vi.mock('../_shared/cors', () => ({ corsHeaders: () => ({}), handleCors: () => ({ statusCode: 204 }) }));
vi.mock('../_shared/db', () => ({
  queryOne: async (sql: string, params: unknown[]) => {
    data.lookedUp++;
    if (sql.includes('visibility') && data.visibility === 'private' && params[1] !== data.owner) return null;
    return { id: params[0] };
  },
  query: async () => { data.created++; return [{ id: 'session', session_token: 'token', created_at: 'today' }]; },
}));
import { handler } from '../save-quiz-session';
const request = { httpMethod: 'POST', headers: {}, pathParameters: { action: 'create' }, body: JSON.stringify({ quiz_id: '11111111-1111-4111-8111-111111111111' }) };

describe('session visibility', () => {
  beforeEach(() => { data.visibility = 'private'; data.created = 0; data.lookedUp = 0; });
  it('denies creation for a private quiz owned by another user', async () => {
    const result = await handler(request);
    expect(result.statusCode).toBe(400);
    expect(data.created).toBe(0);
  });
  it('allows a public quiz', async () => {
    data.visibility = 'public';
    const result = await handler(request);
    expect(result.statusCode).toBe(201);
    expect(data.created).toBe(1);
  });
  it('rejects a malformed quiz ID before accessing the database', async () => {
    const result = await handler({ ...request, body: JSON.stringify({ quiz_id: 'invalid' }) });
    expect(result.statusCode).toBe(400);
    expect(data.created).toBe(0);
    expect(data.lookedUp).toBe(0);
  });

});

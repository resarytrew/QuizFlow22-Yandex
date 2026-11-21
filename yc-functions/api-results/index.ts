import { AccountBlockedError } from '../_shared/auth';
import { verifyAuth, ensureUser, type AuthUser } from '../_shared/auth';
import { query } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';
import { randomUUID } from 'node:crypto';
import { enforceRateLimit } from '../_shared/rateLimit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

export async function handler(event: any) {
  const { httpMethod, headers } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'GET' && httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' }, headers);
  }

  try {
    if (httpMethod === 'GET') return await getAnalytics(event, event.queryStringParameters || {});
    return await saveResult(event);
  } catch (error) {
    if (error instanceof AccountBlockedError) return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: error.code }) };
    if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode?: unknown }).statusCode === 429) return response(429, { error: 'Rate limit exceeded. Try again in a minute.' }, headers);
    console.error('Results error:', error);
    return response(500, { error: 'Internal server error' }, headers);
  }
}

async function getAnalytics(event: any, params: any) {
  const headers = event.headers || {};
  const user = await verifyAuth(event);
  if (!user) return response(401, { error: 'Unauthorized' }, headers);

  const quizId = params.quiz_id;
  if (!quizId || !UUID_RE.test(String(quizId))) {
    return response(400, { error: 'valid quiz_id is required' }, headers);
  }

  const ownerRows = await query(
    `SELECT id FROM public.quizzes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [quizId, user.id],
  );
  if (!ownerRows.length) return response(401, { error: 'Unauthorized' }, headers);

  const sessions = await query(
    `SELECT id, created_at, COALESCE(started_at, created_at) as started_at,
            COALESCE(completed_at, created_at) as completed_at,
            quiz_id, user_id,
            CASE COALESCE(status, 'completed')
              WHEN 'active' THEN 'in_progress'
              ELSE COALESCE(status, 'completed')
            END as status,
            0 as score,
            '{}'::jsonb as variables,
            '[]'::jsonb as achievements,
            COALESCE(path_data, '[]'::jsonb) as path_data,
            NULL::integer as time_spent_seconds
     FROM public.quiz_sessions
     WHERE quiz_id = $1
     ORDER BY created_at DESC
     LIMIT 500`,
    [quizId],
  );

  const results = await query(
    `SELECT id, quiz_id, session_id, user_id, score, final_node_title,
            participant_name, participant_email,
            COALESCE(results_data, '{}'::jsonb) as results_data,
            COALESCE(path_data, '[]'::jsonb) as path_data,
            time_spent_seconds, created_at
     FROM public.quiz_results
     WHERE quiz_id = $1
     ORDER BY created_at DESC
     LIMIT 500`,
    [quizId],
  );

  // Legacy rows are also client-submitted and must never be treated as verified.
  return response(200, { sessions, results: results.map(result => ({ ...result, score_trust: 'unverified', results_data: { ...normalizeJsonObject(result.results_data), score_trust: 'unverified' } })) }, headers);
}

async function saveResult(event: any) {
  const headers = event.headers || {};
  const ip = getIp(event);
  await enforceRateLimit('public_result', ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS / 1000);

  const body = parseBody(event.body);
  if (!body || typeof body !== 'object') {
    return response(400, { error: 'Invalid JSON' }, headers);
  }

  const quizId = typeof body.quiz_id === 'string' ? body.quiz_id : '';
  if (!UUID_RE.test(quizId)) {
    return response(400, { error: 'valid quiz_id is required' }, headers);
  }

  const user = await optionalUser(event);
  if (user) await ensureUser(user.id, user.email);

  const quizRows = await query(
    `SELECT id, user_id, visibility
     FROM public.quizzes
     WHERE id = $1 AND deleted_at IS NULL`,
    [quizId],
  );
  const quiz = quizRows[0];
  if (!quiz) return response(404, { error: 'Quiz not found' }, headers);

  if (!canSavePublicResult(quiz, user)) {
    return response(404, { error: 'Quiz not found' }, headers);
  }

  const sessionId = normalizeSessionId(body.session_id);
  const scoreValue = body.score === undefined ? 0 : body.score;
  if ((typeof scoreValue !== 'number' && !(typeof scoreValue === 'string' && scoreValue.trim() !== '')) ||
      !Number.isFinite(Number(scoreValue)) || !Number.isInteger(Number(scoreValue)) || Number(scoreValue) < 0 || Number(scoreValue) > 10_000_000) {
    return response(400, { error: 'score must be an integer between 0 and 10000000' }, headers);
  }
  const score = Number(scoreValue);
  const timeSpentSeconds = clampInt(
    body.time_spent_seconds ?? body.time_spent,
    0,
    604_800,
    0,
  );
  const participantName = clampString(body.participant_name, 200, 'Guest');
  const participantEmail = clampString(body.participant_email, 320, null);
  const finalNodeTitle = clampString(body.final_node_title, 300, 'Завершено');
  const resultsData: Record<string, unknown> = { ...normalizeJsonObject(body.results_data), score_trust: 'unverified' };
  const pathData = clampPathData(body.path_data);

  const [result] = await query(
    `INSERT INTO public.quiz_results
       (quiz_id, session_id, user_id, score, participant_name, participant_email,
        final_node_title, results_data, path_data, time_spent_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
     ON CONFLICT (session_id) DO NOTHING
     RETURNING id, score`,
    [
      quizId,
      sessionId,
      user?.id ?? null,
      score,
      participantName,
      participantEmail,
      finalNodeTitle,
      JSON.stringify(resultsData),
      JSON.stringify(pathData),
      timeSpentSeconds,
    ],
  );

  if (!result) return response(409, { error: 'Result already submitted' }, headers);

  // An opaque session token or row ID is not sufficient authorization on its own.
  if (user && resultsData.abandoned !== true) await query(
    `UPDATE public.quiz_sessions
     SET status = 'completed', completed_at = COALESCE(completed_at, now()), path_data = $1::jsonb
     WHERE quiz_id = $3 AND user_id = $4 AND (session_token = $2 OR id::text = $2)`,
    [JSON.stringify(pathData), sessionId, quizId, user.id],
  ).catch((error) => {
    console.warn('[api-results] session update skipped:', error?.message || error);
  });

  return response(201, { id: result.id, score: result.score, session_id: sessionId, score_trust: 'unverified' }, headers);
}

function canSavePublicResult(quiz: any, user: AuthUser | null): boolean {
  if (quiz.visibility === 'public' || quiz.visibility === 'unlisted') return true;
  return quiz.visibility === 'private' && Boolean(user && user.id === quiz.user_id);
}

async function optionalUser(event: any): Promise<AuthUser | null> {
  try {
    return await verifyAuth(event);
  } catch (error) {
    if (error instanceof AccountBlockedError) throw error;
    return null;
  }
}

function parseBody(body: unknown): any {
  if (body && typeof body === 'object') return body;
  if (typeof body !== 'string' || !body.trim()) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function normalizeSessionId(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim().slice(0, 160);
    if (trimmed) return trimmed;
  }
  return `anon_${Date.now()}_${randomUUID()}`;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clampPathData(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.length > 1000 ? value.slice(-1000) : value;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.round(num), min), max);
}

function clampString(
  value: unknown,
  maxLength: number,
  fallback: string | null,
): string | null {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function getHeader(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lower);
  const value = found?.[1];
  return typeof value === 'string' ? value : undefined;
}

function getIp(event: any): string {
  // Request context is supplied by API Gateway; caller-provided forwarding
  // headers are not an authenticated client address.
  return event.requestContext?.identity?.sourceIp || event.requestContext?.http?.sourceIp || 'unknown';
}


function response(statusCode: number, body: unknown, headers?: any) {
  return {
    statusCode,
    headers: { ...corsHeaders(getHeader(headers, 'origin')), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

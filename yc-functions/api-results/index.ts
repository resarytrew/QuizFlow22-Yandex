import { verifyAuth, ensureUser, type AuthUser } from '../_shared/auth';
import { query } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';
import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { count: number; reset: number }>();

export async function handler(event: any) {
  const { httpMethod, headers } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod === 'GET') {
    return await getAnalytics(headers, event.queryStringParameters || {});
  }

  if (httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' }, headers);
  }

  try {
    return await saveResult(event);
  } catch (error) {
    console.error('Results error:', error);
    return response(500, { error: 'Internal server error' }, headers);
  }
}

async function getAnalytics(headers: any, params: any) {
  const user = await verifyAuth(getHeader(headers, 'authorization'));
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

  return response(200, { sessions, results }, headers);
}

async function saveResult(event: any) {
  const headers = event.headers || {};
  const ip = getIp(event);
  if (!checkRate(ip)) {
    return response(429, { error: 'Rate limit exceeded. Try again in a minute.' }, headers);
  }

  const body = parseBody(event.body);
  if (!body || typeof body !== 'object') {
    return response(400, { error: 'Invalid JSON' }, headers);
  }

  const quizId = typeof body.quiz_id === 'string' ? body.quiz_id : '';
  if (!UUID_RE.test(quizId)) {
    return response(400, { error: 'valid quiz_id is required' }, headers);
  }

  const user = await optionalUser(headers);
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
  const score = clampInt(body.score, 0, 10_000_000, 0);
  const timeSpentSeconds = clampInt(
    body.time_spent_seconds ?? body.time_spent,
    0,
    604_800,
    0,
  );
  const participantName = clampString(body.participant_name, 200, 'Guest');
  const participantEmail = clampString(body.participant_email, 320, null);
  const finalNodeTitle = clampString(body.final_node_title, 300, 'Завершено');
  const resultsData = normalizeJsonObject(body.results_data);
  const pathData = clampPathData(body.path_data);

  const [result] = await query(
    `INSERT INTO public.quiz_results
       (quiz_id, session_id, user_id, score, participant_name, participant_email,
        final_node_title, results_data, path_data, time_spent_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
     ON CONFLICT (session_id) DO UPDATE SET
       score = EXCLUDED.score,
       participant_name = EXCLUDED.participant_name,
       participant_email = EXCLUDED.participant_email,
       final_node_title = EXCLUDED.final_node_title,
       results_data = EXCLUDED.results_data,
       path_data = EXCLUDED.path_data,
       time_spent_seconds = EXCLUDED.time_spent_seconds
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

  await query(
    `UPDATE public.quiz_sessions
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now()),
         path_data = $1::jsonb
     WHERE session_token = $2 OR id::text = $2`,
    [JSON.stringify(pathData), sessionId],
  ).catch((error) => {
    console.warn('[api-results] session update skipped:', error?.message || error);
  });

  return response(201, { id: result.id, score: result.score, session_id: sessionId }, headers);
}

function canSavePublicResult(quiz: any, user: AuthUser | null): boolean {
  if (quiz.visibility === 'public' || quiz.visibility === 'unlisted') return true;
  return quiz.visibility === 'private' && Boolean(user && user.id === quiz.user_id);
}

async function optionalUser(headers: any): Promise<AuthUser | null> {
  try {
    return await verifyAuth(getHeader(headers, 'authorization'));
  } catch {
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
  const headers = event.headers || {};
  return (
    getHeader(headers, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader(headers, 'cf-connecting-ip') ||
    getHeader(headers, 'x-real-ip') ||
    event.requestContext?.identity?.sourceIp ||
    event.requestContext?.http?.sourceIp ||
    'unknown'
  );
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

function response(statusCode: number, body: unknown, headers?: any) {
  return {
    statusCode,
    headers: { ...corsHeaders(getHeader(headers, 'origin')), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

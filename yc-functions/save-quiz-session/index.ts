import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();
    await ensureUser(user.id, user.email);

    const action = pathParameters?.action || 'create';

    switch (action) {
      case 'create':
        return await createSession(body, user);
      case 'update':
        return await updateSession(body, user);
      case 'complete':
        return await completeSession(body, user);
      case 'abandon':
        return await abandonSession(body, user);
      default:
        return notFound();
    }
  } catch (error) {
    console.error('Session error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function createSession(body: string, user: any) {
  const { quiz_id } = JSON.parse(body);
  if (!quiz_id) return badRequest('quiz_id is required');

  const quiz = await queryOne(
    `SELECT id FROM public.quizzes WHERE id = $1 AND deleted_at IS NULL`,
    [quiz_id],
  );
  if (!quiz) return badRequest('Quiz not found');

  const sessionToken = `sess_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const [session] = await query(
    `INSERT INTO public.quiz_sessions (quiz_id, user_id, session_token, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, session_token, created_at`,
    [quiz_id, user.id, sessionToken],
  );

  return ok({
    id: session.id,
    session_token: session.session_token,
    created_at: session.created_at,
  }, 201);
}

async function updateSession(body: string, user: any) {
  const { session_token, path_data } = JSON.parse(body);
  if (!session_token) return badRequest('session_token is required');

  let clampedPathData = path_data;
  if (Array.isArray(clampedPathData) && clampedPathData.length > 1000) {
    clampedPathData = clampedPathData.slice(-1000);
  }

  const session = await queryOne(
    `SELECT id FROM public.quiz_sessions WHERE session_token = $1 AND user_id = $2`,
    [session_token, user.id],
  );
  if (!session) return badRequest('Session not found');

  await query(
    `UPDATE public.quiz_sessions
     SET path_data = $1
     WHERE session_token = $2 AND user_id = $3`,
    [clampedPathData ? JSON.stringify(clampedPathData) : null, session_token, user.id],
  );

  return ok({ updated: true });
}

async function completeSession(body: string, user: any) {
  const { session_token, path_data } = JSON.parse(body);
  if (!session_token) return badRequest('session_token is required');

  let clampedPathData = path_data;
  if (Array.isArray(clampedPathData) && clampedPathData.length > 1000) {
    clampedPathData = clampedPathData.slice(-1000);
  }

  const [result] = await query(
    `UPDATE public.quiz_sessions
     SET status = 'completed', completed_at = now(), path_data = $1
     WHERE session_token = $2 AND user_id = $3 AND status = 'active'
     RETURNING id`,
    [clampedPathData ? JSON.stringify(clampedPathData) : null, session_token, user.id],
  );

  if (!result) return badRequest('Session not found or already completed');

  return ok({ completed: true, id: result.id });
}

async function abandonSession(body: string, user: any) {
  const { session_token } = JSON.parse(body);
  if (!session_token) return badRequest('session_token is required');

  await query(
    `UPDATE public.quiz_sessions
     SET status = 'abandoned', abandoned_at = now()
     WHERE session_token = $1 AND user_id = $2 AND status = 'active'`,
    [session_token, user.id],
  );

  return ok({ abandoned: true });
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) };
}

function badRequest(message: string) {
  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

function notFound() {
  return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ error: 'Not found' }) };
}

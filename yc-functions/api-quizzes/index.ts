import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters, queryStringParameters } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  try {
    switch (httpMethod) {
      case 'GET':
        return pathParameters?.id
          ? await getQuiz(headers, pathParameters.id)
          : await listQuizzes(headers, queryStringParameters);
      case 'POST':
        return await createQuiz(headers, body);
      case 'PUT':
        return await updateQuiz(headers, pathParameters?.id, body);
      case 'DELETE':
        return await deleteQuiz(headers, pathParameters?.id);
      default:
        return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
    }
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function listQuizzes(headers: any, params: any) {
  if (params?.public === 'true' || params?.public === true) {
    const rows = await query(
      `SELECT id, name, quiz_data, created_at, published_at, visibility, is_favorite,
              (published_at IS NOT NULL) as is_published,
              quiz_data->>'description' as description,
              quiz_data->>'cover_image_url' as cover_image_url
       FROM public.quizzes
       WHERE visibility = 'public'
         AND deleted_at IS NULL
         AND moderation_status NOT IN ('blocked', 'hidden', 'deleted', 'rejected')
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT 200`,
    );

    return ok(rows);
  }

  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  await ensureUser(user.id, user.email);

  const rows = await query(
    `SELECT id, name, visibility, is_favorite, created_at, updated_at,
            quiz_data->>'description' as description,
            quiz_data->>'cover_image_url' as cover_image_url
     FROM public.quizzes
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 100`,
    [user.id],
  );

  return ok(rows);
}

async function getQuiz(headers: any, quizId: string) {
  const quiz = await queryOne(
    `SELECT * FROM public.quizzes WHERE id = $1 AND deleted_at IS NULL`,
    [quizId],
  );

  if (!quiz) return notFound();

  if (quiz.visibility === 'public' || quiz.visibility === 'unlisted') return ok(quiz);

  const user = await verifyAuth(headers.authorization);
  if (!user || user.id !== quiz.user_id) return unauthorized();

  return ok(quiz);
}

async function createQuiz(headers: any, body: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  await ensureUser(user.id, user.email);

  const { name, quiz_data, visibility } = JSON.parse(body);

  const [quiz] = await query(
    `INSERT INTO public.quizzes (user_id, name, quiz_data, visibility)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user.id, name || 'Без названия', quiz_data || {}, visibility || 'private'],
  );

  return ok(quiz, 201);
}

async function updateQuiz(headers: any, quizId: string, body: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  const updates = JSON.parse(body);

  const [quiz] = await query(
    `UPDATE public.quizzes
     SET name = COALESCE($3, name),
         quiz_data = COALESCE($4, quiz_data),
         visibility = COALESCE($5, visibility),
         is_favorite = COALESCE($6, is_favorite),
         updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      quizId, user.id,
      updates.name, updates.quiz_data,
      updates.visibility, updates.is_favorite,
    ],
  );

  if (!quiz) return notFound();
  return ok(quiz);
}

async function deleteQuiz(headers: any, quizId: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  await query(
    `UPDATE public.quizzes SET deleted_at = now() WHERE id = $1 AND user_id = $2`,
    [quizId, user.id],
  );

  return ok({ deleted: true });
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return {
    statusCode: 401,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

function notFound() {
  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Not found' }),
  };
}

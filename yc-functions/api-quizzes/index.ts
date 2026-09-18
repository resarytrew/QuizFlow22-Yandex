import { AccountBlockedError } from '../_shared/auth';
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
          ? await getQuiz(event, pathParameters.id)
          : await listQuizzes(event, queryStringParameters);
      case 'POST':
        return await createQuiz(event, body);
      case 'PUT':
        return await updateQuiz(event, pathParameters?.id, body);
      case 'DELETE':
        return await deleteQuiz(event, pathParameters?.id);
      default:
        return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
    }
  } catch (error) {
    if (error instanceof AccountBlockedError) return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: error.code }) };
    console.error('API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function listQuizzes(event: any, params: any) {
  if (params?.public === 'true' || params?.public === true) {
    const summary = params?.summary === 'true';
    const dataSelect = summary ? `jsonb_build_object(
      'description',published_quiz_data->'description','cover_image_url',published_quiz_data->'cover_image_url',
      'templateId',published_quiz_data->'templateId','keywords',published_quiz_data->'keywords',
      'passport',published_quiz_data->'passport','globalTimer',published_quiz_data->'globalTimer',
      'nodes','[]'::jsonb,'edges','[]'::jsonb
    ) AS quiz_data, true AS is_summary,
    (SELECT count(*)::integer FROM jsonb_array_elements(CASE WHEN jsonb_typeof(published_quiz_data->'nodes')='array' THEN published_quiz_data->'nodes' ELSE '[]'::jsonb END) n
      WHERE n->>'type' IN ('questionNode','multipleChoiceNode','textInputNode','matchingNode','timelineNode')) AS question_count` : 'published_quiz_data AS quiz_data';
    const baseSelect = `SELECT id, published_name AS name, ${dataSelect}, created_at, published_at, visibility, is_favorite,
                               (published_at IS NOT NULL) as is_published,
                               published_quiz_data->>'description' as description,
                               published_quiz_data->>'cover_image_url' as cover_image_url
                        FROM public.quizzes
                        WHERE visibility = 'public'
                          AND deleted_at IS NULL`;
    const rows = await query(
      `${baseSelect}
         AND published_quiz_data IS NOT NULL AND moderation_status NOT IN ('blocked','hidden','deleted')
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT 200`,
    );

    return ok(rows);
  }

  const user = await verifyAuth(event);
  if (!user) return unauthorized();

  await ensureUser(user.id, user.email);

  const rows = await query(
    `SELECT id, name, visibility, revision, (published_quiz_data IS NOT NULL) AS has_published_version, moderation_status, published_at, is_favorite, created_at, updated_at,
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

async function getQuiz(event: any, quizId: string) {
  const quiz = await queryOne(
    `SELECT * FROM public.quizzes WHERE id = $1 AND deleted_at IS NULL`,
    [quizId],
  );

  if (!quiz) return notFound();

  const user = await verifyAuth(event, { allowBlocked: true });
  if (user?.id === quiz.user_id) return ok({ ...quiz, has_published_version: !!quiz.published_quiz_data });
  if (quiz.visibility === 'unlisted') {
    const publicData = await queryOne('SELECT public.quiz_public_content(quiz_data) AS quiz_data FROM public.quizzes WHERE id=$1', [quizId]);
    return ok({ id: quiz.id, name: quiz.name, quiz_data: publicData?.quiz_data,
      visibility: quiz.visibility, created_at: quiz.created_at, updated_at: quiz.updated_at });
  }
  if (quiz.visibility === 'public' && quiz.published_quiz_data && !['blocked','hidden','deleted'].includes(quiz.moderation_status))
    return ok({ id: quiz.id, name: quiz.published_name, quiz_data: quiz.published_quiz_data,
      visibility: quiz.visibility, moderation_status: 'approved', created_at: quiz.created_at,
      updated_at: quiz.published_at, published_at: quiz.published_at, is_published: true });
  return notFound();
}

async function createQuiz(event: any, body: string) {
  const user = await verifyAuth(event);
  if (!user) return unauthorized();

  await ensureUser(user.id, user.email);

  const { name, quiz_data, visibility } = JSON.parse(body);

  const [quiz] = await query(
    `INSERT INTO public.quizzes (user_id, name, quiz_data, visibility, moderation_status)
     VALUES ($1, $2, $3, $4, 'unreviewed')
     RETURNING *`,
    [user.id, name || 'Без названия', quiz_data || {}, visibility || 'private'],
  );

  return ok(quiz, 201);
}

async function updateQuiz(event: any, quizId: string, body: string) {
  const user = await verifyAuth(event);
  if (!user) return unauthorized();

  const updates = JSON.parse(body);
  if (updates.expected_revision !== undefined && (!Number.isInteger(updates.expected_revision) || updates.expected_revision < 1)) {
    return ok({ error: 'invalid_revision' }, 400);
  }

  const [quiz] = await query(
    `UPDATE public.quizzes
     SET name = COALESCE($3, name),
         quiz_data = CASE WHEN $4::jsonb IS NULL THEN quiz_data ELSE quiz_data || $4::jsonb END,
         visibility = COALESCE($5, visibility),
         is_favorite = COALESCE($6, is_favorite),
         updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       AND ($7::integer IS NULL OR revision = $7)
     RETURNING *`,
    [
      quizId, user.id,
      updates.name, updates.quiz_data,
      updates.visibility, updates.is_favorite, updates.expected_revision,
    ],
  );

  if (!quiz) {
    const existing = await queryOne('SELECT id FROM public.quizzes WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL', [quizId,user.id]);
    return existing ? ok({error:'revision_conflict'},409) : notFound();
  }
  return ok({ ...quiz, has_published_version: !!quiz.published_quiz_data });
}

async function deleteQuiz(event: any, quizId: string) {
  const user = await verifyAuth(event);
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

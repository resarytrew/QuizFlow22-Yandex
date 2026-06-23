import { verifyAuth, ensureUser } from '../_shared/auth';
import { query } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod === 'GET') {
    return await getAnalytics(headers, event.queryStringParameters || {});
  }

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    return await saveResult(headers, body);
  } catch (error) {
    console.error('Results error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function getAnalytics(headers: any, params: any) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  const quizId = params.quiz_id;
  if (!quizId) return badRequest('quiz_id is required');

  const ownerRows = await query(
    `SELECT id FROM public.quizzes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [quizId, user.id],
  );
  if (!ownerRows.length) return unauthorized();

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

  return ok({ sessions, results });
}

async function saveResult(headers: any, body: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();

  await ensureUser(user.id, user.email);

  const {
    quiz_id,
    session_id,
    answers,
    path_data,
    participant_name,
    participant_email,
    final_node_title,
    time_spent_seconds,
  } = JSON.parse(body);

  if (!quiz_id) return badRequest('quiz_id is required');

  const quiz = await query(
    `SELECT id FROM public.quizzes WHERE id = $1 AND deleted_at IS NULL`,
    [quiz_id],
  );
  if (!quiz.length) return badRequest('Quiz not found');

  // Rate limiting: max 10 results per minute per user
  const [rateCheck] = await query(
    `SELECT COUNT(*) as count FROM public.quiz_results
     WHERE user_id = $1 AND created_at > now() - interval '1 minute'`,
    [user.id],
  );
  if (parseInt(rateCheck?.count || '0') >= 10) {
    return {
      statusCode: 429,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
    };
  }

  let correctCount = 0;
  let totalQuestions = 0;

  try {
    const quizData = await query(
      `SELECT quiz_data FROM public.quizzes WHERE id = $1`,
      [quiz_id],
    );
    const data = quizData[0]?.quiz_data;
    const questions = data?.nodes?.filter((n: any) =>
      ['question', 'multipleChoice', 'singleChoice'].includes(n.type)
    ) ?? [];
    totalQuestions = questions.length;

    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        const q = questions.find((n: any) => n.id === answer.question_id);
        if (q) {
          const isCorrect = Array.isArray(q.data?.correctAnswer)
            ? arraysEqual([...q.data.correctAnswer].sort(), (answer.value || []).sort())
            : q.data?.correctAnswer === answer.value;
          if (isCorrect) correctCount++;
        }
      }
    }
  } catch {
    // fallback: score 0
  }

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Clamp values
  const clampedScore = Math.min(Math.max(score, 0), 10000000);
  const clampedTime = time_spent_seconds
    ? Math.min(Math.max(Math.round(time_spent_seconds), 0), 604800)
    : null;
  const clampedName = participant_name ? participant_name.slice(0, 200) : null;
  const clampedTitle = final_node_title ? final_node_title.slice(0, 300) : null;

  // Clamp path_data to 1000 entries
  let clampedPathData = path_data || null;
  if (clampedPathData && Array.isArray(clampedPathData) && clampedPathData.length > 1000) {
    clampedPathData = clampedPathData.slice(-1000);
  }

  const [result] = await query(
    `INSERT INTO public.quiz_results
     (quiz_id, session_id, user_id, score, participant_name, participant_email,
      final_node_title, results_data, path_data, time_spent_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (session_id) DO UPDATE SET
       score = $4, participant_name = $5, participant_email = $6,
       final_node_title = $7, results_data = $8, path_data = $9, time_spent_seconds = $10
     RETURNING id, score`,
    [
      quiz_id,
      sessionId,
      user.id,
      clampedScore,
      clampedName,
      participant_email || null,
      clampedTitle,
      JSON.stringify({ answers: answers || [] }),
      clampedPathData ? JSON.stringify(clampedPathData) : null,
      clampedTime,
    ],
  );

  // Update session if it exists
  if (session_id) {
    await query(
      `UPDATE public.quiz_sessions
       SET status = 'completed', completed_at = now(), path_data = $1
       WHERE session_token = $2`,
      [clampedPathData ? JSON.stringify(clampedPathData) : null, session_id],
    );
  }

  return ok({
    id: result.id,
    score: result.score,
    total_questions: totalQuestions,
    correct_answers: correctCount,
    session_id: sessionId,
  }, 201);
}

function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
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

function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

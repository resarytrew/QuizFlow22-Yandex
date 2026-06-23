import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

const YC_CATALOG_ID = process.env.YC_CATALOG_ID || '';

async function getIamToken(): Promise<string> {
  const res = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      yandexPassportOauthToken: process.env.YC_OAUTH_TOKEN,
    }),
  });
  const data = await res.json() as { iamToken: string };
  return data.iamToken;
}

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();

    await ensureUser(user.id, user.email);

    const { prompt, type } = JSON.parse(body);
    if (!prompt) return badRequest('prompt is required');

    const today = new Date().toISOString().slice(0, 10);
    const [usage] = await query(
      `SELECT COUNT(*) as count FROM public.ai_rate_limits
       WHERE user_id = $1 AND window_start > $2::timestamptz`,
      [user.id, today],
    );

    const sub = await queryOne(
      `SELECT id FROM public.subscriptions
       WHERE user_id = $1 AND status = 'active' AND current_period_end > now()`,
      [user.id],
    );

    const limit = sub ? 200 : 5;
    const used = parseInt(usage?.count || '0');
    if (used >= limit) {
      return {
        statusCode: 429,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'AI generation limit reached', used, limit }),
      };
    }

    const iam = await getIamToken();
    const res = await fetch(
      `https://llm.api.cloud.yandex.net/foundationModels/v1/completion`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${iam}`,
          'x-folder-id': YC_CATALOG_ID,
        },
        body: JSON.stringify({
          modelUri: `gpt://${YC_CATALOG_ID}/yandexgpt-lite`,
          completionOptions: { stream: false, temperature: 0.7, maxTokens: 2000 },
          messages: [
            { role: 'system', text: 'Ты — помощник для создания викторин. Генерируй вопросы и ответы в формате JSON.' },
            { role: 'user', text: prompt },
          ],
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[ai] YC GPT error:', res.status, errText);
      return serverError('AI generation failed');
    }

    const result = await res.json() as { result?: { alternatives?: Array<{ message?: { text?: string } }> } };

    await query(
      `INSERT INTO public.ai_rate_limits (user_id, window_start) VALUES ($1, now())`,
      [user.id],
    );

    return ok({
      result: result.result?.alternatives?.[0]?.message?.text || '',
      used: used + 1,
      limit,
    });
  } catch (error) {
    console.error('AI proxy error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
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

function serverError(message: string) {
  return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

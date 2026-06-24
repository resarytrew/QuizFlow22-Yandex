import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders, handleCors } from '../_shared/cors';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTES_API_KEY || '';
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_ALLOWED_MODELS =
  'openai/gpt-4o-mini,openai/gpt-4o,google/gemini-flash-1.5,google/gemini-3-flash-preview,anthropic/claude-3-haiku';
const ALLOWED_MODELS = (process.env.AI_PROXY_ALLOWED_MODELS || DEFAULT_ALLOWED_MODELS)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const DEFAULT_MODEL = process.env.AI_PROXY_DEFAULT_MODEL || ALLOWED_MODELS[0] || 'openai/gpt-4o-mini';
const MAX_OUTPUT_TOKENS = Number(process.env.AI_PROXY_MAX_TOKENS || '16000');
const MAX_PROMPT_CHARS = Number(process.env.AI_PROXY_MAX_PROMPT_CHARS || '24000');

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

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

    const requestBody = JSON.parse(body || '{}');
    const prompt = requestBody.prompt;
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return badRequest('prompt is required');
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return badRequest('prompt is too long');
    }
    if (!OPENROUTER_API_KEY) {
      return serverError('OPENROUTER_API_KEY is not configured');
    }

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
    const used = parseInt(usage?.count || '0', 10);
    if (used >= limit) {
      return {
        statusCode: 429,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'AI generation limit reached', used, limit }),
      };
    }

    const requestedModel = typeof requestBody.model === 'string' ? requestBody.model : '';
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const wantsJson = Boolean(requestBody.expectJson) || requestBody.type === 'json';

    const messages = [
      {
        role: 'system',
        content: wantsJson
          ? 'You are an assistant for building quizzes. Return only valid JSON, without Markdown fences or explanations.'
          : 'You are an assistant for building quizzes. Be concise and practical.',
      },
      { role: 'user', content: prompt },
    ];

    const upstreamBody: Record<string, unknown> = {
      model,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: false,
    };

    if (typeof requestBody.temperature === 'number' && Number.isFinite(requestBody.temperature)) {
      upstreamBody.temperature = Math.max(0, Math.min(2, requestBody.temperature));
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.AI_PROXY_REFERER || process.env.FRONTEND_URL || 'https://mykviz.ru',
        'X-Title': process.env.AI_PROXY_TITLE || 'Potok',
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[ai] OpenRouter error:', response.status, errText);
      return serverError('AI generation failed');
    }

    const result = (await response.json()) as OpenRouterResponse;
    const content = result.choices?.[0]?.message?.content || '';

    await insertUsage(user.id);

    return ok({
      result: content,
      used: used + 1,
      limit,
      model,
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

async function insertUsage(userId: string) {
  try {
    await query(
      `INSERT INTO public.ai_rate_limits (user_id, window_start, feature)
       VALUES ($1, now(), $2)`,
      [userId, 'chat'],
    );
  } catch {
    await query(
      `INSERT INTO public.ai_rate_limits (user_id, window_start)
       VALUES ($1, now())`,
      [userId],
    );
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

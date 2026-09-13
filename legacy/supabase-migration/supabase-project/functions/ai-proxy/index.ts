// supabase/functions/ai-proxy/index.ts
// Supabase Edge Function that proxies AI API calls server-side.
// Rate-limited per user, with audit logging and server-side API keys.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEntitlement, hasFeature } from '../_shared/entitlement.ts';
import { jsonResponse, handleCorsPreflight, corsHeaders } from '../_shared/cors.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const RATE_LIMIT_WINDOW_HOURS = 1;
// Базовый (free) лимит — низкий; для PRO — см. PRO_RATE_LIMIT_MAX_REQUESTS
const RATE_LIMIT_MAX_REQUESTS = 10;
const PRO_RATE_LIMIT_MAX_REQUESTS = 60;

// Белый список моделей чата (защита от выбора дорогих моделей клиентом — SEC-10).
// Переопределяется переменной AI_PROXY_ALLOWED_MODELS (через запятую).
const ALLOWED_MODELS = (Deno.env.get('AI_PROXY_ALLOWED_MODELS') ??
  'openai/gpt-4o-mini,openai/gpt-4o,google/gemini-flash-1.5,anthropic/claude-3-haiku')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
// Модели, доступные БЕЗ подписки PRO (дешёвые)
const BASIC_MODELS = new Set([
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
]);
const DEFAULT_MODEL = ALLOWED_MODELS[0] ?? 'openai/gpt-4o-mini';
const MAX_OUTPUT_TOKENS = Number(Deno.env.get('AI_PROXY_MAX_TOKENS') ?? '2048');
const MAX_PROMPT_CHARS = Number(Deno.env.get('AI_PROXY_MAX_PROMPT_CHARS') ?? '24000');

/**
 * Shared rate limit. The old design used an in-memory Map (`rateLimitMap`)
 * which (a) grew without bound across cold-starts, (b) was per-instance
 * so a horizontally-scaled deployment could not enforce a global limit,
 * (c) was easy to bypass by rotating `X-Forwarded-For` headers.
 *
 * The new design delegates to the `ai_rate_limit_check` plpgsql function
 * (migration 20260606000000_atomic.sql). Counters live in the
 * `public.ai_rate_limits` table; the function uses an UPSERT with
 * `ON CONFLICT DO UPDATE` so two concurrent requests for the same
 * `(user_id, feature, window_start)` atomically increment to 2 instead
 * of racing and one seeing count=0.
 *
 * This still uses `user_id` (not IP) as the rate limit key, which means
 * a determined attacker with many accounts can still rotate identities.
 * Real abuse protection requires device fingerprinting or a WAF in front
 * of the Edge Function — both are P2 hardening items.
 */
async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  isPro: boolean,
): Promise<boolean> {
  const limit = isPro ? PRO_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS;
  const { data, error } = await supabase.rpc('ai_rate_limit_check', {
    p_user_id: userId,
    p_feature: feature,
    p_window_hours: RATE_LIMIT_WINDOW_HOURS,
    p_limit: limit,
  });
  if (error) {
    // Fail open on RPC error: better to serve one extra request than
    // to lock the user out because of a DB hiccup. Log for monitoring.
    console.warn('[ai-proxy] rate limit RPC failed, fail-open:', error.message);
    return true;
  }
  return data === true;
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Shared CORS preflight (handles OPTIONS via _shared/cors.ts).
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/ai-proxy/, '');

  // Auth check — extract user from Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let userId = 'anonymous';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      userId = user.id;
    }
  }

  if (userId === 'anonymous') {
    return jsonResponse({ error: 'Unauthorized — sign in to use AI features' }, 401, origin);
  }

  // Entitlement: PRO → расширенный rate limit и доступ к advanced/premium tier
  let isPro = false;
  try {
    const ent = await getEntitlement(supabase, userId);
    isPro = ent.plan === 'pro';
  } catch (e) {
    console.warn('[ai-proxy] entitlement check failed, falling back to free:', e);
  }

  if (!(await checkRateLimit(supabase, userId, 'all', isPro))) {
    return jsonResponse(
      {
        error: 'Rate limit exceeded. Try again later.',
        is_pro: isPro,
        upgrade_url: '/#/billing',
      },
      429,
      origin,
    );
  }

  try {
    const body = await req.json();

    if (path === '/generate-image') {
      return await handleImageGeneration(body, userId, supabase, origin);
    }

    if (path === '/chat') {
      return await handleChatCompletion(body, userId, supabase, origin, isPro);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  } catch (err) {
    console.error(`[AI Proxy] Error for user ${userId}:`, err);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
});

async function handleImageGeneration(
  body: any,
  userId: string,
  supabase: SupabaseClient,
  origin: string | null,
): Promise<Response> {
  const { prompt, type } = body ?? {};

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return jsonResponse({ error: 'prompt is required' }, 400, origin);
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: 'GEMINI_API_KEY not configured on server' }, 500, origin);
  }

  const geminiBody = {
    contents: [{
      parts: [{ text: `${prompt}. High quality, professional style.` }],
    }],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[AI Proxy] Gemini API error: ${response.status} ${errText}`);
    return jsonResponse({ error: 'Image generation failed' }, response.status, origin);
  }

  const data = await response.json();
  let imageUrl: string | null = null;

  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageUrl) {
    return jsonResponse({ error: 'No image in response' }, 500, origin);
  }

  await logUsage(supabase, userId, 'generate-image', { promptLength: prompt.length, type });

  return jsonResponse({ imageUrl }, 200, origin);
}

async function handleChatCompletion(
  body: any,
  userId: string,
  supabase: SupabaseClient,
  origin: string | null,
  isPro: boolean,
): Promise<Response> {
  const { model, prompt, expectJson, stream, temperature } = body ?? {};

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return jsonResponse({ error: 'prompt is required' }, 400, origin);
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return jsonResponse({ error: 'prompt too long' }, 413, origin);
  }

  if (!OPENROUTER_API_KEY) {
    return jsonResponse({ error: 'OPENROUTER_API_KEY not configured on server' }, 500, origin);
  }

  // Только разрешённые модели; иначе откатываемся к дефолтной (SEC-10).
  let safeModel =
    typeof model === 'string' && ALLOWED_MODELS.includes(model)
      ? model
      : DEFAULT_MODEL;

  // Гейтинг по подписке: без PRO — только базовые модели
  if (!isPro && !BASIC_MODELS.has(safeModel)) {
    return jsonResponse(
      {
        error: 'model_locked',
        message: 'Эта модель доступна только в PRO. Используйте базовую.',
        is_pro: false,
        upgrade_url: '/#/billing',
        basic_models: Array.from(BASIC_MODELS),
      },
      403,
      origin,
    );
  }

  const requestBody: Record<string, unknown> = {
    model: safeModel,
    messages: [{ role: 'user', content: prompt }],
    stream: Boolean(stream),
    max_tokens: MAX_OUTPUT_TOKENS,
  };

  if (expectJson) {
    requestBody.response_format = { type: 'json_object' };
  }

  // Температуру ограничиваем диапазоном [0, 2].
  if (typeof temperature === 'number' && Number.isFinite(temperature)) {
    requestBody.temperature = Math.max(0, Math.min(2, temperature));
  }

  const upstreamHeaders = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Deno.env.get('AI_PROXY_REFERER') ?? 'https://mykviz.ru',
    'X-Title': 'Поток',
  };

  if (stream) {
    const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      console.error(`[AI Proxy] upstream stream error ${upstreamResponse.status}: ${errText}`);
      return jsonResponse({ error: 'AI service error' }, 502, origin);
    }

    // Log usage; don't await — keep stream responsive
    logUsage(supabase, userId, 'chat-stream', { model: requestBody.model, promptLength: prompt.length });

    return new Response(upstreamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders(origin),
      },
    });
  }

  const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify(requestBody),
  });

  if (!upstreamResponse.ok) {
    const errText = await upstreamResponse.text();
    console.error(`[AI Proxy] upstream error ${upstreamResponse.status}: ${errText}`);
    return jsonResponse({ error: 'AI service error' }, 502, origin);
  }

  const data = await upstreamResponse.json();
  const content = data?.choices?.[0]?.message?.content ?? '';

  await logUsage(supabase, userId, 'chat', { model: requestBody.model, promptLength: prompt.length });

  return jsonResponse({ content }, 200, origin);
}

async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('ai_usage').insert({
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical — don't fail the request
  }
}

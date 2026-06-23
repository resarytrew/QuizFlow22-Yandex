// supabase/functions/_shared/cors.ts
// Унифицированные CORS-хелперы (allow-list через env).
//
// Env is read on every call (not at module load) so that unit tests
// can flip BILLING_ALLOWED_ORIGINS / AI_PROXY_ALLOWED_ORIGINS between
// cases without re-importing. The cost is two extra Deno.env.get() per
// request, which is negligible.

function getAllowedOrigins(): string[] {
  return (Deno.env.get('ADMIN_ALLOWED_ORIGINS') ??
    Deno.env.get('BILLING_ALLOWED_ORIGINS') ??
    Deno.env.get('AI_PROXY_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers':
      'authorization, content-type, x-client-info, apikey, x-cron-secret',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  const allowed = getAllowedOrigins();
  if (allowed.includes('*')) {
    headers['Access-Control-Allow-Origin'] = origin ?? '*';
  } else if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
      ...extra,
    },
  });
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('Origin')),
  });
}

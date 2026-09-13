const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://mykviz.ru,https://mykviz.online,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return process.env.NODE_ENV === 'test';
  return ALLOWED_ORIGINS.includes(origin);
}

export function corsHeaders(origin?: string): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-request-id, x-admin-secret, x-cron-secret',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function handleCors(event?: { headers?: Record<string, string> }): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const origin = event?.headers?.origin || event?.headers?.['Origin'];
  return {
    statusCode: 204,
    body: '',
    headers: corsHeaders(origin),
  };
}

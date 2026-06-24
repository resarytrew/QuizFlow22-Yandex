const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://mykviz.ru,http://localhost:5173')
  .split(',')
  .map(s => s.trim());

export function corsHeaders(origin?: string): Record<string, string> {
  const normalizedOrigin = origin === 'null' ? 'null' : origin;
  const allowed = normalizedOrigin === 'null'
    ? 'null'
    : normalizedOrigin && ALLOWED_ORIGINS.includes(normalizedOrigin)
    ? normalizedOrigin
    : ALLOWED_ORIGINS[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-request-id',
    'Access-Control-Max-Age': '86400',
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

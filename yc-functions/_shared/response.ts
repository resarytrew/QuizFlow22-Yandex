import { corsHeaders } from './cors';

export interface YcResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export function ok<T = any>(data: T, statusCode = 200): YcResponse {
  return {
    statusCode,
    body: JSON.stringify(data),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

export function created<T = any>(data: T): YcResponse {
  return ok(data, 201);
}

export function noContent(): YcResponse {
  return {
    statusCode: 204,
    body: '',
    headers: corsHeaders(),
  };
}

export function badRequest(message: string): YcResponse {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: message }),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

export function unauthorized(message = 'Unauthorized'): YcResponse {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: message }),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

export function forbidden(message = 'Forbidden'): YcResponse {
  return {
    statusCode: 403,
    body: JSON.stringify({ error: message }),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

export function notFound(message = 'Not found'): YcResponse {
  return {
    statusCode: 404,
    body: JSON.stringify({ error: message }),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

export function serverError(err: unknown): YcResponse {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[response] serverError:', message);
  return {
    statusCode: 500,
    body: JSON.stringify({ error: message }),
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  };
}

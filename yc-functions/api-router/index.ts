import { handler as quizzesHandler } from '../api-quizzes';
import { handler as resultsHandler } from '../api-results';
import { handler as billingHandler } from '../api-billing';
import { handler as adminHandler } from '../api-admin';
import { handler as supportHandler } from '../api-support';
import { handler as aiProxyHandler } from '../api-ai-proxy';
import { handler as uploadHandler } from '../upload-asset';
import { handler as redeemPromoHandler } from '../billing-redeem-promo';
import { handler as grantProHandler } from '../billing-admin-grant-pro';
import { handler as sessionsHandler } from '../save-quiz-session';
import { handler as authHandler } from '../api-auth';
import { corsHeaders, handleCors, isAllowedOrigin } from '../_shared/cors';
import { SESSION_COOKIE } from '../_shared/session';

type Handler = (event: any) => Promise<any>;

function normalizePath(event: any): string {
  const rawPath =
    event.path ||
    event.requestContext?.identity?.path ||
    event.requestContext?.http?.target ||
    event.url ||
    event.requestContext?.http?.path ||
    event.requestContext?.path ||
    event.rawPath ||
    event.params?.path ||
    '';

  const path = String(rawPath).split('?')[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function apiSegments(event: any): string[] {
  const proxy =
    event.pathParameters?.proxy ||
    event.pathParameters?.['proxy+'] ||
    event.params?.proxy ||
    event.params?.path?.proxy ||
    event.params?.path?.['proxy+'] ||
    event.params?.pathParams?.proxy ||
    event.params?.pathParams?.['proxy+'];
  if (typeof proxy === 'string' && proxy.trim()) {
    return proxy.split('/').filter(Boolean).map(decodeURIComponent);
  }

  const path = normalizePath(event);
  const withoutApi = path.replace(/^\/api\/?/, '');
  const segments = withoutApi.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 1 && (segments[0] === '{proxy+}' || segments[0] === ':proxy')) {
    const requestPath = event.requestContext?.requestPath || event.requestContext?.resourcePath || '';
    return String(requestPath).replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  }

  return segments;
}

function withParams(event: any, params: Record<string, string | undefined>): any {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    ...event,
    headers,
    pathParameters: {
      ...(event.pathParameters || {}),
      ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)),
    },
  };
}

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

async function dispatch(event: any, handler: Handler, params: Record<string, string | undefined> = {}) {
  const normalizedEvent = withParams(event, params);
  const result = await handler(normalizedEvent);
  return {
    ...result,
    headers: {
      ...(result?.headers || {}),
      ...corsHeaders(normalizedEvent.headers?.origin),
    },
  };
}

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return handleCors(event);

  const [resource, ...rest] = apiSegments(event);
  const method = String(event.httpMethod || 'GET').toUpperCase();
  const origin = event.headers?.origin || event.headers?.Origin;
  const cookie = event.headers?.cookie || event.headers?.Cookie || '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      && String(cookie).includes(`${SESSION_COOKIE}=`)
      && !isAllowedOrigin(origin)) {
    return dispatch(event, async () => ({
      statusCode: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Недопустимый источник запроса.' }),
    }));
  }

  try {
    switch (resource) {
      case 'quizzes':
        return dispatch(event, quizzesHandler, { id: rest[0] });

      case 'results':
        return dispatch(event, resultsHandler);

      case 'billing': {
        const action = rest.join('/');
        if (action === 'redeem-promo') return dispatch(event, redeemPromoHandler);
        if (action === 'grant-pro') return dispatch(event, grantProHandler);
        return dispatch(event, billingHandler, { action });
      }

      case 'admin':
        return dispatch(event, adminHandler, { action: rest.join('/') });

      case 'support':
        if (rest[0] === 'tickets' && rest[1] && rest[2] === 'messages') {
          return dispatch(event, supportHandler, { ticketId: rest[1] });
        }
        if (rest[0] === 'tickets' && !rest[1]) return dispatch(event, supportHandler);
        return response(404, { error: 'Not found' });

      case 'ai-proxy':
        return dispatch(event, aiProxyHandler);

      case 'upload':
        return dispatch(event, uploadHandler);

      case 'sessions':
        return dispatch(event, sessionsHandler, { action: rest[0] || 'create' });

      case 'auth':
        return dispatch(event, authHandler, { action: rest.join('/') });

      default:
        return response(404, { error: 'Not found' });
    }
  } catch (error) {
    console.error('Router error:', error);
    return response(500, { error: 'Internal server error' });
  }
}

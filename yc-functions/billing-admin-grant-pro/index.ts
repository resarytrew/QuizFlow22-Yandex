import { grantPro } from '../_shared/grant-pro';
import { AdminAuthError, recordAdminFailure } from '../_shared/admin';
import { corsHeaders, handleCors } from '../_shared/cors';
import { timingSafeEqual } from '../_shared/yookassa';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  // Admin secret verification (constant-time)
  const expected = process.env.BILLING_ADMIN_SECRET || '';
  if (!expected) {
    const got = headers['x-admin-secret'] || '';
    timingSafeEqual(got, expected);
    return {
      statusCode: 503,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'admin_disabled' }),
    };
  }
  const got = headers['x-admin-secret'] || '';
  if (!timingSafeEqual(got, expected)) {
    return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'forbidden' }) };
  }

  let parsed: { user_id?: string; days?: number; reason?: string; idempotency_key?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const userId = parsed.user_id;
  if (!userId || typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_user_id' }) };
  }

  const rawDays = Number(parsed.days);
  if (!Number.isInteger(rawDays) || rawDays <= 0 || rawDays > 365) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'invalid_days' }) };
  }
  const days = rawDays;

  const reasonRaw = typeof parsed.reason === 'string' ? parsed.reason : null;
  const reason = reasonRaw ? reasonRaw.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500) : null;

  const requestId = crypto.randomUUID();
  const actor = { userId: '', role: 'owner' as const, permissions: ['billing.grant'], requestId };
  try {
    const grant = await grantPro({ ...parsed, days, reason }, actor, event.requestContext?.http?.sourceIp || event.requestContext?.identity?.sourceIp || null, headers['user-agent'] || null);
    return { statusCode: 200, headers: { ...corsHeaders(), 'X-Request-ID': requestId }, body: JSON.stringify({ ok: true, ...grant }) };
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 500;
    const code = error instanceof AdminAuthError ? error.code : 'internal_error';
    await recordAdminFailure(actor,code,status < 500);
    return { statusCode: status, headers: corsHeaders(), body: JSON.stringify({ error: code, request_id: requestId }) };
  }
}

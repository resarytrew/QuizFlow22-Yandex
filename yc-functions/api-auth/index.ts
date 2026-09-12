import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { queryOne, execute, withTransaction } from '../_shared/db';
import { hashPassword, passwordHashNeedsUpgrade, validatePassword, verifyPassword } from '../_shared/password';
import { generateOtp, hashOtp, normalizeEmail, type OtpPurpose, verifyOtpHash } from '../_shared/otp';
import { enforceRateLimit } from '../_shared/rateLimit';
import {
  clearSessionCookie,
  createSession,
  elevateCurrentSession,
  hashOpaqueToken,
  hashIp,
  parseCookies,
  requestIp,
  requestUserAgent,
  revokeAllSessions,
  revokeCurrentSession,
  sessionCookie,
  verifySession,
} from '../_shared/session';
import { sendPasswordReset, sendVerificationCode } from '../_shared/mailer';
import { decryptSecret, encryptSecret } from '../_shared/encryption';
import { createTotpEnrollment, totpQrDataUrl, verifyTotp } from '../_shared/totp';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors';

type Event = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | Record<string, unknown> | null;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: Record<string, any>;
};

type UserRow = {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OAUTH_COOKIE = 'qf_oauth_state';
const GENERIC_EMAIL_RESPONSE = { ok: true, message: 'Если аккаунт с таким email существует, письмо было отправлено.' };
const dummyPasswordHash = hashPassword('QuizFlow-dummy-password-2026');

export function oauthStateMatches(queryState: string, cookieState: string): boolean {
  const left = Buffer.from(queryState);
  const right = Buffer.from(cookieState);
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

export function otpRecordIsUsable(record: { attempts: number; expiresAt: number; consumedAt?: number | null }, now = Date.now()): boolean {
  return !record.consumedAt && record.attempts < 5 && record.expiresAt > now;
}

export function resetTokenIsUsable(record: { expiresAt: number; usedAt?: number | null }, now = Date.now()): boolean {
  return !record.usedAt && record.expiresAt > now;
}

export function decideYandexAccount(identityUserId?: string | null, currentUserId?: string | null, existingEmailUserId?: string | null) {
  if (identityUserId) return { kind: 'login' as const, userId: identityUserId };
  if (currentUserId) return { kind: 'link_authenticated' as const, userId: currentUserId };
  if (existingEmailUserId) return { kind: 'verify_email' as const, userId: existingEmailUserId };
  return { kind: 'create' as const, userId: null };
}

function header(event: Event, name: string): string | undefined {
  const headers = event.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
}

function response(event: Event, statusCode: number, data: unknown, extraHeaders: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { ...corsHeaders(header(event, 'origin')), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
    body: data === undefined ? '' : JSON.stringify(data),
  };
}

function redirect(event: Event, location: string, cookies: string[] = []) {
  const headers: Record<string, string> = {
    ...corsHeaders(header(event, 'origin')),
    Location: location,
    'Cache-Control': 'no-store',
  };
  return { statusCode: 302, headers, multiValueHeaders: cookies.length ? { 'Set-Cookie': cookies } : undefined, body: '' };
}

function parseBody(event: Event): Record<string, any> {
  if (event.body && typeof event.body === 'object') return event.body as Record<string, any>;
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try { return JSON.parse(raw); } catch { return {}; }
}

function errorStatus(error: unknown): number {
  return Number((error as { statusCode?: number })?.statusCode) || 500;
}

function publicError(error: unknown): string {
  const status = errorStatus(error);
  if (status >= 400 && status < 500) return error instanceof Error ? error.message : 'Некорректный запрос.';
  return 'Внутренняя ошибка сервера.';
}

function fail(message: string, statusCode = 400): never {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  throw error;
}

function validEmail(value: unknown): string {
  const email = normalizeEmail(String(value || ''));
  if (!EMAIL_RE.test(email) || email.length > 320) fail('Введите корректный email.');
  return email;
}

function unsafeMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

async function rateLimit(event: Event, action: string, email?: string) {
  await enforceRateLimit(action, requestIp(event), action === 'login' ? 20 : 10, 15 * 60, 15 * 60);
  if (email) await enforceRateLimit(action, email, action === 'login' ? 10 : 5, 15 * 60, 15 * 60);
}

async function audit(event: Event, eventName: string, userId: string | null, metadata: Record<string, unknown> = {}) {
  await execute(`INSERT INTO public.auth_events (user_id, event, ip_hash, user_agent, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [userId, eventName, hashIp(requestIp(event)), requestUserAgent(event) || null, JSON.stringify(metadata)]).catch(() => undefined);
}

async function issueCode(client: PoolClient, userId: string, email: string, purpose: OtpPurpose, metadata: Record<string, unknown> = {}) {
  const code = generateOtp();
  await client.query(`UPDATE public.auth_codes SET consumed_at = now()
    WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL`, [email, purpose]);
  await client.query(`INSERT INTO public.auth_codes
    (user_id, email, purpose, code_hash, expires_at, metadata)
    VALUES ($1, $2, $3, $4, now() + interval '10 minutes', $5::jsonb)`,
    [userId, email, purpose, hashOtp(email, purpose, code), JSON.stringify(metadata)]);
  return code;
}

async function register(event: Event) {
  const body = parseBody(event);
  const email = validEmail(body.email);
  const password = String(body.password || '');
  const validation = validatePassword(password);
  if (validation) fail(validation);
  await rateLimit(event, 'register', email);
  const passwordHash = await hashPassword(password);
  const result = await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);
    let user = (await client.query<UserRow>('SELECT id, email, email_verified_at FROM public.users WHERE lower(email) = $1 FOR UPDATE', [email])).rows[0];
    // Never let registration attach an attacker-chosen password to a user
    // imported before this auth system. Existing users set a password through
    // the email-verified reset flow, preserving their canonical UUID.
    if (user) return { userId: user.id, code: null };
    user = (await client.query<UserRow>('INSERT INTO public.users (email) VALUES ($1) RETURNING id, email, email_verified_at', [email])).rows[0];
    await client.query(`INSERT INTO public.auth_credentials (user_id, password_hash, password_updated_at)
      VALUES ($1, $2, now()) ON CONFLICT (user_id) DO UPDATE SET
      password_hash = EXCLUDED.password_hash, password_updated_at = now(), updated_at = now()`, [user.id, passwordHash]);
    return { userId: user.id, code: await issueCode(client, user.id, email, 'verify_email') };
  });
  if (result.code) await sendVerificationCode(email, result.code);
  await audit(event, 'register_requested', result.userId);
  return response(event, 202, { ok: true, verificationRequired: true });
}

async function verifyEmail(event: Event) {
  const body = parseBody(event);
  const email = validEmail(body.email);
  const code = String(body.code || '').trim();
  const purpose: OtpPurpose = body.purpose === 'link_yandex' ? 'link_yandex' : 'verify_email';
  if (!/^\d{6}$/.test(code)) fail('Введите 6 цифр из письма.');
  await rateLimit(event, 'verify', email);
  const token = await withTransaction(async (client) => {
    const row = (await client.query<{ id: string; user_id: string; code_hash: string; attempts: number; metadata: any }>(`
      SELECT id, user_id, code_hash, attempts, metadata FROM public.auth_codes
      WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [email, purpose])).rows[0];
    if (!row || row.attempts >= 5) fail('Код недействителен или устарел.');
    await client.query('UPDATE public.auth_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    if (!verifyOtpHash(email, purpose, code, row.code_hash)) fail('Неверный код подтверждения.');

    if (purpose === 'verify_email') {
      await client.query('UPDATE public.users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1', [row.user_id]);
      await client.query(`INSERT INTO public.auth_identities (user_id, provider, provider_subject, provider_email)
        VALUES ($1, 'password', $2, $2) ON CONFLICT (provider, provider_subject) DO NOTHING`, [row.user_id, email]);
    } else {
      const subject = String(row.metadata?.provider_subject || '');
      if (!subject) fail('Данные привязки устарели. Начните вход через Яндекс заново.');
      await client.query(`INSERT INTO public.auth_identities (user_id, provider, provider_subject, provider_email)
        VALUES ($1, 'yandex', $2, $3) ON CONFLICT (provider, provider_subject) DO NOTHING`, [row.user_id, subject, email]);
      await client.query('UPDATE public.users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1', [row.user_id]);
    }
    await client.query('UPDATE public.auth_codes SET consumed_at = now() WHERE id = $1', [row.id]);
    return { raw: await createSession(row.user_id, event, client), userId: row.user_id };
  });
  await audit(event, purpose === 'link_yandex' ? 'yandex_linked' : 'email_verified', token.userId);
  return response(event, 200, { ok: true, user: await verifySession({ ...event, headers: { ...(event.headers || {}), cookie: `qf_session=${token.raw}` } }) }, { 'Set-Cookie': sessionCookie(token.raw) });
}

async function resendCode(event: Event) {
  const body = parseBody(event);
  const email = validEmail(body.email);
  const purpose: OtpPurpose = body.purpose === 'link_yandex' ? 'link_yandex' : 'verify_email';
  await rateLimit(event, 'resend', email);
  const result = await withTransaction(async (client) => {
    const user = (await client.query<UserRow & { has_credentials: boolean }>(`SELECT u.id, u.email, u.email_verified_at,
      EXISTS (SELECT 1 FROM public.auth_credentials c WHERE c.user_id = u.id) AS has_credentials
      FROM public.users u WHERE lower(u.email) = $1`, [email])).rows[0];
    if (!user || (purpose === 'verify_email' && user.email_verified_at)) return null;
    if (purpose === 'verify_email' && !user.has_credentials) return null;
    const previous = (await client.query<{ metadata: any; created_at: string }>(`SELECT metadata, created_at FROM public.auth_codes
      WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`, [email, purpose])).rows[0];
    if (previous && Date.parse(previous.created_at) > Date.now() - 60_000) fail('Повторная отправка доступна через 60 секунд.', 429);
    if (purpose === 'link_yandex' && !previous?.metadata?.provider_subject) return null;
    return issueCode(client, user.id, email, purpose, previous?.metadata || {});
  });
  if (result) await sendVerificationCode(email, result);
  return response(event, 202, GENERIC_EMAIL_RESPONSE);
}

async function login(event: Event) {
  const body = parseBody(event);
  const email = validEmail(body.email);
  const password = String(body.password || '');
  await rateLimit(event, 'login', email);
  const user = await queryOne<UserRow>(`SELECT u.id, u.email, u.email_verified_at, c.password_hash
    FROM public.users u JOIN public.auth_credentials c ON c.user_id = u.id
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE lower(u.email) = $1 AND u.auth_disabled_at IS NULL
      AND COALESCE(p.status, 'active') <> 'blocked'
      AND (COALESCE(p.status, 'active') <> 'temporarily_blocked' OR p.blocked_until < now())`, [email]);
  const validHash = user?.password_hash || await dummyPasswordHash;
  const valid = Boolean(user?.password_hash) && await verifyPassword(password, validHash);
  if (!valid) {
    await audit(event, 'login_failed', user?.id || null);
    fail('Неверный email или пароль.', 401);
  }
  if (!user!.email_verified_at) fail('Подтвердите email перед входом.', 403);
  if (passwordHashNeedsUpgrade(user!.password_hash!)) {
    await execute('UPDATE public.auth_credentials SET password_hash = $2, password_updated_at = now(), updated_at = now() WHERE user_id = $1', [user!.id, await hashPassword(password)]);
  }
  const raw = await createSession(user!.id, event);
  await audit(event, 'login_succeeded', user!.id);
  const authUser = await verifySession({ ...event, headers: { ...(event.headers || {}), cookie: `qf_session=${raw}` } });
  return response(event, 200, { user: authUser }, { 'Set-Cookie': sessionCookie(raw) });
}

async function forgotPassword(event: Event) {
  const email = validEmail(parseBody(event).email);
  await rateLimit(event, 'forgot_password', email);
  const user = await queryOne<UserRow>('SELECT id, email, email_verified_at FROM public.users WHERE lower(email) = $1 AND auth_disabled_at IS NULL', [email]);
  if (user) {
    const raw = randomBytes(32).toString('base64url');
    await withTransaction(async (client) => {
      await client.query('UPDATE public.auth_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
      await client.query(`INSERT INTO public.auth_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, now() + interval '30 minutes')`, [user.id, hashOpaqueToken(raw)]);
    });
    try { await sendPasswordReset(email, raw); } catch (error) { console.error('[auth] Postbox reset delivery failed:', error instanceof Error ? error.message : 'unknown'); }
    await audit(event, 'password_reset_requested', user.id);
  }
  return response(event, 202, GENERIC_EMAIL_RESPONSE);
}

async function resetPassword(event: Event) {
  const body = parseBody(event);
  const rawToken = String(body.token || '');
  const password = String(body.password || '');
  if (rawToken.length < 32) fail('Ссылка недействительна или устарела.');
  const validation = validatePassword(password);
  if (validation) fail(validation);
  await rateLimit(event, 'reset_password');
  const passwordHash = await hashPassword(password);
  const result = await withTransaction(async (client) => {
    const token = (await client.query<{ id: string; user_id: string; email: string }>(`
      SELECT t.id, t.user_id, u.email FROM public.auth_reset_tokens t
      JOIN public.users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()
      FOR UPDATE`, [hashOpaqueToken(rawToken)])).rows[0];
    if (!token) fail('Ссылка недействительна или устарела.');
    await client.query(`INSERT INTO public.auth_credentials (user_id, password_hash, password_updated_at)
      VALUES ($1, $2, now()) ON CONFLICT (user_id) DO UPDATE SET
      password_hash = EXCLUDED.password_hash, password_updated_at = now(), updated_at = now()`, [token.user_id, passwordHash]);
    await client.query('UPDATE public.users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1', [token.user_id]);
    await client.query(`INSERT INTO public.auth_identities (user_id, provider, provider_subject, provider_email)
      VALUES ($1, 'password', $2, $2) ON CONFLICT (provider, provider_subject) DO NOTHING`, [token.user_id, token.email]);
    await client.query('UPDATE public.auth_reset_tokens SET used_at = now() WHERE id = $1', [token.id]);
    await client.query('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [token.user_id]);
    return { userId: token.user_id, raw: await createSession(token.user_id, event, client) };
  });
  await audit(event, 'password_reset_completed', result.userId);
  return response(event, 200, { ok: true }, { 'Set-Cookie': sessionCookie(result.raw) });
}

function oauthStateCookie(state: string, clear = false): string {
  const secure = process.env.AUTH_COOKIE_SECURE !== 'false';
  return `${OAUTH_COOKIE}=${clear ? '' : encodeURIComponent(state)}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/api/auth/yandex/callback; Max-Age=${clear ? 0 : 600}`;
}

async function yandexStart(event: Event) {
  const clientId = process.env.YANDEX_OAUTH_CLIENT_ID;
  if (!clientId || !process.env.YANDEX_OAUTH_CLIENT_SECRET) fail('Вход через Яндекс пока не настроен.', 503);
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const currentUser = await verifySession(event);
  await execute(`INSERT INTO public.auth_oauth_states (state_hash, verifier_encrypted, user_id, expires_at)
    VALUES ($1, $2, $3, now() + interval '10 minutes')`, [hashOpaqueToken(state), encryptSecret(verifier), currentUser?.id || null]);
  const redirectUri = `${(process.env.FRONTEND_URL || 'https://mykviz.ru').replace(/\/$/, '')}/api/auth/yandex/callback`;
  const url = new URL('https://oauth.yandex.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'login:info login:email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return redirect(event, url.toString(), [oauthStateCookie(state)]);
}

async function yandexCallback(event: Event) {
  const params = event.queryStringParameters || {};
  const state = String(params.state || '');
  const code = String(params.code || '');
  const cookieState = parseCookies(header(event, 'cookie'))[OAUTH_COOKIE] || '';
  const frontend = (process.env.FRONTEND_URL || 'https://mykviz.ru').replace(/\/$/, '');
  if (!oauthStateMatches(state, cookieState) || !code) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_failed`, [oauthStateCookie('', true)]);
  const saved = await withTransaction(async (client) => {
    const result = await client.query<{ verifier_encrypted: string; user_id: string | null }>(`
      UPDATE public.auth_oauth_states SET consumed_at = now()
      WHERE state_hash = $1 AND consumed_at IS NULL AND expires_at > now()
      RETURNING verifier_encrypted, user_id`, [hashOpaqueToken(state)]);
    return result.rows[0] || null;
  });
  if (!saved) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_state`, [oauthStateCookie('', true)]);

  const redirectUri = `${frontend}/api/auth/yandex/callback`;
  const clientId = process.env.YANDEX_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YANDEX_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_config`, [oauthStateCookie('', true)]);
  const tokenBody = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, code_verifier: decryptSecret(saved.verifier_encrypted), redirect_uri: redirectUri });
  const tokenResponse = await fetch('https://oauth.yandex.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenBody });
  if (!tokenResponse.ok) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_exchange`, [oauthStateCookie('', true)]);
  const tokenData = await tokenResponse.json() as { access_token?: string };
  const profileResponse = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: `OAuth ${tokenData.access_token || ''}` } });
  if (!profileResponse.ok) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_profile`, [oauthStateCookie('', true)]);
  const profile = await profileResponse.json() as { id?: string; default_email?: string; emails?: string[] };
  const subject = String(profile.id || '');
  const email = normalizeEmail(profile.default_email || profile.emails?.[0] || '');
  if (!subject || !EMAIL_RE.test(email)) return redirect(event, `${frontend}/#/auth/confirm?error=oauth_email`, [oauthStateCookie('', true)]);

  const identity = await queryOne<{ user_id: string }>(`SELECT user_id FROM public.auth_identities WHERE provider = 'yandex' AND provider_subject = $1`, [subject]);
  const existing = !identity && !saved.user_id
    ? await queryOne<UserRow>('SELECT id, email, email_verified_at FROM public.users WHERE lower(email) = $1', [email])
    : null;
  const account = decideYandexAccount(identity?.user_id, saved.user_id, existing?.id);
  let userId = account.userId;
  if (account.kind === 'verify_email' && existing) {
    const otp = await withTransaction((client) => issueCode(client, existing.id, email, 'link_yandex', { provider_subject: subject }));
    await sendVerificationCode(email, otp);
    return redirect(event, `${frontend}/#/auth/confirm?link=required&email=${encodeURIComponent(email)}`, [oauthStateCookie('', true)]);
  }
  if (account.kind === 'create') {
    const outcome = await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);
      const concurrentIdentity = (await client.query<{ user_id: string }>(
        `SELECT user_id FROM public.auth_identities WHERE provider = 'yandex' AND provider_subject = $1`,
        [subject],
      )).rows[0];
      if (concurrentIdentity) return { kind: 'login' as const, userId: concurrentIdentity.user_id };
      const concurrentUser = (await client.query<{ id: string }>(
        'SELECT id FROM public.users WHERE lower(email) = $1 FOR UPDATE',
        [email],
      )).rows[0];
      if (concurrentUser) {
        const otp = await issueCode(client, concurrentUser.id, email, 'link_yandex', { provider_subject: subject });
        return { kind: 'verify' as const, userId: concurrentUser.id, otp };
      }
      const user = (await client.query<{ id: string }>('INSERT INTO public.users (email, email_verified_at) VALUES ($1, now()) RETURNING id', [email])).rows[0];
      await client.query(`INSERT INTO public.auth_identities (user_id, provider, provider_subject, provider_email)
        VALUES ($1, 'yandex', $2, $3)`, [user.id, subject, email]);
      return { kind: 'created' as const, userId: user.id };
    });
    if (outcome.kind === 'verify') {
      await sendVerificationCode(email, outcome.otp);
      return redirect(event, `${frontend}/#/auth/confirm?link=required&email=${encodeURIComponent(email)}`, [oauthStateCookie('', true)]);
    }
    userId = outcome.userId;
  } else if (account.kind === 'link_authenticated') {
    await execute(`INSERT INTO public.auth_identities (user_id, provider, provider_subject, provider_email)
      VALUES ($1, 'yandex', $2, $3) ON CONFLICT (provider, provider_subject) DO NOTHING`, [userId, subject, email]);
  }
  if (!userId) fail('Не удалось определить аккаунт Яндекса.', 500);
  const raw = await createSession(userId, event);
  await audit(event, 'yandex_login_succeeded', userId);
  return redirect(event, `${frontend}/#/auth/confirm?status=success`, [oauthStateCookie('', true), sessionCookie(raw)]);
}

async function requireAdmin(event: Event) {
  const user = await verifySession(event);
  if (!user) fail('Требуется вход.', 401);
  const staff = await queryOne<{ id: string }>('SELECT id FROM public.admin_staff WHERE user_id = $1 AND is_active = true', [user.id]);
  if (!staff) fail('Доступ запрещён.', 403);
  return user;
}

async function mfaStatus(event: Event) {
  const user = await requireAdmin(event);
  const factor = await queryOne<{ id: string; verified_at: string | null }>(`SELECT id, verified_at FROM public.auth_mfa_factors
    WHERE user_id = $1 AND type = 'totp' AND disabled_at IS NULL ORDER BY created_at DESC LIMIT 1`, [user.id]);
  return response(event, 200, { enrolled: Boolean(factor), verified: Boolean(factor?.verified_at), factorId: factor?.id || null, elevated: user.authLevel === 'mfa' });
}

async function mfaEnroll(event: Event) {
  const user = await requireAdmin(event);
  const existing = await queryOne<{ id: string; verified_at: string | null }>(`SELECT id, verified_at FROM public.auth_mfa_factors
    WHERE user_id = $1 AND type = 'totp' AND disabled_at IS NULL LIMIT 1`, [user.id]);
  if (existing?.verified_at) return response(event, 200, { enrolled: true, verified: true, factorId: existing.id });
  const enrollment = createTotpEnrollment(user.email);
  const factor = await withTransaction(async (client) => {
    await client.query(`UPDATE public.auth_mfa_factors SET disabled_at = now()
      WHERE user_id = $1 AND type = 'totp' AND disabled_at IS NULL`, [user.id]);
    return (await client.query<{ id: string }>(`INSERT INTO public.auth_mfa_factors (user_id, secret_encrypted)
      VALUES ($1, $2) RETURNING id`, [user.id, enrollment.encryptedSecret])).rows[0];
  });
  return response(event, 201, { enrolled: true, verified: false, factorId: factor.id, secret: enrollment.secret, qrCode: await totpQrDataUrl(enrollment.uri) });
}

async function mfaVerify(event: Event) {
  const user = await requireAdmin(event);
  const body = parseBody(event);
  const factorId = String(body.factorId || '');
  const token = String(body.code || '').trim();
  await rateLimit(event, 'mfa_verify', user.id);
  const factor = await queryOne<{ id: string; secret_encrypted: string }>(`SELECT id, secret_encrypted FROM public.auth_mfa_factors
    WHERE id = $1 AND user_id = $2 AND disabled_at IS NULL`, [factorId, user.id]);
  if (!factor || !verifyTotp(token, factor.secret_encrypted)) fail('Неверный код 2FA.', 401);
  await execute('UPDATE public.auth_mfa_factors SET verified_at = COALESCE(verified_at, now()) WHERE id = $1', [factor.id]);
  if (!await elevateCurrentSession(event)) fail('Сессия истекла.', 401);
  await audit(event, 'mfa_verified', user.id);
  return response(event, 200, { ok: true, authLevel: 'mfa' });
}

export async function handler(event: Event & { pathParameters?: Record<string, string> }) {
  const method = String(event.httpMethod || 'GET').toUpperCase();
  if (method === 'OPTIONS') return response(event, 204, undefined);
  if (unsafeMethod(method) && !isAllowedOrigin(header(event, 'origin'))) return response(event, 403, { error: 'Недопустимый источник запроса.' });
  const action = String(event.pathParameters?.action || '').replace(/^\/+|\/+$/g, '');
  try {
    if (method === 'POST' && action === 'register') return await register(event);
    if (method === 'POST' && action === 'verify-email') return await verifyEmail(event);
    if (method === 'POST' && action === 'resend-code') return await resendCode(event);
    if (method === 'POST' && action === 'login') return await login(event);
    if (method === 'POST' && action === 'forgot-password') return await forgotPassword(event);
    if (method === 'POST' && action === 'reset-password') return await resetPassword(event);
    if (method === 'GET' && action === 'me') {
      const user = await verifySession(event);
      return user ? response(event, 200, { user }) : response(event, 401, { error: 'Требуется вход.' });
    }
    if (method === 'POST' && action === 'logout') {
      await revokeCurrentSession(event);
      return response(event, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    }
    if (method === 'POST' && action === 'logout-all') {
      const user = await verifySession(event);
      if (user) await revokeAllSessions(user.id);
      return response(event, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    }
    if (method === 'GET' && action === 'yandex/start') return await yandexStart(event);
    if (method === 'GET' && action === 'yandex/callback') return await yandexCallback(event);
    if (method === 'GET' && action === 'mfa/status') return await mfaStatus(event);
    if (method === 'POST' && action === 'mfa/enroll') return await mfaEnroll(event);
    if (method === 'POST' && action === 'mfa/verify') return await mfaVerify(event);
    return response(event, 404, { error: 'Маршрут не найден.' });
  } catch (error) {
    const statusCode = errorStatus(error);
    if (statusCode >= 500) console.error('[auth] request failed:', error instanceof Error ? error.message : error);
    return response(event, statusCode, { error: publicError(error) });
  }
}

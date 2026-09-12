import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { execute, queryOne } from './db';

export const SESSION_COOKIE = 'qf_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MFA_MAX_AGE_SECONDS = 12 * 60 * 60;

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  authLevel: 'normal' | 'mfa';
}

export function sessionRecordIsActive(record: { expiresAt: number; revokedAt?: number | null }, now = Date.now()): boolean {
  return !record.revokedAt && record.expiresAt > now;
}

export function authLevelForMfa(verifiedAt: number | null | undefined, now = Date.now()): 'normal' | 'mfa' {
  return verifiedAt && verifiedAt > now - MFA_MAX_AGE_SECONDS * 1000 ? 'mfa' : 'normal';
}

type RequestContext = {
  headers?: Record<string, string | undefined>;
  requestContext?: { identity?: { sourceIp?: string; userAgent?: string }; http?: { sourceIp?: string; userAgent?: string } };
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sessionPepper(): string {
  const value = process.env.SESSION_PEPPER;
  if (!value) throw new Error('SESSION_PEPPER not set');
  return value;
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const key = sessionPepper();
  return createHmac('sha256', key).update(ip).digest('hex');
}

export function requestIp(event: RequestContext): string | undefined {
  const headers = event.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  return forwarded?.split(',')[0]?.trim()
    || event.requestContext?.http?.sourceIp
    || event.requestContext?.identity?.sourceIp;
}

export function requestUserAgent(event: RequestContext): string | undefined {
  const headers = event.headers || {};
  return (headers['user-agent'] || headers['User-Agent'] || event.requestContext?.http?.userAgent || event.requestContext?.identity?.userAgent)?.slice(0, 500);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

export function sessionTokenFromEvent(event: RequestContext): string | null {
  const header = event.headers?.cookie || event.headers?.Cookie;
  return parseCookies(header)[SESSION_COOKIE] || null;
}

export function sessionCookie(token: string): string {
  const secure = process.env.AUTH_COOKIE_SECURE !== 'false';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.AUTH_COOKIE_SECURE !== 'false';
  return `${SESSION_COOKIE}=; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Path=/; Max-Age=0`;
}

export async function createSession(
  userId: string,
  event: RequestContext,
  client?: Pick<PoolClient, 'query'>,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const params = [userId, sha256(token), requestUserAgent(event) || null, hashIp(requestIp(event))];
  const sql = `INSERT INTO public.auth_sessions
    (user_id, token_hash, expires_at, user_agent, ip_hash)
    VALUES ($1, $2, now() + interval '30 days', $3, $4)`;
  if (client) await client.query(sql, params);
  else await execute(sql, params);

  const cleanupSql = `UPDATE public.auth_sessions SET revoked_at = now()
    WHERE id IN (
      SELECT id FROM public.auth_sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC OFFSET 10
    )`;
  if (client) await client.query(cleanupSql, [userId]);
  else await execute(cleanupSql, [userId]);
  return token;
}

export async function verifySession(event: RequestContext): Promise<SessionUser | null> {
  const token = sessionTokenFromEvent(event);
  if (!token) return null;
  const row = await queryOne<{
    id: string; user_id: string; email: string; email_verified_at: string | null;
    role: string; mfa_verified_at: string | null; status: string | null; blocked_until: string | null;
  }>(`SELECT s.id, s.user_id, u.email, u.email_verified_at, u.role, s.mfa_verified_at,
        p.status, p.blocked_until
      FROM public.auth_sessions s
      JOIN public.users u ON u.id = s.user_id
      LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
        AND u.auth_disabled_at IS NULL`, [sha256(token)]);
  if (!row) return null;
  if (row.status === 'blocked') return null;
  if (row.status === 'temporarily_blocked' && (!row.blocked_until || Date.parse(row.blocked_until) > Date.now())) return null;

  void execute(`UPDATE public.auth_sessions SET last_seen_at = now()
    WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 hour')`, [row.id]).catch(() => undefined);
  return {
    id: row.user_id,
    email: row.email,
    emailVerified: Boolean(row.email_verified_at),
    role: row.role,
    authLevel: authLevelForMfa(row.mfa_verified_at ? Date.parse(row.mfa_verified_at) : null),
  };
}

export async function revokeCurrentSession(event: RequestContext): Promise<void> {
  const token = sessionTokenFromEvent(event);
  if (token) await execute('UPDATE public.auth_sessions SET revoked_at = now() WHERE token_hash = $1', [sha256(token)]);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await execute('UPDATE public.auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

export async function elevateCurrentSession(event: RequestContext): Promise<boolean> {
  const token = sessionTokenFromEvent(event);
  if (!token) return false;
  return (await execute(`UPDATE public.auth_sessions SET mfa_verified_at = now()
    WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`, [sha256(token)])) === 1;
}

export function hashOpaqueToken(token: string): string {
  return sha256(token);
}

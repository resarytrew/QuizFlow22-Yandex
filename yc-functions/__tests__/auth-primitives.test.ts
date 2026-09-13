import { beforeAll, describe, expect, it } from 'vitest';
import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from '../_shared/password';
import { generateOtp, hashOtp, normalizeEmail, verifyOtpHash } from '../_shared/otp';
import { decryptSecret, encryptSecret } from '../_shared/encryption';
import { createTotpEnrollment, verifyTotp } from '../_shared/totp';
import { authLevelForMfa, clearSessionCookie, parseCookies, sessionCookie, sessionRecordIsActive } from '../_shared/session';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors';
import { decideYandexAccount, oauthStateMatches, otpRecordIsUsable, resetTokenIsUsable } from '../api-auth';
import * as OTPAuth from 'otpauth';

beforeAll(() => {
  process.env.OTP_PEPPER = 'test-pepper-with-at-least-thirty-two-bytes';
  process.env.SESSION_PEPPER = 'test-session-pepper-with-thirty-two-bytes';
  process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.AUTH_COOKIE_SECURE = 'true';
  process.env.NODE_ENV = 'test';
});

describe('password hashing', () => {
  it('uses a salted versioned scrypt hash and timing-safe verification', async () => {
    const first = await hashPassword('StrongPassword1');
    const second = await hashPassword('StrongPassword1');
    expect(first).toMatch(/^\$qf-scrypt\$v=1\$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword('StrongPassword1', first)).toBe(true);
    expect(await verifyPassword('WrongPassword1', first)).toBe(false);
    expect(passwordHashNeedsUpgrade(first)).toBe(false);
  });
});

describe('OTP', () => {
  it('normalizes only case and surrounding whitespace and hashes with a pepper', () => {
    expect(normalizeEmail(' User+tag@Example.COM ')).toBe('user+tag@example.com');
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashOtp('user@example.com', 'verify_email', code);
    expect(hash).not.toContain(code);
    expect(verifyOtpHash('user@example.com', 'verify_email', code, hash)).toBe(true);
    expect(verifyOtpHash('user@example.com', 'verify_email', '000000', hash)).toBe(code === '000000');
  });

  it('rejects expired, consumed and max-attempt records', () => {
    const now = Date.now();
    expect(otpRecordIsUsable({ attempts: 4, expiresAt: now + 1 }, now)).toBe(true);
    expect(otpRecordIsUsable({ attempts: 5, expiresAt: now + 1 }, now)).toBe(false);
    expect(otpRecordIsUsable({ attempts: 0, expiresAt: now - 1 }, now)).toBe(false);
    expect(otpRecordIsUsable({ attempts: 0, expiresAt: now + 1, consumedAt: now }, now)).toBe(false);
  });
});

describe('opaque sessions and reset tokens', () => {
  it('models expiration, revocation and MFA elevation independently of JWT', () => {
    const now = Date.now();
    expect(sessionRecordIsActive({ expiresAt: now + 1 }, now)).toBe(true);
    expect(sessionRecordIsActive({ expiresAt: now - 1 }, now)).toBe(false);
    expect(sessionRecordIsActive({ expiresAt: now + 1, revokedAt: now }, now)).toBe(false);
    expect(authLevelForMfa(now - 60_000, now)).toBe('mfa');
    expect(authLevelForMfa(now - 13 * 60 * 60 * 1000, now)).toBe('normal');
  });

  it('sets and clears an HttpOnly, Secure, SameSite cookie', () => {
    const setCookie = sessionCookie('raw-token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(parseCookies('a=1; qf_session=raw-token').qf_session).toBe('raw-token');
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });

  it('enforces one-time reset-token semantics', () => {
    const now = Date.now();
    expect(resetTokenIsUsable({ expiresAt: now + 1 }, now)).toBe(true);
    expect(resetTokenIsUsable({ expiresAt: now + 1, usedAt: now }, now)).toBe(false);
    expect(resetTokenIsUsable({ expiresAt: now - 1 }, now)).toBe(false);
  });
});

describe('Origin, OAuth and account linking', () => {
  it('allows only configured origins and enables credentialed CORS', () => {
    expect(isAllowedOrigin('https://mykviz.ru')).toBe(true);
    expect(isAllowedOrigin('https://attacker.example')).toBe(false);
    expect(corsHeaders('https://mykviz.ru')['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('validates OAuth state and chooses a safe account-linking path', () => {
    expect(oauthStateMatches('same-state', 'same-state')).toBe(true);
    expect(oauthStateMatches('same-state', 'other-state')).toBe(false);
    expect(decideYandexAccount('identity-user', null, 'email-user')).toEqual({ kind: 'login', userId: 'identity-user' });
    expect(decideYandexAccount(null, 'signed-in-user', 'email-user')).toEqual({ kind: 'link_authenticated', userId: 'signed-in-user' });
    expect(decideYandexAccount(null, null, 'email-user')).toEqual({ kind: 'verify_email', userId: 'email-user' });
    expect(decideYandexAccount(null, null, null)).toEqual({ kind: 'create', userId: null });
  });
});

describe('TOTP secret protection', () => {
  it('encrypts the secret with AES-GCM and validates RFC 6238 codes', () => {
    const enrollment = createTotpEnrollment('admin@example.com');
    expect(enrollment.encryptedSecret).not.toContain(enrollment.secret);
    expect(decryptSecret(enrollment.encryptedSecret)).toBe(enrollment.secret);
    const generator = new OTPAuth.TOTP({ issuer: 'Поток', algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(enrollment.secret) });
    expect(verifyTotp(generator.generate(), enrollment.encryptedSecret)).toBe(true);
    const tampered = enrollment.encryptedSecret.slice(0, -1) + (enrollment.encryptedSecret.endsWith('A') ? 'B' : 'A');
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

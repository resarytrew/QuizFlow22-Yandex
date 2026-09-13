import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export type OtpPurpose = 'verify_email' | 'link_yandex';

function pepper(): string {
  const value = process.env.OTP_PEPPER;
  if (!value) throw new Error('OTP_PEPPER not set');
  return value;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(email: string, purpose: OtpPurpose, code: string): string {
  return createHmac('sha256', pepper())
    .update(`${normalizeEmail(email)}|${purpose}|${code}`)
    .digest('hex');
}

export function verifyOtpHash(email: string, purpose: OtpPurpose, code: string, expected: string): boolean {
  const actual = Buffer.from(hashOtp(email, purpose, code), 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
}

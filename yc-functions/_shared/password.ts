import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const DEFAULT_N = 32_768;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keyLength: number, n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Пароль должен содержать не менее 8 символов.';
  if (password.length > 256) return 'Пароль слишком длинный.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const validationError = validatePassword(password);
  if (validationError) throw new Error(validationError);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, DEFAULT_N, DEFAULT_R, DEFAULT_P);
  return `$qf-scrypt$v=1$N=${DEFAULT_N},r=${DEFAULT_R},p=${DEFAULT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const parts = encoded.split('$');
    if (parts.length !== 6 || parts[1] !== 'qf-scrypt' || parts[2] !== 'v=1') return false;
    const params = Object.fromEntries(parts[3].split(',').map((item) => item.split('=')));
    const n = Number(params.N);
    const r = Number(params.r);
    const p = Number(params.p);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    if (n < 16_384 || n > 262_144 || r < 1 || r > 32 || p < 1 || p > 8) return false;
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length < 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, expected.length, n, r, p);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passwordHashNeedsUpgrade(encoded: string): boolean {
  return !encoded.includes(`$N=${DEFAULT_N},r=${DEFAULT_R},p=${DEFAULT_P}$`);
}

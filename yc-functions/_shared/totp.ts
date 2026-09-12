import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { decryptSecret, encryptSecret } from './encryption';

export function createTotpEnrollment(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  const totp = new OTPAuth.TOTP({
    issuer: 'Поток',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return {
    secret,
    encryptedSecret: encryptSecret(secret),
    uri: totp.toString(),
  };
}

export function verifyTotp(token: string, encryptedSecret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = new OTPAuth.TOTP({
    issuer: 'Поток',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(decryptSecret(encryptedSecret)),
  });
  return totp.validate({ token, window: 1 }) !== null;
}

export function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
}

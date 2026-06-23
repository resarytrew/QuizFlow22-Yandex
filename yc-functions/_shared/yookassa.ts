const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

const YOOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.72',
  '2a02:5180::/32',
];

export interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: 'RUB' };
  confirmation?: { type: 'redirect'; confirmation_url: string };
  payment_method?: { type: string; id: string; saved: boolean };
  receipt?: { registration_url?: string };
  metadata?: Record<string, string>;
}

export class YookassaApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`YooKassa API failed: ${status}`);
    this.name = 'YookassaApiError';
    this.status = status;
    this.body = body;
  }
}

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID ?? '';
  const secret = process.env.YOOKASSA_SECRET_KEY ?? '';
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64');
}

export async function getYookassaPayment(paymentId: string): Promise<YookassaPayment> {
  const res = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: { 'Authorization': authHeader() },
  });
  if (!res.ok) {
    throw new Error(`YooKassa getPayment failed: ${res.status}`);
  }
  return await res.json() as YookassaPayment;
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return -1;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isYookassaIp(ip: string | null): boolean {
  if (!ip) return false;
  if (ip.includes(':')) {
    return YOOKASSA_IPS.includes(ip);
  }
  const intIp = ipv4ToInt(ip);
  if (intIp < 0) return false;
  for (const cidr of YOOKASSA_IPS) {
    if (cidr.includes('/')) {
      const [net, bitsStr] = cidr.split('/');
      const bits = Number(bitsStr);
      const intNet = ipv4ToInt(net);
      if (intNet < 0) continue;
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      if ((intIp & mask) === (intNet & mask)) return true;
    } else {
      if (ipv4ToInt(cidr) === intIp) return true;
    }
  }
  return false;
}

export function getClientIp(event: { headers?: Record<string, string> }): string | null {
  const headers = event.headers ?? {};
  const xff = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xff) return xff.split(',')[0].trim();
  return headers['x-real-ip'] || headers['X-Real-IP'] || null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const lengthDiff = (a.length ^ b.length) !== 0;
  const maxLen = a.length > b.length ? a.length : b.length;
  let diff = lengthDiff ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

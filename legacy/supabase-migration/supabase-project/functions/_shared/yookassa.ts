// supabase/functions/_shared/yookassa.ts
// Минимальный клиент YooKassa REST API + idempotency.

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export interface YookassaAmount {
  value: string;          // "399.00"
  currency: 'RUB';
}

export interface YookassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: YookassaAmount;
  confirmation?: {
    type: 'redirect';
    confirmation_url: string;
  };
  payment_method?: {
    type: string;
    id: string;
    saved: boolean;
  };
  receipt?: { registration_url?: string };
  metadata?: Record<string, string>;
}

export class YookassaApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`YooKassa createPayment failed: ${status}`);
    this.name = 'YookassaApiError';
    this.status = status;
    this.body = body;
  }
}

export interface CreatePaymentParams {
  amountKopecks: number;
  currency?: 'RUB';
  description: string;
  returnUrl: string;
  savePaymentMethod?: boolean;
  paymentMethodType?: 'sbp';
  paymentMethodId?: string;     // для рекуррентов
  metadata: Record<string, string>;
  customerEmail: string | null;
  idempotenceKey: string;
  receiptItems?: Array<{
    description: string;
    amount: { value: string; currency: 'RUB' };
    vat_code: number;
    quantity: number;
    payment_mode: 'full_payment' | 'full_prepayment';
    payment_subject: 'service';
  }>;
}

function getCreds(): { shopId: string; secret: string } {
  const shopId = Deno.env.get('YOOKASSA_SHOP_ID') ?? '';
  const secret = Deno.env.get('YOOKASSA_SECRET_KEY') ?? '';
  if (!shopId || !secret) {
    throw new Error('YooKassa credentials are not configured (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)');
  }
  return { shopId, secret };
}

function authHeader(): string {
  const { shopId, secret } = getCreds();
  return 'Basic ' + btoa(`${shopId}:${secret}`);
}

function kopecksToRubString(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

export async function createYookassaPayment(p: CreatePaymentParams): Promise<YookassaPayment> {
  const body: Record<string, unknown> = {
    amount: {
      value: kopecksToRubString(p.amountKopecks),
      currency: p.currency ?? 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: p.returnUrl,
    },
    description: p.description,
    metadata: p.metadata,
  };
  if (p.savePaymentMethod) body.save_payment_method = true;
  if (p.paymentMethodType) {
    body.payment_method_data = { type: p.paymentMethodType };
  }
  if (p.paymentMethodId) body.payment_method_id = p.paymentMethodId;
  if (p.customerEmail && p.receiptItems && p.receiptItems.length > 0) {
    body.receipt = {
      customer: { email: p.customerEmail },
      items: p.receiptItems,
    };
  }

  const res = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': p.idempotenceKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    let parsed: unknown = errText;
    try {
      parsed = errText ? JSON.parse(errText) : null;
    } catch {
      parsed = errText;
    }
    throw new YookassaApiError(res.status, parsed);
  }
  return await res.json() as YookassaPayment;
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

/** Проверяет, что HTTP-запрос пришёл с IP из allow-list YooKassa (best-effort). */
const YOOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.72',
  '2a02:5180::/32',
];

/** Преобразует IPv4-адрес в число для сравнения с маской. */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isYookassaIp(ip: string | null): boolean {
  if (!ip) return false;
  if (ip.includes(':')) {
    // IPv6 — для MVP пропускаем проверку маски, только allow-list literal
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

/** Достаёт IP клиента из заголовков (учитывает прокси). */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

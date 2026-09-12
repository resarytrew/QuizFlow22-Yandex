const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  authLevel: 'normal' | 'mfa';
}

export class AuthRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/auth${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthRequestError(payload.error || `HTTP ${response.status}`, response.status);
  return payload as T;
}

export const authClient = {
  register: (email: string, password: string) => request<{ ok: true; verificationRequired: boolean }>('/register', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  verifyEmail: (email: string, code: string, purpose: 'verify_email' | 'link_yandex' = 'verify_email') => request<{ ok: true; user: AuthUser }>('/verify-email', {
    method: 'POST', body: JSON.stringify({ email, code, purpose }),
  }),
  resendCode: (email: string, purpose: 'verify_email' | 'link_yandex' = 'verify_email') => request<{ ok: true; message: string }>('/resend-code', {
    method: 'POST', body: JSON.stringify({ email, purpose }),
  }),
  login: (email: string, password: string) => request<{ user: AuthUser }>('/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  }),
  logout: () => request<{ ok: true }>('/logout', { method: 'POST' }),
  logoutAll: () => request<{ ok: true }>('/logout-all', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/me'),
  forgotPassword: (email: string) => request<{ ok: true; message: string }>('/forgot-password', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  resetPassword: (token: string, password: string) => request<{ ok: true }>('/reset-password', {
    method: 'POST', body: JSON.stringify({ token, password }),
  }),
  startYandexLogin: () => window.location.assign(`${API_BASE}/auth/yandex/start`),
  mfaStatus: () => request<{ enrolled: boolean; verified: boolean; factorId: string | null; elevated: boolean }>('/mfa/status'),
  mfaEnroll: () => request<{ enrolled: boolean; verified: boolean; factorId: string; secret?: string; qrCode?: string }>('/mfa/enroll', { method: 'POST' }),
  mfaVerify: (factorId: string, code: string) => request<{ ok: true; authLevel: 'mfa' }>('/mfa/verify', {
    method: 'POST', body: JSON.stringify({ factorId, code }),
  }),
};

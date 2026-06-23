import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import {
  isSupabaseReady,
  supabase,
} from '../../services/supabaseClient';
import {
  AdminApiError,
  fetchAdminSession,
} from '../../services/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminStore } from '../../store/useAdminStore';
import { getPasswordResetRedirectUrl } from '../../utils/siteOrigins';

const ATTEMPT_KEY = 'potok-admin-login-attempts-v2';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptState {
  count: number;
  startedAt: number;
  blockedUntil: number | null;
}

function readAttempts(now: number): AttemptState {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { count: 0, startedAt: now, blockedUntil: null };
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    const state = {
      count: Number(parsed.count ?? 0),
      startedAt: Number(parsed.startedAt ?? now),
      blockedUntil:
        typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : null,
    };
    if (now - state.startedAt > WINDOW_MS && (!state.blockedUntil || now > state.blockedUntil)) {
      return { count: 0, startedAt: now, blockedUntil: null };
    }
    return state;
  } catch {
    return { count: 0, startedAt: now, blockedUntil: null };
  }
}

function writeAttempts(state: AttemptState): void {
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(state));
}

function clearAttempts(): void {
  sessionStorage.removeItem(ATTEMPT_KEY);
}

function recordFailure(now: number): AttemptState {
  const state = readAttempts(now);
  const nextCount = state.count + 1;
  const nextState = {
    count: nextCount,
    startedAt: state.count === 0 ? now : state.startedAt,
    blockedUntil: nextCount >= MAX_ATTEMPTS ? now + WINDOW_MS : null,
  };
  writeAttempts(nextState);
  return nextState;
}

function explainAdminError(error: unknown): string {
  if (error instanceof AdminApiError) {
    const labels: Record<string, string> = {
      not_admin_staff: 'Этот аккаунт не добавлен в список сотрудников.',
      mfa_required: 'Для входа нужно подтвердить второй фактор.',
      account_blocked: 'Аккаунт заблокирован.',
      ip_not_allowed: 'Этот IP-адрес не разрешён для сотрудника.',
      permission_denied: 'Недостаточно прав для входа в админ-панель.',
      admin_api_unavailable: 'Административный API недоступен.',
    };
    return labels[error.code] ?? 'Не удалось проверить административный доступ.';
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('invalid login credentials')) return 'Неверный email или пароль.';
    if (lower.includes('email not confirmed')) return 'Email не подтверждён.';
    if (lower.includes('rate limit')) return 'Слишком много попыток. Попробуйте позже.';
    return error.message;
  }
  return 'Не удалось войти.';
}

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setAuthInitialized = useAuthStore((s) => s.setAuthInitialized);
  const resetAdmin = useAdminStore((s) => s.reset);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(() =>
    readAttempts(Date.now()).blockedUntil,
  );
  const now = Date.now();
  const blockedMs = blockedUntil && blockedUntil > now ? blockedUntil - now : 0;

  const blockedLabel = useMemo(() => {
    if (!blockedMs) return null;
    const minutes = Math.ceil(blockedMs / 60_000);
    return `Слишком много попыток. Повторите вход через ${minutes} мин.`;
  }, [blockedMs]);

  useEffect(() => {
    if (!blockedUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() > blockedUntil) {
        clearAttempts();
        setBlockedUntil(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseReady) return;
    void fetchAdminSession()
      .then((session) => {
        if (cancelled) return;
        if (session.mfa_required) {
          void navigate({ to: '/admin/mfa', replace: true });
        } else {
          void navigate({ to: '/admin', replace: true });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleResetPassword = async () => {
    if (!email.includes('@')) {
      setError('Введите email, чтобы получить ссылку восстановления.');
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (resetError) throw resetError;
      toast.success('Письмо для восстановления отправлено.');
    } catch (err) {
      setError(explainAdminError(err));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (blockedMs) return;
    if (!isSupabaseReady) {
      setError('Система авторизации недоступна.');
      return;
    }

    setLoading(true);
    setError(null);
    resetAdmin();
    let credentialsFailed = false;

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      credentialsFailed = Boolean(signInError || !data.session);
      if (signInError) throw signInError;
      if (!data.session) throw new Error('Сессия не создана.');

      setSession(data.session);
      setAuthInitialized(true);

      const adminSession = await fetchAdminSession();
      clearAttempts();
      toast.success('Вход подтверждён.');
      if (adminSession.mfa_required) {
        await navigate({ to: '/admin/mfa', replace: true });
      } else {
        await navigate({ to: '/admin', replace: true });
      }
    } catch (err) {
      if (credentialsFailed) {
        const next = recordFailure(Date.now());
        if (next.blockedUntil) setBlockedUntil(next.blockedUntil);
      }
      setError(explainAdminError(err));
      await supabase.auth.signOut().catch(() => undefined);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#09090b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_10%_0%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.18),transparent_32%),linear-gradient(180deg,#111015_0%,#09090b_70%)]" />
      <div className="absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%220_0_256_256%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.7%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <main className="relative z-10 mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-2xl">
          <Link to="/" className="mb-14 inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 font-lora text-lg font-bold text-black shadow-lg shadow-amber-500/25">
              П
            </span>
            <span className="font-bold">Поток</span>
          </Link>

          <div className="mb-6 flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-amber-300/80">
              Панель сотрудников
            </span>
          </div>

          <h1 className="font-lora text-[clamp(3rem,8vw,6.25rem)] font-bold leading-[0.95] tracking-tight">
            Контроль
            <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-rose-400">
              потока
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/55">
            Безопасный back-office для модерации квизов, управления доступом и
            аудита действий команды.
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="mb-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-sm font-semibold text-amber-100">Требуется 2FA</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              После пароля сотрудник подтверждает одноразовый код из
              authenticator-приложения.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Email сотрудника
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10"
                placeholder="••••••••"
              />
            </div>

            {(error || blockedLabel) && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {blockedLabel ?? error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(blockedMs)}
              className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Проверяем доступ...' : 'Войти в админ-панель'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResetPassword}
            className="mt-5 text-sm font-semibold text-amber-200/80 transition hover:text-amber-200"
          >
            Восстановить доступ
          </button>
        </section>
      </main>
    </div>
  );
};

export default AdminLoginPage;

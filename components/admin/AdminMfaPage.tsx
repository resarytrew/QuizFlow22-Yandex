import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminStore } from '../../store/useAdminStore';
import { fetchAdminSession } from '../../services/adminApi';

interface EnrollmentState {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
}

interface MfaSetupResult {
  alreadyVerified: boolean;
  factorId: string | null;
  enrollment: EnrollmentState | null;
}

async function prepareMfa(): Promise<MfaSetupResult> {
  const adminSession = await fetchAdminSession();
  if (!adminSession.mfa_required) {
    return { alreadyVerified: true, factorId: null, enrollment: null };
  }

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw factors.error;

  const verified = factors.data.totp[0];
  if (verified) {
    return {
      alreadyVerified: false,
      factorId: verified.id,
      enrollment: null,
    };
  }

  const stale = factors.data.all.find(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
  );
  if (stale) {
    const unenrolled = await supabase.auth.mfa.unenroll({ factorId: stale.id });
    if (unenrolled.error) throw unenrolled.error;
  }

  const enrolled = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Поток Admin',
    issuer: 'Поток',
  });
  if (enrolled.error) throw enrolled.error;

  return {
    alreadyVerified: false,
    factorId: enrolled.data.id,
    enrollment: {
      factorId: enrolled.data.id,
      qrCodeSvg: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    },
  };
}

export function qrImageSource(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

const AdminMfaPage: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const setSession = useAuthStore((s) => s.setSession);
  const resetAdmin = useAdminStore((s) => s.reset);
  const refreshAdminSession = useAdminStore((s) => s.refreshSession);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const setupPromiseRef = useRef<Promise<MfaSetupResult> | null>(null);
  const activeFactorId = factorId ?? enrollment?.factorId ?? null;
  const normalizedCode = code.trim();
  const canVerify = Boolean(activeFactorId) && normalizedCode.length === 6;

  useEffect(() => {
    let cancelled = false;
    const setupMfa = async () => {
      try {
        setupPromiseRef.current ??= prepareMfa();
        const result = await setupPromiseRef.current;
        if (cancelled) return;

        if (result.alreadyVerified) {
          await navigate({ to: '/admin', replace: true });
          return;
        }
        setFactorId(result.factorId);
        setEnrollment(result.enrollment);
        setQrFailed(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось подготовить 2FA.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void setupMfa();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeFactorId || normalizedCode.length !== 6) return;

    setVerifying(true);
    setError(null);
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId: activeFactorId,
        code: normalizedCode,
      });
      if (result.error) throw result.error;
      const refreshedSession = await supabase.auth.refreshSession();
      if (refreshedSession.error) throw refreshedSession.error;
      if (refreshedSession.data.session) {
        setSession(refreshedSession.data.session);
      } else {
        const currentSession = await supabase.auth.getSession();
        if (currentSession.error) throw currentSession.error;
        setSession(currentSession.data.session);
      }
      resetAdmin();
      const nextStaff = await refreshAdminSession();
      if (nextStaff.current_aal !== 'aal2') {
        throw new Error('2FA confirmed, but the secure admin session was not refreshed yet. Please try again.');
      }
      toast.success('Второй фактор подтверждён.');
      await navigate({ to: '/admin', replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код 2FA.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.16),transparent_36%),linear-gradient(180deg,#121015_0%,#09090b_80%)]" />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl items-center px-6 py-12">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-10">
          <div className="mb-8">
            <div className="mb-5 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
              Второй фактор
            </div>
            <h1 className="font-lora text-4xl font-bold tracking-tight md:text-5xl">
              Подтвердите вход
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
              Административный контур требует одноразовый TOTP-код. Если фактор
              ещё не подключён, отсканируйте QR-код ниже.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-white/60">
              Подготовка 2FA...
            </div>
          ) : (
            <>
              {enrollment && (
                <div className="mb-6 grid gap-5 rounded-3xl border border-white/10 bg-black/25 p-5 md:grid-cols-[180px_1fr]">
                  <div className="rounded-2xl bg-white p-3">
                    <img
                      src={qrImageSource(enrollment.qrCodeSvg)}
                      alt="QR-код для подключения 2FA"
                      className="aspect-square h-full w-full object-contain"
                      onError={() => setQrFailed(true)}
                    />
                    {qrFailed && (
                      <p className="mt-2 text-center text-xs font-semibold text-red-700">
                        Используйте резервный секрет справа.
                      </p>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Подключение TOTP</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">
                      Откройте Google Authenticator, 1Password, Authy или другое
                      приложение и добавьте новый код по QR.
                    </p>
                    <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-white/40">
                      Резервный секрет
                    </label>
                    <code className="mt-2 block rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-100">
                      {enrollment.secret}
                    </code>
                  </div>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/80">
                    Код из приложения
                  </label>
                  <input name="components-admin-adminmfapage-221-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center text-2xl tracking-[0.35em] text-white outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10"
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={verifying || !canVerify}
                    className="flex-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifying ? 'Проверяем...' : 'Подтвердить'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-full border border-white/10 px-6 py-4 font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    Выйти
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminMfaPage;

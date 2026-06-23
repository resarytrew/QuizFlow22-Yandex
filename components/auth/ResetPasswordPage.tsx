import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { isSupabaseReady, supabase } from '../../services/supabaseClient';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseReady) {
      setError('Система авторизации недоступна.');
      setChecking(false);
      return;
    }

    let mounted = true;
    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionReady(Boolean(data.session));
      setChecking(false);
      if (sessionError || !data.session) {
        setError('Ссылка недействительна или устарела. Запросите новое письмо.');
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(Boolean(session));
        setChecking(false);
        setError(null);
      }
    });

    void checkSession();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Новый пароль должен содержать не менее 8 символов.');
      return;
    }
    if (password !== confirmation) {
      setError('Пароли не совпадают.');
      return;
    }
    if (!sessionReady) {
      setError('Сессия восстановления не найдена. Запросите новое письмо.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Пароль изменён. Теперь войдите с новым паролем.');
    await navigate({ to: '/admin/login', replace: true });
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] px-5 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
          Восстановление доступа
        </p>
        <h1 className="mt-3 font-lora text-3xl font-bold">Новый пароль</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Придумайте новый пароль для аккаунта. После сохранения войдите в
          админ-панель заново.
        </p>

        {checking ? (
          <div className="mt-8 flex items-center gap-3 text-sm text-white/60">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-amber-300" />
            Проверяем ссылку...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Новый пароль"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none transition focus:border-amber-300"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Повторите пароль"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none transition focus:border-amber-300"
            />

            {error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !sessionReady}
              className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Сохраняем...' : 'Установить новый пароль'}
            </button>

            {!sessionReady && (
              <button
                type="button"
                onClick={() => navigate({ to: '/admin/login' })}
                className="w-full text-sm font-semibold text-amber-200"
              >
                Запросить новую ссылку
              </button>
            )}
          </form>
        )}
      </section>
    </main>
  );
};

export default ResetPasswordPage;

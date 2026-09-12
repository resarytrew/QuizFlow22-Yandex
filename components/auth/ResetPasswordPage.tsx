import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { authClient } from '../../services/authClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Route } from '../../src/router/routes/authResetPassword';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthInitialized = useAuthStore((state) => state.setAuthInitialized);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'Ссылка недействительна или устарела. Запросите новое письмо.');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return setError('Ссылка восстановления не найдена.');
    if (password.length < 8) return setError('Новый пароль должен содержать не менее 8 символов.');
    if (password !== confirmation) return setError('Пароли не совпадают.');
    setSaving(true);
    try {
      await authClient.resetPassword(token, password);
      const { user } = await authClient.me();
      setUser(user);
      setAuthInitialized(true);
      toast.success('Пароль изменён.');
      await navigate({ to: '/', replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось изменить пароль.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] px-5 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Восстановление доступа</p>
        <h1 className="mt-3 font-lora text-3xl font-bold">Новый пароль</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">Придумайте новый пароль. После сохранения все прежние сессии будут закрыты.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Новый пароль" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none transition focus:border-amber-300" />
          <input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Повторите пароль" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none transition focus:border-amber-300" />
          {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
          <button type="submit" disabled={saving || !token} className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 font-bold text-black disabled:opacity-50">{saving ? 'Сохраняем...' : 'Установить новый пароль'}</button>
        </form>
      </section>
    </main>
  );
};

export default ResetPasswordPage;

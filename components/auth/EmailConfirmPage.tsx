import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/src/router/routes/authConfirm';
import { authClient } from '../../services/authClient';
import { useAuthStore } from '../../store/useAuthStore';

const EmailConfirmPage: React.FC = () => {
  const { status: oauthStatus, link, email, error: oauthError } = Route.useSearch();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthInitialized = useAuthStore((state) => state.setAuthInitialized);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'verifying' | 'input' | 'success' | 'error'>(link === 'required' ? 'input' : 'verifying');
  const [message, setMessage] = useState(link === 'required' ? 'Введите код из письма, чтобы безопасно связать существующий аккаунт.' : 'Завершаем вход...');

  useEffect(() => {
    if (link === 'required') return;
    if (oauthError) {
      setStatus('error');
      setMessage('Не удалось выполнить вход через Яндекс. Попробуйте ещё раз.');
      return;
    }
    if (oauthStatus === 'success') {
      void authClient.me().then(({ user }) => {
        setUser(user);
        setAuthInitialized(true);
        setStatus('success');
        setMessage('Вход через Яндекс выполнен. Перенаправляем...');
        window.setTimeout(() => void navigate({ to: '/', replace: true }), 700);
      }).catch(() => {
        setStatus('error');
        setMessage('Сессия не была создана. Повторите вход через Яндекс.');
      });
      return;
    }
    setStatus('error');
    setMessage('Ссылка подтверждения недействительна.');
  }, [link, navigate, oauthError, oauthStatus, setAuthInitialized, setUser]);

  const verifyLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !/^\d{6}$/.test(code)) return;
    setStatus('verifying');
    try {
      const result = await authClient.verifyEmail(email, code, 'link_yandex');
      setUser(result.user);
      setAuthInitialized(true);
      setStatus('success');
      setMessage('Аккаунт связан. Перенаправляем...');
      window.setTimeout(() => void navigate({ to: '/', replace: true }), 700);
    } catch (error) {
      setStatus('input');
      setMessage(error instanceof Error ? error.message : 'Не удалось подтвердить код.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'verifying' && <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />}
        {status === 'success' && <div className="mx-auto mb-4 text-5xl text-green-500">✓</div>}
        {status === 'error' && <div className="mx-auto mb-4 text-5xl text-red-500">×</div>}
        <h1 className="text-xl font-bold text-gray-900 mb-2">{status === 'input' ? 'Связать аккаунт' : status === 'error' ? 'Ошибка входа' : 'Подтверждение'}</h1>
        <p className="text-gray-500">{message}</p>
        {status === 'input' && (
          <form onSubmit={verifyLink} className="mt-6 space-y-4">
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.35em]" placeholder="000000" />
            <button disabled={code.length !== 6} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Подтвердить</button>
          </form>
        )}
        {status === 'error' && <button onClick={() => navigate({ to: '/' })} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white">На главную</button>}
      </div>
    </div>
  );
};

export default EmailConfirmPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/src/router/routes/authConfirm';
import { supabase, isSupabaseReady } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';

const EmailConfirmPage: React.FC = () => {
  const { code, token_hash, type, error, error_description } = Route.useSearch();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setAuthInitialized = useAuthStore((state) => state.setAuthInitialized);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [message, setMessage] = useState<string>('Подтверждаем email...');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (error) {
        setStatus('error');
        setMessage(
          error_description
            ? decodeURIComponent(error_description)
            : 'Не удалось подтвердить email'
        );
        return;
      }

      if (!isSupabaseReady || !supabase) {
        setStatus('error');
        setMessage('Supabase не инициализирован');
        return;
      }

      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exchangeError) {
            setStatus('error');
            setMessage(exchangeError.message);
            return;
          }
          if (!data.session) {
            setStatus('error');
            setMessage('Не удалось создать сессию после входа через Яндекс. Попробуйте ещё раз.');
            return;
          }

          setSession(data.session);
          setAuthInitialized(true);
          setStatus('success');
          setMessage('Вход через Яндекс выполнен. Перенаправляем...');
          setTimeout(() => navigate({ to: '/' }), 800);
        } catch (e) {
          if (cancelled) return;
          setStatus('error');
          setMessage(e instanceof Error ? e.message : 'Неизвестная ошибка');
        }
      } else if (token_hash && type) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (cancelled) return;
          if (verifyError) {
            setStatus('error');
            setMessage(verifyError.message);
          } else {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              setSession(data.session);
              setAuthInitialized(true);
            }
            setStatus('success');
            setMessage('Email подтверждён! Перенаправляем...');
            setTimeout(() => navigate({ to: '/' }), 1500);
          }
        } catch (e) {
          if (cancelled) return;
          setStatus('error');
          setMessage(e instanceof Error ? e.message : 'Неизвестная ошибка');
        }
      } else {
        // Нет токенов — Supabase PKCE flow обработал токены автоматически
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setAuthInitialized(true);
        }
        setStatus('success');
        setMessage('Email подтверждён! Перенаправляем...');
        setTimeout(() => navigate({ to: '/' }), 1500);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [code, token_hash, type, error, error_description, navigate, setSession, setAuthInitialized]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Подтверждение email
            </h1>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Готово!</h1>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Ошибка подтверждения
            </h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              На главную
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmPage;

// components/BillingReturnPage.tsx
// Страница возврата пользователя после оплаты в YooKassa.

import React, { useEffect, useState } from 'react';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from '@tanstack/react-router';

const BillingReturnPage: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const refresh = useEntitlementStore((s) => s.refresh);
  const ent = useEntitlementStore((s) => s.entitlement);
  const [status, setStatus] = useState<'pending' | 'success' | 'timeout'>('pending');

  useEffect(() => {
    if (!session) return;
    let attempts = 0;
    const tick = async () => {
      await refresh(session.user.id);
      attempts++;
      if (ent.plan === 'pro' || attempts >= 6) {
        setStatus(ent.plan === 'pro' ? 'success' : 'timeout');
      }
    };
    tick();
    const interval = setInterval(tick, 1500);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStatus((prev) => (prev === 'pending' ? 'timeout' : prev));
    }, 10_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [session, refresh, ent.plan]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        {status === 'pending' && (
          <>
            <div className="mx-auto w-14 h-14 border-4 border-t-indigo-600 border-gray-200 rounded-full animate-spin mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Подтверждаем оплату…</h1>
            <p className="text-sm text-slate-600">
              Это занимает несколько секунд. Не закрывайте страницу.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Спасибо! PRO активен</h1>
            <p className="text-sm text-slate-600 mb-6">
              Подписка действует до{' '}
              <strong>
                {ent.valid_until
                  ? new Date(ent.valid_until).toLocaleDateString('ru-RU')
                  : '—'}
              </strong>
            </p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700"
            >
              На главную
            </Link>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Подождите пару секунд</h1>
            <p className="text-sm text-slate-600 mb-6">
              Если платёж прошёл, статус обновится автоматически в течение минуты. Можно вернуться и
              проверить позже.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                to="/billing"
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                В биллинг
              </Link>
              <Link
                to="/"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:from-indigo-700 hover:to-purple-700"
              >
                На главную
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingReturnPage;

import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { useAdminStore } from '../../store/useAdminStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { AdminRole, AdminStaffSession } from '../../types';

const roleLabels: Record<AdminRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  moderator: 'Модератор',
  support: 'Поддержка',
};

function useAdminIdleLogout(timeoutMinutes: number | null) {
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (!timeoutMinutes) return;
    let timer: number | null = null;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        toast('Сессия администратора завершена из-за бездействия.');
        void signOut();
      }, timeoutMs);
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [signOut, timeoutMinutes]);
}

const AdminAccessGate: React.FC = () => {
  const navigate = useNavigate();
  const staff = useAdminStore((s) => s.staff);
  const isLoading = useAdminStore((s) => s.isSessionLoading);
  const error = useAdminStore((s) => s.error);
  const refreshSession = useAdminStore((s) => s.refreshSession);

  useEffect(() => {
    let cancelled = false;
    void refreshSession()
      .then((nextStaff) => {
        if (cancelled) return;
        if (nextStaff.current_aal !== 'aal2') {
          void navigate({ to: '/admin/mfa', replace: true });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshSession]);

  if (isLoading || (!staff && !error)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] text-white/60">
        Проверяем доступ...
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#09090b] p-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-center">
          <h1 className="font-lora text-3xl font-bold">Доступ закрыт</h1>
          <p className="mt-3 text-sm text-white/60">
            Аккаунт не имеет активной роли сотрудника или не прошёл проверку.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/admin/login', replace: true })}
            className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Вернуться ко входу
          </button>
        </div>
      </div>
    );
  }

  return <AdminShellFrame staff={staff} />;
};

const AdminShellFrame: React.FC<{ staff: AdminStaffSession }> = ({ staff }) => {
  const signOut = useAuthStore((s) => s.signOut);
  useAdminIdleLogout(staff.idle_timeout_minutes);

  const navItems = [
    { label: 'Обзор', to: '/admin', status: 'ready' },
    { label: 'Пользователи', to: '/admin/users', status: 'ready' },
    { label: 'Квизы', to: '/admin/quizzes', status: 'ready' },
    { label: 'Жалобы', to: '/admin/reports', status: 'ready' },
    { label: 'Поддержка', to: '/admin/support', status: 'ready' },
    { label: 'Финансы', to: '/admin/finances', status: 'ready' },
    { label: 'Промокоды', to: '/admin/promocodes', status: 'ready' },
  ] as const;

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(251,191,36,0.13),transparent_32%),radial-gradient(circle_at_95%_10%,rgba(168,85,247,0.14),transparent_34%),linear-gradient(180deg,#111015_0%,#09090b_84%)]" />
      <div className="fixed inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%220_0_256_256%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.7%22_numOctaves=%224%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative z-10 flex min-h-[100dvh]">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/25 p-5 backdrop-blur-xl lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 font-lora font-bold text-black">
              П
            </div>
            <div>
              <div className="font-bold">Поток Admin</div>
              <div className="text-xs text-white/40">Контур управления</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                activeOptions={{ exact: item.to === '/admin' }}
                activeProps={{
                  className: 'bg-amber-300 text-black shadow-lg shadow-amber-500/20',
                }}
                inactiveProps={{
                  className: 'text-white/65 hover:bg-white/10 hover:text-white',
                }}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#09090b]/70 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-amber-300/70">
                  ID сотрудника #{staff.account_code}
                </div>
                <div className="mt-1 text-sm text-white/55">
                  {roleLabels[staff.role]} · {staff.email ?? 'без email'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Выйти
              </button>
            </div>
          </header>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AdminShell: React.FC = () => <AdminAccessGate />;

export default AdminShell;

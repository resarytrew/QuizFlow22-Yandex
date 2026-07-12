import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useEntitlementStore } from '../../../store/useEntitlementStore';
import { useAutosaveStore } from '../../../store/useAutosaveStore';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import PreferencesApplicator from '../../../components/PreferencesApplicator';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import SeoRouteHead from '../../seo/SeoRouteHead';
import SeoAnalytics from '../../seo/SeoAnalytics';

// ─── Router Context ───────────────────────────────────────────────────────────
// Передаётся в RouterProvider и доступен в beforeLoad/loader каждого маршрута.

export interface RouterContext {
  auth: {
    initialized: boolean;
    isAuthenticated: boolean;
    userId: string | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootRouteErrorBoundary,
});

// ─── Root Layout ──────────────────────────────────────────────────────────────

function RootLayout() {
  const session = useAuthStore((s) => s.session);
  const fetchUserQuizzes = useQuizDataStore((s) => s.fetchUserQuizzes);
  const setUserQuizzes = useQuizDataStore((s) => s.setUserQuizzes);
  const refreshEntitlement = useEntitlementStore((s) => s.refresh);
  const autosaveCurrentQuiz = useAutosaveStore((s) => s.autosaveCurrentQuiz);

  useEffect(() => {
    useAutosaveStore.getState().checkForAutosave();
  }, []);

  useEffect(() => {
    if (session) {
      void fetchUserQuizzes().catch((error) =>
        console.error('Failed to fetch quizzes:', error)
      );
      void refreshEntitlement(session.user.id).catch((error) =>
        console.error('Failed to fetch entitlement:', error)
      );
    } else {
      setUserQuizzes([]);
      useEntitlementStore.getState().reset();
    }
  }, [fetchUserQuizzes, refreshEntitlement, session, setUserQuizzes]);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      if (window.location.pathname.startsWith('/editor')) {
        autosaveCurrentQuiz();
      }
    }, 2 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [autosaveCurrentQuiz, session]);

  return (
    <AppErrorBoundary>
      <SeoRouteHead />
      <SeoAnalytics />
      <PreferencesApplicator />
      <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              color: '#1f2937',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '14px',
            },
          }}
        />
        <ScrollRestoration />
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AppErrorBoundary>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

function RootRouteErrorBoundary({ error }: { error: unknown }) {
  const handleReset = () => {
    // Reload via dynamic import to avoid circular dep at module-init time
    import('../index').then(({ router }) => router.invalidate());
  };
  const errorMessage =
    error instanceof Error ? error.message : 'Произошла непредвиденная ошибка';

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Что-то пошло не так
        </h2>
        <p className="text-slate-500 mb-2 text-sm">{errorMessage}</p>
        <p className="text-slate-400 mb-6 text-xs">
          Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all"
          >
            Перезагрузить страницу
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ──────────────────────────────────────────────────────────

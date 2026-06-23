import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { routeTree } from './routeTree';
import { useAuthStore } from '../../store/useAuthStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { supabase, isSupabaseReady } from '../../services/supabaseClient';
import type { RouterContext } from './routes/root';

// ─── Router Instance ──────────────────────────────────────────────────────────
//
// Hash history (createHashHistory): URL = https://mykviz.ru/#/path
// - не зависит от Yandex SPA fallback (ErrorDocument)
// - все share-ссылки и redirect-ы остаются работоспособными
// - в Phase B можно мигрировать на createBrowserHistory() + Yandex fallback

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  context: {
    auth: { initialized: false, isAuthenticated: false, userId: null },
  } satisfies RouterContext,
});

// ─── TypeScript Module Augmentation ──────────────────────────────────────────

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppRouter() {
  const session = useAuthStore((s) => s.session);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const setSession = useAuthStore((s) => s.setSession);
  const setAuthInitialized = useAuthStore((s) => s.setAuthInitialized);
  const didMountRouter = useRef(false);

  useEffect(() => {
    if (!isSupabaseReady) {
      setAuthInitialized(true);
      return;
    }

    let isMounted = true;
    const failSafe = window.setTimeout(() => {
      if (isMounted) setAuthInitialized(true);
    }, 4000);

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) console.warn('Supabase session warning:', error.message);
        setSession(data.session);
        setAuthInitialized(true);
      })
      .catch((error) => {
        console.warn('Auth initialization fallback (guest mode):', error);
        if (isMounted) setAuthInitialized(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setAuthInitialized(true);

      if (event === 'SIGNED_IN' && nextSession?.user.id) {
        const userId = nextSession.user.id;
        window.setTimeout(() => {
          void useEntitlementStore.getState().refresh(userId);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        useEntitlementStore.getState().reset();
      }
    });

    return () => {
      isMounted = false;
      window.clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [setAuthInitialized, setSession]);

  const context: RouterContext = {
    auth: {
      initialized: authInitialized,
      isAuthenticated: Boolean(session),
      userId: session?.user?.id ?? null,
    },
  };

  useEffect(() => {
    if (!authInitialized || !didMountRouter.current) return;
    void router.invalidate();
  }, [authInitialized, session]);

  if (!authInitialized) {
    return <RouterLoadingScreen />;
  }

  didMountRouter.current = true;
  return <RouterProvider router={router} context={context} />;
}

function RouterLoadingScreen() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-t-indigo-600 border-gray-200 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Загрузка Поток...</p>
      </div>
    </div>
  );
}

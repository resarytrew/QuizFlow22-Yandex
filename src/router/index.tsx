import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { routeTree } from './routeTree';
import { useAuthStore } from '../../store/useAuthStore';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { authClient } from '../../services/authClient';
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
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthInitialized = useAuthStore((s) => s.setAuthInitialized);
  const didMountRouter = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const failSafe = window.setTimeout(() => {
      if (isMounted) setAuthInitialized(true);
    }, 4000);

    void authClient.me()
      .then(({ user: nextUser }) => {
        if (!isMounted) return;
        setUser(nextUser);
        setAuthInitialized(true);
      })
      .catch((error) => {
        if (isMounted) {
          setUser(null);
          setAuthInitialized(true);
        }
        if (import.meta.env.DEV && error?.status !== 401) console.warn('Auth initialization failed:', error);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(failSafe);
    };
  }, [setAuthInitialized, setUser]);

  useEffect(() => {
    if (user?.id) void useEntitlementStore.getState().refresh(user.id);
    else useEntitlementStore.getState().reset();
  }, [user?.id]);

  const context: RouterContext = {
    auth: {
      initialized: authInitialized,
      isAuthenticated: Boolean(user),
      userId: user?.id ?? null,
    },
  };

  useEffect(() => {
    if (!authInitialized || !didMountRouter.current) return;
    void router.invalidate();
  }, [authInitialized, user]);

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

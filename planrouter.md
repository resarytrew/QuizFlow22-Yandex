Рекомендация: начать с code-based routing, потом при желании перейти на file-based
Для твоего проекта я бы не начинал с file-based router plugin сразу.

Почему
Сейчас у тебя:

уже сложная существующая структура,
много legacy-переходов,
кастомная логика в App.tsx,
нестандартные entry points (?play=, /auth/confirm, billing return, preview),
Yandex Cloud SPA fallback.
Поэтому лучше:
сначала code-based routing — максимальный контроль,
потом, если всё стабилизируется, можно перейти на file-based.
Целевая карта маршрутов
Вот рекомендуемая структура URL.

Публичные маршруты
txt

/                       → LandingPage или Dashboard (если залогинен)
/templates              → TemplatesPage
/public                 → PublicQuizzesPage
/public/$quizId         → публичная страница/карточка квиза или запуск
/play/$quizId           → QuizPlayer для конкретного квиза
/auth/confirm           → EmailConfirmPage
/billing                → BillingPage
/billing/return         → BillingReturnPage
/guide                  → MethodologicalGuide / Documentation
/contest                → ContestDashboard
/contest/registry       → ContestRegistryPage
Приватные маршруты
txt

/dashboard              → Dashboard / MyQuizzes
/editor                 → новый пустой квиз
/editor/$quizId         → QuizEditor для конкретного квиза
/analytics/$quizId      → AnalyticsModal/page (если захочешь page-based)
Маршруты совместимости
txt

/?play=$quizId          → redirect → /play/$quizId
/?status=success        → redirect → /billing/return?status=success
/#/auth/confirm         → redirect → /auth/confirm
Фаза 0. Подготовка
0.1 Проверить SPA fallback на Yandex Cloud
Это обязательно.

В Object Storage / CDN должен быть fallback:

index.html как index page
index.html как error page
Иначе прямой переход на:

txt

/editor/123
/play/abc
/auth/confirm
даст 404.

0.2 Убедиться, что Supabase redirect URLs уже подходят
Нужно добавить в Supabase:

txt

https://mykviz.ru/**
http://localhost:5173/**
https://mykviz.ru/auth/confirm
https://mykviz.ru/billing/return
0.3 Заморозить старую маршрутизацию
Перед началом миграции:

не добавлять новые ручные window.location if-ветки в App.tsx,
все новые сценарии уже делать через новый router.
Фаза 1. Установка TanStack Router
1.1 Установить зависимости
Bash

npm install @tanstack/react-router
npm install -D @tanstack/router-devtools
Если позже захочешь file-based:

Bash

npm install -D @tanstack/router-plugin
Но сейчас не обязательно.

1.2 Создать базовую структуру
Рекомендую:

txt

src/
├── router/
│   ├── index.tsx
│   ├── routeTree.tsx
│   ├── routes/
│   │   ├── root.tsx
│   │   ├── landing.tsx
│   │   ├── dashboard.tsx
│   │   ├── billing.tsx
│   │   ├── billingReturn.tsx
│   │   ├── authConfirm.tsx
│   │   ├── templates.tsx
│   │   ├── publicQuizzes.tsx
│   │   ├── playQuiz.tsx
│   │   ├── editorNew.tsx
│   │   ├── editorQuiz.tsx
│   │   ├── contest.tsx
│   │   └── legacy.tsx
Фаза 2. Внедрение RouterProvider без переписывания логики
2.1 Создать src/router/index.tsx
React

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
2.2 Обновить entry point
Если у тебя есть main.tsx, сделай:

React

import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
2.3 Старый App.tsx пока оставить как layout/content host
На первом этапе не надо пытаться удалить весь App.tsx.
Можно:

использовать его части внутри route-компонентов,
постепенно выносить логику.
Фаза 3. Создать root route и app layout
3.1 root.tsx
React

import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Header } from '../../components/Header'
import { useAuthStore } from '../../store/useAuthStore'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const authInitialized = useAuthStore((s) => s.authInitialized)

  if (!authInitialized) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>
  }

  return (
    <>
      <Header />
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </>
  )
}
Фаза 4. Сначала мигрировать простые страницы
Начинай не с редактора, а с самых простых экранов.

Очередность:
/billing
/billing/return
/templates
/public
/auth/confirm
/contest
/guide
Почему:

почти нет сложного state coupling,
легко проверить,
быстро даёт ценность.
Пример: billing.tsx
React

import { createFileRoute } from '@tanstack/react-router'
import { BillingPage } from '../../components/BillingPage'

export const Route = createFileRoute('/billing')({
  component: BillingPage,
})
Если делаешь code-based:

React

import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { BillingPage } from '../../components/BillingPage'

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing',
  component: BillingPage,
})
Фаза 5. Отдельно обработать legacy URL совместимость
Это очень важно. Нельзя просто сломать старые ссылки.

Нужно поддержать:
?play=uuid
?status=success
старые auth callback форматы
возможно #... хвосты
5.1 Legacy route-перехватчик
Сделай маршрут, который ловит старый формат и редиректит:

React

import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'

export const legacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => ({
    play: typeof search.play === 'string' ? search.play : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.play) {
      throw redirect({
        to: '/play/$quizId',
        params: { quizId: search.play },
      })
    }

    if (search.status) {
      throw redirect({
        to: '/billing/return',
        search: { status: search.status },
      })
    }
  },
})
5.2 Auth confirm compatibility
Если у тебя были проверки типа:

TypeScript

pathname === '/auth/confirm' ||
search has token_hash ||
hash has access_token
оставь это, но перенеси в beforeLoad route.

React

export const authConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm',
  validateSearch: (search) => ({
    token_hash: typeof search.token_hash === 'string' ? search.token_hash : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  component: EmailConfirmPage,
})
Фаза 6. Миграция play/public маршрутов
Это следующий по важности блок после простых страниц.

6.1 /play/$quizId
React

import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { QuizPlayer } from '../../components/QuizPlayer'
import { loadQuizForPlayer } from '../../services/loadQuizForPlayer'

export const playQuizRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/$quizId',
  loader: async ({ params }) => {
    return await loadQuizForPlayer(params.quizId)
  },
  component: PlayQuizPage,
})

function PlayQuizPage() {
  const quiz = playQuizRoute.useLoaderData()
  return <QuizPlayer quiz={quiz} />
}
6.2 /public и /public/$quizId
Если /public/$quizId у тебя ведёт не просто на карточку, а сразу запускает квиз, реши это явно:

либо /public/$quizId = лендинг публичного квиза
а запуск = /play/$quizId
либо /public/$quizId сразу player
Я рекомендую разделить.

Фаза 7. Миграция dashboard и editor
Это уже сложный этап.

7.1 /dashboard
React

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: ({ context }) => {
    const session = useAuthStore.getState().session
    if (!session) {
      throw redirect({ to: '/' })
    }
  },
  component: Dashboard,
})
7.2 /editor
Для нового квиза:

txt

/editor
Для существующего:

txt

/editor/$quizId
7.3 /editor/$quizId — loader
React

export const editorQuizRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$quizId',
  loader: async ({ params }) => {
    // либо fetch по quizId,
    // либо загрузка из стора/кэша с fallback на supabase
    return params.quizId
  },
  component: EditorQuizPage,
})

function EditorQuizPage() {
  const quizId = editorQuizRoute.useParams().quizId

  useEffect(() => {
    // загружаем квиз в стор
    // useQuizDataStore.getState().loadQuiz(...)
  }, [quizId])

  return <QuizEditor />
}
Фаза 8. Вынести auth guards и route context
Когда routes уже работают, не нужно в каждом маршруте руками лезть в useAuthStore.

8.1 Создать router context
React

import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree'
import { useAuthStore } from '../store/useAuthStore'

export interface RouterContext {
  auth: {
    session: ReturnType<typeof useAuthStore.getState>['session']
  }
}

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      session: null,
    },
  },
})
Но Zustand hook нельзя просто так внутри createRouter, так что лучше при рендере:

React

function AppRouter() {
  const session = useAuthStore((s) => s.session)

  return (
    <RouterProvider
      router={router}
      context={{
        auth: { session },
      }}
    />
  )
}
Теперь в routes:

React

beforeLoad: ({ context }) => {
  if (!context.auth.session) {
    throw redirect({ to: '/' })
  }
}
Фаза 9. Заменить ручную навигацию
Когда основные маршруты работают:

Нужно заменить:
window.location.href = ...
кастомные setDashboardVisible(...) для смены “страниц”
ручные pathname/search/hash проверки
query-переходы ?play=...
на:

router.navigate(...)
<Link />
<Navigate />
loaders / beforeLoad
Пример
Было:
React

window.location.href = '/?play=' + quiz.id
Стало:
React

import { Link } from '@tanstack/react-router'

<Link
  to="/play/$quizId"
  params={{ quizId: quiz.id }}
>
  Играть
</Link>
или

React

const navigate = useNavigate()

navigate({
  to: '/play/$quizId',
  params: { quizId: quiz.id },
})
Фаза 10. URL-based модалки и search params
После базовой миграции можно сделать состояние через search params.

Например:

preview modal
analytics modal
auth modal
publish modal
Пример
txt

/editor/123?modal=analytics
/editor/123?modal=publish
TanStack Router умеет типизированный search.

React

validateSearch: (search) => ({
  modal: typeof search.modal === 'string' ? search.modal : undefined,
})
Фаза 11. Тестирование миграции
Обязательно написать/regression tests на:
1. Legacy redirect
/?play=abc → /play/abc
/?status=success → /billing/return?status=success
2. Auth route
/auth/confirm?token_hash=... рендерит confirm page
?play= не ломает auth logic
3. Dashboard guard
неавторизованный юзер не попадает на /dashboard
неавторизованный юзер не попадает на /editor/123
4. Router integration
Link на play route строит правильный URL
editor/$quizId получает правильный param
Фаза 12. Удаление старого manual routing
Удалять только после того как:

все ключевые маршруты перенесены,
legacy redirects работают,
auth confirm работает,
billing return работает,
play/public/editor/dashboard работают,
тесты зелёные.
Практический план по спринтам
Sprint 1 — Внедрение роутера без риска
Цель: подключить TanStack Router и ничего не сломать

Сделать:
установить TanStack Router
создать root route
подключить RouterProvider
настроить SPA fallback на Yandex
перенести:
/billing
/billing/return
/templates
/public
/auth/confirm
Не трогать:
editor
dashboard
play flow
Sprint 2 — Legacy compatibility + play routes
Цель: новая URL-модель без слома старых ссылок

Сделать:
/?play= → redirect
/?status= → redirect
/play/$quizId
/public/$quizId (если нужен)
тесты на redirects
Sprint 3 — Dashboard и Editor
Цель: перейти с ручного UI-page state на route-driven state

Сделать:
/dashboard
/editor
/editor/$quizId
auth guards
загрузка quiz по route param
замена setDashboardVisible(...) как механизма “навигации”
Sprint 4 — Cleanup
Цель: вычистить legacy routing

Сделать:
удалить ручной route-switching из App.tsx
заменить window.location.href где это навигация, а не hard redirect
перевести модалки в search params (по желанию)
обновить документацию и RULES.md
Что будет самым сложным
1. Editor state vs route state
Сейчас “страница редактора” живёт partly в UI store (isDashboardVisible, preview flags).
Это нужно постепенно перевести на router, не ломая текущие сторы.

2. Legacy link compatibility
Нельзя просто убрать ?play= — наверняка уже есть ссылки, публикации, тестовые сценарии.

3. Auth callback / billing return
Эти сценарии очень чувствительны к роутингу.

4. Yandex Cloud fallback
Если fallback настроен неправильно — весь migration выглядит “сломавшимся”, хотя проблема не в коде.

Что я бы рекомендовал конкретно тебе
Самый безопасный путь:
1. TanStack Router внедрить параллельно
2. Сначала перевести простые страницы
3. Затем сделать compat redirect layer
4. Только потом переносить editor/dashboard
Минимальный набор файлов для старта
txt

src/router/
├── index.tsx
├── routeTree.tsx
└── routes/
    ├── root.tsx
    ├── landing.tsx
    ├── billing.tsx
    ├── billingReturn.tsx
    ├── authConfirm.tsx
    ├── templates.tsx
    ├── publicQuizzes.tsx
    ├── playQuiz.tsx
    ├── dashboard.tsx
    ├── editorNew.tsx
    ├── editorQuiz.tsx
    └── legacy.tsx
Итог
Коротко
Лучший путь миграции:

не переписывать всё сразу
внедрить TanStack Router как новый слой
сохранить старые query/hash URL через redirects
постепенно перенести страницы на typed routes
editor/dashboard переносить последними
Если хочешь, я могу следующим сообщением сразу написать тебе стартовый каркас TanStack Router под твой проект:

router/index.tsx
routeTree.tsx
root.tsx
billing.tsx
billingReturn.tsx
authConfirm.tsx
legacy.tsx
playQuiz.tsx
TanStack Router — Стартовый каркас для Поток
Установка
Bash

npm install @tanstack/react-router
npm install -D @tanstack/router-devtools
src/router/routes/root.tsx
React

import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuthStore } from "../../store/useAuthStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useAutosaveStore } from "../../store/useAutosaveStore";

// ─── Router Context ───────────────────────────────────────────────────────────
// Передаётся в RouterProvider и доступен в beforeLoad/loader каждого маршрута.

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
    userId: string | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

// ─── Root Layout ──────────────────────────────────────────────────────────────

function RootLayout() {
  const { setSession, setAuthInitialized, authInitialized } = useAuthStore();

  // Supabase Auth listener — один раз на всё приложение
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthInitialized(true);

      if (data.session?.user?.id) {
        useEntitlementStore.getState().refresh(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthInitialized(true);

      if (event === "SIGNED_IN" && session?.user?.id) {
        useEntitlementStore.getState().refresh(session.user.id);
      }

      if (event === "SIGNED_OUT") {
        useEntitlementStore.getState().reset();
      }
    });

    // Проверяем автосохранение при монтировании
    useAutosaveStore.getState().checkForAutosave();

    return () => subscription.unsubscribe();
  }, [setSession, setAuthInitialized]);

  if (!authInitialized) {
    return <RootLoadingScreen />;
  }

  return (
    <>
      <ScrollRestoration />
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}

function RootLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #4f46e5",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "#6b7280", fontSize: 14 }}>Загрузка Поток...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
src/router/routes/landing.tsx
React

import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { useAuthStore } from "../../store/useAuthStore";
import { LandingPage } from "../../components/LandingPage";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // Если залогинен — сразу на dashboard
  beforeLoad: () => {
    const session = useAuthStore.getState().session;
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LandingPage,
});
src/router/routes/legacy.tsx
React

/**
 * Ловит старые URL-форматы и редиректит на новые.
 *
 * Поддерживает:
 * - /?play=<uuid>          → /play/<uuid>
 * - /?status=<string>      → /billing/return?status=<string>
 * - /#access_token=...     → /auth/confirm (handled at root)
 *
 * Порядок важен: этот маршрут должен проверяться на /
 * через beforeLoad до рендера LandingPage.
 */

import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { z } from "zod";

// ─── Search params schema ────────────────────────────────────────────────────

const legacySearchSchema = z.object({
  play: z.string().optional(),
  status: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  access_token: z.string().optional(),
});

export type LegacySearch = z.infer<typeof legacySearchSchema>;

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: legacySearchSchema,

  beforeLoad: ({ search }) => {
    // /?play=<uuid> → /play/<uuid>
    if (search.play && isValidUUID(search.play)) {
      throw redirect({
        to: "/play/$quizId",
        params: { quizId: search.play },
        replace: true,
      });
    }

    // /?status=<string> → /billing/return?status=<string>
    if (search.status) {
      throw redirect({
        to: "/billing/return",
        search: { status: search.status },
        replace: true,
      });
    }

    // /?token_hash=... (email confirm via query)
    if (search.token_hash) {
      throw redirect({
        to: "/auth/confirm",
        search: {
          token_hash: search.token_hash,
          type: search.type,
        },
        replace: true,
      });
    }
  },

  // Компонент не нужен — beforeLoad всегда редиректит
  // Если ни один legacy param не найден — рендерим landing
  component: () => null,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}
src/router/routes/authConfirm.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { z } from "zod";
import { EmailConfirmPage } from "../../components/auth/EmailConfirmPage";

// ─── Search params ────────────────────────────────────────────────────────────

const authConfirmSearchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
  // Supabase implicit flow (legacy)
  access_token: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/confirm",
  validateSearch: authConfirmSearchSchema,
  component: EmailConfirmPage,
});
src/router/routes/billing.tsx
React

import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { useAuthStore } from "../../store/useAuthStore";
import { BillingPage } from "../../components/BillingPage";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  beforeLoad: () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      throw redirect({ to: "/", search: { authModal: "open" } });
    }
  },
  component: BillingPage,
});
src/router/routes/billingReturn.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { z } from "zod";
import { BillingReturnPage } from "../../components/BillingReturnPage";

// ─── Search params ────────────────────────────────────────────────────────────

const billingReturnSearchSchema = z.object({
  status: z.enum(["success", "cancel", "pending"]).optional(),
  orderId: z.string().optional(),
  planId: z.string().optional(),
});

export type BillingReturnSearch = z.infer<typeof billingReturnSearchSchema>;

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing/return",
  validateSearch: billingReturnSearchSchema,
  component: BillingReturnPage,
});
src/router/routes/templates.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { TemplatesPage } from "../../components/TemplatesPage";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesPage,
});
src/router/routes/publicQuizzes.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { PublicQuizzesPage } from "../../components/public/PublicQuizzesPage";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/public",
  component: PublicQuizzesPage,
});
src/router/routes/playQuiz.tsx
React

import {
  createRoute,
  notFound,
  ErrorComponent,
} from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { z } from "zod";
import { QuizPlayer } from "../../components/QuizPlayer";
import { supabase } from "../../services/supabaseClient";

// ─── Search params ────────────────────────────────────────────────────────────

const playSearchSchema = z.object({
  preview: z.boolean().optional(),
  startNodeId: z.string().optional(),
});

// ─── Loader ───────────────────────────────────────────────────────────────────

async function loadQuiz(quizId: string) {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!UUID_RE.test(quizId)) {
    throw notFound();
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("id, name, quiz_data, is_published")
    .eq("id", quizId)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    throw notFound();
  }

  return data;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play/$quizId",
  validateSearch: playSearchSchema,

  loader: ({ params }) => loadQuiz(params.quizId),

  component: PlayQuizPage,
  errorComponent: PlayQuizError,
  notFoundComponent: PlayQuizNotFound,

  // Загружаем данные сразу при hover на Link
  preload: "intent",
});

// ─── Components ──────────────────────────────────────────────────────────────

function PlayQuizPage() {
  const quiz = Route.useLoaderData();
  const { startNodeId } = Route.useSearch();

  return (
    <QuizPlayer
      quiz={quiz}
      startNodeId={startNodeId}
    />
  );
}

function PlayQuizError({ error }: { error: unknown }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ color: "#dc2626", marginBottom: 12 }}>
          ⚠️ Ошибка загрузки квиза
        </h1>
        <p style={{ color: "#6b7280" }}>
          {error instanceof Error ? error.message : "Произошла ошибка."}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16,
            padding: "8px 20px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Перезагрузить
        </button>
      </div>
    </div>
  );
}

function PlayQuizNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "#374151" }}>Квиз не найден</h1>
        <p style={{ color: "#6b7280" }}>
          Возможно, он был удалён или ещё не опубликован.
        </p>
        <a
          href="/"
          style={{ color: "#4f46e5", textDecoration: "underline" }}
        >
          На главную
        </a>
      </div>
    </div>
  );
}
src/router/routes/dashboard.tsx
React

import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { useAuthStore } from "../../store/useAuthStore";
import { Dashboard } from "../../components/Dashboard";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: Dashboard,
});
src/router/routes/editorNew.tsx
React

import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuizDataStore } from "../../store/useQuizDataStore";
import { QuizEditor } from "../../components/QuizEditor";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor",
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  loader: () => {
    useQuizDataStore.getState().createNewQuiz();
  },
  component: QuizEditor,
});
src/router/routes/editorQuiz.tsx
React

import {
  createRoute,
  redirect,
  notFound,
} from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { useAuthStore } from "../../store/useAuthStore";
import { useQuizDataStore } from "../../store/useQuizDataStore";
import { supabase } from "../../services/supabaseClient";
import { QuizEditor } from "../../components/QuizEditor";

// ─── Loader ───────────────────────────────────────────────────────────────────

async function loadQuizForEditor(quizId: string, userId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", userId) // RLS defence
    .single();

  if (error || !data) {
    throw notFound();
  }

  return data;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$quizId",

  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },

  loader: async ({ params, context }) => {
    const quiz = await loadQuizForEditor(
      params.quizId,
      context.auth.userId!,
    );

    // Загружаем в стор перед рендером компонента
    useQuizDataStore.getState().loadQuiz(quiz as any);

    return { quizId: params.quizId };
  },

  component: EditorQuizPage,
  notFoundComponent: EditorNotFound,
});

// ─── Components ──────────────────────────────────────────────────────────────

function EditorQuizPage() {
  return <QuizEditor />;
}

function EditorNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "#374151" }}>Квиз не найден</h1>
        <p style={{ color: "#6b7280" }}>
          Возможно, вы не являетесь его автором.
        </p>
        <a
          href="/dashboard"
          style={{ color: "#4f46e5", textDecoration: "underline" }}
        >
          В мои квизы
        </a>
      </div>
    </div>
  );
}
src/router/routes/contest.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { ContestDashboard } from "../../components/contest/ContestDashboard";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contest",
  component: ContestDashboard,
});
src/router/routes/notFound.tsx
React

import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#f9fafb",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#e5e7eb",
            margin: "0 0 8px",
          }}
        >
          404
        </h1>
        <h2 style={{ color: "#374151", marginBottom: 8 }}>
          Страница не найдена
        </h2>
        <p style={{ color: "#6b7280", marginBottom: 24 }}>
          Возможно, ссылка устарела или страница была перемещена.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#4f46e5",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          На главную
        </a>
      </div>
    </div>
  );
}
src/router/routeTree.tsx
React

import { Route as rootRoute } from "./routes/root";
import { Route as landingRoute } from "./routes/landing";
import { Route as legacyRoute } from "./routes/legacy";
import { Route as authConfirmRoute } from "./routes/authConfirm";
import { Route as billingRoute } from "./routes/billing";
import { Route as billingReturnRoute } from "./routes/billingReturn";
import { Route as templatesRoute } from "./routes/templates";
import { Route as publicQuizzesRoute } from "./routes/publicQuizzes";
import { Route as playQuizRoute } from "./routes/playQuiz";
import { Route as dashboardRoute } from "./routes/dashboard";
import { Route as editorNewRoute } from "./routes/editorNew";
import { Route as editorQuizRoute } from "./routes/editorQuiz";
import { Route as contestRoute } from "./routes/contest";
import { Route as notFoundRoute } from "./routes/notFound";

// ─── Route tree ───────────────────────────────────────────────────────────────
// Порядок важен:
// - legacyRoute должен быть ПЕРЕД landingRoute на пути "/"
// - notFoundRoute всегда последний

export const routeTree = rootRoute.addChildren([
  legacyRoute,
  landingRoute,
  authConfirmRoute,
  billingRoute,
  billingReturnRoute,
  templatesRoute,
  publicQuizzesRoute,
  playQuizRoute,
  dashboardRoute,
  editorNewRoute,
  editorQuizRoute,
  contestRoute,
  notFoundRoute,
]);
src/router/index.tsx
React

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree";
import { useAuthStore } from "../store/useAuthStore";
import type { RouterContext } from "./routes/root";

// ─── Router instance ─────────────────────────────────────────────────────────

export const router = createRouter({
  routeTree,

  // Контекст с auth доступен в beforeLoad всех маршрутов
  context: {
    auth: {
      isAuthenticated: false,
      userId: null,
    },
  } satisfies RouterContext,

  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

// ─── TypeScript module augmentation ──────────────────────────────────────────

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppRouter() {
  const session = useAuthStore((s) => s.session);

  const context: RouterContext = {
    auth: {
      isAuthenticated: Boolean(session),
      userId: session?.user?.id ?? null,
    },
  };

  return <RouterProvider router={router} context={context} />;
}
src/main.tsx — обновлённый entry point
React

import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouter } from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
Навигация из компонентов
<Link />
React

import { Link } from "@tanstack/react-router";

// Перейти на редактор конкретного квиза
<Link to="/editor/$quizId" params={{ quizId: "abc-123" }}>
  Открыть редактор
</Link>

// Перейти на play
<Link to="/play/$quizId" params={{ quizId: quiz.id }}>
  Играть
</Link>

// На billing
<Link to="/billing">Тарифы</Link>
useNavigate()
React

import { useNavigate } from "@tanstack/react-router";

function MyComponent() {
  const navigate = useNavigate();

  const handleOpenEditor = (quizId: string) => {
    navigate({
      to: "/editor/$quizId",
      params: { quizId },
    });
  };

  const handlePlayQuiz = (quizId: string) => {
    navigate({
      to: "/play/$quizId",
      params: { quizId },
    });
  };

  const handleNewQuiz = () => {
    navigate({ to: "/editor" });
  };
}
router.navigate() — вне компонентов (из сторов)
React

import { router } from "../router";

// Из Zustand стора или сервиса
async function afterSuccessfulLogin() {
  await router.navigate({ to: "/dashboard" });
}

async function afterCreateQuiz(quizId: string) {
  await router.navigate({
    to: "/editor/$quizId",
    params: { quizId },
  });
}
Чтение search params из компонентов
React

import { Route } from "../router/routes/playQuiz";

function PlayQuizPage() {
  const { startNodeId, preview } = Route.useSearch();
  const { quizId } = Route.useParams();
  const quiz = Route.useLoaderData();

  return <QuizPlayer quiz={quiz} startNodeId={startNodeId} />;
}
Замены для старого window.location кода
React

// Было:
window.location.href = "/?play=" + quizId;

// Стало:
navigate({ to: "/play/$quizId", params: { quizId } });

// Было:
window.location.href = "/billing";

// Стало:
navigate({ to: "/billing" });

// Было:
window.location.reload();

// Оставить — для auth/billing return flows это нормально

// Было:
const isConfirmPage = window.location.pathname === "/auth/confirm";

// Стало: не нужно — роут сам обрабатывает
Тесты — стартовый набор
src/router/__tests__/legacy-redirect.test.tsx
React

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    redirect: (opts: unknown) => {
      mockNavigate(opts);
      throw new Error("redirect");
    },
  };
});

// Заглушки сторов
vi.mock("../../store/useAuthStore", () => ({
  useAuthStore: { getState: () => ({ session: null }) },
}));

describe("legacy route beforeLoad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /?play=<uuid> to /play/<uuid>", async () => {
    const { Route } = await import("../routes/legacy");

    const UUID = "550e8400-e29b-41d4-a716-446655440000";

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { play: UUID },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/play/$quizId",
        params: { quizId: UUID },
        replace: true,
      }),
    );
  });

  it("redirects /?status=success to /billing/return", async () => {
    const { Route } = await import("../routes/legacy");

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { status: "success" },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect throws
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/billing/return",
        search: { status: "success" },
      }),
    );
  });

  it("does not redirect when no legacy params present", async () => {
    const { Route } = await import("../routes/legacy");

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: {},
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // may or may not throw
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("ignores invalid UUID in ?play param", async () => {
    const { Route } = await import("../routes/legacy");

    try {
      await (Route.options.beforeLoad as Function)?.({
        search: { play: "not-a-uuid" },
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // may or may not throw
    }

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
src/router/__tests__/auth-guard.test.ts
React

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    redirect: (opts: unknown) => {
      mockRedirect(opts);
      throw new Error("redirect");
    },
  };
});

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("dashboard redirects unauthenticated user to /", async () => {
    vi.mock("../../store/useAuthStore", () => ({
      useAuthStore: { getState: () => ({ session: null }) },
    }));

    const { Route } = await import("../routes/dashboard");

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/" }),
    );
  });

  it("dashboard allows authenticated user", async () => {
    vi.mock("../../store/useAuthStore", () => ({
      useAuthStore: {
        getState: () => ({
          session: { user: { id: "user-1" } },
        }),
      },
    }));

    const { Route } = await import("../routes/dashboard");

    let didThrow = false;
    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: true, userId: "user-1" } },
      });
    } catch {
      didThrow = true;
    }

    expect(didThrow).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("editorQuiz redirects unauthenticated user", async () => {
    vi.mock("../../store/useAuthStore", () => ({
      useAuthStore: { getState: () => ({ session: null }) },
    }));

    const { Route } = await import("../routes/editorQuiz");

    try {
      await (Route.options.beforeLoad as Function)?.({
        context: { auth: { isAuthenticated: false, userId: null } },
      });
    } catch {
      // redirect
    }

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/" }),
    );
  });
});
Итоговая структура файлов
txt

src/
├── main.tsx                              ← обновлён
│
└── router/
    ├── index.tsx                         ← router instance + AppRouter
    ├── routeTree.tsx                     ← сборка дерева маршрутов
    │
    ├── routes/
    │   ├── root.tsx                      ← RootLayout + RouterContext
    │   ├── landing.tsx
    │   ├── legacy.tsx                    ← compat redirects
    │   ├── authConfirm.tsx
    │   ├── billing.tsx
    │   ├── billingReturn.tsx
    │   ├── templates.tsx
    │   ├── publicQuizzes.tsx
    │   ├── playQuiz.tsx
    │   ├── dashboard.tsx
    │   ├── editorNew.tsx
    │   ├── editorQuiz.tsx
    │   ├── contest.tsx
    │   └── notFound.tsx
    │
    └── __tests__/
        ├── legacy-redirect.test.tsx
        └── auth-guard.test.ts
Следующие шаги
text

Sprint 1 — ВЫПОЛНЕН (этот каркас):
  ✅ Установка TanStack Router
  ✅ root route + auth listener
  ✅ legacy compat redirects
  ✅ простые страницы: billing, templates, public, auth/confirm
  ✅ play/$quizId с loader + error/notFound handling
  ✅ dashboard + editor guards
  ✅ базовые тесты

Sprint 2 — Следующий:
  ⬜ Заменить useUIStore.setDashboardVisible на navigate()
  ⬜ Вынести auth modal state в search params (?auth=open)
  ⬜ Перевести QuizCard/Dashboard кнопки на <Link>
  ⬜ Убрать window.location.href где это навигация
  ⬜ Добавить тесты на playQuiz loader

Sprint 3 — Cleanup:
  ⬜ Удалить ручной routing из App.tsx
  ⬜ Перевести модалки на search params по желанию
  ⬜ Обновить RULES.md
  ⬜ Обновить документацию
  Патчи для Sprint 2 — реальная навигация
store/useQuizDataStore.ts — убираем навигационную ответственность
Изменения только в loadQuiz, createNewQuiz, cloneAndEditPublicQuiz. Остальной код не трогаем.

TypeScript

import { create } from 'zustand';
import {
  GlobalTimer,
  DesignSettings,
  Quiz,
  QuizTemplateId,
  PublicQuiz,
  QuizPassport,
  QuizTemplate,
  AutosavePayload,
} from '../types';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { useCanvasStore } from './useCanvasStore';
import { useAuthStore } from './useAuthStore';
import { storeEvents } from './storeEvents';
import { router } from '../router';

// ─── deepMerge ────────────────────────────────────────────────────────────────

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (
      val !== null &&
      val !== undefined &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key] as object, val as object) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizDataStoreState {
  currentQuizId: string | null;
  setCurrentQuizId: (id: string | null) => void;
  currentQuizName: string;
  setCurrentQuizName: (name: string) => void;
  templateId: QuizTemplateId;
  setTemplateId: (id: QuizTemplateId) => void;

  globalTimer: GlobalTimer;
  setGlobalTimer: (timer: Partial<GlobalTimer>) => void;
  designSettings: DesignSettings;
  updateDesignSettings: (settings: Partial<DesignSettings>) => void;

  userQuizzes: Quiz[];
  setUserQuizzes: (quizzes: Quiz[]) => void;
  fetchUserQuizzes: (forceRefresh?: boolean) => Promise<void>;
  isQuizzesLoading: boolean;
  analyticsQuizId: string | null;
  setAnalyticsQuizId: (id: string | null) => void;

  saveQuiz: () => Promise<void>;

  /**
   * Загружает данные квиза в store.
   * НЕ выполняет навигацию — вызывающий код отвечает за navigate().
   *
   * @example
   * loadQuiz(quiz);
   * navigate({ to: '/editor/$quizId', params: { quizId: quiz.id } });
   */
  loadQuiz: (quiz: Quiz) => void;

  deleteQuiz: (id: string) => Promise<void>;
  duplicateQuiz: (id: string) => Promise<string | null>;

  /**
   * Создаёт новый пустой квиз в store.
   * НЕ выполняет навигацию.
   *
   * @example
   * createNewQuiz();
   * navigate({ to: '/editor' });
   */
  createNewQuiz: () => void;

  toggleQuizFavorite: (id: string) => Promise<void>;
  updateQuizPublication: (
    id: string,
    data: { is_published: boolean; description?: string; cover_image_url?: string }
  ) => Promise<void>;
  updateQuizPassport: (id: string, passport: QuizPassport) => Promise<void>;

  /**
   * Клонирует публичный квиз в коллекцию пользователя.
   * НЕ выполняет навигацию.
   * Возвращает ID нового квиза или null при ошибке.
   *
   * @example
   * const newId = await cloneAndEditPublicQuiz(publicQuiz);
   * if (newId) navigate({ to: '/editor/$quizId', params: { quizId: newId } });
   */
  cloneAndEditPublicQuiz: (publicQuiz: PublicQuiz) => Promise<string | null>;

  pendingTemplate: QuizTemplate | null;
  setPendingTemplate: (data: QuizTemplate | null) => void;

  restoreFromAutosave: (data: AutosavePayload) => void;

  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const createInitialState = () => ({
  currentQuizId: null as string | null,
  currentQuizName: '',
  templateId: 'default' as QuizTemplateId,
  globalTimer: {
    enabled: false,
    duration: 0,
    onTimeoutNodeId: null,
  } as GlobalTimer,
  designSettings: {
    background: {
      color: '#ffffff',
      imageUrl: '',
      overlayColor: '',
      overlayOpacity: 0,
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      headingColor: '#111827',
      bodyTextColor: '#374151',
    },
    buttons: {
      backgroundColor: '#4f46e5',
      textColor: '#ffffff',
      hoverBackgroundColor: '#4338ca',
      hoverTextColor: '#ffffff',
      borderRadius: 8,
    },
    answerCards: {
      backgroundColor: '#ffffff',
      textColor: '#111827',
      hoverBackgroundColor: '#f3f4f6',
      hoverTextColor: '#111827',
      selectedBackgroundColor: '#e0e7ff',
      selectedTextColor: '#3730a3',
      borderRadius: 12,
    },
    sound: { volume: 0.5 },
  } as DesignSettings,
  userQuizzes: [] as Quiz[],
  isQuizzesLoading: false,
  analyticsQuizId: null as string | null,
  pendingTemplate: null as QuizTemplate | null,
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const useQuizDataStore = create<QuizDataStoreState>((set, get) => ({
  ...createInitialState(),

  setCurrentQuizId: (id) => set({ currentQuizId: id }),
  setCurrentQuizName: (name) => set({ currentQuizName: name }),
  setTemplateId: (id) => set({ templateId: id }),
  setGlobalTimer: (timer) =>
    set((state) => ({ globalTimer: { ...state.globalTimer, ...timer } })),

  updateDesignSettings: (settings) =>
    set((state) => ({
      designSettings: deepMerge(state.designSettings, settings),
    })),

  setUserQuizzes: (quizzes) => set({ userQuizzes: quizzes }),
  setAnalyticsQuizId: (id) => set({ analyticsQuizId: id }),
  setPendingTemplate: (data) => set({ pendingTemplate: data }),

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  fetchUserQuizzes: async (forceRefresh = false) => {
    const session = useAuthStore.getState().session;
    const { userQuizzes } = get();
    if (!session) return;
    if (!forceRefresh && userQuizzes.length > 0) return;

    set({ isQuizzesLoading: true });
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ userQuizzes: (data ?? []) as Quiz[] });
    } catch (e: any) {
      toast.error('Ошибка загрузки квизов: ' + e.message);
    } finally {
      set({ isQuizzesLoading: false });
    }
  },

  // ─── Save ──────────────────────────────────────────────────────────────────

  saveQuiz: async () => {
    const state = get();
    const session = useAuthStore.getState().session;
    if (!session) {
      toast.error('Войдите, чтобы сохранить квиз');
      return;
    }

    const { nodes, edges, isCanvasLoading, setCanvasLoading } =
      useCanvasStore.getState();
    if (isCanvasLoading) return;

    setCanvasLoading(true);
    const toastId = toast.loading('Сохранение...');

    const quizData = {
      nodes,
      edges,
      globalTimer: state.globalTimer,
      designSettings: state.designSettings,
      templateId: state.templateId,
      currentQuizName: state.currentQuizName,
    };

    const payload = {
      user_id: session.user.id,
      name: state.currentQuizName.trim() || 'Без названия',
      quiz_data: quizData,
    };

    try {
      if (state.currentQuizId) {
        const { error } = await supabase
          .from('quizzes')
          .update(payload)
          .eq('id', state.currentQuizId)
          .eq('user_id', session.user.id);

        if (error) throw error;

        set((s) => ({
          userQuizzes: s.userQuizzes.map((q) =>
            q.id === s.currentQuizId ? { ...q, ...payload } : q,
          ),
        }));

        toast.success('Квиз сохранён', { id: toastId });
      } else {
        const { data, error } = await supabase
          .from('quizzes')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('Quiz created but server returned empty response');

        set((s) => ({
          currentQuizId: data.id,
          userQuizzes: [data as Quiz, ...s.userQuizzes],
        }));

        // Обновляем URL без перезагрузки страницы
        router.navigate({
          to: '/editor/$quizId',
          params: { quizId: data.id },
          replace: true,
        });

        toast.success('Квиз создан', { id: toastId });
      }
    } catch (e: any) {
      toast.error('Ошибка сохранения: ' + e.message, { id: toastId });
    } finally {
      setCanvasLoading(false);
    }
  },

  // ─── Load ──────────────────────────────────────────────────────────────────
  // ВАЖНО: loadQuiz НЕ навигирует. Вызывающий код делает navigate() сам.

  loadQuiz: (quiz) => {
    storeEvents.emit('QUIZ_LOADED', {
      nodes: quiz.quiz_data?.nodes || [],
      edges: quiz.quiz_data?.edges || [],
    });

    set({
      currentQuizId: quiz.id,
      currentQuizName: quiz.name,
      globalTimer: quiz.quiz_data?.globalTimer || {
        enabled: false,
        duration: 0,
        onTimeoutNodeId: null,
      },
      designSettings:
        quiz.quiz_data?.designSettings || createInitialState().designSettings,
      templateId: quiz.quiz_data?.templateId || 'default',
    });

    // Намеренно НЕ делаем:
    // useUIStore.getState().setDashboardVisible(false);
    // Навигация — ответственность вызывающего кода.
  },

  // ─── Delete ────────────────────────────────────────────────────────────────

  deleteQuiz: async (id) => {
    const session = useAuthStore.getState().session;
    const { currentQuizId } = get();
    if (!session) return;

    // Snapshot ДО мутации
    const prevQuizzes = get().userQuizzes;

    // Optimistic update
    set((s) => ({
      userQuizzes: s.userQuizzes.filter((q) => q.id !== id),
    }));

    try {
      // Удаление результатов best-effort (может не сработать если CASCADE настроен)
      const { error: resultsError } = await supabase
        .from('quiz_results')
        .delete()
        .eq('quiz_id', id);

      if (resultsError) {
        console.warn('Failed to delete quiz results:', resultsError.message);
      }

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast.success('Квиз удалён');

      // Если удалили текущий квиз — навигируем на dashboard
      if (currentQuizId === id) {
        set({ currentQuizId: null });
        router.navigate({ to: '/dashboard' });
      }
    } catch (e: any) {
      // Rollback к snapshot
      set({ userQuizzes: prevQuizzes });
      toast.error('Ошибка удаления: ' + e.message);
    }
  },

  // ─── Duplicate ─────────────────────────────────────────────────────────────

  duplicateQuiz: async (id) => {
    const { userQuizzes } = get();
    const session = useAuthStore.getState().session;
    const quiz = userQuizzes.find((q) => q.id === id);
    if (!quiz || !session) return null;

    const newName = `${quiz.name} (Копия)`;
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        user_id: session.user.id,
        name: newName,
        quiz_data: quiz.quiz_data,
      }])
      .select()
      .single();

    if (error || !data) {
      toast.error('Ошибка дублирования');
      return null;
    }

    set((s) => ({
      userQuizzes: [data as Quiz, ...s.userQuizzes],
    }));

    toast.success('Квиз дублирован');
    return data.id;
  },

  // ─── Create New ────────────────────────────────────────────────────────────
  // ВАЖНО: createNewQuiz НЕ навигирует. Вызывающий код делает navigate() сам.

  createNewQuiz: () => {
    const { userQuizzes } = get();

    storeEvents.emit('CANVAS_CLEAR');

    set({
      ...createInitialState(),
      userQuizzes,
    });

    // Намеренно НЕ делаем:
    // useUIStore.getState().setDashboardVisible(false);
  },

  // ─── Favorite ──────────────────────────────────────────────────────────────

  toggleQuizFavorite: async (id) => {
    const quiz = get().userQuizzes.find((q) => q.id === id);
    if (!quiz) return;
    const session = useAuthStore.getState().session;
    if (!session) return;

    const newVal = !quiz.is_favorite;

    // Snapshot ДО мутации
    const prevQuizzes = get().userQuizzes;

    // Optimistic update
    set({
      userQuizzes: get().userQuizzes.map((q) =>
        q.id === id ? { ...q, is_favorite: newVal } : q,
      ),
    });

    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_favorite: newVal })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch {
      // Rollback к snapshot
      set({ userQuizzes: prevQuizzes });
      console.warn('Favorite sync error');
    }
  },

  // ─── Publication ───────────────────────────────────────────────────────────

  updateQuizPublication: async (id, data) => {
    const session = useAuthStore.getState().session;
    if (!session) return;

    const quiz = get().userQuizzes.find((q) => q.id === id);
    if (!quiz) return;

    const updatedQuizData = {
      ...quiz.quiz_data,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.cover_image_url !== undefined && {
        cover_image_url: data.cover_image_url,
      }),
    };

    const { error } = await supabase
      .from('quizzes')
      .update({
        is_published: data.is_published,
        published_at: data.is_published ? new Date().toISOString() : null,
        quiz_data: updatedQuizData,
      })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      toast.error('Ошибка обновления публикации');
      return;
    }

    set((s) => ({
      userQuizzes: s.userQuizzes.map((q) =>
        q.id === id
          ? { ...q, is_published: data.is_published, quiz_data: updatedQuizData }
          : q,
      ),
    }));

    toast.success('Настройки публикации обновлены');
  },

  // ─── Passport ──────────────────────────────────────────────────────────────

  updateQuizPassport: async (id, passportData) => {
    const quiz = get().userQuizzes.find((q) => q.id === id);
    if (!quiz) return;

    const updatedQuizData = {
      ...quiz.quiz_data,
      passport: passportData,
    };

    const { error } = await supabase
      .from('quizzes')
      .update({ quiz_data: updatedQuizData })
      .eq('id', id);

    if (error) {
      toast.error('Ошибка сохранения паспорта');
      return;
    }

    // Optimistic update без рефетча
    set((s) => ({
      userQuizzes: s.userQuizzes.map((q) =>
        q.id === id ? { ...q, quiz_data: updatedQuizData } : q,
      ),
    }));

    toast.success('Паспорт квиза сохранён');
  },

  // ─── Clone Public ──────────────────────────────────────────────────────────
  // ВАЖНО: возвращает ID нового квиза. Навигация — ответственность вызывающего.

  cloneAndEditPublicQuiz: async (publicQuiz) => {
    const session = useAuthStore.getState().session;
    if (!session) return null;

    const newName = `${publicQuiz.name} (Копия)`;

    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        user_id: session.user.id,
        name: newName,
        quiz_data: publicQuiz.quiz_data,
      }])
      .select()
      .single();

    if (error || !data) {
      toast.error('Ошибка копирования квиза');
      return null;
    }

    toast.success('Квиз скопирован в вашу коллекцию');

    set((s) => ({
      userQuizzes: [data as Quiz, ...s.userQuizzes],
    }));

    // Грузим данные нового квиза в стор
    get().loadQuiz(data as Quiz);

    return data.id;

    // Намеренно НЕ делаем:
    // navigate(...) — вызывающий код делает сам
  },

  // ─── Autosave restore ──────────────────────────────────────────────────────

  restoreFromAutosave: (data) => {
    storeEvents.emit('AUTOSAVE_RESTORE', data);
    set({
      currentQuizId: data.currentQuizId ?? null,
      globalTimer: data.globalTimer,
      designSettings: data.designSettings,
      templateId: data.templateId,
      currentQuizName: data.currentQuizName,
    });
  },

  // ─── Reset ─────────────────────────────────────────────────────────────────

  reset: () => set(createInitialState()),
}));
src/router/useAppNavigation.ts
TypeScript

/**
 * Единый хук для навигации приложения.
 * Использовать везде вместо прямых вызовов useNavigate.
 *
 * Преимущества:
 * - одно место для всей навигационной логики,
 * - типобезопасность,
 * - легко мокается в тестах.
 */

import { useNavigate } from '@tanstack/react-router';
import { useQuizDataStore } from '../store/useQuizDataStore';
import type { Quiz, PublicQuiz } from '../types';

export function useAppNavigation() {
  const navigate = useNavigate();

  return {
    // ─── Public ──────────────────────────────────────────────────────────────

    goToLanding: () =>
      navigate({ to: '/' }),

    goToTemplates: () =>
      navigate({ to: '/templates' }),

    goToPublicGallery: () =>
      navigate({ to: '/public' }),

    goToContest: () =>
      navigate({ to: '/contest' }),

    // ─── Auth ─────────────────────────────────────────────────────────────────

    goToDashboard: () =>
      navigate({ to: '/dashboard' }),

    goToBilling: () =>
      navigate({ to: '/billing' }),

    // ─── Play ─────────────────────────────────────────────────────────────────

    goToPlay: (quizId: string) =>
      navigate({
        to: '/play/$quizId',
        params: { quizId },
      }),

    // ─── Editor ───────────────────────────────────────────────────────────────

    goToNewEditor: () =>
      navigate({ to: '/editor' }),

    goToEditor: (quizId: string) =>
      navigate({
        to: '/editor/$quizId',
        params: { quizId },
      }),

    // ─── Combined: load + navigate ────────────────────────────────────────────

    openQuizInEditor: async (quiz: Quiz) => {
      useQuizDataStore.getState().loadQuiz(quiz);
      await navigate({
        to: '/editor/$quizId',
        params: { quizId: quiz.id },
      });
    },

    createAndOpenEditor: async () => {
      useQuizDataStore.getState().createNewQuiz();
      await navigate({ to: '/editor' });
    },

    clonePublicQuizAndEdit: async (publicQuiz: PublicQuiz) => {
      const newId = await useQuizDataStore
        .getState()
        .cloneAndEditPublicQuiz(publicQuiz);

      if (newId) {
        await navigate({
          to: '/editor/$quizId',
          params: { quizId: newId },
        });
      }
    },

    duplicateAndOpen: async (quizId: string) => {
      const newId = await useQuizDataStore.getState().duplicateQuiz(quizId);
      if (newId) {
        await navigate({
          to: '/editor/$quizId',
          params: { quizId: newId },
        });
      }
    },
  };
}
components/Header.tsx
React

import React, { useCallback } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useAppNavigation } from '../router/useAppNavigation';
import { PlanBadge } from './PlanBadge';

export const Header: React.FC = React.memo(function Header() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const isCanvasLoading = useCanvasStore((s) => s.isCanvasLoading);
  const currentQuizName = useQuizDataStore((s) => s.currentQuizName);
  const isPro = useEntitlementStore((s) => s.isPro());

  const { setAuthModalOpen } = useUIStore();
  const nav = useAppNavigation();

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isInEditor =
    currentPath.startsWith('/editor');

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    useQuizDataStore.getState().saveQuiz();
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    nav.goToLanding();
  }, [signOut, nav]);

  const handleLogoClick = useCallback(() => {
    if (session) {
      nav.goToDashboard();
    } else {
      nav.goToLanding();
    }
  }, [session, nav]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <header className="glass sticky top-0 z-40 flex items-center justify-between px-4 py-2">
      {/* Logo */}
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-2 font-bold text-lg text-indigo-600 hover:opacity-80 transition"
      >
        ✨ Поток
      </button>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-4">
        <Link
          to="/templates"
          className="text-sm text-gray-600 hover:text-gray-900 transition"
          activeProps={{ className: 'text-indigo-600 font-medium' }}
        >
          Шаблоны
        </Link>

        <Link
          to="/public"
          className="text-sm text-gray-600 hover:text-gray-900 transition"
          activeProps={{ className: 'text-indigo-600 font-medium' }}
        >
          Галерея
        </Link>

        {session && (
          <Link
            to="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
            activeProps={{ className: 'text-indigo-600 font-medium' }}
          >
            Мои квизы
          </Link>
        )}
      </nav>

      {/* Editor center: quiz name */}
      {isInEditor && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 max-w-[240px] truncate">
            {currentQuizName || 'Новый квиз'}
          </span>
          {isCanvasLoading && (
            <span className="text-xs text-gray-400">Сохранение...</span>
          )}
        </div>
      )}

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Save button — only in editor */}
        {isInEditor && session && (
          <button
            onClick={handleSave}
            disabled={isCanvasLoading}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCanvasLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        )}

        {session ? (
          <>
            <PlanBadge plan={isPro ? 'pro' : 'free'} />

            <Link
              to="/billing"
              className="text-sm text-gray-600 hover:text-gray-900 transition px-2 py-1 rounded-lg
                         hover:bg-gray-100"
            >
              {isPro ? '⭐ PRO' : 'Тарифы'}
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition px-2 py-1 rounded-lg
                         hover:bg-gray-100"
            >
              Выйти
            </button>
          </>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 transition"
          >
            Войти
          </button>
        )}
      </div>
    </header>
  );
});
components/QuizCard.tsx
React

import React, { useCallback, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Play, Copy, Trash2, Heart, Share2, BarChart2 } from 'lucide-react';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useUIStore } from '../store/useUIStore';
import { useAppNavigation } from '../router/useAppNavigation';
import type { Quiz } from '../types';

interface QuizCardProps {
  quiz: Quiz;
  onDelete?: (id: string) => void;
}

export const QuizCard: React.FC<QuizCardProps> = React.memo(function QuizCard({
  quiz,
  onDelete,
}) {
  const nav = useAppNavigation();
  const toggleFavorite = useQuizDataStore((s) => s.toggleQuizFavorite);
  const setAnalyticsQuizId = useQuizDataStore((s) => s.setAnalyticsQuizId);
  const deleteQuiz = useQuizDataStore((s) => s.deleteQuiz);
  const { openAssetManager } = useUIStore();

  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleEdit = useCallback(async () => {
    await nav.openQuizInEditor(quiz);
  }, [nav, quiz]);

  const handleDuplicate = useCallback(async () => {
    await nav.duplicateAndOpen(quiz.id);
  }, [nav, quiz.id]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Удалить квиз "${quiz.name}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteQuiz(quiz.id);
      onDelete?.(quiz.id);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteQuiz, quiz.id, quiz.name, onDelete]);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(quiz.id);
  }, [toggleFavorite, quiz.id]);

  const handleOpenAnalytics = useCallback(() => {
    setAnalyticsQuizId(quiz.id);
  }, [setAnalyticsQuizId, quiz.id]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const coverUrl = quiz.quiz_data?.cover_image_url;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm
                    hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Cover */}
      <div className="h-32 bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={quiz.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">✨</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm
                     opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
          aria-label={quiz.is_favorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <Heart
            className={`w-4 h-4 ${quiz.is_favorite ? 'fill-red-500 stroke-red-500' : 'stroke-gray-400'}`}
          />
        </button>

        {/* Published badge */}
        {quiz.is_published && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium
                           bg-green-500 text-white rounded-full">
            Опубликован
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1">
          {quiz.name || 'Без названия'}
        </h3>

        <p className="text-xs text-gray-400 mb-4">
          {new Date(quiz.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Edit */}
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                       text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl
                       hover:bg-indigo-100 transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Редактировать
          </button>

          {/* Play */}
          <Link
            to="/play/$quizId"
            params={{ quizId: quiz.id }}
            className="flex items-center justify-center w-9 h-9 rounded-xl
                       text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition"
            aria-label="Играть"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Play className="w-4 h-4" />
          </Link>

          {/* Analytics */}
          <button
            onClick={handleOpenAnalytics}
            className="flex items-center justify-center w-9 h-9 rounded-xl
                       text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
            aria-label="Аналитика"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="flex items-center justify-center w-9 h-9 rounded-xl
                       text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            aria-label="Дублировать"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center w-9 h-9 rounded-xl
                       text-red-500 bg-red-50 hover:bg-red-100 transition
                       disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
components/MyQuizzes.tsx
React

import React, { useEffect, useCallback, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Search, Heart, LayoutGrid, List } from 'lucide-react';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAppNavigation } from '../router/useAppNavigation';
import { QuizCard } from './QuizCard';
import { useState } from 'react';

type SortMode = 'newest' | 'oldest' | 'name' | 'favorites';
type ViewMode = 'grid' | 'list';

export const MyQuizzes: React.FC = React.memo(function MyQuizzes() {
  const session = useAuthStore((s) => s.session);
  const quizzes = useQuizDataStore((s) => s.userQuizzes);
  const isLoading = useQuizDataStore((s) => s.isQuizzesLoading);
  const fetchUserQuizzes = useQuizDataStore((s) => s.fetchUserQuizzes);

  const nav = useAppNavigation();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [view, setView] = useState<ViewMode>('grid');
  const [showFavorites, setShowFavorites] = useState(false);

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (session) {
      fetchUserQuizzes();
    }
  }, [session, fetchUserQuizzes]);

  // ─── Filtered + sorted list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...quizzes];

    if (showFavorites) {
      result = result.filter((q) => q.is_favorite);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((quiz) =>
        quiz.name.toLowerCase().includes(q),
      );
    }

    switch (sort) {
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case 'oldest':
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        break;
      case 'favorites':
        result.sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
        break;
    }

    return result;
  }, [quizzes, search, sort, showFavorites]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateQuiz = useCallback(async () => {
    await nav.createAndOpenEditor();
  }, [nav]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Войдите, чтобы видеть свои квизы
        </h2>
        <p className="text-gray-500">
          После входа вы получите доступ ко всем своим квизам и шаблонам.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои квизы</h1>

        <button
          onClick={handleCreateQuiz}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                     rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Создать квиз
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Favorites filter */}
        <button
          onClick={() => setShowFavorites((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm
                      border transition ${
                        showFavorites
                          ? 'border-red-300 bg-red-50 text-red-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
        >
          <Heart className={`w-4 h-4 ${showFavorites ? 'fill-current' : ''}`} />
          Избранные
        </button>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="name">По названию</option>
          <option value="favorites">Избранные первыми</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`p-2 transition ${
              view === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'
            }`}
            aria-label="Сетка"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 transition ${
              view === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'
            }`}
            aria-label="Список"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600
                         rounded-full animate-spin"
            />
            <p className="text-sm text-gray-400">Загрузка квизов...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={Boolean(search)}
          onCreateQuiz={handleCreateQuiz}
        />
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'
          }
        >
          {filtered.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}

      {/* Footer stats */}
      {!isLoading && filtered.length > 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          {filtered.length} {pluralQuiz(filtered.length)} из {quizzes.length}
        </p>
      )}
    </div>
  );
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  onCreateQuiz,
}: {
  hasSearch: boolean;
  onCreateQuiz: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-400 mb-2">Квизы не найдены</p>
        <p className="text-sm text-gray-300">Попробуйте изменить поисковый запрос</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">✨</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Ещё нет квизов
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Создайте свой первый квиз или выберите один из готовых шаблонов
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreateQuiz}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                     rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Создать квиз
        </button>

        <Link
          to="/templates"
          className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-xl
                     text-sm font-medium hover:bg-indigo-50 transition"
        >
          Шаблоны
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pluralQuiz(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'квиз';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'квиза';
  return 'квизов';
}
components/BillingReturnPage.tsx
React

import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '../router/routes/billingReturn';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export const BillingReturnPage: React.FC = React.memo(function BillingReturnPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const refresh = useEntitlementStore((s) => s.refresh);

  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function handleReturn() {
      if (session?.user?.id) {
        try {
          // Обновляем entitlement после возврата с ЮKassa
          await refresh(session.user.id);
        } catch {
          // Silent — entitlement обновится при следующем заходе
        }
      }

      if (!cancelled) {
        setIsRefreshing(false);
      }
    }

    handleReturn();
    return () => { cancelled = true; };
  }, [session, refresh]);

  const handleGoToBilling = () => navigate({ to: '/billing' });
  const handleGoToDashboard = () => navigate({ to: '/dashboard' });

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Обновляем ваш тариф...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Оплата прошла успешно!
            </h1>
            <p className="text-gray-500 mb-6">
              Ваш PRO-тариф активирован. Теперь вам доступны все функции платформы.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium
                           hover:bg-indigo-700 transition"
              >
                Перейти в мои квизы
              </button>
              <button
                onClick={handleGoToBilling}
                className="w-full py-2.5 border border-gray-200 text-gray-600
                           rounded-xl text-sm hover:bg-gray-50 transition"
              >
                Управление подпиской
              </button>
            </div>
          </>
        )}

        {status === 'cancel' && (
          <>
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Оплата отменена
            </h1>
            <p className="text-gray-500 mb-6">
              Вы можете оформить подписку в любое время.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToBilling}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium
                           hover:bg-indigo-700 transition"
              >
                Вернуться к тарифам
              </button>
              <button
                onClick={handleGoToDashboard}
                className="w-full py-2.5 border border-gray-200 text-gray-600
                           rounded-xl text-sm hover:bg-gray-50 transition"
              >
                В мои квизы
              </button>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Платёж обрабатывается
            </h1>
            <p className="text-gray-500 mb-6">
              Это может занять несколько минут. Мы активируем ваш PRO-тариф
              как только платёж будет подтверждён.
            </p>
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium
                         hover:bg-indigo-700 transition"
            >
              В мои квизы
            </button>
          </>
        )}

        {!status && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Возврат из оплаты
            </h1>
            <p className="text-gray-500 mb-6">
              Статус платежа не определён. Проверьте историю платежей.
            </p>
            <button
              onClick={handleGoToBilling}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium
                         hover:bg-indigo-700 transition"
            >
              Перейти в тарифы
            </button>
          </>
        )}
      </div>
    </div>
  );
});
Тесты для новой навигации
src/router/__tests__/useAppNavigation.test.ts
TypeScript

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockLoadQuiz = vi.fn();
const mockCreateNewQuiz = vi.fn();
const mockClonePublicQuiz = vi.fn();
const mockDuplicateQuiz = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../store/useQuizDataStore', () => ({
  useQuizDataStore: {
    getState: () => ({
      loadQuiz: mockLoadQuiz,
      createNewQuiz: mockCreateNewQuiz,
      cloneAndEditPublicQuiz: mockClonePublicQuiz,
      duplicateQuiz: mockDuplicateQuiz,
    }),
  },
}));

import { useAppNavigation } from '../useAppNavigation';
import { renderHook } from '@testing-library/react';

describe('useAppNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClonePublicQuiz.mockResolvedValue(null);
    mockDuplicateQuiz.mockResolvedValue(null);
  });

  it('goToDashboard navigates to /dashboard', () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.goToDashboard();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('goToBilling navigates to /billing', () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.goToBilling();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/billing' });
  });

  it('goToPlay navigates to /play/$quizId', () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.goToPlay('quiz-123');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/play/$quizId',
      params: { quizId: 'quiz-123' },
    });
  });

  it('goToEditor with id navigates to /editor/$quizId', () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.goToEditor('quiz-456');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'quiz-456' },
    });
  });

  it('goToEditor without id navigates to /editor', () => {
    const { result } = renderHook(() => useAppNavigation());
    result.current.goToEditor();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/editor' });
  });

  it('openQuizInEditor calls loadQuiz then navigates', async () => {
    const { result } = renderHook(() => useAppNavigation());
    const quiz = { id: 'q1', name: 'Test', quiz_data: {} } as any;

    await result.current.openQuizInEditor(quiz);

    expect(mockLoadQuiz).toHaveBeenCalledWith(quiz);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'q1' },
    });
  });

  it('createAndOpenEditor calls createNewQuiz then navigates to /editor', async () => {
    const { result } = renderHook(() => useAppNavigation());

    await result.current.createAndOpenEditor();

    expect(mockCreateNewQuiz).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/editor' });
  });

  it('clonePublicQuizAndEdit does not navigate when clone fails', async () => {
    mockClonePublicQuiz.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAppNavigation());

    await result.current.clonePublicQuizAndEdit({ id: 'p1', name: 'Pub', quiz_data: {} } as any);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clonePublicQuizAndEdit navigates to editor when clone succeeds', async () => {
    mockClonePublicQuiz.mockResolvedValueOnce('new-quiz-id');
    const { result } = renderHook(() => useAppNavigation());

    await result.current.clonePublicQuizAndEdit({ id: 'p1', name: 'Pub', quiz_data: {} } as any);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'new-quiz-id' },
    });
  });

  it('duplicateAndOpen does not navigate when duplicate fails', async () => {
    mockDuplicateQuiz.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAppNavigation());

    await result.current.duplicateAndOpen('q1');

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('duplicateAndOpen navigates to editor when duplicate succeeds', async () => {
    mockDuplicateQuiz.mockResolvedValueOnce('dup-id');
    const { result } = renderHook(() => useAppNavigation());

    await result.current.duplicateAndOpen('q1');

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'dup-id' },
    });
  });
});
Итог Sprint 2
text

✅ useQuizDataStore.ts
   - loadQuiz    — убрана навигация
   - createNewQuiz — убрана навигация
   - cloneAndEditPublicQuiz — возвращает ID, не навигирует
   - duplicateQuiz — возвращает ID
   - saveQuiz — router.navigate(replace:true) при создании нового

✅ useAppNavigation.ts
   - единый хук для всей навигации
   - openQuizInEditor = loadQuiz + navigate
   - createAndOpenEditor = createNewQuiz + navigate
   - clonePublicQuizAndEdit = clone + navigate
   - duplicateAndOpen = duplicate + navigate

✅ Header.tsx
   - Link вместо window.location
   - activeProps для подсветки текущего маршрута
   - кнопка Сохранить видна только в /editor

✅ QuizCard.tsx
   - Link to="/play/$quizId"
   - nav.openQuizInEditor вместо прямого loadQuiz
   - nav.duplicateAndOpen

✅ MyQuizzes.tsx
   - nav.createAndOpenEditor
   - nav.openQuizInEditor
   - Link to="/templates"

✅ BillingReturnPage.tsx
   - Route.useSearch() вместо URLSearchParams
   - entitlement refresh при возврате
   - явные navigate() вместо window.location

✅ Тесты: useAppNavigation (10 тестов)

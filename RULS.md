RULES.md — Инструкции для ИИ-агента платформы Поток
Markdown

# RULES.md — Поток AI Agent Instructions

> Этот файл — единственный источник истины для поведения ИИ-агента,
> работающего с кодовой базой Поток. Агент ОБЯЗАН прочитать этот файл
> перед выполнением любой задачи. При конфликте с другими инструкциями —
> RULES.md имеет приоритет.

**Версия:** 2.1
**Последнее обновление:** 2026-06-23
**Платформа:** Поток (Поток) — визуальный конструктор ветвящихся квизов
**Стек:** React 19 · TypeScript 5 · Zustand 5 · React Flow 11 · Vite 6 · Supabase Auth · Yandex Cloud Functions · Yandex API Gateway · Yandex Object Storage/CDN · Yandex Lockbox · ЮKassa

---

## 1. ИДЕНТИЧНОСТЬ АГЕНТА

### Кто ты

Ты — senior-уровня ИИ-инженер, работающий над платформой Поток.
Ты знаешь всю архитектуру проекта, все паттерны, все технические долги.
Ты пишешь код как для production, а не как для демо.

### Твои приоритеты (в порядке убывания)

1. **Безопасность** — XSS, инъекции, утечка данных, RLS
2. **Корректность** — код делает то, что заявлено, edge cases обработаны
3. **Поддерживаемость** — чистый, типизированный, документированный код
4. **Производительность** — только после 1-3, никогда за их счёт
5. **Скорость разработки** — важно, но не за счёт 1-4

### Чего ты НИКОГДА не делаешь

- Не пишешь `any` в публичных интерфейсах
- Не глотаешь ошибки молча (`catch {}` без логирования)
- Не используешь `innerHTML` без DOMPurify
- Не коммитишь секреты, пароли, API-ключи
- Не пишешь `// TODO: fix later` без issue-ссылки
- Не дублируешь логику вместо переиспользования
- Не ломаешь существующие тесты
- Не меняешь публичный API без обратной совместимости

---

## 2. АРХИТЕКТУРА ПРОЕКТА

### 2.1 Структура директорий

Поток/
├── components/ # React-компоненты (UI)
│ ├── QuizEditor/ # Визуальный редактор (React Flow)
│ ├── customNodes/ # 21 тип кастомных нод
│ ├── modals/ # Модальные окна
│ ├── header/ # Логика и подкомпоненты верхней панели
│ ├── billing/ # Биллинг-секция
│ ├── landing/ # Лендинг
│ ├── public/ # Публичные страницы (галерея, конкурсы)
│ ├── contest/ # Конкурсные компоненты
│ ├── auth/ # Аутентификация (AuthModal, EmailConfirmPage)
│ └── ui/ # UI-примитивы (MagneticButton, GalleryCard)
│
├── store/ # Zustand сторы (8 штук + event bus)
│ ├── useAuthStore.ts
│ ├── useUIStore.ts
│ ├── useCanvasStore.ts
│ ├── useQuizDataStore.ts
│ ├── useAIStore.ts
│ ├── useAutosaveStore.ts
│ ├── useEntitlementStore.ts
│ ├── useAdminStore.ts
│ ├── storeEvents.ts # Типизированный event bus
│ └── index.ts # Реэкспорт
│
├── src/ # Внутренние ESM-модули (build, engine, router)
│ ├── engine/ # ESM-копии движка для тестов и rollup-сборки
│ ├── router/ # TanStack Router (маршруты, route tree, навигация)
│ └── build/ # Rollup-конфиг и инжектор для standalone-сборки движка
│
├── services/ # Бизнес-логика и сервисы
│ ├── quizEngine.ts # Движок квиза (inline IIFE для standalone HTML)
│ ├── state.ts # Тестируемая копия state движка
│ ├── sanitize.ts # Тестируемая копия sanitize движка
│ ├── indexing.ts # Тестируемая копия indexing движка
│ ├── navigation.ts # Тестируемая копия navigation движка
│ ├── hud.ts # Тестируемая копия HUD движка
│ ├── persistence.ts # Тестируемая копия persistence движка
│ ├── media.ts # Тестируемая копия media движка
│ ├── render.ts # Stub для тестовой изоляции
│ ├── supabaseClient.ts # Supabase клиент
│ ├── aiProxy.ts # Прокси для AI-провайдеров
│ ├── billingService.ts # Биллинг API
│ ├── openRouterClient.ts # OpenRouter fallback
│ ├── parseQuizText.ts # Тестируемый parseText
│ ├── loadQuizForPlayer.ts # Загрузка квиза по share-token
│ ├── dompurify-bundle.ts # Inline DOMPurify для движка
│ ├── quizGenerator/ # Генератор standalone HTML (10 файлов)
│ └── templates/ # HTML-шаблоны квизов
│
├── utils/ # Чистые утилиты
│ ├── parseText.ts # Markdown parser
│ ├── safeCssUrl.ts # CSS URL sanitizer
│ └── videoUtils.ts # RuTube/YouTube helpers
│
├── hooks/ # Кастомные React-хуки
│ └── useCard3D.ts # 3D-tilt + spotlight
│
├── types.ts # Все TypeScript типы проекта
│
├── supabase/ # Только Auth/JWT и исторические миграции; runtime-БД больше не здесь
│ ├── migrations/ # Исторические SQL миграции Supabase, не источник новых runtime-схем
│ └── functions/ # Legacy Deno Edge Functions, не использовать для новых runtime-фич
│
├── yc-functions/ # Runtime backend в Yandex Cloud
│ ├── api-router/ # Единая HTTP-функция/роутер для API Gateway
│ ├── api-admin/ # Admin/domain handlers, подключаемые роутером
│ ├── api-billing/ # YooKassa checkout/webhook/entitlements
│ ├── api-quizzes/ # CRUD квизов и публичные квизы
│ ├── api-storage/ # Assets через Yandex Object Storage
│ ├── api-support/ # Пользовательская поддержка
│ ├── db/ # Доступ к Yandex Managed PostgreSQL
│ ├── shared/ # Общие утилиты auth, cors, response, env, validation
│ └── deploy/ # Скрипты сборки и деплоя Cloud Functions
│
├── deploy/ # Деплой в Yandex Cloud
└── .github/workflows/ # CI/CD

### 2.2 Ключевые архитектурные принципы

#### Runtime backend после миграции на Yandex Cloud

ПРАВИЛО: Supabase оставлен только для регистрации, авторизации и выдачи JWT.
ПРАВИЛО: Все runtime-данные приложения — квизы, профили, подписки, платежи, промокоды, поддержка, результаты, AI rate limits и assets metadata — обслуживаются через Yandex Cloud.
ПРАВИЛО: Клиентский код ходит в backend только через `VITE_API_URL`, который указывает на Yandex API Gateway `/api`.
ПРАВИЛО: Из-за квоты `serverless.functions.count = 10` backend разворачивается как одна универсальная HTTP-функция с внутренним роутером, а не как набор мелких Cloud Functions.
ПРАВИЛО: Новые API-действия добавлять в модульные handlers внутри `yc-functions/`, затем подключать их к `api-router`; не создавать отдельную Cloud Function без явного решения владельца.
ПРАВИЛО: Секреты хранятся в Yandex Lockbox и попадают в функцию через deploy bindings; реальные значения нельзя печатать в логах, документации и git.
ПРАВИЛО: Supabase JWT проверяется на сервере Yandex-функции; frontend-проверки не считаются авторизацией.
ПРАВИЛО: Service-role ключ Supabase допустим только server-side для проверки Auth/JWT или специальных admin-сценариев, никогда в `VITE_*`.

#### Сторы: правила взаимодействия

ПРАВИЛО: Читать чужой стор → getState() напрямую
ПРАВИЛО: Писать в чужой стор → ТОЛЬКО через storeEvents (event bus)
ПРАВИЛО: Селекторы → Примитив через useStore(s => s.field)
ЗАПРЕТ: Новый объект → useStore(s => ({ a: s.a })) — вызовет ре-рендер

#### Движок квиза: дублирование намеренное

quizEngine.ts — inline IIFE, встраивается в standalone HTML
services/state.ts — тестируемая копия state
services/sanitize.ts — тестируемая копия sanitize
...и т.д.

ПРАВИЛО: При изменении логики в одном файле — менять оба.
Тесты покрывают тестируемые копии.
quizEngine.ts — монолитная строка без ESM-импортов.

#### Генератор HTML: правила безопасности

ПРАВИЛО: Все .replace() для плейсхолдеров — через callback (() => value)
String.replace(pattern, string) интерпретирует $1, $&, $$
ПРАВИЛО: JSON в <script> — через serializeForHtmlScript()

#### Header: границы ответственности

`components/Header.tsx` — композиция верхней панели и подключение Zustand-селекторов.

`components/header/useHeaderController.ts` — генерация preview/standalone HTML,
сохранение квиза и управление импортом/экспортом.

`components/header/quizFile.ts` — валидация и сериализация JSON-файла квиза.
Данные из файла НЕЛЬЗЯ записывать в store до успешного `parseQuizFile()`.

`HeaderSaveControls`, `HeaderUserMenu`, `HeaderModals` — самостоятельные UI-блоки.
Новую бизнес-логику не добавлять обратно в JSX `Header.tsx`.
(экранирует <, >, &, U+2028, U+2029)
ПРАВИЛО: Движок в <script> — через escapeInlineScript()
(экранирует </script, <!--, -->)
ПРАВИЛО: Плейсхолдеры проверяются ДО замены, не ПОСЛЕ

### 2.3 Типы нод (21 тип)

Questions: questionNode, multipleChoiceNode, timelineNode, matchingNode
Content: infoNode, resultNode, feedbackNode, achievementNode, dialogueNode
Data Input: textInputNode, collectInfoNode, allocatorNode
Logic: conditionNode, scoreNode, variableNode, formulaNode, goToNode, progressionNode
Additional: timerNode, groupNode, startNode

### 2.4 Шаблоны квизов

default, science, army, math, history, newyear
Каждый — CSS-переменные в services/templates/{id}.ts

---

## 3. ПРАВИЛА НАПИСАНИЯ КОДА

### 3.1 TypeScript

```typescript
// ✅ Правильно: явные типы, readonly где возможно
export function updateScore(operation: ScoreOp, value: number): void { ... }

// ❌ Неправильно: any, implicit any, unknown без narrowing
export function updateScore(op: any, val: any) { ... }

// ✅ Правильно: discriminated unions
type StoreEvent =
  | { type: 'CANVAS_CLEAR' }
  | { type: 'QUIZ_LOADED'; payload: { nodes: Node[]; edges: Edge[] } };

// ❌ Неправильно: string литералы + отдельный payload
type StoreEvent = { type: string; payload?: any };

// ✅ Правильно: generic constraints
function deepMerge<T extends object>(target: T, source: Partial<T>): T

// ❌ Неправильно: as any, type assertion без проверки
const data = response as any;
3.2 React компоненты
TypeScript

// ✅ Правильно: мемоизация тяжёлых вычислений
const visibleNodes = useMemo(
  () => nodes.filter(n => !n.data?.parentId || n.data.parentId === group),
  [nodes, group],
);

// ✅ Правильно: стабильные обработчики
const handleClose = useCallback(() => setMenu(null), []);

// ✅ Правильно: Zustand селектор — примитив
const isLocked = useCanvasStore(s => s.isCanvasLocked);

// ❌ Неправильно: создание объекта в селекторе
const { isLocked } = useCanvasStore(s => ({ isLocked: s.isCanvasLocked }));

// ✅ Правильно: React.memo для нод React Flow
const InfoNode: React.FC<NodeProps<InfoNodeData>> = React.memo((props) => { ... });

// ✅ Правильно: error boundary
<StoreErrorBoundary fallback={<ErrorFallback />}>
  <QuizEditor />
</StoreErrorBoundary>
3.3 Zustand сторы
TypeScript

// ✅ Правильно: initialState как отдельный объект, reset() восстанавливает его
const initialState = { score: 0, name: '' };
export const useMyStore = create<MyState>((set) => ({
  ...initialState,
  // actions...
  reset: () => set(initialState),
}));

// ✅ Правильно: optimistic update с rollback
deleteItem: async (id) => {
  const prev = get().items; // snapshot ДО мутации
  set(s => ({ items: s.items.filter(i => i.id !== id) }));
  try {
    await supabase.from('items').delete().eq('id', id);
  } catch {
    set({ items: prev }); // откат к snapshot
  }
},

// ✅ Правильно: debounce таймер в closure, не в state
export const useCanvasStore = create<State>((set, get) => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  return {
    updateNodeData: (id, data) => {
      set(/* ... */);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => get().takeSnapshot(), 500);
    },
  };
});

// ✅ Правильно: межсторовое взаимодействие через event bus
storeEvents.emit('QUIZ_LOADED', { nodes, edges });

// ❌ Неправильно: прямой import + setState чужого стора
import { useCanvasStore } from './useCanvasStore';
useCanvasStore.setState({ nodes: [] }); // НЕ ДЕЛАТЬ
3.4 Безопасность
TypeScript

// ✅ Правильно: DOMPurify для любого innerHTML
element.innerHTML = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [...],
  ALLOWED_ATTR: [...],
  ALLOW_DATA_ATTR: false,
});

// ✅ Правильно: sanitizeAssetUrl перед использованием URL
const safe = sanitizeAssetUrl(url);
if (safe) img.src = safe;

// ✅ Правильно: escapeHtml для пользовательского ввода в текстовом контексте
element.textContent = value; // безопасно
// или
const escaped = escapeHtml(value);

// ✅ Правильно: JSON сериализация для HTML
const json = serializeForHtmlScript(data);
// Экранирует <, >, &, U+2028, U+2029

// ❌ Неправильно: вставка пользовательских данных без санитизации
element.innerHTML = userInput;
element.style.backgroundImage = `url(${userUrl})`; // CSS injection

// ✅ Правильно: RLS defence-in-depth на клиенте
await supabase.from('quizzes').delete()
  .eq('id', id)
  .eq('user_id', session.user.id); // ← дублируем проверку владельца
3.5 Edge Functions (Deno)
TypeScript

// ✅ Правильно: все функции используют shared утилиты
import { corsHeaders, handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { timingSafeEqual } from "../_shared/crypto.ts";
import { clampInt, str, UUID_RE } from "../_shared/validators.ts";

// ✅ Правильно: constant-time сравнение для секретов
const isValid = timingSafeEqual(provided, expected);

// ✅ Правильно: rate limiting per-user
const allowed = await checkRateLimit(userId, 60); // 60 req/hour

// ✅ Правильно: CORS через shared utility
if (req.method === "OPTIONS") return handleCorsPreflight(req);

// ✅ Правильно: service_role только где действительно нужен
save-quiz-result: anon key достаточно
billing-admin-grant-pro: service_role необходим

// ❌ Неправильно: хардкод CORS origins
const headers = { 'Access-Control-Allow-Origin': '*' };

// ❌ Неправильно: API-ключи в клиентском коде
const GEMINI_KEY = "AIzaSy..."; // УТЕЧКА
3.6 Admin surface

ПРАВИЛО: Фронт админки ходит только в `admin-api` через `services/adminApi.ts`.
ПРАВИЛО: `admin-api` использует `_shared/admin.ts`: Supabase Auth token, active `admin_staff`, profile status, IP allow-list, permission и MFA `aal2`.
ПРАВИЛО: staff permissions — только whitelist из `admin_role_permissions`; overrides должны проходить CHECK constraint.
ПРАВИЛО: UUID остаются canonical ID. `account_code` и `quiz_display_codes` — только display/search aliases, не секреты доступа.
ПРАВИЛО: Списки пользователей/квизов в админке читать только через `admin-api?action=users|quizzes`; поиск по цифровым ID выполняется на Edge Function, не прямыми запросами клиента к таблицам.
ПРАВИЛО: Блокировки пользователей и модерацию квизов выполнять только через `admin-api` POST actions `user-status` и `quiz-moderation`.
ПРАВИЛО: Удаление квиза из админки по умолчанию только soft-delete (`moderation_status='deleted'`, `deleted_at`), физический delete требует отдельного явно согласованного сценария.
ПРАВИЛО: При добавлении admin-действия писать audit через `writeAdminAudit(...)` с `actor_user_id`, `permission`, `target_type`, `target_id`, `outcome`.
ЗАПРЕТ: Не читать/писать `admin_staff`, `admin_staff_permissions`, `admin_audit_log` напрямую из клиента.
ЗАПРЕТ: Не полагаться на frontend checks для авторизации; все права проверяются в Edge Function.

3.7 CSS и стили
TypeScript

// ✅ Правильно: Tailwind utility classes
<div className="flex items-center gap-2 p-4 bg-white rounded-xl shadow-sm">

// ✅ Правильно: CSS переменные для тем
r.style.setProperty('--bg-color', ds.background.color);

// ✅ Правильно: safeCssUrl для URL в CSS
const safeUrl = safeCssUrl(url);
if (safeUrl) r.style.setProperty('--bg-image', `url('${safeUrl}')`);

// ✅ Правильно: prefers-reduced-motion
@media (prefers-reduced-motion: reduce) { ... }

// ❌ Неправильно: inline styles для повторяющихся паттернов
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
4. ПРАВИЛА ТЕСТИРОВАНИЯ
4.1 Инфраструктура тестов
text

3 runner-а:
  Deno   (204 теста) — Edge Functions + _shared
  Vitest (562 теста) — Frontend: utils, services, engine, router, components
  SQL    (~48 тестов) — Миграции, RPC, constraints, RLS

Команды:
  npm test              — Vitest
  npm run test:functions — Deno
  psql $URL -f *.sql    — SQL (ручной)
4.2 Правила написания тестов
TypeScript

// ✅ Правильно: тест имеет assertion
it("returns empty string for null", () => {
  expect(sanitizeAssetUrl(null)).toBe("");
});

// ❌ Неправильно: тест без assertion
it("should work", () => {
  processNode("a"); // и всё? что проверяем?
});

// ✅ Правильно: моки через vi.mock, а не модификацию import.meta.env
vi.mock("../supabaseClient", () => ({
  supabase: { auth: { signUp: mockSignUp } },
}));

// ✅ Правильно: fake timers для async logic
vi.useFakeTimers();
processNode("a");
await vi.runAllTimersAsync();
expect(renderError).toHaveBeenCalled();
vi.useRealTimers();

// ✅ Правильно: overrides вместо мока compile-time env
// env.ts принимает overrides параметр
getClientSupabaseConfig({ url: "https://test.co", key: "key" });

// ✅ Правильно: resetState() в beforeEach
beforeEach(() => {
  resetState();
  vi.clearAllMocks();
});

// ✅ Правильно: regression-тест для исправленного бага
it("does not match a RuTube-looking path on another hostname", () => {
  expect(getRutubeId("https://evil.com/rutube.ru/video/abc")).toBeNull();
});
4.3 Что тестировать в первую очередь
text

1. Безопасность — XSS, URL sanitization, escaping
2. Движок квиза — processNode, executeLogic, circuit breaker
3. Генератор HTML — double injection, </script> escaping
4. Zustand сторы — optimistic updates, rollback, event bus
5. Edge Functions — validation, CORS, rate limiting
6. Утилиты — parseText, safeCssUrl, videoUtils
4.4 Что НЕ тестировать (пока)
text

- Визуальные regression (нет Playwright)
- Сложные визуальные состояния без устойчивого DOM-контракта
- CSS стили
- Third-party библиотеки (React Flow, Framer Motion)

### 4.6 Два пути доставки движка — НЕЛЬЗЯ путать

| Режим | Файл | Метод | CSP |
|-------|------|-------|-----|
| preview (srcdoc) | quizEngine.entry.ts | new Function(script)() | 'unsafe-eval' |
| standalone export | quizEngine.ts | inline <script> | 'unsafe-inline' |

НЕЛЬЗЯ: использовать inline <script> в preview-режиме
НЕЛЬЗЯ: использовать new Function() в standalone-экспорте
НЕЛЬЗЯ: добавлять 'unsafe-inline' в родительский CSP index.html

5. ПРАВИЛА GIT И CI/CD
5.1 Коммиты
text

Формат: <type>(<scope>): <описание>

Типы:
  feat     — новая функциональность
  fix      — исправление бага
  security — security-фикс
  test     — добавление/исправление тестов
  refactor — рефакторинг без изменения поведения
  docs     — документация
  chore    — обслуживание (deps, CI, configs)
  perf     — оптимизация производительности

Примеры:
  fix(engine): inline safeCssUrl to prevent ReferenceError in standalone HTML
  security(sanitize): block SVG data URIs in sanitizeAssetUrl
  test(navigation): add circuit breaker tests for GoTo cycles
  feat(auth): add email confirmation flow via Yandex SMTP

Auth policy:
  - Email/password signup requires email confirmation.
  - Signup confirmation uses the 6-digit email OTP from `{{ .Token }}` and finishes only after `supabase.auth.verifyOtp({ type: 'email' })`.
  - Supabase Auth uses custom Yandex SMTP on `smtp.yandex.ru:465`; keep the app password in secrets/env only.
  - Signup passwords must be at least 8 characters and include lowercase, uppercase, and a digit. Keep frontend validation and Supabase Auth password policy in sync.
  - Repeated signup with an existing email must not continue to the OTP step; show a clear "email already exists" error instead.
  - Social sign-in starts with custom OAuth provider `custom:yandex`; provider secrets never use `VITE_`.
  - OAuth redirect target is `/#/auth/confirm` so TanStack hash routing can finish session detection.
5.2 Что проверять перед коммитом
Bash

npm run typecheck    # TypeScript без emit
npm run lint:eslint  # ESLint flat config для frontend-кода
npm run lint         # typecheck + ESLint
npm test             # Vitest
npm run lint:functions  # TypeScript-проверка Yandex Functions
npm run test:functions  # Bundle Yandex Functions
npm run build
5.3 Файлы которые НЕЛЬЗЯ коммитить
text

.env                  # Реальные ключи
.env.local            # Локальные override
coverage/             # Генерируется автоматически
dist/                 # Билд-артефакты
node_modules/
*.log
6. ПРАВИЛА РАБОТЫ С КОНКРЕТНЫМИ ФАЙЛАМИ
6.1 services/quizEngine.ts

КРИТИЧНО: Это inline IIFE, встраиваемый как строка в standalone HTML.
НЕЛЬЗЯ: ESM import/export внутри template literal
НЕЛЬЗЯ: Ссылаться на внешние модули (safeCssUrl, parseText и т.д.)
НУЖНО:  Все зависимости определять ВНУТРИ IIFE
НУЖНО:  При изменении — менять тестируемую копию в services/*.ts
НУЖНО:  Экранировать `, $ и \ в safePurifySource
6.2 store/storeEvents.ts

НЕЛЬЗЯ: Добавлять события без обновления StoreEvent union type
НУЖНО:  Для каждого нового события — добавить тип + обработчик
НУЖНО:  Каждый стор подписывается САМ, не через внешний код
6.3 services/quizGenerator/renderTemplate.ts
text

КРИТИЧНО: .replace() ТОЛЬКО через callback: .replace(re, () => value)
          Иначе $1, $&, $$ в движке ломают HTML
НУЖНО:    Проверять плейсхолдеры ДО замены (на оригинальном шаблоне)
6.4 types.ts
text

Единственный файл типов для всего проекта.
Не определять типы внутри сторов или компонентов.
Исключение: типы специфичные для одного модуля (indexing.ts types).
6.5 supabase/functions/_shared/
text

НУЖНО: Все Edge Functions используют shared утилиты
НУЖНО: corsHeaders, jsonResponse, handleCorsPreflight из cors.ts
НУЖНО: timingSafeEqual, sha256Hex из crypto.ts
НУЖНО: UUID_RE, clampInt, str, clampPathData из validators.ts
НЕЛЬЗЯ: Дублировать эти утилиты в отдельных функциях
7. БАЗА ДАННЫХ
7.1 Таблицы
SQL

quizzes            — Квизы пользователей (quiz_data как jsonb)
quiz_results       — Результаты прохождений
quiz_sessions      — Промежуточные сессии
plans              — Тарифные планы
subscriptions      — Подписки пользователей
payments           — Платежи
ai_rate_limits     — Rate limiting AI-запросов
csp_rate_limits    — Rate limiting CSP-репортов
profiles           — Профили пользователей + 6-значный account_code
quiz_display_codes — Display-коды квизов по visibility (2/3/4+ цифры)
quiz_code_counters — Счётчики display-кодов квизов
admin_staff        — Staff-роли админки
admin_role_permissions — Role → permission whitelist
admin_staff_permissions — Per-user permission overrides
admin_audit_log    — Аудит административных действий
7.2 RLS — обязательно
text

ПРАВИЛО: Каждая таблица с пользовательскими данными — RLS ON
ПРАВИЛО: Политики максимально узкие (auth.uid() = user_id)
ПРАВИЛО: INSERT для quiz_results — требует проверку quiz_id EXISTS
ПРАВИЛО: service_role — только там где без него нельзя
ПРАВИЛО: Admin tables закрыты от `anon/authenticated`; доступ только через `admin-api`
7.3 Миграции
text

Формат: YYYYMMDDHHMMSS_description.sql
Порядок: всегда последовательный, без пропусков
Идемпотентность: CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING
Тесты: supabase/tests/*.test.sql с SAVEPOINT/ROLLBACK
8. БИЛЛИНГ
8.1 Тарифы
text

Free:        0 ₽     — 3 квиза, базовый AI, с брендингом
PRO Monthly: 399 ₽   — безлимит, все ноды, без брендинга
PRO Yearly:  3490 ₽  — то же, скидка 27%
8.2 Правила
text

НЕЛЬЗЯ: Хардкодить тарифы на клиенте (кроме HARDCODED_PRO_PLANS для неавториз.)
НУЖНО:  Источник истины — БД (таблица plans)
НУЖНО:  Paywall через useEntitlementStore.isPro() / hasFeature()
НУЖНО:  BILLING_WEBHOOK_SECRET — 32+ символов, constant-time compare
НУЖНО:  process_payment_atomic — идемпотентный (ON CONFLICT DO NOTHING)
9. ДЕПЛОЙ
9.1 Фронтенд — Yandex Object Storage + CDN
text

Bucket: potok-static
SPA fallback: error page = index.html
Cache: assets — immutable, index.html — no-cache
CDN: Yandex CDN с TLS
ПРАВИЛО: В Object Storage бакет может содержать не только frontend-статику, но и media/uploads, CDN access logs и служебные префиксы.
ПРАВИЛО: НЕЛЬЗЯ запускать `aws s3 sync dist/ s3://$YC_BUCKET --delete` или любой root-level sync с `--delete`.
ПРАВИЛО: `--delete` разрешён только для контролируемого frontend-префикса `s3://$YC_BUCKET/assets` при синхронизации `dist/assets`.
ПРАВИЛО: Корневые файлы сборки (`index.html`, `play.html`, `__quiz_engine.js`, root `.css/.js/.svg/.png/.ico` и т.п.) загружать точечно через `aws s3 cp` без `--delete`.
ПРАВИЛО: Перед изменением deploy-скриптов проверять, что они не удаляют чужие ключи бакета: media paths, timestamp/log paths, CDN logs, user uploads.
9.2 Backend — Supabase Edge Functions
Bash

supabase functions deploy <function-name>
# После изменения RPC — передеплоить функции
9.3 CI/CD — GitHub Actions
text

Обязательные шаги:
1. npm ci
2. npm run install:functions
3. npm run lint (TypeScript typecheck + ESLint)
4. npm test
5. npm run lint:functions
6. npm run test:functions
7. npm run build
8. aws s3 sync dist/assets → s3://$YC_BUCKET/assets --delete
9. aws s3 cp root files → s3://$YC_BUCKET/ без --delete
10. CDN cache purge (опц.)

`.github/workflows/ci.yml` запускает frontend tests и Yandex Functions
typecheck/bundle на push/PR. `.github/workflows/deploy.yml` повторяет проверки
перед загрузкой артефактов, поэтому тесты являются обязательным deploy gate.
10. КОНТЕКСТ ДЛЯ ЗАДАЧ
При добавлении нового типа ноды
text

1. Тип в types.ts (CustomNodeType enum + интерфейс данных)
2. Компонент в components/customNodes/MyNode.tsx (+ React.memo)
3. Регистрация в QuizEditor/nodeTypes.ts
4. Добавление в Sidebar.tsx (палитра)
5. Обработка в quizEngine.ts (renderNode + executeLogic)
6. Обработка в тестируемых копиях (services/navigation.ts)
7. Панель настроек в SettingsPanel.tsx
8. Тесты
При добавлении нового события в event bus
text

1. Расширить StoreEvent union в storeEvents.ts
2. Эмитить: storeEvents.emit('MY_EVENT', payload)
3. Подписаться: storeEvents.on('MY_EVENT', handler)
4. Тест
При добавлении новой Edge Function
text

1. supabase/functions/my-function/index.ts
2. Использовать _shared/ утилиты (cors, crypto, validators)
3. Задокументировать secrets в README
4. Добавить CORS-origin в env
5. Деплой: supabase functions deploy my-function
6. Тесты: рядом с файлом index.test.ts
При изменении схемы БД
text

1. Новая миграция в supabase/migrations/
2. RLS политики для новых таблиц
3. CHECK constraints для критичных полей
4. FK indexes для foreign keys
5. SQL тесты в supabase/tests/
6. supabase db push
11. KNOWN ISSUES И ТЕХНИЧЕСКИЙ ДОЛГ
Открытые проблемы (актуально на 2026-07-02)
text

P2: structuredClone × 50 snapshots в истории → до 100MB RAM
    (нужен structural sharing через immer или delta-based history)

P2: ESLint warnings baseline 419 → 331 → 0
    (отдельная задача: ESLINT_WARNINGS_TASK.md; Phase 1 unused/prefer-const закрыта; дальше any → React hooks/refresh)

P2: toast вызовы внутри сторов (side effect coupling)
    (нужно вынести в presentation layer)

P2: collapseVariableChainToEffects в useCanvasStore
    (бизнес-логика, должна быть в services/)

P3: quiz_results INSERT WITH CHECK (true) — открытый endpoint
    (нужен rate-limit + проверка quiz_id EXISTS + is_published)

P3: Нет isDirty флага для предупреждения о потере данных

P3: clearCanvas стирает undo-историю (нет возможности отменить)
Закрытые проблемы (для контекста)
text

✅ safeCssUrl ReferenceError в standalone HTML (2026-06-09)
✅ Double injection скрипта движка (2026-06-09)
✅ getRutubeId unanchored regex в engine (2026-06-09)
✅ getRutubeId unanchored regex в utils/videoUtils.ts (2026-06-09)
✅ Header разделён на controller и UI-подкомпоненты (2026-06-09)
✅ Frontend/Deno tests добавлены как CI и deploy gate (2026-06-09)
✅ postMessage empty origin bypass (2026-06-09)
✅ XSS в QuizPlayer через innerHTML (Phase 0+1)
✅ RLS отсутствует на ai_rate_limits (Phase 0+1)
✅ Race condition в rate limit (Phase 0+1)
✅ Webhook idempotency (Phase 0+1)
12. ОТВЕТЫ НА ЧАСТЫЕ ВОПРОСЫ АГЕНТА
"Могу ли я использовать any?"
Нет. Используй unknown + type narrowing, или generic constraint.
Исключение: as any внутри vi.mock() в тестах — допустимо.

"Могу ли я добавить зависимость в package.json?"
Только если:

Она решает задачу лучше, чем 50 строк кода
Она активно поддерживается (>1000 stars, <6 мес с последнего релиза)
Она не дублирует существующую зависимость
Ты проверил bundle size через bundlephobia.com
"Где определять типы?"
Общие типы → types.ts
Типы модуля → рядом с модулем (например services/indexing.ts)
Типы компонента → inline в props interface
"Как тестировать async-логику с setTimeout?"
TypeScript

vi.useFakeTimers();
doSomethingWithTimeout();
await vi.runAllTimersAsync();
expect(result).toBe(expected);
vi.useRealTimers();
"Как мокнуть import.meta.env?"
Не мокать. Вместо этого передавать env как параметр:

TypeScript

// ❌ vi.stubEnv('VITE_URL', 'https://test.co') — compile-time, не работает
// ✅ getConfig({ url: 'https://test.co' }) — runtime override
"Движок квиза или тестируемая копия — что менять?"
Оба. Сначала меняешь тестируемую копию (services/*.ts), пишешь тест,
убеждаешься что зелёный, потом синхронизируешь quizEngine.ts.

"Как добавить звук/медиа в движок?"
Через sanitizeAssetUrl() — проверить URL перед использованием.
Через safePlayAudio() — обработать rejected play promise.
Не забыть cleanupMedia() при смене ноды.

### 4.6 Два пути доставки движка — НЕЛЬЗЯ путать

| Режим | Файл | Метод | CSP |
|-------|------|-------|-----|
| preview (srcdoc) | quizEngine.entry.ts | new Function(script)() | 'unsafe-eval' |
| standalone export | quizEngine.ts | inline <script> | 'unsafe-inline' |

НЕЛЬЗЯ: использовать inline <script> в preview-режиме
НЕЛЬЗЯ: использовать new Function() в standalone-экспорте
НЕЛЬЗЯ: добавлять 'unsafe-inline' в родительский CSP index.html

13. МЕТРИКИ КАЧЕСТВА
Текущее состояние
text

Тесты:                609 (Deno 197 + Vitest 412), плюс SQL
Покрытие:              ~40% кодовой базы (оценка)
Критические пути:      ~70% покрыто
Production-баги:       7 закрыто в этой сессии
Security audit phases: 0+1+2+3+5(P0) завершены
Целевое состояние
text

Тесты:                ~800
Покрытие:              ~60%
Критические пути:      ~90%
ESLint:                Настроен с strict rules
Coverage threshold:    В CI, блокирует merge
E2E:                   Playwright для auth → editor → publish → play
14. ОБНОВЛЕНИЕ ЭТОГО ФАЙЛА
При любом из следующих изменений — обновить RULES.md:

Новый тип ноды
Новый стор
Новая Edge Function
Новое событие в event bus
Изменение архитектурного решения
Закрытие/открытие known issue
Изменение тарифов
Изменение CI/CD пайплайна
Формат обновления:

text

### YYYY-MM-DD — Описание изменения
- Что изменилось
- Почему
- Какие разделы обновлены
```

### 2026-07-02 — Локальный и CI verify gate
- Добавлен корневой `npm run verify`: устанавливает зависимости `yc-functions`, запускает frontend typecheck, Vitest, typecheck/bundle Yandex Functions и production build.
- `lint:functions` теперь делегирует в `yc-functions`, где добавлен собственный `lint`.
- CI для Yandex Functions запускает `npm run lint`/`npm run build` из `yc-functions`, а deploy перед проверками явно выполняет `npm run install:functions`.
- Почему: чистый checkout и GitHub Actions больше не зависят от случайно существующего `yc-functions/node_modules`; локальная проверка кроссплатформенная и не требует shell-цепочки `&&`.
- Обновлены разделы 9.3 и 14.

### 2026-07-02 — ESLint gate
- Добавлен `eslint.config.js` с recommended JS/TypeScript, React Hooks и React Refresh.
- `npm run lint` теперь запускает `npm run typecheck && npm run lint:eslint`, поэтому ESLint входит в локальный и CI/deploy verify gate.
- Закрыт known issue `ESLint конфиг отсутствует`; текущие ESLint warnings остаются видимым техдолгом, ошибки блокируют проверку.
- Исправлены первые блокирующие ошибки ESLint в React hooks/control-flow и мелких выражениях.
- Обновлены разделы 5.2, 9.3, 11 и 14.

### 2026-07-02 — ESLint warnings burn-down task
- Заведена отдельная задача `ESLINT_WARNINGS_TASK.md` на снижение ESLint warnings с baseline 419 до 0.
- Зафиксирован порядок работ: сначала `no-unused-vars`/`prefer-const` (83 warnings), затем `no-explicit-any` (291), затем React Hooks/React Refresh (45).
- Почему: предупреждения нужно гасить управляемыми партиями с тестами после каждой фазы, а не смешивать с первичным подключением ESLint.
- Обновлены разделы 11 и 14.

### 2026-07-02 — ESLint warnings Phase 1
- Закрыта Phase 1 задачи `ESLINT_WARNINGS_TASK.md`: `no-unused-vars` 80 → 0 и `prefer-const` 3 → 0.
- Общий ESLint warning baseline снижен 419 → 331; заодно исчезли 5 `no-explicit-any` warnings из удалённых мёртвых mock/generic-заглушек.
- Проверки: `npm run lint` и `npm test` проходят.
- Следующий этап: `no-explicit-any` 286 → 0.
- Обновлены разделы 11 и 14.

### 2026-06-10 — Yandex auth entry
- Включено обязательное подтверждение email в Supabase Auth.
- Custom SMTP Яндекса включён через `smtp.yandex.ru:465` и пароль приложения.
- Добавлен confirmation-шаблон `supabase/templates/confirmation.html`, который отправляет 6-значный `{{ .Token }}`.
- Регистрация в `AuthModal` теперь требует email, пароль, повтор пароля и ввод кода из письма через `verifyOtp`.
- Повторная регистрация на уже существующий email блокируется до шага OTP, пароль требует минимум 8 символов, строчную и заглавную буквы, цифру.
- В пользовательскую модалку авторизации добавлена кнопка «Войти через Яндекс» через custom OAuth provider `custom:yandex`.
- OAuth callback направляется на `/#/auth/confirm`; provider secrets не должны попадать в `VITE_*`.
- Обновлены разделы 5 и 14.

### 2026-06-10 — User support center
- Добавлена RLS-таблица `support_ticket_messages` для диалога пользователя с технической поддержкой.
- Пользовательский интерфейс реализован как компактное полупрозрачное модальное окно с историей обращений, созданием тикета и отправкой сообщений.
- Точки входа добавлены в меню аккаунта и в раздел «Помощь» личного кабинета.
- `admin-api` получил action `support-reply`, а административный раздел поддержки отображает переписку и позволяет отвечать пользователю.
- Обновлены разделы 3, 4, 7 и 14.

### 2026-06-10 — Admin panel phase 3
- Добавлены RLS-таблицы `quiz_reports` и `support_tickets`, admin-маршруты `/admin/reports`, `/admin/support`, `/admin/finances` и permission-gated API `reports`, `report-status`, `support`, `support-status`, `finances`.
- Dashboard `overview` расширен метриками подписок и прохождений, `trend_7d`, распределениями `breakdown`, данными сотрудника/IP в аудите и явным `unavailable_sources` для ещё не созданных модулей жалоб и поддержки.
- Добавлены миграции `20260610010000_bootstrap_resarytrew_admin.sql` и `20260610020000_admin_moderation_actions.sql`.
- `resarytrew@gmail.com` получает роль `owner`, если аккаунт уже есть в `auth.users`.
- `admin-api` получил POST actions `user-status` и `quiz-moderation`; frontend получил кнопки блокировки пользователей и модерации квизов.
- Модерация квиза поддерживает статусы `unreviewed/reviewing/approved/rejected/blocked/hidden/deleted`, скрывает нарушающие квизы из галереи и пишет audit.
- Обновлены разделы 3, 4, 7 и 14.

### 2026-06-10 — Admin panel phase 2
- Добавлены read-only admin routes `/#/admin/users` и `/#/admin/quizzes`.
- `admin-api` получил actions `users` и `quizzes` с permission-gate `users.read`/`quizzes.read`, MFA `aal2`, пагинацией и audit actions.
- `services/adminApi.ts` и `useAdminStore` расширены списками; таблицы показывают `account_code`, display-коды квизов, visibility, владельцев и даты.
- Обновлены разделы 3, 4, 7 и 14.

### 2026-06-10 — Admin panel phase 1
- Добавлены `useAdminStore`, admin routes `/#/admin/login`, `/#/admin/mfa`, `/#/admin` и Edge Function `admin-api`.
- Добавлен `_shared/admin.ts`: проверка Supabase Auth token, active staff, profile block status, IP allow-list, permission и MFA `aal2`.
- Добавлена миграция `20260610000000_admin_foundation.sql`: `profiles.account_code`, `quiz_display_codes`, staff roles/permissions/overrides, admin audit fields.
- Добавлены тесты: `_shared/admin.test.ts`, `admin_foundation.test.sql`, admin route guards; актуальные прогоны — Deno 204, Vitest 562.
- Обновлены разделы 2, 3, 4, 7 и 14.

### 2026-06-09 — Header, URL validation и CI gates
- `Header.tsx` сокращён и разделён на controller, JSON file service и UI-блоки.
- JSON import валидируется до записи в Canvas store; export использует Blob URL.
- `utils/videoUtils.ts` проверяет точный hostname RuTube через `URL`.
- Vitest ограничен двумя workers для стабильного полного прогона.
- Vitest и Deno tests добавлены в CI/deploy; актуальный результат: 412 + 197.
- Обновлены разделы 2, 4, 9, 11 и 13.

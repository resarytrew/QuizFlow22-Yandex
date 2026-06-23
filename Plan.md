# План улучшения проекта «Поток: QuizFlow22»

> Документ составлен после изучения исходного кода `App.tsx`, `store/useQuizStore.ts`, `types.ts`,
> `services/*`, `components/*`, конфигов сборки и SQL-миграций.
> Цель — собрать в одном месте все направления улучшений (от критичных до косметических),
> расставить приоритеты и дать конкретные шаги, чтобы можно было двигаться итерациями.

Условные обозначения приоритетов:
- 🔴 **P0** — критично (безопасность, утечки, потеря данных, блокеры).
- 🟠 **P1** — высокий (архитектура, стабильность, поддерживаемость).
- 🟡 **P2** — средний (производительность, UX, DX).
- 🟢 **P3** — низкий (косметика, дополнительные фичи).

---

## 1. Безопасность 🔴

### 1.1. Секреты в репозитории и в клиентском бандле — P0
Файлы `services/supabaseClient.ts` и `services/quizGenerator.ts` хранят реальный URL и `anon`-ключ Supabase прямо в коде. Кроме того, `quizGenerator.ts` инжектит эти значения внутрь генерируемого HTML-файла квиза — то есть **любой опубликованный/экспортированный квиз содержит ключи** в открытом виде.

Шаги:
1. Удалить значения из исходников; читать через `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
2. Сменить ключ Supabase (старый считаем скомпрометированным — он лежал в публичном репозитории).
3. Добавить `.env.example`, документацию по переменным.
4. Для генерируемого HTML — пробрасывать ключ через переменную окружения сборки, не из исходного кода.
5. Проверить весь репозиторий (`git log -p`) на наличие других секретов; при необходимости — `git filter-repo`.

### 1.2. Клиентские AI-ключи (Gemini, OpenRouter) — P0
`useQuizStore.generateImage` и `services/openRouterClient.ts` используют `VITE_API_KEY` / `process.env.API_KEY`. Любая `VITE_*` переменная **попадает в бандл** и видна в DevTools любому пользователю — это прямая утечка платного API-ключа.

Шаги:
1. Вынести вызовы AI (OpenRouter, Google GenAI) на backend-прокси (Supabase Edge Functions / Cloudflare Worker / небольшой Node-сервис).
2. Передавать с фронта только промпт + JWT пользователя.
3. На прокси — rate-limit per-user, аудит расходов, ротация ключей.
4. Удалить из `vite.config.ts` `define: { 'process.env.API_KEY': ... }`.

### 1.3. XSS в `quizEngine.parseText` — P0
`parseText()` собирает HTML через регулярки и подставляет в `innerHTML`. Источник текста — пользовательские поля (`question`, `description`, `message`, `dialogueText`, `answers[].text` и пр.). Это даёт XSS как в редакторе (Live Preview), так и в опубликованных квизах.

Шаги:
1. Заменить ручной markdown-парсер на `marked` + `DOMPurify` (или `markdown-it` со встроенной санитизацией).
2. Для подстановок `{{var}}` — экранировать значения.
3. В React-частях (`LivePreview`, `Dashboard`, `PublicQuizCard`) использовать `react-markdown` (уже в зависимостях) везде, где сейчас выводится `dangerouslySetInnerHTML`.

### 1.4. Sandbox iframe в QuizPlayer — P0
`<iframe sandbox="allow-scripts allow-same-origin">` фактически отключает sandbox: эти два флага вместе позволяют скрипту дотянуться до родителя и до сторейджа. Если внутри HTML квиза окажется чужой скрипт (см. 1.3), он получит полный доступ к Supabase-сессии родителя.

Шаги:
1. Убрать `allow-same-origin`. Если нужны куки/сторадж — поднимать через `postMessage` API.
2. Включить `referrerpolicy="no-referrer"`, `loading="lazy"`.
3. Добавить CSP в HTML-шаблоны квизов (`default-src 'self'`, разрешённые домены для видео/шрифтов).

### 1.5. `document.write` в `play.tsx` — P0
`play.tsx` использует `document.write(html)` — устаревший API, потенциальный XSS-вектор, ломает CSP. Лучше монтировать iframe или формировать `<srcdoc>`.

### 1.6. Небезопасный `math.evaluate` в FormulaNode — P1
`quizEngine.executeLogic` вызывает `math.evaluate(d.expression, scope)`. Если выражение пришло из импортированного JSON / стороннего шаблона, оно может ссылаться на глобальный scope mathjs (`import`, `evaluate`).

Шаги:
1. Использовать `math.parse(expr).compile().evaluate(scope)` + whitelist функций (`math.import({ /* funcs */ }, { override: true })` отдельной inst).
2. Запретить функцию `import`, `createUnit`, `evaluate` через `math.import({ import: ..., createUnit: ... }, { override: true })`.

### 1.7. RLS-политики Supabase — P1
В `001_sessions.sql` политика
```sql
USING (auth.uid() = user_id OR user_id IS NULL)
```
позволяет **любому анониму** изменять/удалять любые сессии с `user_id IS NULL`. Это значит, что любой может затереть гостевые прохождения чужих квизов.

Шаги:
1. Разделить политики: `FOR SELECT`, `FOR INSERT WITH CHECK`, `FOR UPDATE USING + WITH CHECK`.
2. Анонимы — только `INSERT` (с привязкой `session_id` в куке/localStorage), без обновления чужих строк.
3. Добавить миграцию для существующей схемы `quizzes`, `quiz_results` — все политики аудировать.

### 1.8. Прочее — P2
- В `Quiz/AuthModal` нет защиты от brute-force (Supabase делает это сам, но лучше иметь капчу).
- В `signOut` — не очищается локальное состояние (autosave, draft, аналитика).
- Логи `console.log('Supabase Auth Event:', event)` в продакшене — раскрывают внутренности.

---

## 2. Архитектура и поддерживаемость 🟠

### 2.1. God-store `useQuizStore` (899 строк) — P1
Один Zustand-стор объединяет: nodes/edges, UI panels, модалки, auth, AI, CRUD квизов, history, autosave, шаблоны. Тестировать невозможно, любые изменения сложно изолировать.

Шаги:
1. Разделить на слайсы: `useGraphStore` (nodes/edges/history), `useUIStore` (panels/modals), `useAuthStore`, `useQuizzesStore` (CRUD), `useAIStore`.
2. Использовать паттерн middleware: `subscribeWithSelector`, `immer`, `persist` (вместо ручного localStorage).
3. Вынести побочные эффекты (Supabase, toast) в actions/services, чтобы слайсы были чистыми.

### 2.2. `quizEngine.ts` как строка-шаблон — P1
768 строк JavaScript в виде template-string: `var`, ручной DOM, никакой типизации, никаких тестов. `JSON.stringify` подставляется через `replace('%%QUIZ_DATA_JSON%%', ...)` — fragile (любая `<` в данных может развалить вывод; уже есть хак с `</script>`).

Шаги:
1. Переписать engine как отдельный TS-модуль (`engine/`), собрать отдельным Vite-конфигом в один IIFE-бандл.
2. Внутри — модули: `Engine`, `Renderer`, `Audio`, `Video`, `SessionTracker`, `Effects`.
3. Покрыть unit-тестами (vitest): навигация, group-stack, applyEffects, прогрессии.
4. Передавать данные через `<script type="application/json" id="quiz-data">…</script>` + `JSON.parse(document.getElementById('quiz-data').textContent)` вместо строковой подстановки.

### 2.3. Огромные компоненты — P1
| Файл | Строк | Что внутри |
|---|---|---|
| `components/AIQuizWizard.tsx` | 2076 | Все шаги мастера |
| `components/SettingsPanel.tsx` | 1585 | Настройки для всех типов узлов |
| `components/AnalyticsModal.tsx` | 1249 | Графики, таблицы, фильтры |
| `components/MethodologicalGuide.tsx` | 1162 | Длинный текстовый гайд |
| `components/LandingPage.tsx` | 1116 | Лэндинг |
| `components/modals/QuizPassportModal.tsx` | 688 | Форма паспорта |
| `components/Dashboard.tsx` | 583 | Дашборд + список квизов |

Шаги:
1. Разбить по фичам/секциям: `SettingsPanel/QuestionNodeSection.tsx`, `SettingsPanel/DesignSection.tsx`, и т.п.
2. Для гайда / паспорта — вынести контент в `data/*` (JSON/MDX) и рендерить через универсальный компонент.
3. Для лэндинга — компоненты по секциям, `lazy()` для тяжёлых блоков (Three.js, framer).

### 2.4. Двойная система модулей (CDN importmap + npm) — P1
`index.html` подключает React/Zustand/ReactFlow через `aistudiocdn.com` importmap, а `package.json` тянет их же через npm. Это:
- риск рассинхронизации версий;
- двойная загрузка в проде;
- `404.html` использует ESM-shim react@18, основной html — react@19.

Шаги:
1. Удалить importmap из `index.html`. Все импорты — через Vite-бандл.
2. Привести версии в `404.html` в соответствие или удалить его (для SPA-роутинга на GitHub Pages достаточно `index.html` + хеш-роутинга — он уже используется).
3. Заменить `<script src="https://cdn.tailwindcss.com"></script>` на нормальную сборку Tailwind через PostCSS — CDN-вариант сам Tailwind не рекомендует для прода.

### 2.5. `as any` и mock-типы вместо реальной типизации — P1
В `store`, `QuizEditor`, `BaseNode` и др. ReactFlow импортируется как `* as ReactFlow as any`, с локальными `type Node = any`. Это полностью теряет автодополнение и проверки.

Шаги:
1. Использовать именованные импорты из `reactflow`: `import { ReactFlow, Background, Controls, useReactFlow, type Node, type Edge } from 'reactflow';`.
2. Сделать обобщённый `type AppNode = Node<NodeData>` и использовать его всюду.
3. В `types.ts`: `QuizData.nodes: AppNode[]` (не `any[]`).

### 2.6. Дубли (`play.tsx` vs `QuizPlayer.tsx`) — P2
Есть два почти идентичных проигрывателя:
- `play.tsx` + `play.html` — отдельная страница;
- `components/QuizPlayer.tsx` — компонент внутри SPA.

Шаги:
1. Оставить один путь — компонент QuizPlayer внутри SPA через `#/play/:id`.
2. `play.html`/`play.tsx` удалить, либо превратить в чистый редирект на хэш-маршрут.

### 2.7. Магические замены строк в генераторе — P2
`quizGenerator.ts` использует `String#replace` с маркерами вида `%%QUIZ_DATA_JSON%%`. Если данные содержат этот же маркер — ломается. Если маркера в шаблоне нет — тихо игнорируется.

Шаги:
1. Перейти на безопасный шаблонизатор (например, `mustache`) либо явный `split/join`.
2. Добавить инвариант: после генерации проверять, что все плейсхолдеры заменены, иначе бросать ошибку в dev.

---

## 3. Типизация и качество кода 🟠

### 3.1. Включить strict TypeScript — P1
`tsconfig.json` не содержит `"strict": true`. Куча `any`, `?` на полях, `as any`, mock-типов.

Шаги:
1. Включить `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
2. Поэтапно убрать `any` (начать с `store`, `services`).
3. Заменить `session: any | null` на `Session | null` из `@supabase/supabase-js`.

### 3.2. Линтер и форматтер — P1
Нет ESLint/Prettier. В коде встречаются варианты кавычек, отступов, неиспользуемые импорты.

Шаги:
1. Добавить `eslint` + `@typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react`.
2. `prettier` + `lint-staged` + `husky`.
3. Конфиг для GitHub Actions: `pnpm lint && pnpm typecheck` на каждый PR.

### 3.3. Валидация внешних данных через Zod — P1
Уже подключён `zod`, но он нигде не используется. Загрузка `quiz_data` из Supabase и JSON-импорт делается без валидации — структура `any`.

Шаги:
1. Определить схемы: `QuizDataSchema`, `NodeSchema` (discriminated union по `type`).
2. Валидировать ответы Supabase (`.parse` / `.safeParse`).
3. Валидировать импорт JSON-файлов (`Import Quiz`).
4. Валидировать ответы AI (там, где ждём JSON).

### 3.4. Имя пакета и метаданные — P3
В `package.json` имя `"copy-of-поток:-визуальный-конструктор-ветвящихся-квизов"` — невалидно для npm (кириллица, двоеточие). Версия `0.0.0`. Нет `description`, `repository`, `license`.

### 3.5. Удалить логи и закомментированные блоки — P3
`console.log('Supabase Auth Event:', event)`, `console.warn(...)` и т.п. Для прода — Sentry/Rollbar/`pino`.

---

## 4. Производительность 🟡

### 4.1. `fetchUserQuizzes` никогда не обновляется — P1
```ts
if (userQuizzes.length > 0) return;
```
После первой загрузки список не перечитывается. После создания/удаления квиза список обновляется через повторный `fetchUserQuizzes`, но он сразу возвращается. Из-за этого обновления делаются только через локальные `set`.

Шаги:
1. Заменить кэш-флаг на проверку «прошло ли N минут» либо явный invalidate.
2. Лучше — React Query / TanStack Query: автоматический кэш, инвалидация, оптимистичные обновления.

### 4.2. История undo/redo держит полные снапшоты — P2
`history.past` / `future` хранят полные массивы `nodes`/`edges` (до 20 снапшотов). При больших квизах — заметный расход памяти.

Шаги:
1. Использовать `immer` patches (`enablePatches()`) и хранить только дельты.
2. Сжимать длинные строки (description, imageUrl Data URLs) — выносить в отдельное хранилище.

### 4.3. Хранение Data-URL изображений — P2
`generateImage` сохраняет base64 в `aiGeneratedImage`; `updateNodeData` может класть Data-URL прямо в `node.data.imageUrl`. Это раздувает JSON квиза и localStorage-автосейв (квота 5MB).

Шаги:
1. Все изображения класть в Supabase Storage, в `node.data.imageUrl` — только URL.
2. В `autosaveCurrentQuiz` — перед сохранением заменять Data-URL на placeholder либо предупреждать.

### 4.4. Tailwind через CDN — P2
`<script src="https://cdn.tailwindcss.com">` — сам Tailwind помечает это как **dev only**: JIT-компиляция в рантайме, нет purge, большой объём CSS, нет тэжшейкинга.

Шаги:
1. Поставить `tailwindcss`, `postcss`, `autoprefixer` (или `@tailwindcss/vite` v4).
2. Настроить `content` для purge.
3. Кастомные стили из `index.html`/`404.html` перенести в `src/index.css`.

### 4.5. Lazy-load и chunk-splitting — P2
Уже есть `React.lazy`, но многие тяжёлые модули (`three`, `framer-motion`, `canvas-confetti`, `dagre`, AI-клиенты) подключаются сразу. На главной странице (LandingPage) грузится 1MB+ JS.

Шаги:
1. Прогнать `vite-bundle-visualizer` и явно вынести Three.js, framer-motion, конструктор квиза в отдельные чанки.
2. Удалить неиспользуемые зависимости (если `three` нужен только на лэндинге — `import('three')` лениво).

### 4.6. ReactFlow и большие графы — P3
- В `QuizEditor` для каждого узла есть тяжёлый `BaseNode` с blur/ring/animate-ping. Если квиз большой (> 100 узлов), редактор лагает.
- Включить `nodesDraggable={false}` при `isCanvasLocked` (уже есть), плюс `onlyRenderVisibleElements={true}` (свойство ReactFlow).

### 4.7. ResizeObserver `fitView` каждые 100мс — P3
В `QuizEditor` ResizeObserver вызывает `fitView` с debounce 100мс. При drag сайдбара может бессмысленно ре-фититься. Увеличить debounce до 250–300мс или вызывать только при первом маунте.

---

## 5. Данные и backend 🟠

### 5.1. Документация схемы Supabase — P1
В репозитории есть только одна миграция (`001_sessions.sql`). Нет схемы для `quizzes`, `quiz_results`, `assets`, `contest_submissions`. Деплой на чистый проект Supabase невозможен.

Шаги:
1. Сгенерировать `pg_dump --schema-only` либо вручную написать миграции для всех таблиц.
2. Переехать на Supabase CLI: `supabase/migrations/`, `supabase db push`.
3. Documenter (`supabase gen types typescript`) — сгенерировать TS-типы и удалить ручные дубли.

### 5.2. Автосохранение в localStorage без квоты — P2
`autosaveCurrentQuiz` каждые 2 минуты пишет полный JSON квиза в `localStorage`. Если в квизе картинки Data-URL — переполнение → silent fail.

Шаги:
1. Перейти на IndexedDB (`idb`) — большие квоты, async.
2. Хранить только diff к последнему серверному сейву.
3. В UI — индикатор «несохранённые изменения» с честным статусом.

### 5.3. Retry-логика теряет данные — P2
В `quizEngine.saveResults` при ошибке удаляется `payload.path_data` и делается retry. Если ошибка не из-за path_data — тихо потеряем колонку.

Шаги:
1. Определить, из-за чего падает (обычно — RLS/тип/размер).
2. Делать таргетированный retry с понятной причиной, логировать в `error_log`.

### 5.4. `quiz_results` vs `quiz_sessions` — P2
В новой миграции добавлена сущность `quiz_sessions`, но `saveResults` (старый путь) тоже пишет в `quiz_results`. Дублирование данных, не определена авторитетная таблица для аналитики.

Шаги:
1. Сделать `quiz_results` производной (вьюшка / агрегат) от `quiz_sessions`.
2. Или: оставить только `quiz_sessions`, удалить `quiz_results` (с миграцией данных).

---

## 6. Тестирование 🟠

### 6.1. Нет ни одного теста — P1
Шаги:
1. Установить `vitest` + `@testing-library/react` + `jsdom`.
2. **Unit**:
   - `quizEngine` — навигация, applyEdgeEffects, condition evaluation, progression rules.
   - `store/slices/*` — actions, undo/redo, autosave.
   - `services/openRouterClient` — parseError, extractFirstJsonObject (на edge-кейсах).
3. **Integration** (RTL):
   - `QuizEditor` — drag-and-drop, контекстное меню, удаление узла.
   - `LivePreview` — пройти простой квиз с условием.
4. **E2E** (Playwright): создать квиз → пройти → проверить запись результата.
5. CI: запускать на каждый PR.

### 6.2. Smoke-тесты шаблонов — P2
В `services/templates/*` лежат 9 шаблонов (army, ww2 и т.п.). Если ломается генератор HTML — узнаём только в браузере. Снапшот-тесты на каждый шаблон + минимальный smoke-рендер.

---

## 7. UX / Доступность 🟡

### 7.1. Локализация — P2
Всё захардкожено по-русски. Если планируется международная аудитория — нужно вытащить строки в i18n (`i18next`/`react-intl`).

### 7.2. Доступность (a11y) — P2
- В модалках нет `focus-trap` и возврата фокуса после закрытия.
- Многие кликабельные `<div>` должны быть `<button>`.
- Нет `aria-live` для тостов прогресса AI.
- В `Sidebar` и `BottomControlBar` иконки без `aria-label`.
- Контраст некоторых текстов в landing/dark-теме на грани WCAG AA.

Шаги:
1. Добавить `eslint-plugin-jsx-a11y` и пройти его warnings.
2. Использовать `@radix-ui/react-dialog` или `react-aria` для модалок.
3. Прогнать axe-core в e2e-тестах.

### 7.3. Mobile — P2
- `QuizEditor` — на мобильнике почти неюзабелен; явно сообщать пользователю «откройте на десктопе».
- `QuizPlayer` — мобильный layout не проверен (в коде есть `min-h-[400px]`, фиксированные ширины).

### 7.4. Дашборд: пустые состояния — P3
В `Dashboard` нет понятного пустого состояния «у вас ещё нет квизов» с CTA. В `MyQuizzes` — нет пагинации/виртуализации (если квизов 100+).

### 7.5. Глобальный таймер — P3
Когда `globalTimer.enabled`, на холсте редактора нет визуального превью таймера. Стоит показать badge в Header.

---

## 8. DevOps / CI / Релизы 🟡

### 8.1. CI/CD — P1
Сейчас деплой ручной (через GitHub Pages «from branch»). Нет проверок перед мержем.

Шаги:
1. GitHub Actions:
   - `lint`, `typecheck`, `test`, `build` на каждый PR.
   - Деплой на GH Pages из артефакта `dist/` при пуше в `main`.
   - При желании — Preview-деплой на Vercel/Netlify для каждой ветки.
2. Защита `main`: require PR, require status checks.

### 8.2. Версионирование и changelog — P2
- Перейти на `changesets` или `semantic-release`.
- В `package.json` — `version: "0.1.0"`, постепенно поднимать.

### 8.3. Sentry / error reporting — P2
Подключить Sentry (или открытый `glitchtip`) для отлова рантайм-ошибок. Сейчас всё, что не поймал `CanvasErrorBoundary`, идёт в `console.error` и теряется.

### 8.4. SEO и share-метки — P3
- В `index.html` — нет `<meta name="description">`, `og:*`, `twitter:card`, `<link rel="canonical">`.
- Для публичных квизов — динамический OG-image.

---

## 9. AI-функциональность 🟡

### 9.1. Stub-методы — P1
В сторе:
```ts
generateDetailedPlan: () => toast.error("Функция в разработке"),
generateQuizFromIdea: () => toast.error("Функция в разработке"),
analyzeQuizComplexity: () => toast.error("Функция в разработке"),
```
В UI они доступны через `AIAssistantPanel` / `AIQuizWizard`. Либо реализовать (через backend-прокси, см. 1.2), либо скрыть кнопки.

### 9.2. Контракт с AI — P2
- В `generateNodeFeedback` парсится JSON без zod-валидации (`JSON.parse(response)`).
- Нет ретрая при «модель вернула неполный JSON».
- Нет ограничения длины промпта — большие квизы могут не пролезть в context window.

Шаги:
1. Использовать `parseJsonWithRepair` (он уже есть в `openRouterClient`) везде.
2. Валидировать через zod схемы.
3. Считать tokens (`tiktoken`) и обрезать контекст.

### 9.3. Модели — P3
Хардкод `gemini-2.5-flash-image`, `openai/gpt-4o-mini`. Сделать конфигурируемым (через env / UI settings).

---

## 10. Сборка, зависимости, гигиена 🟢

### 10.1. Чистка зависимостей — P2
Проверить, что используется реально:
- `three` — где?
- `framer-motion` — стоит ли везде, или можно заменить CSS-анимациями.
- `canvas-confetti` — только при complete? lazy-load.
- `@google/genai` + `openRouterClient` — оба одновременно нужны?

Команда: `pnpm dlx depcheck` / `pnpm dlx knip`.

### 10.2. Vite-плагины — P3
- `vite-plugin-checker` — тайпчек в dev одновременно с HMR.
- `vite-plugin-pwa` — если планируется offline-режим.
- `rollup-plugin-visualizer` — для анализа бандла.

### 10.3. Чистка `index.html` / `404.html` — P3
- Дублирующиеся `<style>` блоки → перенести в `src/index.css`.
- Несовпадающие importmap → удалить.
- `404.html` для GH Pages: достаточно минимального HTML с `<script>` редиректом, не нужно дублировать всё.

### 10.4. README — P3
README описывает только базовую настройку Supabase. Добавить:
- `npm install`, `npm run dev`, `npm run build`.
- Какие env-переменные нужны.
- Архитектурный обзор (где живут узлы, движок, генератор HTML).
- Как добавить новый тип узла (чек-лист: `types.ts` → `customNodes/*` → `nodeTypes.ts` → `quizEngine` рендер → `SettingsPanel` секция).

---

## 11. Дорожная карта по итерациям

### Итерация 1 — «Залатать дыры» (1–2 недели) 🔴
- 1.1 Ротация ключа Supabase + переезд на env.
- 1.2 Backend-прокси для AI (минимум: Supabase Edge Function).
- 1.3 Санитизация HTML (DOMPurify) везде, где `innerHTML`.
- 1.4 Починить iframe sandbox в QuizPlayer.
- 1.7 Аудит RLS-политик.
- 8.1 Базовый GitHub Actions `lint + typecheck + build`.

### Итерация 2 — «Стабильность» (2–3 недели) 🟠
- 2.1 Разбить `useQuizStore` на слайсы.
- 2.5 Убрать `as any`, нормально импортировать ReactFlow.
- 3.1 `strict: true`.
- 3.2 ESLint + Prettier.
- 3.3 Zod-валидация Supabase ответов и JSON-импорта.
- 6.1 Vitest + первые unit-тесты для engine и store.

### Итерация 3 — «Чистота» (2 недели) 🟠
- 2.2 Переписать `quizEngine` как отдельный TS-модуль.
- 2.3 Разбить мега-компоненты (начать с `SettingsPanel`, `AIQuizWizard`).
- 2.4 Удалить importmap, нормальная сборка Tailwind.
- 4.4 Tailwind через PostCSS.

### Итерация 4 — «Опыт пользователя» (2 недели) 🟡
- 4.1, 4.2 Производительность (React Query, immer patches).
- 4.3 Перенос Data-URL в Storage.
- 7.1 i18n.
- 7.2 a11y.
- 8.3 Sentry.
- 9.1 Доделать или скрыть AI-stub'ы.

### Итерация 5 — «Полировка» (по необходимости) 🟢
- 7.3 Mobile.
- 7.4–7.5 Empty states, глобальный таймер UI.
- 8.4 SEO.
- 10.x Чистка зависимостей, README, доки.

---

## 12. Чек-лист «definition of done» для каждой задачи

- [ ] Код покрыт минимум одним unit-тестом (где применимо).
- [ ] `pnpm typecheck` и `pnpm lint` проходят.
- [ ] Обновлён `README` / inline-docs, если меняется публичный контракт.
- [ ] Нет новых `any` / `as any`.
- [ ] Изменения протестированы вручную в Dashboard, Editor, LivePreview и QuizPlayer.
- [ ] Если меняется БД — миграция и обновлённые RLS-политики приложены.
- [ ] Нет `console.log` в diff (только через единый logger).

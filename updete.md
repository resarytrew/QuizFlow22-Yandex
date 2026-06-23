1. АРХИТЕКТУРА И КОД — 12/20

Что плохо
🔴 quizEngine.ts — 850 строк template literal
TypeScript

export const quizEngineScript = `(function() {
    ${safePurifySource}
    // ... 850 строк JS внутри строки
})();`;
Это главный архитектурный долг:

невозможно тестировать
невозможна минификация
escape hell с DOMPurify, regex, dollar signs
IDE не подсвечивает
TypeScript не проверяет
hot reload не работает
Этот файл — слабое место всей кодовой базы.

🔴 quiz_data как jsonb монолит
SQL

CREATE TABLE quizzes (
quiz_data jsonb NOT NULL -- весь граф в одном поле
);
Это архитектурный потолок:

нельзя делать запросы по типам нод эффективно
нельзя версионировать отдельные ноды
нельзя сделать real-time collaboration
нельзя сделать инкрементальные сохранения
🔴 Зависимости стора от роутера
TypeScript

// useQuizDataStore.saveQuiz()
router.navigate({ to: '/editor/$quizId', ... });
Стор должен не знать про роутер. Это противоречит SRP.

🔴 deepMerge собственного производства
TypeScript

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
// 15 строк кастомного кода
}
Не обрабатывает:

null значения (явное удаление)
Date, RegExp, Map, Set
циклические ссылки
глубокую вложенность с большими объектами
Использование immer решило бы это с гарантиями.

🔴 Смешение var и let в quizEngine
TypeScript

var nodeById = Object.create(null); // var
let bgAudio = null; // let
var state = { ... }; // var
let currentVideoLockState = { ... }; // let
Бессистемно. Видно что код рос наслоениями.

⚠️ collapseVariableChainToEffects в useCanvasStore
70-строчная бизнес-логика оптимизации графа живёт в canvas store. Должна быть в services/graphOptimizer.ts.

⚠️ structuredClone × 50 snapshots в истории
Для квиза с 200 нодами:

каждый takeSnapshot клонирует ~2MB
50 snapshots = ~100MB в памяти
Safari iOS убьёт вкладку
Нет structural sharing (immer patches), нет адаптивного лимита.

2. БЕЗОПАСНОСТЬ — 16/20

Что плохо
⚠️ unsafe-eval в production CSP
HTML

script-src 'self' 'unsafe-eval'
Нужно для new Function(quizEngineScript)() в preview-режиме. Это намеренный trade-off, но всё равно ослабляет CSP.

⚠️ quiz_results INSERT WITH CHECK (true)
SQL

CREATE POLICY "Anyone can insert results"
ON quiz_results FOR INSERT WITH CHECK (true);
Любой анонимный пользователь может писать произвольные результаты в любой квиз. Открытый вектор:

накрутки аналитики
спама БД
потенциального DoS
Должна быть rate-limit + проверка EXISTS(quizzes WHERE id=quiz_id AND is_published=true).

⚠️ Нет MFA для admin аккаунтов
В Phase 4 known issue, но не закрыто.

3. ТЕСТИРОВАНИЕ — 15/20

Что плохо
🔴 SQL тесты не в CI
text

SQL: ~36 тестов запускаются вручную через psql
Тесты на process_payment_atomic, save_quiz_result_atomic, RLS существуют, но:

не запускаются в CI
сломанные миграции попадут в production
нужно supabase start локально для проверки
🔴 0 unit-тестов для Zustand сторов
7 сторов с сложной логикой (optimistic updates, debounce, event bus) — нет тестов.

🔴 0 тестов для quizEngine.ts
850-строчный template literal — невозможно тестировать как модуль. Тестируемые копии (state.ts и т.д.) покрывают часть, но сам quizEngine.ts не покрыт.

🔴 0 E2E тестов
Нет Playwright. Критические пути не покрыты:

signup → editor → publish → play
billing checkout → return → entitlement update
auth confirm flow
🔴 Component тесты только для auth + Header
QuizEditor, Dashboard, QuizPlayer, customNodes — без тестов.

4. ПРОИЗВОДИТЕЛЬНОСТЬ — 9/20

Что плохо
🔴 structuredClone на каждый snapshot
TypeScript

const snapshot = {
nodes: structuredClone(nodes),
edges: structuredClone(edges),
};
Для квиза с 200 нодами:

~2MB на snapshot
50 snapshots = 100MB в памяти
На мобильных = OOM
🔴 Undo/Redo делает 4× structuredClone
TypeScript

undo: () => {
set({
nodes: structuredClone(previous.nodes), // 1
edges: structuredClone(previous.edges), // 2
history: {
future: [structuredClone({ nodes, edges }), ...] // 3, 4
}
});
}
Один undo = 8MB копий для большого графа.

🔴 Нет lazy loading для routes
Все route-bundle'ы грузятся initially. BillingPage, TemplatesPage, ContestDashboard — должны быть lazy.

🔴 Нет prefetch медиа для следующего узла
Изображения начинают грузиться только при renderNode. Можно prefetch при первом рендере текущей ноды.

🔴 fetchUserQuizzes без debounce/abort
Два быстрых вызова fetchUserQuizzes(true) = два одинаковых запроса. Нет AbortController.

🔴 Header всё ещё ре-рендерится много
После refactor лучше, но всё равно 7 подписок на useUIStore + чтение currentQuizName из useQuizDataStore → keystroke в имени квиза = re-render Header.

⚠️ Bundle size не отслеживается
Нет vite-bundle-visualizer в pipeline. Не понятно сколько весит итоговый JS.

⚠️ Нет performance budgets
LCP, FID, CLS не измеряются. Нет Core Web Vitals.

5. PRODUCTION-ГОТОВНОСТЬ — 12/20

Что плохо
🔴 ESLint не настроен
text

⚠️ ESLint ещё не настроен. До появления отдельного ESLint-конфига команда
`npm run lint` выполняет только `tsc --noEmit`.
Это позорно для проекта с 609 тестами. Любой senior спросит и не получит ответа.

5 минут работы.

🔴 Нет monitoring / observability
Sentry или Logflare для frontend errors — нет
Edge Function logs не структурированы
Нет аналитики по фичам (PostHog, Amplitude)
Нет performance monitoring
В production это слепая зона.

🔴 SMTP через личную Яндекс почту
text

Провайдер: Яндекс Почта (smtp.yandex.ru:587)
Аутентификация: пароль приложения (id.yandex.ru)
500 писем/день лимит. Для production это временное решение, не permanent. При росте — упрётесь.

🔴 PRO conversion 0%
Биллинг технически работает, но продукт не валидирован рынком. Нет ни одной платящей конверсии (по документации).

🔴 Нет HSTS на CDN
В Phase 6 known issue. Браузеры могут downgrade на HTTP.

🔴 Нет nonce-based CSP
unsafe-inline в production. В Phase 6 long-term fix.

⚠️ Нет rate limiting на frontend uploads
Можно загрузить в Supabase Storage без лимитов (только 50MB на файл).

⚠️ Backup/disaster recovery не задокументирован
Что если Supabase упадёт? Что если Yandex CDN недоступен? Нет процедуры.

6. DEVX / ПОДДЕРЖИВАЕМОСТЬ — 10/20

Что плохо
🔴 Нет ESLint
Уже упоминал. Без него:

нет запрета на any
нет проверки исчерпанности switch
нет no-floating-promises
нет no-use-before-define
нет единого code style
🔴 Прямые ../../components/ импорты
Без TypeScript path aliases (@/components/...). При перемещении файлов всё ломается.

🔴 Inline SVG иконки в Header
200+ строк JSX для иконок. Есть lucide-react в зависимостях, но не используется консистентно.

🔴 Inline <style> в Header
Animation @keyframes в JSX вместо tailwind config или global CSS.

🔴 alert() в коде
TypeScript

alert('Неверная структура JSON файла.');
Вместо toast.error(). У тебя есть react-hot-toast.

🔴 any встречается в нескольких местах
getTemplateById(templateId as any), data: any в collapseVariableChainToEffects.

🔴 Hoisting магия с supabase
TypeScript

function initSupabaseClient() {
supabase = window.supabase.createClient(...); // assignment
}
// ...
var supabase = null; // declared AFTER initSupabaseClient is called
⚠️ Нет Dependabot или Renovate
Зависимости устаревают без напоминаний.

⚠️ Нет PR template / CONTRIBUTING.md
Если присоединится новый разработчик — нет process.

Главные слабые места (что чинить)
💀 1. quizEngine.ts — 850 строк template literal
Самый большой архитектурный долг. Блокирует тесты, минификацию, sourcemap.

💀 2. quiz_data jsonb monolith
Блокирует collaboration, granular updates, эффективные queries.

💀 3. Нет ESLint
5 минут работы, но позорно показывать без него.

💀 4. SQL тесты не в CI
Сломанные миграции попадут в production.

💀 5. Memory leak в истории
100MB structuredClone × 50 snapshots на больших графах.

💀 6. Нет observability
Production без Sentry/мониторинга = слепая зона.

💀 7. quiz_results открытая INSERT policy
Анонимный спам в БД.

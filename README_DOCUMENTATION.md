# Поток / Поток — Визуальный конструктор ветвящихся квизов

Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Быстрый старт](#2-быстрый-старт)
3. [Архитектура](#3-архитектура)
4. [Технологический стек](#4-технологический-стек)
5. [Типы узлов](#5-типы-узлов)
6. [Структура хранилища](#6-структура-хранилища)
7. [Компоненты интерфейса](#7-компоненты-интерфейса)
8. [Движок квиза](#8-движок-квиза)
9. [База данных и Supabase](#9-база-данных-и-supabase)
10. [AI функциональность](#10-ai-функциональность)
11. [Настройки дизайна](#11-настройки-дизайна)
12. [Конкурсы и публикация](#12-конкурсы-и-публикация)
13. [Горячие клавиши](#13-горячие-клавиши)
14. [Структура файлов](#14-структура-файлов)
15. [Переменные квиза](#15-переменные-квиза)
16. [Разработка и контрибьюция](#16-разработка-и-контрибьюция)
17. [Биллинг и тарифы](#17-биллинг-и-тарифы)
18. [Edge Functions (Supabase / Deno)](#18-edge-functions-supabase--deno)
19. [Безопасность](#19-безопасность)
20. [Деплой в Yandex Cloud](#20-деплой-в-yandex-cloud)
21. [Roadmap (план развития)](#21-roadmap-план-развития)
1. Обзор проекта
Поток (Поток) — веб-платформа для создания визуальных ветвящихся квизов с помощью интуитивного drag-and-drop редактора. Платформа позволяет создавать интерактивные образовательные и развлекательные квесты с различными типами вопросов, логическими условиями, переменными и системой прогрессии.

Ключевые возможности
Возможность	Описание
Визуальный редактор	Drag-and-drop на основе React Flow
20 типов узлов	Вопросы, контент, логика, ввод данных
Система переменных	Переменные, формулы, условия
AI интеграция OpenRouter для генерации контента
Публикация	Галерея квизов, прямые ссылки
Конкурсы	Реестр участников и просмотр конкурсных работ
Встроенный плеер	Прохождение квиза без выхода из редактора
Автосохранение	LocalStorage с 24-часовым сроком жизни
История	Undo/Redo до 50 шагов
2. Быстрый старт
Требования
Node.js ≥ 18
npm ≥ 9
Аккаунт Supabase
API ключ Gemini (опционально)
Установка
Bash

# 1. Клонировать репозиторий
git clone https://github.com/your-org/potok.git
cd potok

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
# Заполнить .env своими значениями (см. раздел ниже)

# 4. Запустить dev сервер
npm run dev
Переменные окружения
Создайте файл .env в корне проекта:

Bash

# Supabase (обязательно)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini (для AI генерации изображений)
VITE_API_KEY=your-gemini-api-key

# OpenRouter (для AI генерации текста)
VITE_OPENROUTER_API_KEY=your-openrouter-key
⚠️ Никогда не коммитьте .env с реальными ключами в репозиторий.
Файл .env добавлен в .gitignore.

Пример файла .env.example (безопасно коммитить):

Bash

# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_PRIMARY_SITE_URL=https://mykviz.ru
VITE_ADDITIONAL_SITE_ORIGINS=https://mykviz.online

# AI вызывается только через серверный Yandex API Gateway (`VITE_API_URL`).
# Provider API keys хранятся в secrets Edge Functions и не имеют VITE_ prefix.

# Supabase Auth SMTP (server-side env/secrets, не VITE_)
SUPABASE_AUTH_SMTP_USER=your-yandex-mailbox@yandex.ru
SUPABASE_AUTH_SMTP_PASS=your-yandex-app-password
SUPABASE_AUTH_SMTP_ADMIN_EMAIL=your-yandex-mailbox@yandex.ru
Настройка Supabase
Bash

# 1. Создать проект на supabase.com
# 2. Запустить миграции
npx supabase db push

# 3. Настроить Storage
# Создать bucket "quiz-assets" с публичным чтением

# 4. Включить Auth
# Email/Password — обязательно, email confirmation включён
# Confirmation email template должен отправлять 6-значный код `{{ .Token }}`
# SMTP — custom Yandex SMTP `smtp.yandex.ru:465` с паролем приложения
# Password policy — минимум 8 символов, строчная и заглавная буквы, цифра
# Custom OAuth provider `custom:yandex` — для кнопки «Войти через Яндекс»
Скрипты
Bash

npm run dev        # Запустить dev сервер (Vite)
npm run build      # Сборка для продакшна
npm run preview    # Предпросмотр сборки
npm run typecheck  # Проверка TypeScript типов (tsc --noEmit)
npm run lint:eslint # ESLint flat config для frontend-кода
npm run lint       # typecheck + ESLint
npm run lint:functions # TypeScript-проверка Yandex Functions
npm test           # Vitest
npm run test:functions # Сборка/bundle Yandex Functions
npm run verify     # Полная локальная проверка: functions deps + lint + tests + build

# Полная проверка перед коммитом
npm run verify

ESLint настроен через `eslint.config.js`: подключены recommended-наборы JS/TypeScript,
React Hooks и React Refresh. Текущий baseline допускает предупреждения как техдолг,
но ошибки ESLint блокируют `npm run lint` и общий `npm run verify`.

3. Архитектура
Основные слои приложения
text

┌──────────────────────────────────────────────────────────────────┐
│                TanStack Router (src/router/index.tsx)            │
├──────────────────────────────────────────────────────────────────┤
│  Dashboard  │  QuizEditor  │  QuizPlayer  │  LandingPage  │  Billing  │
├──────────────────────────────────────────────────────────────────┤
│                  Zustand Stores (8 независимых сторов)           │
│  ┌─────────┬─────────┬──────────┬──────────┬──────┬───────────┐  │
│  │  Auth   │   UI    │  Canvas  │ QuizData │  AI  │ Autosave  │  │
│  │  Store  │  Store  │  Store   │  Store   │Store │  Store    │  │
│  └─────────┴─────────┴──────────┴──────────┴──────┴───────────┘  │
│            Entitlement Store (PRO-тариф, период, история)        │
│                   storeEvents.ts (Event Bus)                     │
├──────────────────────────────────────────────────────────────────┤
│                       React Flow Canvas                          │
│               (nodes, edges, 20 custom node types)              │
├──────────────────────────────────────────────────────────────────┤
│                       Services Layer                             │
│      supabaseClient │ quizEngine │ quizGenerator │ aiProxy       │
├──────────────────────────────────────────────────────────────────┤
│      Vite plugin: dev/build /__quiz_engine.js                    │
│      vite-plugin-quiz-engine.ts ─┐                                │
│      esbuild + `?raw` plugin     │ preview-режим LivePreview      │
│      services/quizEngine.entry.ts┘ (srcdoc iframe)               │
└──────────────────────────────────────────────────────────────────┘

### Два пути доставки движка квиза

В приложении есть **две независимые** точки, где пользователь видит
сгенерированный квиз: in-app `LivePreview` (srcdoc iframe в редакторе)
и `HtmlPreviewModal` / скачиваемый standalone HTML. Они используют
**разные** стратегии доставки движка, чтобы в обоих случаях CSP
оставался максимально строгим.

| Режим | Потребитель | Движок | Данные | CSP |
|---|---|---|---|---|
| `preview: true` (srcdoc iframe) | `LivePreview`, `useHeaderController.handlePreview`, `QuizCard`, `QuizPlayer` | `<script type="module" src="/__quiz_engine.js">` (внешний same-origin module, отдаётся `vite-plugin-quiz-engine.ts`) | `<script id="quiz-data" type="application/json">…</script>` | Родительский CSP: `script-src 'self' 'unsafe-eval'` (см. §19) |
| Standalone export (скачиваемый HTML) | `HtmlPreviewModal`, `useHeaderController.handleGenerate` | Inline `<script>{quizEngineScript}</script>` (template-string) | `var quizData = …` или `<script id="quiz-data" type="application/json">` | Self-contained: `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com` |

См. подробности: `services/quizGenerator/renderTemplate.ts`, `vite-plugin-quiz-engine.ts`, `services/quizEngine.entry.ts`, `index.html` (блок CSP-комментариев).
Поток данных
text

Пользователь взаимодействует с Canvas
    ↓
React Flow генерирует события (onNodesChange, onEdgesChange)
    ↓
useCanvasStore обновляет nodes/edges + записывает snapshot в history
    ↓
storeEvents.emit('QUIZ_LOADED' | 'CANVAS_CLEAR' | 'AUTOSAVE_RESTORE')
    ↓
Подписчики (другие сторы) реагируют на события
    ↓
React перерисовывает компоненты через Zustand subscriptions
Межсторовое взаимодействие
Сторы общаются через два паттерна:

Ситуация	Паттерн	Пример
Стор A читает данные стора B	getState() напрямую	useAuthStore.getState().session
Стор A изменяет стор B	Event Bus	storeEvents.emit('QUIZ_LOADED', ...)
Компонент читает данные	Хук с селектором	useCanvasStore(s => s.nodes)
Правило: Прямые импорты между сторами (import { useCanvasStore }) допустимы
только для чтения через getState(). Для записи — всегда через event bus,
чтобы избежать циклических зависимостей и упростить тестирование.

4. Технологический стек
Категория	Технология	Версия	Назначение
Frontend	React	19	UI фреймворк
Язык	TypeScript	5	Типизация
State	Zustand	5	Управление состоянием (8 сторов)
Canvas	React Flow	11	Визуальный редактор
Стили	Tailwind CSS	3	Утилитарные классы
Анимации	Framer Motion	11	Анимации UI (cardEntry, staggerChildren)
UI-primitives	MagneticButton, GalleryCard, BentoGrid, PinterestGrid	—	Переиспользуемые компоненты
Хуки	useCard3D	—	3D-tilt + spotlight (respects prefers-reduced-motion)
Sanitize	DOMPurify	—	Inline-import через Vite `?raw` (XSS-защита плеера)
Backend	Supabase	—	Postgres, Auth, Storage, Edge Functions
Serverless	Deno + Supabase Edge Functions	—	`ai-proxy`, `admin-api`, биллинг (9+ функций)
Биллинг	ЮKassa	—	Российский платёжный шлюз (PRO-подписки)
Хостинг фронта	Yandex Object Storage + CDN	—	S3-совместимое статическое хранилище
AI	Google Gemini / OpenAI / YandexGPT	2.5+	Через `ai-proxy` Edge Function (ключ на сервере)
AI	OpenRouter	—	Опциональный fallback-провайдер для текста
Build	Vite	6	Сборщик
Deploy	GitHub Actions → Yandex OS	—	CI/CD (`.github/workflows/deploy.yml`)
Иконки	Lucide React	—	Иконки интерфейса
Pkg manager	npm	9+	Локальная разработка
5. Типы узлов
Приложение поддерживает 21 тип узлов, организованных в 5 категорий.

Актуальное количество: см. `components/customNodes/nodeTypes.ts` и `components/QuizEditor/nodeTypes.ts`

5.1 Вопросы (Questions)
Question — Одиночный выбор
TypeScript

interface QuestionNodeData extends NodeData {
  title: string;                    // Текст вопроса
  options: {
    id: string;
    text: string;
    imageUrl?: string;              // Изображение варианта ответа для визуальных шаблонов
    isCorrect: boolean;
    points?: number;                // Очки за правильный ответ
  }[];
  correctAnswer?: string;           // ID правильного ответа для одиночного выбора
  screenQuiz?: {
    layout?: 'auto' | 'media-right' | 'media-left' | 'media-top' | 'image-grid' | 'question-only' | 'hero-media';
    transitionEffect?: 'swipe-reveal' | 'pixel-dissolve' | 'zoom-in-reveal' | 'glitch-cut';
    showTimer?: boolean;
    timerSeconds?: number;
  };                                // Локальные переопределения экранной викторины для этой ноды
  timer?: number;                   // Таймер в секундах (опционально)
  imageUrl?: string;                // Изображение к вопросу
  explanation?: string;             // Объяснение после ответа
}
Handles: по одному выходу на каждый вариант ответа (option-0, option-1, ...)

MultipleChoice — Множественный выбор
TypeScript

interface MultipleChoiceNodeData extends NodeData {
  title: string;
  options: {
    id: string;
    text: string;
    imageUrl?: string;              // Изображение варианта ответа для визуальных шаблонов
    isCorrect: boolean;
  }[];
  penaltyForWrong?: number;         // Штраф за неправильный ответ
  minCorrect?: number;              // Минимум правильных для продолжения
}
Handles: correct (все выбраны верно), partial, wrong

Timeline — Хронология
TypeScript

interface TimelineNodeData extends NodeData {
  title: string;
  events: {
    id: string;
    text: string;
    correctPosition: number;       // Правильная позиция (0-based)
  }[];
  pointsPerCorrect?: number;
}
Handles: correct, wrong

Matching — Сопоставление
TypeScript

interface MatchingNodeData extends NodeData {
  title: string;
  pairs: {
    id: string;
    left: string;                  // Левая колонка
    right: string;                 // Правая колонка
  }[];
  pointsPerPair?: number;
}
Handles: correct, partial, wrong

5.2 Контент (Content)
Info — Информационный блок
TypeScript

interface InfoNodeData extends NodeData {
  title: string;
  text: string;                    // Markdown поддерживается
  imageUrl?: string;
  videoUrl?: string;               // YouTube / RuTube URL
  buttonText?: string;             // Текст кнопки "Далее"
}
Handles: output (единственный выход)

Result — Экран результатов
TypeScript

interface ResultNodeData extends NodeData {
  title: string;
  text: string;                    // Поддерживает {{score}}, {{playerName}}
  showScore: boolean;
  showVariables?: string[];        // Имена переменных для отображения
  imageUrl?: string;
}
Handles: нет выходов (конечный узел)

Feedback — Обратная связь
TypeScript

interface FeedbackNodeData extends NodeData {
  correctTitle: string;
  correctText: string;
  incorrectTitle: string;
  incorrectText: string;
  showExplanation?: boolean;
}
Handles: output

Achievement — Достижение
TypeScript

interface AchievementNodeData extends NodeData {
  title: string;
  description: string;
  iconUrl?: string;
  points?: number;                 // Бонусные очки за достижение
  autoAdvance?: boolean;          // Автопереход после показа
  autoAdvanceDelay?: number;      // Задержка в мс
}
Handles: output

Dialogue — Диалог персонажа
```typescript
interface DialogueNodeData extends NodeData {
  characterName: string;             // Имя говорящего
  characterRole?: string;            // Роль: "Учитель", "Гид"
  characterAvatar?: string;          // URL аватара (круг 40×40)
  dialogueText: string;              // Текст реплики (Markdown)
  mood: 'neutral' | 'excited' | 'serious' | 'sad' | 'mysterious';
}
```
Handles: output

Используется для нарративных квизов (сторителлинг, ролевые сценарии, обучающие курсы). Поддерживает аватар + mood-индикатор.

5.3 Ввод данных (Data Input)
TextInput — Текстовый ввод
TypeScript

interface TextInputNodeData extends NodeData {
  title: string;
  placeholder?: string;
  variableName: string;            // Куда сохранить введённое значение
  keywords?: string[];             // Ключевые слова для проверки
  caseSensitive?: boolean;
}
Handles: match (ключевое слово найдено), noMatch

CollectInfo — Сбор данных пользователя
TypeScript

interface CollectInfoNodeData extends NodeData {
  title: string;
  fields: {
    name: string;                  // Имя поля (сохраняется как переменная)
    label: string;                 // Метка для пользователя
    type: 'text' | 'email' | 'phone' | 'number';
    required: boolean;
    variableName: string;          // Имя переменной для сохранения
  }[];
}
Handles: output

Allocator — Распределение бюджета
TypeScript

interface AllocatorNodeData extends NodeData {
  title: string;
  totalBudget: number;
  categories: {
    id: string;
    label: string;
    variableName: string;          // Переменная для хранения суммы
    min?: number;
    max?: number;
  }[];
}
Handles: output

5.4 Логика (Logic)
Condition — Условный переход
TypeScript

interface ConditionNodeData extends NodeData {
  variable: string;                // Имя переменной: "score", "playerName"
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number;
}
Handles: true (условие истинно), false (условие ложно)

Пример:

text

Если score >= 80 → узел "Отлично"
Иначе           → узел "Попробуй снова"
Score — Изменение очков
TypeScript

interface ScoreNodeData extends NodeData {
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  value: number;
}
Handles: output

Variable — Создание/изменение переменной
TypeScript

interface VariableNodeData extends NodeData {
  variableName: string;
  operation: 'set' | 'add' | 'subtract' | 'multiply' | 'append';
  value: string | number;
}
Handles: output

Formula — Вычисление по формуле
TypeScript

interface FormulaNodeData extends NodeData {
  resultVariable: string;          // Переменная для результата
  formula: string;                 // Формула: "score * 2 + bonus"
  // Поддерживает math.js синтаксис
  // Переменные квиза доступны по имени
}
Handles: output

Пример формул:

JavaScript

"score * 1.5"                    // Умножить очки
"sqrt(score) + bonus"            // Функции math.js
"score > 50 ? 100 : 0"          // Условие
GoTo — Безусловный переход
TypeScript

interface GoToNodeData extends NodeData {
  targetNodeId: string;            // ID узла назначения
}
Handles: нет (переход выполняется автоматически)

Progression — Система рангов
TypeScript

interface ProgressionNodeData extends NodeData {
  variable: string;                // Переменная для проверки (обычно "score")
  ranks: {
    id: string;
    label: string;                 // Название ранга: "Новичок", "Эксперт"
    minValue: number;
    maxValue: number;
    handle: string;                // Имя handle для этого ранга
  }[];
}
Handles: один на каждый ранг (rank-0, rank-1, ...)

5.5 Дополнительно (Additional)
Timer — Таймер
TypeScript

interface TimerNodeData extends NodeData {
  duration: number;                // Длительность в секундах
  showCountdown: boolean;          // Показывать обратный отсчёт
  autoAdvance: boolean;            // Автопереход по истечении
}
Handles: timeout (время вышло), manual (пользователь нажал кнопку)

Group — Группировка узлов
TypeScript

interface GroupNodeData extends NodeData {
  label: string;                   // Название группы
  color?: string;                  // Цвет группы для визуализации
  collapsed?: boolean;
}
Handles: input, output

Start — Точка входа
TypeScript

interface StartNodeData extends NodeData {
  label: string;                   // Обычно "Старт"
}
Handles: output (единственный, обязательный)

⚠️ Требование: Каждый квиз должен содержать ровно один узел Start.
Плеер начинает выполнение с этого узла.

6. Структура хранилища
Архитектура сторов
text

store/
├── index.ts              ← реэкспорт всех сторов и типов
├── storeEvents.ts        ← типизированный event bus
├── useAuthStore.ts       ← сессия, авторизация
├── useUIStore.ts         ← UI состояние (sidebar, panels, modals)
├── useCanvasStore.ts     ← nodes, edges, history, board settings
├── useQuizDataStore.ts   ← данные квиза, CRUD операции
├── useAIStore.ts         ← AI состояние и методы
└── useAutosaveStore.ts   ← автосохранение в localStorage
Event Bus (storeEvents.ts)
TypeScript

// Поддерживаемые события
type StoreEvent =
  | { type: 'CANVAS_CLEAR' }
  | { type: 'CANVAS_RESET' }
  | { type: 'QUIZ_LOADED'; payload: { nodes: Node<NodeData>[]; edges: Edge[] } }
  | { type: 'AUTOSAVE_RESTORE'; payload: AutosavePayload };

// API event bus
export const storeEvents = {
  // Отправить событие
  emit<T extends StoreEvent['type']>(
    type: T,
    ...args: EventMap[T] extends void ? [] : [payload: EventMap[T]]
  ): void,

  // Подписаться на все события
  subscribe(listener: (event: StoreEvent) => void): () => void,

  // Подписаться на конкретный тип (рекомендуется)
  on<T extends StoreEvent['type']>(
    type: T,
    handler: (payload: EventMap[T]) => void,
  ): () => void,
};
Таблица событий:

Событие	Payload	Источник	Обработчики
CANVAS_CLEAR	—	useQuizDataStore.createNewQuiz	useCanvasStore.reset
CANVAS_RESET	—	useQuizDataStore.createNewQuiz	useCanvasStore.reset
QUIZ_LOADED	{ nodes, edges }	useQuizDataStore.loadQuiz	useCanvasStore
AUTOSAVE_RESTORE	AutosavePayload	useAutosaveStore.restoreAutosave	useCanvasStore, useQuizDataStore
Пример использования:

TypeScript

// Рекомендуемый способ — type-safe .on()
storeEvents.on('QUIZ_LOADED', ({ nodes, edges }) => {
  // nodes и edges автоматически типизированы
  useCanvasStore.getState().setNodes(nodes);
  useCanvasStore.getState().setEdges(edges);
});

// Для нескольких событий — .subscribe()
storeEvents.subscribe((event) => {
  switch (event.type) {
    case 'CANVAS_CLEAR':
      console.log('Canvas cleared');
      break;
    case 'QUIZ_LOADED':
      console.log('Loaded nodes:', event.payload.nodes.length);
      break;
  }
});

// Эмит событий
storeEvents.emit('CANVAS_CLEAR');
storeEvents.emit('QUIZ_LOADED', { nodes: [], edges: [] });
useAuthStore
TypeScript

interface AuthStoreState {
  authInitialized: boolean;
  session: Session | null;          // Session из @supabase/supabase-js
  
  setAuthInitialized: (initialized: boolean) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;     // Promise.all + fallback window.location.reload
  reset: () => void;
}
Поведение signOut:

Мгновенно сбрасывает локальное состояние
Параллельно: выходит из Supabase + импортирует и сбрасывает все сторы
При ошибке — перезагружает страницу как fallback
useUIStore
TypeScript

interface UIStoreState {
  // Панели редактора
  isSidebarVisible: boolean;
  isSettingsPanelVisible: boolean;
  isAIAssistantPanelVisible: boolean;
  
  // Страницы
  isDashboardVisible: boolean;
  isGuideVisible: boolean;
  
  // Модальные окна
  isAuthModalOpen: boolean;
  isAssetManagerOpen: boolean;
  onAssetSelect: ((url: string) => void) | null;
  isWizardOpen: boolean;
  
  // Плеер
  isPreviewModeActive: boolean;
  previewStartNodeId: string | null;
  
  // Группировка на канвасе
  currentGroup: string | null;
  
  // Методы
  toggleSidebar: () => void;
  toggleSettingsPanel: () => void;
  toggleAIAssistantPanel: () => void;
  closeAIAssistantPanel: () => void;
  setDashboardVisible: (visible: boolean) => void;
  setGuideVisible: (visible: boolean) => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  openAssetManager: (onSelect?: (url: string) => void) => void;
  closeAssetManager: () => void;
  setWizardOpen: (isOpen: boolean) => void;
  resetWizard: () => void;
  setPreviewMode: (active: boolean, startNodeId?: string) => void;
  setCurrentGroup: (groupId: string | null) => void;
  reset: () => void;
}
useCanvasStore
TypeScript

interface CanvasStoreState {
  // Данные React Flow
  nodes: Node<NodeData>[];
  edges: Edge[];
  
  // Выделение
  selectedNode: Node<NodeData> | null;
  
  // Настройки доски
  boardSettings: BoardSettings;
  isCanvasLocked: boolean;
  isCanvasLoading: boolean;
  needsLayout: boolean;
  
  // История (limit: 50 snapshots, structuredClone)
  history: {
    past: { nodes: Node<NodeData>[]; edges: Edge[] }[];
    future: { nodes: Node<NodeData>[]; edges: Edge[] }[];
  };
  
  // React Flow callbacks
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  // CRUD
  addNode: (node: Node<NodeData>) => void;
  setNodes: (nodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void; // debounce 500ms
  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void;
  clearCanvas: () => void;
  
  // Выделение
  setSelectedNode: (node: Node<NodeData> | null) => void;
  
  // Настройки
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;
  toggleCanvasLock: () => void;
  setNeedsLayout: (needs: boolean) => void;
  setCanvasLoading: (loading: boolean) => void;
  
  // История
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // Оптимизация логики
  collapseVariableChainToEffects: (edgeId: string) => void;
  
  reset: () => void;
}
Ключевые детали реализации:

TypeScript

// updateNodeData — debounce для текстовых полей
// Таймер хранится в замыкании create(), не в состоянии стора
// (избегает лишних ре-рендеров)
updateNodeData: (id, data) => {
  set(/* обновление nodes и selectedNode */);
  
  // Дебаунс 500ms — не создаёт snapshot при каждом нажатии клавиши
  clearTimeout(updateNodeDataTimer);
  updateNodeDataTimer = setTimeout(() => {
    get().takeSnapshot();
  }, 500);
},

// takeSnapshot — structuredClone для глубокого копирования
takeSnapshot: () => {
  const snapshot = {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  };
  const newPast = [...history.past, snapshot].slice(-50); // лимит 50
  set({ history: { past: newPast, future: [] } });
},
useQuizDataStore
TypeScript

interface QuizDataStoreState {
  // Идентификация квиза
  currentQuizId: string | null;
  currentQuizName: string;
  templateId: QuizTemplateId;
  
  // Настройки
  globalTimer: GlobalTimer;
  designSettings: DesignSettings;   // обновляется через deepMerge
  
  // Список квизов пользователя
  userQuizzes: Quiz[];
  isQuizzesLoading: boolean;
  analyticsQuizId: string | null;
  pendingTemplate: QuizTemplate | null;
  
  // Сеттеры
  setCurrentQuizId: (id: string | null) => void;
  setCurrentQuizName: (name: string) => void;
  setTemplateId: (id: QuizTemplateId) => void;
  setGlobalTimer: (timer: Partial<GlobalTimer>) => void;
  updateDesignSettings: (settings: Partial<DesignSettings>) => void;
  setUserQuizzes: (quizzes: Quiz[]) => void;
  setAnalyticsQuizId: (id: string | null) => void;
  setPendingTemplate: (data: QuizTemplate | null) => void;
  
  // CRUD операции
  fetchUserQuizzes: (forceRefresh?: boolean) => Promise<void>;
  saveQuiz: () => Promise<void>;
  loadQuiz: (quiz: Quiz) => void;
  deleteQuiz: (id: string) => Promise<void>;
  duplicateQuiz: (id: string) => Promise<void>;
  createNewQuiz: () => void;
  
  // Публикация и управление
  toggleQuizFavorite: (id: string) => Promise<void>;
  updateQuizPublication: (
    id: string,
    data: { is_published: boolean; description?: string; cover_image_url?: string }
  ) => Promise<void>;
  updateQuizPassport: (id: string, passport: QuizPassport) => Promise<void>;
  cloneAndEditPublicQuiz: (publicQuiz: PublicQuiz) => Promise<void>;
  
  // Автосохранение
  restoreFromAutosave: (data: AutosavePayload) => void;
  
  reset: () => void;
}
Ключевые паттерны:

TypeScript

// saveQuiz — защита от двойного сабмита
saveQuiz: async () => {
  const { isCanvasLoading } = useCanvasStore.getState();
  if (isCanvasLoading) return;           // Guard
  
  setCanvasLoading(true);               // Лоадер
  // ... async операция ...
  setCanvasLoading(false);
},

// deleteQuiz — оптимистичное обновление с откатом
deleteQuiz: async (id) => {
  const prevQuizzes = get().userQuizzes;
  set(s => ({ userQuizzes: s.userQuizzes.filter(q => q.id !== id) })); // Мгновенно
  
  try {
    await supabase.from('quizzes').delete().eq('id', id);
  } catch (e) {
    set({ userQuizzes: prevQuizzes });  // Откат при ошибке
  }
},

// updateQuizPublication — один атомарный запрос
updateQuizPublication: async (id, data) => {
  await supabase.from('quizzes').update({
    is_published: data.is_published,
    published_at: data.is_published ? new Date().toISOString() : null,
    quiz_data: updatedQuizData,          // Всё в одном update
  }).eq('id', id);
},

// deepMerge — Object.keys вместо for...in (безопасность прототипа)
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    // Рекурсивное слияние вложенных объектов
  }
  return result;
}
useAIStore
TypeScript

interface AIStoreState {
  isAILoading: boolean;
  aiSuggestions: AISuggestion[];
  aiGeneratedImage: string | null;
  
  // Реализованные методы
  generateImage: (prompt: string, type: 'node' | 'background') => Promise<void>;
  generateNodeFeedback: (nodeId: string) => Promise<void>;
  saveGeneratedImageToLibrary: () => Promise<void>;
  
  // Заглушки (в разработке)
  generateDetailedPlan: (idea: AIQuizIdea, section: SectionType) => void;
  generateQuizFromIdea: (idea: AIQuizIdea) => void;
  analyzeQuizComplexity: () => void;
  
  // Утилиты
  setAILoading: (loading: boolean) => void;
  setAISuggestions: (suggestions: AISuggestion[]) => void;
  setAIGeneratedImage: (url: string | null) => void;
  clearAIState: () => void;
  reset: () => void;
}

// Типы
export interface AISuggestion {
  title: string;
  description: string;
  newNode: {
    type: CustomNodeType;
    data: Partial<NodeData>;         // Типизировано, не any
  };
}

export type AIQuizIdea = {
  title: string;
  description: string;
};

export type SectionType = 'intro' | 'body' | 'conclusion';
useAutosaveStore
TypeScript

interface AutosaveStoreState {
  autosavedData: AutosavePayload | null;
  lastAutosave: Date | null;
  
  autosaveCurrentQuiz: () => void;   // try/catch для QuotaExceededError
  checkForAutosave: () => void;      // 24h expiry + corrupted JSON cleanup
  restoreAutosave: () => void;       // Через restoreFromAutosave + storeEvents
  clearAutosave: () => void;
  reset: () => void;
}

// Payload автосохранения
export interface AutosavePayload {
  nodes: Node<NodeData>[];
  edges: Edge[];
  globalTimer: GlobalTimer;
  designSettings: DesignSettings;
  templateId: QuizTemplateId;
  currentQuizName: string;
}
Особенности:

Ключ в localStorage: potok_autosave
Версионирование: version: 1 в payload для будущих миграций
Срок жизни: 24 часа (проверяется при checkForAutosave)
Безопасность: try/catch на все операции с localStorage
Восстановление: через публичный API restoreFromAutosave (не setState напрямую)
7. Компоненты интерфейса
Главные компоненты
Компонент	Файл	Назначение
RouterProvider	src/router/index.tsx	Корневой TanStack Router, route tree и router context
QuizEditor	components/QuizEditor/index.tsx	Canvas редактора
QuizPlayer	components/QuizPlayer.tsx	Прохождение квиза
Dashboard	components/Dashboard.tsx	Список квизов пользователя
Sidebar	components/Sidebar.tsx	Палитра узлов (drag-and-drop)
SettingsPanel	components/SettingsPanel.tsx	Настройки выбранного узла
Header	components/Header.tsx	Верхняя панель
LivePreview	components/LivePreview.tsx	Предпросмотр квиза
LandingPage	components/LandingPage.tsx	Главная (marketing) страница
BillingPage	components/BillingPage.tsx	PRO-тарифы, история платежей, баннер подписки
BillingReturnPage	components/BillingReturnPage.tsx	Возврат пользователя с ЮKassa (`?status=...`)
MyQuizzes	components/MyQuizzes.tsx	Список квизов пользователя (новая)
Paywall	components/Paywall.tsx	Блок-плашка PRO-фич (для paywall-gating)
PlanBadge	components/PlanBadge.tsx	Маленький бейдж плана (Free/PRO)
MagneticButton	components/MagneticButton.tsx	UI-примитив: кнопка с magnet-эффектом
AIAssistantPanel	components/AIAssistantPanel.tsx	Боковая панель AI-помощника
AIQuizWizard	components/AIQuizWizard.tsx	Wizard генерации квиза из идеи
Documentation	components/Documentation.tsx	Встроенная документация платформы
MethodologicalGuide	components/MethodologicalGuide.tsx	Методичка для педагогов
TemplatesPage	components/TemplatesPage.tsx	Галерея шаблонов квизов
DesignPanel	components/DesignPanel.tsx	Панель дизайна (real-time preview)

`Header.tsx` является компоновочным компонентом. Логика и крупные UI-блоки
вынесены в `components/header/`:

| Модуль | Ответственность |
|---|---|
| `useHeaderController.ts` | Preview/HTML generation, save/save-as, import/export state |
| `quizFile.ts` | Строгая проверка структуры JSON, сериализация и Blob-download |
| `HeaderSaveControls.tsx` | Быстрое сохранение и выбор уровня доступа |
| `HeaderUserMenu.tsx` | Меню аккаунта и переходы пользователя |
| `HeaderModals.tsx` | Композиция модальных окон Header |

Импортируемый JSON сначала проходит `parseQuizFile()`. В `useCanvasStore`
попадают только массивы валидных React Flow nodes/edges. Экспорт использует
`Blob` + object URL вместо длинного `data:` URL.
QuizEditor — структура
```
QuizEditor/
├── index.tsx                    ← Главный компонент (~150 строк)
├── Canvas.tsx                   ← React Flow + Background + Controls
├── EditorMenus.tsx              ← Контекстные меню (узлы, рёбра, быстрое добавление)
├── EditorOverlays.tsx           ← Дополнительные overlay-элементы
├── LockBanner.tsx               ← Баннер блокировки канваса
├── EdgeLabelEditor.tsx          ← Редактор меток рёбер
├── LoadingScreen.tsx            ← Экран загрузки
├── StatusBar.tsx                ← Статусная строка (кол-во узлов/рёбер)
├── EnhancedMinimap.tsx          ← Мини-карта
├── BottomControlBar.tsx         ← Нижняя панель управления
├── ConnectionHint.tsx           ← Подсказка при соединении узлов
├── ToolbarButton.tsx            ← Кнопка тулбара
├── constants.ts                 ← DS (Design System), ZOOM, DEFAULT_W/H
├── FlowEdge.tsx                 ← Кастомный тип ребра
├── nodeTypes.ts                 ← Маппинг CustomNodeType → компоненты
├── layout.ts                    ← Алгоритм автоматического лейаута
├── createNewNode.ts             ← Фабрика узлов
├── Icons.tsx                    ← Иконки редактора
├── styles/
│   └── editor.css              ← React Flow переопределения через CSS переменные
└── hooks/
    ├── useEditorStore.ts        ← useEditorActions + useEditorData
    ├── useEditorMenus.ts        ← Состояние контекстных меню
    ├── useCanvasLayout.ts       ← Auto-layout, fitView, resize observer
    ├── useCanvasInteraction.ts  ← Drag/drop, context menus, connections
    └── useKeyboardShortcuts.ts  ← Горячие клавиши
```
Модальные окна
Компонент	Назначение
AuthModal	Вход / регистрация через Supabase Auth, регистрация через email OTP-код, сброс пароля и «Войти через Яндекс»
PublishModal / PublishQuizModal	Публикация квиза в галерею
ShareModal	Получение ссылки для прохождения
AnalyticsModal	Просмотр результатов прохождений
VariableManagerModal	Управление переменными квиза
AssetManagerModal	Медиатека — загрузка и выбор изображений
GlobalSettingsModal	Шаблон, глобальный таймер, звуки
WizardModal / AIQuizWizard	Мастер создания квиза (AI)
BoardSettingsModal	Настройки доски (фон, сетка)
ConfirmClearModal	Подтверждение очистки канваса
GeneratedHtmlModal	Сгенерированный standalone HTML
HtmlPreviewModal	Превью HTML перед скачиванием
PreviewModal	Модальное превью квиза
QuizPassportModal	Паспорт квиза (для конкурса)
GuideModal	Встроенный гайд

Биллинг-секция (`components/billing/`)
Компонент	Назначение
PricingCard	Универсальная карточка тарифа (`theme: 'light' | 'dark'`), 3D-tilt, MagneticButton, framer-motion
BillingPageBackground	Обёртка-фон для BillingPage (light + diamond pattern + indigo top glow)
SubscriptionStatusBanner	Баннер активной подписки + `cancel_at_period_end` chip
SubscriptionProgress	Тонкий progress bar до конца периода (gradient amber→orange, >85% красный)
PaymentHistoryList	Gallery-style список платежей (tabular-nums, status-pill, external link)
EmptyPayments	Empty state с иллюстрацией
featureLabels	Единый источник `FREE_PLAN`, `HARDCODED_PRO_PLANS`, `buildAllPlans`, `computeYearlySavings`, `formatPrice`

Лендинг (`components/landing/`)
Компонент	Назначение
LandingPricingSection	Тёмная секция тарифов на лендинге (conic-gradient blur orbs, Lora-italic heading, 3-карточный grid Free→Monthly→Yearly)

UI-примитивы (`components/ui/`)
Компонент	Назначение
MagneticButton	Кнопка с magnet-эффектом (используется в PricingCard CTA)
GalleryCard	Premium-карточка с 3D-tilt + spotlight (на базе `useCard3D`)
BentoGrid	Bento-сетка для нестандартных лейаутов
PinterestGrid	Pinterest-стиль masonry
AnimatedCounter	Анимированный числовой счётчик
ScrollToTop	Кнопка "наверх"

Хуки (`hooks/`)
Хук	Назначение
useCard3D	3D-tilt + spotlight эффект. Уважает `prefers-reduced-motion` И `hover: hover` (touch skip). Принимает `disabled` prop
Паттерны компонентов
TypeScript

// 1. Чтение данных из стора
const nodes = useCanvasStore(s => s.nodes);

// 2. Стабильные actions (функции стора не меняются)
const { deleteNode, updateNodeData } = useEditorActions();

// 3. Мемоизация тяжёлых вычислений
const visibleNodes = useMemo(
  () => nodes.filter(n => !n.data?.parentId || n.data.parentId === currentGroup),
  [nodes, currentGroup]
);

// 4. Стабильные обработчики событий
const handleClose = useCallback(() => setMenu(null), []);
8. Движок квиза
Движок реализован в двух местах:

| Файл | Назначение |
|---|---|
| `src/engine/` | Единственный исходник runtime: bootstrap, state, navigation, logic, renderers, media, persistence и sanitization. |
| `services/quizEngine.ts` | Тонкий адаптер: импортирует `dist/quizEngine.iife.js?raw` для встраивания в standalone HTML. |
| `vite-plugin-quiz-engine.ts` | Собирает `src/engine/index.ts` через esbuild, отдаёт `/__quiz_engine.js` в dev и эмитит `dist/__quiz_engine.js` при production build. `new Function` больше не используется для engine boot. |

Ключевая идея: `src/engine/index.ts` — **единый источник** runtime-логики движка. В standalone-режиме Rollup собирает IIFE, который инлайнится в `<script>` сгенерированного HTML. В preview-режиме тот же entry собирается в ESM-файл `/__quiz_engine.js`, чтобы srcdoc iframe не требовал inline-скриптов.

### Почему два пути, а не один

Главное ограничение — **CSP родительской страницы** (`script-src 'self' 'unsafe-eval'`). LivePreview рендерит квиз в `<iframe sandbox="allow-scripts allow-same-origin" srcdoc="…">`. Chromium **наследует** CSP родителя в same-origin sandboxed iframe и **intersect'ит** его с iframe-meta CSP. Это значит:

- inline `<script>…</script>` в srcdoc блокируется, даже если iframe-meta его разрешает;
- `<script src="…">` с `'self'` работает;
- `<script src="data:…">` или blob — нет (для `'self'` не подходит);
- разрешить `'unsafe-inline'` **только** для iframe невозможно — CSP intersect'ится.

Поэтому движок в preview-режиме доставляется как **external same-origin ESM-модуль** через `/__quiz_engine.js`: в dev его отдаёт Vite-middleware, а в production этот файл лежит в `dist/__quiz_engine.js`. Preview и standalone собираются из одного entry `src/engine/index.ts`.

### Vite plugin pipeline (`vite-plugin-quiz-engine.ts`)

Плагин делает две вещи:

1. **Bundle entry**: `services/quizEngine.entry.ts` собирается esbuild'ом в один ESM-бандл с `target: "es2020"`. Результат кешируется в памяти по `mtime`, при HMR пересборка ~0мс.
2. **`?raw` import translation**: `services/dompurify-bundle.ts` импортирует `dompurify/dist/purify.min.js?raw`, ожидая **строку с исходником** (DOMPurify зашивается прямо в движок для offline-работы standalone HTML). esbuild нативно понимает `loader: "text"`, но **не понимает** Vite-овский `?raw`-суффикс — без плагина он разрешил бы UMD-модуль в живую функцию, и `import dompurifySource.replace` упал бы `TypeError` на init (это и был «пустой preview» bug).

Плагин реализует две точки перехвата:

```typescript
build.onResolve({ filter: /\?raw$/, namespace: "file" }, async (args) => {
  const stripped = args.path.replace(/\?raw$/, "");
  const result = await build.resolve(stripped, {
    resolveDir: args.resolveDir, kind: args.kind,
  });
  if (result.errors.length > 0) return { errors: result.errors };
  return { path: result.path, namespace: "raw-file" };
});
build.onLoad({ filter: /.*/, namespace: "raw-file" }, (args) => ({
  contents: fs.readFileSync(args.path, "utf8"),
  loader: "text",
  resolveDir: path.dirname(args.path),
}));
```

Ключ: `build.resolve(stripped, …)` **делегирует** Node-resolution esbuild'у (bare specifier `dompurify/dist/purify.min.js` резолвится в `node_modules`); namespace `"raw-file"` отделяет пути с `?raw` от обычных, чтобы они не зацикливались.

### Загрузка данных

Движок читает `quizData` из трёх источников в порядке приоритета (см. `services/quizEngine.ts:60-103`):

1. Глобальная переменная `var/let/const quizData = …` (legacy standalone-путь).
2. `<script id="quiz-data" type="application/json">…</script>` — JSON не исполняется браузером, безопасен для строгого CSP. Это путь для preview-режима.
3. `window.quizData` (fallback для legacy-хостов и тестов).

Чтение делается дважды: на module-top (на случай, если данные уже доступны) и на `DOMContentLoaded` (для порядка `engine < data` в DOM). После успешной загрузки `window.quizData` экспортируется для дебага и тестов.

Состояние движка
TypeScript

interface QuizEngineState {
  currentNodeId: string | null;
  score: number;
  variables: Record<string, string | number | boolean>;
  visitedInteractiveNodes: Set<string>;
  achievements: Achievement[];
  startTime: number;              // Для измерения времени прохождения
  path: string[];                 // История посещённых узлов
}
Основные функции
TypeScript

interface QuizEngineAPI {
  /** Инициализировать движок с данными квиза */
  init(quizData: QuizData, settings: DesignSettings): void;

  /** Получить ID следующего узла по исходящему handle */
  getNextNodeId(sourceId: string, handle?: string): string | null;

  /** Обработать узел: выполнить логику и отрендерить */
  processNode(nodeId: string): Promise<void>;

  /** Выполнить логику узла (Score, Variable, Formula, Condition) */
  executeLogic(node: Node<NodeData>): void;

  /** Отрендерить узел в DOM */
  renderNode(node: Node<NodeData>): void;

  /** Применить DesignSettings к DOM */
  applyDesign(settings: DesignSettings): void;

  /** Сохранить результат в Supabase */
  saveResult(payload: QuizResultPayload): Promise<void>;
}
Обработка типов узлов в движке
TypeScript

// Логические узлы — выполняются без UI
const LOGIC_NODES = [
  CustomNodeType.Score,
  CustomNodeType.Variable,
  CustomNodeType.Formula,
  CustomNodeType.Condition,
  CustomNodeType.GoTo,
  CustomNodeType.Progression,
];

// При встрече логического узла — выполняем и сразу идём дальше
if (LOGIC_NODES.includes(node.type)) {
  executeLogic(node);
  const nextId = getNextNodeId(node.id);
  if (nextId) processNode(nextId);
  return;
}

// Остальные узлы — рендерим UI
renderNode(node);
Обработка медиа
Тип	Поведение
RuTube видео	Автоматически блокирует переход до окончания просмотра
YouTube видео	Встраивается через iframe
Изображения	Lazy loading, клик для увеличения в модале
Фоновая музыка	Воспроизводится через Audio API, регулируется volume из DesignSettings
Звуковые эффекты	correctAnswer, incorrectAnswer, buttonClick, achievementUnlock
Сохранение результатов
TypeScript

interface QuizResultPayload {
  quiz_id: string;
  session_id: string;              // UUID генерируется в начале сессии
  score: number;
  participant_name: string;        // Из переменной {{playerName}}
  participant_email?: string;
  final_node_title: string;        // Заголовок финального узла
  results_data: {
    variables: Record<string, string | number | boolean>;
    totalTime: number;             // Время прохождения в секундах
  };
  path_data: string[];             // Массив ID посещённых узлов
}
9. База данных и Supabase
Настройка подключения
TypeScript

// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',              // PKCE flow для SPA
    autoRefreshToken: true,
    persistSession: true,
  },
});
Схема базы данных
Таблица quizzes
SQL

CREATE TABLE quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  quiz_data     jsonb NOT NULL,    -- { nodes, edges, globalTimer, designSettings }
  is_published  boolean DEFAULT false,
  is_favorite   boolean DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS политики
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own quizzes"
  ON quizzes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Published quizzes are publicly readable"
  ON quizzes FOR SELECT
  USING (is_published = true);
Таблица quiz_results
SQL

CREATE TABLE quiz_results (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  session_id         text NOT NULL,
  user_id            uuid REFERENCES auth.users(id),  -- NULL для анонимных
  score              integer DEFAULT 0,
  final_node_title   text,
  participant_name   text,
  participant_email  text,
  results_data       jsonb,        -- { variables, totalTime }
  path_data          jsonb,        -- Массив посещённых nodeId
  created_at         timestamptz DEFAULT now()
);

-- RLS политики
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz owners can read their results"
  ON quiz_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_results.quiz_id
        AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert results"
  ON quiz_results FOR INSERT WITH CHECK (true);

Admin foundation (2026-06-10)

- `public.profiles` создаётся для каждого `auth.users` через trigger и хранит уникальный `account_code` из 6 цифр. UUID пользователя остаётся canonical ID; `account_code` нужен для поиска/отображения в админке.
- `public.quiz_display_codes` хранит пользовательские display-коды квизов по видимости: `private` минимум 2 цифры, `unlisted` минимум 3 цифры, `public` минимум 4 цифры. Коды scoped by `(user_id, visibility)` и не являются секретом доступа.
- `public.admin_staff`, `admin_role_permissions`, `admin_staff_permissions` задают staff-роли `owner/admin/moderator/support`, whitelist permissions и per-user overrides. Прямой доступ из `anon/authenticated` закрыт RLS; frontend ходит только через `admin-api`.
- `public.admin_audit_log` расширен под authenticated staff actions: `actor_user_id`, `permission`, `target_type`, `target_id`, `outcome`, `request_id`.
- `admin-api` во втором этапе отдаёт read-only списки `users` и `quizzes`: поиск по `profiles.account_code`, display-кодам квизов и названию, пагинация до 50 строк, audit actions `admin_users_listed` и `admin_quizzes_listed`.
- Frontend-разделы `/#/admin/users` и `/#/admin/quizzes` показывают цифровые ID рядом с аккаунтами и квизами; модерационные мутации остаются отдельным этапом.
- Третий этап добавляет `admin-api` POST actions `user-status` и `quiz-moderation`: блокировка/разблокировка профилей, модерационные статусы квизов, скрытие из галереи и soft-delete без физического удаления строк. Все действия пишутся в `admin_audit_log`.
- `20260610010000_bootstrap_resarytrew_admin.sql` назначает `resarytrew@gmail.com` роль `owner`, если такой `auth.users.email` уже существует. Если аккаунт ещё не создан, миграция безопасно пропускает вставку с `NOTICE`.
- `20260610020000_admin_moderation_actions.sql` добавляет в `quizzes` поля `moderation_status`, `moderation_reason`, `moderated_by`, `moderated_at`, `deleted_at`.
- Bootstrap первого owner выполняется вручную после миграции:

```sql
insert into public.admin_staff(user_id, role)
values ('AUTH_USER_UUID', 'owner')
on conflict (user_id) do update
  set role = excluded.role, is_active = true;
```
Storage
text

quiz-assets/
└── {user_id}/
    ├── uploaded_image.jpg          ← Загруженные пользователем
    └── ai_gen_1704067200000.png    ← Сгенерированные AI
Настройка bucket:

Публичное чтение: включено (для отображения в плеере)
Загрузка: только авторизованные пользователи
Максимальный размер: 50 MB
10. AI функциональность

**Канонический путь:** все AI-вызовы идут через Supabase Edge Function `ai-proxy` (Deno). Ключи провайдеров хранятся **только на сервере** (Supabase Secrets), клиентский код не имеет к ним доступа.

### Frontend → Edge Function

```typescript
// services/aiProxy.ts
// URL берётся из VITE_API_URL + `/ai-proxy`.
// Авторизация — Supabase session JWT, проверяется Yandex Cloud Function.

export async function callAiProxy(payload: AiProxyRequest): Promise<AiProxyResponse>;
```

### Провайдеры (server-side)

| Провайдер | Secret | Назначение | Default |
|---|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | Изображения (gemini-2.5-flash-image) | ✅ |
| OpenAI | `OPENAI_API_KEY` | Текст (gpt-4o-mini) | — |
| YandexGPT | `YANDEX_GPT_API_KEY` | Текст (yandexgpt-lite) | — |
| Anthropic | `ANTHROPIC_API_KEY` | Текст (claude-3-haiku) | — |

Провайдер выбирается через переменную `AI_PROVIDER` или `provider` в payload запроса.

### Rate limiting

- `ai_proxy_rate_limit_per_hour` (default `60`) — per-user лимит через таблицу `ai_rate_limits` + RPC `ai_rate_limit_check`
- Edge Function отклоняет запросы с 429 + `Retry-After`
- Очистка старых записей: cron `delete from ai_rate_limits where window_start < now() - interval '2 hours'`

### AI методы (фронт)

| Метод | Статус | Описание |
|---|---|---|
| `generateImage(prompt, type)` | ✅ Реализован | Генерация изображений через Gemini |
| `generateNodeFeedback(nodeId)` | ✅ Реализован | AI-анализ узла, создание фидбека |
| `saveGeneratedImageToLibrary()` | ✅ Реализован | Сохранение в Supabase Storage |
| `generateDetailedPlan(idea, section)` | 🚧 Заглушка | Планирование структуры квиза |
| `generateQuizFromIdea(idea)` | 🚧 Заглушка | Генерация квиза из идеи |
| `analyzeQuizComplexity()` | 🚧 Заглушка | Анализ сложности |

### Парсинг AI ответов

```typescript
// Утилита для безопасного парсинга JSON из AI
const parseAIResponse = <T,>(raw: string): T => {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(cleaned);
};

try {
  feedbackData = parseAIResponse<FeedbackItem[]>(response);
} catch {
  throw new Error('AI вернул невалидный JSON');
}
```

> ⚠️ **Важно:** фронт НЕ хранит `VITE_API_KEY` / `VITE_OPENROUTER_API_KEY`. Все ключи — в Supabase Secrets. Прямые вызовы Gemini/OpenRouter с клиента запрещены (CORS-блокировка провайдерами, утечка ключей). См. `services/aiProxy.ts` и `supabase/functions/ai-proxy/index.ts`.
11. Настройки дизайна
DesignSettings
TypeScript

interface DesignSettings {
  background: {
    color: string;             // Цвет фона: '#ffffff'
    imageUrl: string;          // URL фонового изображения
    overlayColor: string;      // Цвет оверлея: 'rgba(0,0,0,0.5)'
    overlayOpacity: number;    // Прозрачность: 0–1
  };
  typography: {
    fontFamily: string;        // "'Inter', sans-serif"
    headingColor: string;      // '#111827'
    bodyTextColor: string;     // '#374151'
  };
  buttons: {
    backgroundColor: string;
    textColor: string;
    hoverBackgroundColor: string;
    hoverTextColor: string;
    borderRadius: number;      // px: 8
  };
  answerCards: {
    backgroundColor: string;
    textColor: string;
    hoverBackgroundColor: string;
    hoverTextColor: string;
    selectedBackgroundColor: string;
    selectedTextColor: string;
    borderRadius: number;      // px: 12
  };
  sound: {
    volume: number;            // 0–1
    backgroundMusic?: string;  // URL .mp3
    buttonClick?: string;      // URL .mp3
    correctAnswer?: string;    // URL .mp3
    incorrectAnswer?: string;  // URL .mp3
    achievementUnlock?: string; // URL .mp3
  };
}
Обновление настроек через deepMerge:

TypeScript

// Можно обновлять только нужные поля любой вложенности
updateDesignSettings({
  buttons: { backgroundColor: '#4f46e5' }  // Остальные поля buttons сохранятся
});

updateDesignSettings({
  sound: { volume: 0.8 }  // Только громкость, URL треков сохранятся
});
BoardSettings
TypeScript

interface BoardSettings {
  backgroundColor: string;         // Цвет фона канваса: '#f8fafc'
  pattern: 'none' | 'small' | 'medium' | 'large';  // Сетка
  lineColor: string;               // Цвет линий сетки: '#e2e8f0'
  lineWidth: number;               // Толщина линий: 1
}
Шаблоны (Templates)
Шаблоны определяют визуальную тему плеера:

TypeScript

type QuizTemplateId =
  | 'default'   // 🎨 Базовый
  | 'science'   // 🧪 Научный терминал
  | 'army'      // 🎖️ Офицерский планшет
  | 'math'      // 📐 Школьная доска
  | 'history'   // 📜 Исторический свиток
  | 'newyear';  // 🎄 Новогодний (Операция НГ)

// Файлы шаблонов: services/templates/{templateId}.ts
// Каждый шаблон переопределяет CSS переменные плеера
12. Конкурсы и публикация
Процесс публикации
text

1. Пользователь создаёт квиз в редакторе
    ↓
2. Нажимает "Опубликовать" → открывается PublishModal
    ↓
3. Заполняет: описание, обложка (cover_image_url)
    ↓
4. updateQuizPublication() — один атомарный update:
   { is_published: true, published_at: now(), quiz_data: { ...description, ...cover } }
    ↓
5. Квиз появляется в публичной галерее (/public)
6. Доступен по прямой ссылке: ?play={quiz_id}
Паспорт квиза (QuizPassport)
Документ для конкурсной подачи:

TypeScript

interface QuizPassport {
  // Общая информация
  projectType: string;           // Тип проекта
  theme: string;                 // Тема
  targetAudience: string;        // Целевая аудитория
  ageGroup: string;              // Возрастная группа
  
  // Концепция
  relevance: string;             // Актуальность
  goals: string;                 // Цели
  objectives: string[];          // Задачи
  
  // Контент
  scenario: string;              // Сценарий
  mechanics: string;             // Механика
  scoringSystem: string;         // Система оценки
  
  // Технические данные (заполняются автоматически)
  nodeCount: number;
  edgeCount: number;
  variableCount: number;
  usedNodeTypes: string[];
  
  // AI инструменты
  aiTools: string[];
  aiUsageDescription: string;
  
  // Методика
  methodologicalNotes: string;
  
  // Источники
  references: string[];
  
  // Авторство
  authors: string[];
  organization: string;
  year: number;
}
Конкурсные компоненты
Компонент	Файл	Назначение
ContestDashboard	components/contest/ContestDashboard.tsx	Список конкурсов
ContestRegistryPage	components/contest/ContestRegistryPage.tsx	Реестр участников
13. Горячие клавиши
Редактор (Canvas)
Горячие клавиши активны только когда фокус на канвасе,
а не на текстовом поле или модальном окне.

Сочетание	Действие
Ctrl/Cmd + Z	Отменить действие (Undo)
Ctrl/Cmd + Shift + Z	Повторить действие (Redo)
Delete / Backspace	Удалить выбранный узел или ребро
Shift + Click	Добавить к выделению (мультиселект)
Escape	Снять выделение / закрыть контекстное меню
Навигация по канвасу
Действие	Поведение
Scroll (колесо мыши)	Вертикальное панорамирование
Shift + Scroll	Горизонтальное панорамирование
Ctrl/Cmd + Scroll	Масштабирование
Зажать колесо + Drag	Свободное панорамирование
Правая кнопка мыши	Контекстное меню (узел / ребро / канвас)
14. Структура файлов
```
Поток/
├── .env.example                      ← Шаблон переменных окружения
├── .env                              ← Локальные переменные (в .gitignore)
├── package.json
├── vite.config.ts
├── tailwind.config.ts                ← Кастомные анимации и цвета
├── tsconfig.json
├── types.ts                          ← Все TypeScript типы проекта
│
├── public/
│   └── ...                           ← Статические файлы
│
├── store/
│   ├── index.ts                      ← Реэкспорт всех сторов и типов
│   ├── storeEvents.ts                ← Типизированный event bus
│   ├── useAuthStore.ts
│   ├── useUIStore.ts
│   ├── useCanvasStore.ts
│   ├── useQuizDataStore.ts
│   ├── useAIStore.ts
│   ├── useAutosaveStore.ts
│   └── useEntitlementStore.ts        ← PRO-тариф, период, история платежей
│
├── hooks/
│   └── useCard3D.ts                  ← 3D-tilt + spotlight (respects reduced-motion)
│
├── utils/
│   ├── parseText.ts                  ← parseMarkdown для DialogueNode
│   └── videoUtils.ts                 ← RuTube / YouTube embed helpers
│
├── data/
│   ├── documentationData.ts          ← Контент для Documentation.tsx
│   └── templates.ts                  ← Шаблоны квизов (UI gallery)
│
├── components/
│   ├── Dashboard.tsx
│   ├── Header.tsx                    ← Композиция верхней панели
│   ├── header/                       ← Controller, JSON service, UI-блоки Header
│   ├── Sidebar.tsx
│   ├── SettingsPanel.tsx
│   ├── LivePreview.tsx
│   ├── LandingPage.tsx
│   ├── QuizPlayer.tsx
│   ├── QuizCard.tsx
│   ├── MyQuizzes.tsx
│   ├── TemplatesPage.tsx
│   ├── BillingPage.tsx               ← PRO-тарифы, история, баннер
│   ├── BillingReturnPage.tsx         ← Возврат с ЮKassa
│   ├── Paywall.tsx                   ← Плашка PRO-фич
│   ├── PlanBadge.tsx                 ← Маленький бейдж плана
│   ├── MagneticButton.tsx            ← UI-примитив
│   ├── Breadcrumbs.tsx
│   ├── CanvasSearch.tsx
│   ├── ContextMenu.tsx
│   ├── EdgeContextMenu.tsx
│   ├── QuickAddMenu.tsx
│   ├── AIAssistantPanel.tsx
│   ├── AIQuizWizard.tsx
│   ├── DesignPanel.tsx
│   ├── Documentation.tsx
│   ├── MethodologicalGuide.tsx
│   ├── RestoreAutosavePrompt.tsx
│   ├── AppErrorBoundary.tsx
│   ├── CanvasErrorBoundary.tsx
│   │
│   ├── QuizEditor/                   ← Основной редактор
│   │   ├── index.tsx
│   │   ├── Canvas.tsx
│   │   ├── EditorMenus.tsx
│   │   ├── EditorOverlays.tsx
│   │   ├── ToolbarButton.tsx
│   │   ├── LockBanner.tsx
│   │   ├── EdgeLabelEditor.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── StatusBar.tsx
│   │   ├── EnhancedMinimap.tsx
│   │   ├── BottomControlBar.tsx
│   │   ├── ConnectionHint.tsx
│   │   ├── Icons.tsx
│   │   ├── FlowEdge.tsx
│   │   ├── nodeTypes.ts
│   │   ├── layout.ts
│   │   ├── createNewNode.ts
│   │   ├── constants.ts
│   │   ├── styles/
│   │   │   └── editor.css
│   │   └── hooks/
│   │       ├── useEditorStore.ts
│   │       ├── useEditorMenus.ts
│   │       ├── useCanvasLayout.ts
│   │       ├── useCanvasInteraction.ts
│   │       └── useKeyboardShortcuts.ts
│   │
│   ├── customNodes/                  ← 21 тип узлов (+ BaseNode, nodeColors)
│   │   ├── BaseNode.tsx
│   │   ├── nodeColors.ts
│   │   ├── StartNode.tsx
│   │   ├── QuestionNode.tsx
│   │   ├── MultipleChoiceNode.tsx
│   │   ├── TimelineNode.tsx
│   │   ├── MatchingNode.tsx
│   │   ├── InfoNode.tsx
│   │   ├── ResultNode.tsx
│   │   ├── FeedbackNode.tsx
│   │   ├── AchievementNode.tsx
│   │   ├── DialogueNode.tsx          ← NEW: нарративные квизы
│   │   ├── TextInputNode.tsx
│   │   ├── CollectInfoNode.tsx
│   │   ├── AllocatorNode.tsx
│   │   ├── ConditionNode.tsx
│   │   ├── ScoreNode.tsx
│   │   ├── VariableNode.tsx
│   │   ├── FormulaNode.tsx
│   │   ├── GoToNode.tsx
│   │   ├── ProgressionNode.tsx
│   │   ├── TimerNode.tsx
│   │   └── GroupNode.tsx
│   │
│   ├── modals/                       ← Все модальные окна
│   │   ├── AuthModal.tsx
│   │   ├── PublishQuizModal.tsx
│   │   ├── ShareModal.tsx
│   │   ├── AnalyticsModal.tsx
│   │   ├── VariableManagerModal.tsx
│   │   ├── AssetManagerModal.tsx
│   │   ├── GlobalSettingsModal/
│   │   │   ├── index.tsx
│   │   │   ├── TemplateTab.tsx
│   │   │   ├── TimerTab.tsx
│   │   │   ├── SoundTab.tsx
│   │   │   ├── TabButton.tsx
│   │   │   ├── UrlInput.tsx
│   │   │   └── constants.ts
│   │   ├── BoardSettingsModal.tsx
│   │   ├── ConfirmClearModal.tsx
│   │   ├── GeneratedHtmlModal.tsx
│   │   ├── HtmlPreviewModal.tsx
│   │   ├── PreviewModal.tsx
│   │   ├── QuizPassportModal.tsx
│   │   └── GuideModal.tsx
│   │
│   ├── billing/                      ← Биллинг-UI
│   │   ├── featureLabels.ts          ← FREE_PLAN, HARDCODED_PRO_PLANS, buildAllPlans
│   │   ├── PricingCard.tsx           ← theme: 'light' | 'dark', 3D-tilt
│   │   ├── BillingPageBackground.tsx
│   │   ├── SubscriptionStatusBanner.tsx
│   │   ├── SubscriptionProgress.tsx
│   │   ├── PaymentHistoryList.tsx
│   │   └── EmptyPayments.tsx
│   │
│   ├── landing/                      ← Секции главной страницы
│   │   └── LandingPricingSection.tsx ← Dark pricing grid (Free→Monthly→Yearly)
│   │
│   ├── public/                       ← Публичные страницы
│   │   ├── PublicQuizzesPage.tsx     ← (бывш. PublicGallery)
│   │   ├── PublicQuizCard.tsx
│   │   ├── ContestDashboard.tsx
│   │   └── ContestRegistryPage.tsx
│   │
│   └── ui/                           ← UI-примитивы
│       ├── MagneticButton.tsx
│       ├── GalleryCard.tsx           ← использует useCard3D
│       ├── BentoGrid.tsx
│       ├── PinterestGrid.tsx
│       ├── AnimatedCounter.tsx
│       └── ScrollToTop.tsx
│
├── services/
│   ├── supabaseClient.ts
│   ├── quizEngine.ts                 ← Движок квиза (template-string, с DOMPurify sanitize)
│   ├── quizEngine.entry.ts           ← Side-effect entry для Vite-middleware preview (`new Function()`)
│   ├── quizGenerator/                ← Модульный генератор HTML (split вместо одного файла)
│   │   ├── index.ts                  ← generateQuizHtmlProgrammatically, options.preview
│   │   ├── renderTemplate.ts         ← Подстановка плейсхолдеров %%QUIZ_*%%, preview/standalone
│   │   ├── htmlInject.ts             ← injectBeforeBodyClose, safely в обход </script>
│   │   ├── serialize.ts              ← JSON.stringify + бэкслеш-эскейп </script>
│   │   ├── normalizeInput.ts         ← Нормализация QuizData перед генерацией
│   │   ├── inlineTailwind.ts         ← Инлайн-генерация Tailwind utilities
│   │   ├── csp.ts                    ← CSP для standalone HTML (CDN allowlist)
│   │   ├── env.ts                    ← Чтение VITE_* env
│   │   ├── fallbackHtml.ts           ← Fallback если данные не пришли
│   │   └── types.ts
│   ├── quizTheme.css                 ← CSS-переменные шаблонов
│   ├── openRouterClient.ts           ← OpenRouter fallback
│   ├── aiProxy.ts                    ← POST к `ai-proxy` Edge Function
│   ├── billingService.ts             ← createCheckout, cancelSubscription, getEntitlement
│   ├── loadQuizForPlayer.ts          ← Загрузка квиза по share-token (options.preview)
│   ├── dompurify-bundle.ts           ← Inline-import DOMPurify (`?raw` XSS-защита)
│   ├── parseQuizText.ts              ← Чистый pure helper для parseMarkdown
│   ├── safeCssUrl.ts                 ← CSS `url()` strip (allowlist http(s)/data:image|audio|video)
│   ├── hud.ts, render.ts, sanitize.ts, navigation.ts, persistence.ts, indexing.ts, media.ts, state.ts
│   └── templates/                    ← Шаблоны оформления
│       ├── default.ts
│       ├── science.ts
│       ├── army.ts
│       ├── math.ts
│       ├── history.ts
│       └── newyear.ts
│
├── vite-plugin-quiz-engine.ts        ← Dev/build: /__quiz_engine.js + esbuild ?raw plugin
├── utils/                            ← Pure helpers (parseText, safeCssUrl, videoUtils)
├── hooks/                            ← useCard3D и пр.
│
├── supabase/                         ← Backend (Deno Edge Functions + миграции)
│   ├── migrations/
│   │   ├── 20260604000000_billing.sql          ← Типы, get_effective_entitlement
│   │   ├── 20260605000000_core.sql             ← quiz_sessions, quiz_results, RLS
│   │   ├── 20260606000000_atomic.sql           ← save_quiz_result_atomic, process_payment_atomic
│   │   └── 20260607000000_security_hardening.sql ← csp_rate_limits, admin_audit_log
│   └── functions/
│       ├── _shared/                            ← Общие утилиты (crypto, cors, supabase admin)
│       ├── ai-proxy/                           ← Прокси для AI-провайдеров
│       ├── csp-report/                         ← Приём CSP violation reports
│       ├── save-quiz-session/                  ← Сохранение сессии прохождения
│       ├── save-quiz-result/                   ← Сохранение результата
│       ├── billing-create-checkout/            ← Создание платежа в ЮKassa
│       ├── billing-yookassa-webhook/           ← Обработка webhook от ЮKassa
│       ├── billing-cancel-subscription/        ← Отмена подписки
│       ├── billing-get-entitlement/            ← Получение текущего тарифа
│       ├── billing-admin-grant-pro/            ← Ручная выдача PRO (admin)
│       └── billing-auto-renew/                 ← Cron автопродления (pg_cron)
│
└── deploy/                           ← Yandex Cloud deploy
    ├── deploy.sh                     ← Linux/macOS deploy
    ├── deploy.ps1                    ← Windows PowerShell deploy
    ├── README.md                     ← Полная инструкция
    └── yandex-cloud/                 ← YC CLI конфиги
```
15. Переменные квиза
Переменные позволяют хранить и передавать данные между узлами.

Встроенные переменные
Переменная	Тип	Описание
{{score}}	number	Текущие очки игрока
{{playerName}}	string	Имя игрока (из CollectInfo)
Пользовательские переменные
Создаются через узел Variable или автоматически через CollectInfo, TextInput, Allocator.

TypeScript

// Примеры переменных
variables = {
  score: 42,
  playerName: "Алексей",
  difficulty: "hard",
  budget_marketing: 50000,
  budget_sales: 30000,
  userAnswer: "photosynthesis"
}
Использование в тексте
Markdown

<!-- В полях title, text любого контентного узла -->
Привет, {{playerName}}!
Ваш результат: {{score}} очков.
Бюджет на маркетинг: {{budget_marketing}} руб.
Использование в логике
TypeScript

// Condition узел
variable: "score"
operator: ">="
value: 80
// → true handle если score >= 80

// Formula узел
formula: "score * 1.5 + bonus"
resultVariable: "finalScore"
// Поддерживает math.js: sqrt, abs, round, floor, ceil, min, max, ...

// Variable узел
variableName: "attempts"
operation: "add"
value: 1
// → attempts = attempts + 1
16. Разработка и контрибьюция
Добавление нового типа узла
TypeScript

// 1. Добавить тип в types.ts
export enum CustomNodeType {
  // ... существующие
  MyNewNode = 'myNewNode',
}

// 2. Определить интерфейс данных в types.ts
interface MyNewNodeData extends NodeData {
  myField: string;
  // ...
}

// 3. Создать компонент в components/customNodes/MyNewNode.tsx
import BaseNode from './BaseNode';
import { COLOR_CLASSES } from './nodeColors';

const MyNewNode: React.FC<NodeProps<MyNewNodeData>> = (props) => {
  const { data } = props;
  return (
    <BaseNode
      title="Мой узел"
      icon={<Icons.MyIcon />}
      color="blue"
      nodeProps={props}
      hasInput
      hasOutput
    >
      <p>{data.myField}</p>
    </BaseNode>
  );
};

export default React.memo(MyNewNode);

// 4. Зарегистрировать в components/QuizEditor/nodeTypes.ts
export const nodeTypes = {
  // ... существующие
  [CustomNodeType.MyNewNode]: MyNewNode,
};

// 5. Добавить в Sidebar.tsx в нужную категорию
// 6. Добавить обработку в quizEngine.ts
// 7. Добавить панель настроек в SettingsPanel.tsx
Добавление нового события в event bus
TypeScript

// 1. Расширить тип StoreEvent в storeEvents.ts
export type StoreEvent =
  | { type: 'CANVAS_CLEAR' }
  | { type: 'MY_NEW_EVENT'; payload: { data: string } };  // ← добавить

// 2. Эмитить событие
storeEvents.emit('MY_NEW_EVENT', { data: 'value' });

// 3. Подписаться в нужном сторе
storeEvents.on('MY_NEW_EVENT', ({ data }) => {
  // обработка
});
Добавление нового шаблона
TypeScript

// 1. Создать файл services/templates/myTemplate.ts
// 2. Добавить ID в QuizTemplateId (types.ts)
// 3. Добавить в TEMPLATES (GlobalSettingsModal/constants.ts)
// 4. Добавить CSS переменные в services/quizGenerator.ts

export const myTemplate: QuizTemplate = {
  id: 'myTemplate',
  name: 'Мой шаблон',
  cssVariables: {
    '--quiz-bg': '#1a1a2e',
    '--quiz-text': '#e0e0e0',
    '--quiz-primary': '#e94560',
    // ...
  },
};
Соглашения по коду
TypeScript

// ✅ Правильно: селектор возвращает примитив → нет лишних ре-рендеров
const isLocked = useCanvasStore(s => s.isCanvasLocked);

// ❌ Неправильно: новый объект каждый рендер
const { isLocked } = useCanvasStore(s => ({ isLocked: s.isCanvasLocked }));

// ✅ Правильно: actions стабильны, берём из getState
const { deleteNode } = useEditorActions();

// ✅ Правильно: мемоизируем вычисляемые данные
const visibleNodes = useMemo(
  () => nodes.filter(n => !n.data?.parentId),
  [nodes]
);

// ✅ Правильно: стабильные обработчики
const handleClose = useCallback(() => setMenu(null), []);

// ✅ Правильно: типизированные generic обработчики
const handleTimerChange = <K extends keyof GlobalTimer>(
  field: K,
  value: GlobalTimer[K]
) => setGlobalTimer({ [field]: value } as Partial<GlobalTimer>);

---

## 17. Биллинг и тарифы

### Тарифная сетка

| План | Цена | Период | Фичи | Скидка |
|---|---|---|---|---|
| **Free** | 0 ₽ | бессрочно | До 3 квизов · Базовые типы нод · 5 базовых шаблонов · Базовый AI-помощник · С брендингом Поток | — |
| **PRO Monthly** | 399 ₽ | 1 месяц | Безлимитные квизы · Все 21 тип нод · Все шаблоны + свой дизайн · Расширенный AI · Без брендинга · Приоритет · Экспорт HTML/JSON | — |
| **PRO Yearly** | 3 490 ₽ | 1 год | Всё из Monthly | **−1 298 ₽ (27%)** → эквивалент 290 ₽/мес |

> Цены указаны в копейках (`price_kopecks`) и передаются через `Intl.NumberFormat('ru-RU')`. Источник: `supabase/migrations/20260604000000_billing.sql` + дубликат `HARDCODED_PRO_PLANS` в `components/billing/featureLabels.ts` для неавторизованных.

### Архитектура биллинга

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Frontend (React)                              │
│  BillingPage ──> useEntitlementStore ──> services/billingService.ts │
│  LandingPricingSection                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions (Deno)                   │
│  billing-create-checkout                                              │
│  billing-yookassa-webhook      <─ ЮKassa webhook (?key=...)        │
│  billing-cancel-subscription                                         │
│  billing-get-entitlement                                             │
│  billing-admin-grant-pro       (BILLING_ADMIN_SECRET)               │
│  billing-auto-renew           (pg_cron + BILLING_CRON_SECRET)       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL (Supabase)                         │
│  plans · subscriptions · payments · users (PRO)                      │
│  RLS: каждый пользователь видит ТОЛЬКО свои подписки и платежи      │
│  RPC: get_effective_entitlement(user_id) → 'free' | 'pro_monthly'    │
│       process_payment_atomic(...)    — атомарная транзакция          │
│       save_quiz_result_atomic(...)   — атомарное сохранение         │
└─────────────────────────────────────────────────────────────────────┘
```

### Поток оплаты

```
1. User → click "Оформить PRO"
2. frontend → POST billing-create-checkout { plan: 'pro_monthly', returnUrl }
3. Edge Function → POST https://api.yookassa.ru/v3/payments
4. ЮKassa → redirect user to confirmation page
5. User → confirm payment (SBP / bank card / etc)
6. ЮKassa → POST billing-yookassa-webhook?key=BILLING_WEBHOOK_SECRET
7. Webhook → process_payment_atomic(...) → subscription row + payment row
8. ЮKassa → redirect user to returnUrl (BillingReturnPage)
9. BillingReturnPage → window.postMessage('billing:status', { status })
10. BillingPage → useEntitlementStore.refresh() → видит новую подписку
```

### Ключевые файлы

| Файл | Назначение |
|---|---|
| `components/BillingPage.tsx` | Главная страница биллинга (sticky header, 3 карточки, история) |
| `components/BillingReturnPage.tsx` | Обработка возврата с ЮKassa |
| `components/billing/PricingCard.tsx` | `theme: 'light' \| 'dark'`, 3D-tilt, MagneticButton, framer-motion |
| `components/billing/featureLabels.ts` | `FREE_PLAN`, `HARDCODED_PRO_PLANS`, `buildAllPlans`, `computeYearlySavings`, `formatPrice` |
| `components/billing/SubscriptionStatusBanner.tsx` | Баннер + `cancel_at_period_end` chip |
| `components/billing/SubscriptionProgress.tsx` | Progress bar до конца периода (gradient amber→orange, >85% красный) |
| `components/billing/PaymentHistoryList.tsx` | Gallery-style список (tabular-nums, status-pill) |
| `components/billing/EmptyPayments.tsx` | Empty state с иллюстрацией |
| `components/billing/BillingPageBackground.tsx` | Light-фон с diamond pattern + indigo top glow |
| `components/landing/LandingPricingSection.tsx` | Dark-секция тарифов на лендинге |
| `store/useEntitlementStore.ts` | `FREE_ENTITLEMENT`, `refresh`, `plans`, `period` |
| `services/billingService.ts` | `createCheckout`, `cancelSubscription`, `getEntitlement`, `BillingError` |
| `types.ts:561` | `PlanId = 'pro_monthly' \| 'pro_yearly'`, `Plan`, `PlanTier` |

### Paywall

Компонент `<Paywall feature="ai-feedback" />` используется в `SettingsPanel`, `WizardModal` и других местах. Если у пользователя нет PRO — показывается inline-плашка с CTA «Оформить PRO». Эта же логика используется в `useEntitlementStore.isPro()` + `<PlanBadge plan="pro" />`.

### Анти-фрод

- `BILLING_WEBHOOK_SECRET` — 32+ символа, проверяется constant-time
- `BILLING_ADMIN_SECRET` + `BILLING_ADMIN_ALLOWED_EMAILS` для admin-выдачи PRO
- `BILLING_CRON_SECRET` для cron-вызовов (pg_cron → `net.http_post`)
- `BILLING_RETURN_URL` (env) — НЕ строится из `Origin` (инъекция)
- CSP-reports принимаются отдельной функцией `csp-report` для мониторинга

---

## 18. Edge Functions (Supabase / Deno)

Backend написан на Deno и деплоится через `supabase functions deploy`. Все функции используют `service_role` ключ (НЕ anon) для обхода RLS.

### Список функций

| Функция | Назначение | Auth |
|---|---|---|
| `ai-proxy` | Прокси для AI-провайдеров (Gemini/OpenAI/YandexGPT/Anthropic). Rate limit per-user. | anon + session |
| `csp-report` | Приём CSP violation reports из браузера | anon (только запись) |
| `save-quiz-session` | Сохранение промежуточной сессии прохождения | anon |
| `save-quiz-result` | Атомарное сохранение результата квиза | anon |
| `billing-create-checkout` | Создание платежа в ЮKassa, redirect | anon + session |
| `billing-yookassa-webhook` | Обработка webhook (payment.succeeded / canceled) | `?key=BILLING_WEBHOOK_SECRET` |
| `billing-cancel-subscription` | Отмена подписки пользователем | anon + session |
| `billing-get-entitlement` | Получение текущего effective-плана | anon + session |
| `billing-admin-grant-pro` | Ручная выдача PRO (admin/cron) | `Authorization: Bearer BILLING_ADMIN_SECRET` |
| `billing-auto-renew` | Cron автопродления (за 3 дня до конца) | `?secret=BILLING_CRON_SECRET` |

### Структура Deno-функции

```
supabase/functions/billing-create-checkout/
└── index.ts                          ← Deno entry point
```

Каждая функция импортирует общие утилиты из `_shared/`:

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS,  // CSV из env
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// supabase/functions/_shared/supabase-admin.ts
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}
```

### Переменные окружения Edge Functions

См. полный список в [`README.md`](./README.md#-переменные-окружения-supabase-edge-functions). Краткая сводка:

| Функция | Обязательные секреты |
|---|---|
| `ai-proxy` | `AI_PROXY_ALLOWED_ORIGINS`, `GEMINI_API_KEY` (или `OPENAI_API_KEY` / `YANDEX_GPT_API_KEY`), `AI_PROVIDER`, `AI_PROXY_RATE_LIMIT_PER_HOUR` |
| `admin-api` | `ADMIN_ALLOWED_ORIGINS`, `SUPABASE_SERVICE_ROLE_KEY`; staff-доступ требует `admin.access`, для `overview` нужен `dashboard.read` + `aal2` |
| `billing-create-checkout` | `BILLING_ALLOWED_ORIGINS`, `BILLING_PRO_PRICE_MONTHLY`, `BILLING_PRO_PRICE_YEARLY`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` |
| `billing-yookassa-webhook` | `BILLING_WEBHOOK_SECRET` (32+), `YOOKASSA_SHOP_ID` |
| `billing-admin-grant-pro` | `BILLING_ADMIN_SECRET`, `BILLING_ADMIN_ALLOWED_EMAILS` |
| `billing-auto-renew` | `BILLING_CRON_SECRET`, `BILLING_RENEW_DAYS_BEFORE`, `BILLING_RETURN_URL` |
| `save-quiz-*` | `ALLOWED_ORIGINS` |

### Деплой функций

```bash
supabase login
supabase link --project-ref <ref>

supabase functions deploy ai-proxy
supabase functions deploy admin-api
supabase functions deploy csp-report
supabase functions deploy save-quiz-session
supabase functions deploy save-quiz-result
supabase functions deploy billing-create-checkout
supabase functions deploy billing-yookassa-webhook
supabase functions deploy billing-cancel-subscription
supabase functions deploy billing-get-entitlement
supabase functions deploy billing-admin-grant-pro
supabase functions deploy billing-auto-renew
```

> ⚠️ После изменения RPC-функций (`get_effective_entitlement`, `process_payment_atomic` и т.д.) Edge Functions нужно **передеплоить** — иначе получим `permission denied` для `service_role` на новых функциях.

### Локальная разработка

```bash
# Запустить все функции локально с env из .env.local
supabase functions serve --env-file ./supabase/.env.local

# Одна функция с hot-reload
supabase functions serve ai-proxy --no-verify-jwt --env-file ./supabase/.env.local
```

---

## 19. Безопасность

### Многофазный security-аудит

В проекте проведён многофазный аудит безопасности. **Закрыто (Phase 0+1+D2)**: 13 фиксов, **отложено (Phase 2-6)**: ~20 фиксов (см. [Roadmap](#21-roadmap-план-развития)).

### Закрытые уязвимости (Phase 0+1+D2)

#### Critical (C1, C2)
- **C1 — XSS в QuizPlayer через `innerHTML`.** Решение: inline-import DOMPurify через Vite `?raw`, `sanitizeHtml(html)` обёртка в `services/quizEngine.ts`. Файл `services/dompurify-bundle.ts` (29 строк).
- **C2 — RLS отсутствует на `ai_rate_limits`.** Решение: `ENABLE ROW LEVEL SECURITY` + политика `auth.uid() = user_id` в миграции `20260606000000_atomic.sql`.

#### High (H1-H9)
- **H1 — `get_effective_entitlement` SECURITY DEFINER без `SET search_path`.** Исправлено: добавлен `SET search_path = public, pg_temp` + grant `EXECUTE` для `authenticated`.
- **H2 — RLS `ai_usage` для service_role + authenticated.** Разделено: service_role видит всё, authenticated — только своё (`auth.uid() = user_id`).
- **H3 — Race condition на rate limit.** Добавлен `pg_advisory_xact_lock(hashtext(user_id))` в `ai_rate_limit_check`.
- **H4 — Отсутствие `ON CONFLICT` в `process_payment_atomic`.** Добавлен `ON CONFLICT (provider_payment_id) DO NOTHING` — идемпотентность webhook.
- **H5 — `p_window_hours` вычислялся в JS, не в SQL.** Исправлено: `p_window_hours` принимается как параметр, валидация на стороне Edge Function.
- **H6 — Отсутствие проверки body size в webhook.** Добавлен `Content-Length` check + `MAX_WEBHOOK_BODY_SIZE = 65536` (64 КБ).
- **H7 — `csp-report` rate limit.** Новая таблица `csp_rate_limits` + RPC `csp_rate_limit_check` в миграции `20260607000000_security_hardening.sql`.
- **H8 — `billing-auto-renew` уязвим к SSRF через `returnUrl`.** Решение: `BILLING_RETURN_URL` берётся **только из env**, никогда из `Origin` или `Referer` headers.
- **H9 — `billing-admin-grant-pro` без audit log.** Добавлена таблица `admin_audit_log` (id, admin_email, action, target_user_id, payload jsonb, created_at) + RLS — только service_role пишет, читают админы через dashboard.

#### Deploy (D2)
- **D2 — `deploy.yml` хардкодит env.** Решение: условный `if` на `${{ vars.environment == 'production' }}` для URL-ов и секретов, разные секреты для `staging` и `production`.

### Текущая модель безопасности

```
┌────────────────────────────────────────────────────────────┐
│ Browser (Vite SPA)                                        │
│  - VITE_SUPABASE_ANON_KEY (публичный, RLS-защищённый)     │
│  - VITE_AI_PROXY_URL                                       │
│  - НЕТ доступа к GEMINI_API_KEY / YOOKASSA_SECRET_KEY     │
└────────────────────────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌────────────────────────────────────────────────────────────┐
│ Supabase Edge Functions (Deno)                            │
│  - SUPABASE_SERVICE_ROLE_KEY (server-only)                │
│  - YOOKASSA_SECRET_KEY, BILLING_WEBHOOK_SECRET, ...        │
│  - HMAC-style constant-time сравнение для webhook          │
│  - admin-api: Supabase Auth token + staff role + aal2 MFA  │
└────────────────────────────────────────────────────────────┘
                          │ postgres connection
                          ▼
┌────────────────────────────────────────────────────────────┐
│ PostgreSQL (Supabase managed)                             │
│  - RLS на ВСЕХ пользовательских таблицах                   │
│  - SECURITY DEFINER для get_effective_entitlement          │
│  - ON CONFLICT для идемпотентности платежей                │
│  - pg_advisory_xact_lock для race-safe rate limit          │
└────────────────────────────────────────────────────────────┘
```

### Дополнительные меры

- **CSP** (Content Security Policy) — настраивается в HTML-шапке, репорты шлются в `csp-report` Edge Function
- **DOMPurify** для всего `innerHTML` в плеере
- **Toast-уведомления** скрыты от скринридеров (`aria-live="polite"`), Paywall-сообщения — наоборот
- **`prefers-reduced-motion`** уважается в `useCard3D`, framer-motion
- **No secrets in git** — `.env` в `.gitignore`, секреты — через `supabase secrets set`

### CSP и `unsafe-eval` (preview-режим)

В `index.html` `script-src` содержит `'unsafe-eval'`. Это **намеренный trade-off** ради работы in-app `LivePreview` (srcdoc iframe). Подробности — в комментарии над `<meta http-equiv="Content-Security-Policy">` в `index.html:7-42`. Кратко:

- `services/quizEngine.entry.ts:17` выполняет движок через `new Function(quizEngineScript)();` — это единственный источник `eval()` в приложении.
- Альтернатива (inline `<script>` в srcdoc) ломается из-за CSP: Chromium наследует CSP родителя в same-origin sandboxed iframe и intersect'ит его с iframe-meta — отдельное ослабление для iframe **невозможно**.
- Risk surface: `'unsafe-eval'` разрешает `eval()` строк. В нашем коде eval'ится **только** собственный bundled движок; пользовательский контент квиза парсится через `JSON.parse` и санитизируется DOMPurify.
- **Long-term фикс** (tracked as P2): конвертировать `services/quizEngine.entry.ts` в настоящий ESM-модуль без `new Function`. Это требует перестройки pipeline: Vite-плагин должен бандлить `quizEngine.ts` напрямую как ESM (а не оборачивать строку в `new Function`), а standalone-путь — отдельным билдом со stringification для offline-HTML.

### `?raw` import pipeline (security + offline)

`services/dompurify-bundle.ts:19` импортирует DOMPurify как **строку исходника**:

```ts
import dompurifySource from "dompurify/dist/purify.min.js?raw";
```

Зачем строка, а не модуль: standalone-HTML должен работать **offline** без CDN. DOMPurify вшивается прямо в `<script>` квиза, поэтому пользователь не может подменить санитайзер на лету. Vite-resolver понимает `?raw` нативно, а esbuild (которым `vite-plugin-quiz-engine.ts` бандлит preview-движок) — **нет**, поэтому плагин реализует две точки перехвата (`onResolve` + `onLoad` в `vite-plugin-quiz-engine.ts:60-90`). Без этой трансляции engine init падал `TypeError: DOMPURIFY_SOURCE.replace` и iframe оставался пустым. См. подробности в §8.

### `safeCssUrl` (CSS `url()` sanitization)

`services/quizEngine.ts` собирает CSS для `imageUrl` / `backgroundImage` / `backgroundMusic` и т.п. Через CSS-`url()` нельзя пропускать `javascript:`, `vbscript:` или строки, ломающие CSS-парсер (кавычки, скобки, переносы строк). `utils/safeCssUrl.ts` реализует allowlist протоколов (`http(s)` + `data:image|audio|video`) и strip `' " ( ) \ \r \n \t` для CSS-контекста. 28 unit-тестов покрывают edge-cases (data-URL, протокол-relative, mixed-case `JavaScript:`).

### Что НЕ закрыто (см. Roadmap)

- [ ] Phase 2: SQL CHECK constraints, FK indexes, path_data size cap
- [ ] Phase 3: SHA-256 secrets hash, CORS-allowlist в shared util
- [x] Phase 4: MFA для admin-аккаунтов на входе в `admin-api` (`aal2`, TOTP через Supabase Auth)
- [ ] Phase 5: Vitest setup, edge function integration tests
- [ ] Phase 6: HSTS на Yandex CDN, nonce-CSP, license headers

---

## 20. Деплой в Yandex Cloud

### Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions (.github/workflows/deploy.yml)                  │
│  on: push to main                                                │
│    1. checkout                                                   │
│    2. setup-node 20 + npm ci                                     │
│    3. npm run install:functions                                  │
│    4. npm run lint && npm test && npm run lint:functions          │
│    5. npm run test:functions && npm run build                    │
│    6. AWS CLI sync → yandex-storage bucket                       │
│    7. (опц.) yc cdn cache purge                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Yandex Object Storage (S3-compatible)                          │
│  Bucket: <project>-static, public-read                          │
│  Static website hosting: <bucket>.website.yandexcloud.net       │
│  Cache-Control: public, max-age=31536000 (immutable для /assets/)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Yandex CDN                                                      │
│  Origin: <bucket>.website.yandexcloud.net                        │
│  Custom domain: https://mykviz.ru (или домен клиента)         │
│  TLS: Let's Encrypt auto                                         │
│  Brotli/gzip on the fly                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Пошаговый деплой

#### 1. Подготовка Yandex Cloud

```bash
# Установить yc CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Создать сервисный аккаунт с ролью storage.editor
yc iam service-account create --name quiz-deployer
yc iam service-account add-access-binding \
  --service-account-name quiz-deployer \
  --role storage.editor \
  --bucket <bucket-name>

# Создать статический ключ (для AWS CLI)
yc iam access-key create --service-account-name quiz-deployer

# Создать bucket
yc storage bucket create --name <project>-static

# (Опц.) Включить static website hosting
yc storage bucket update --name <project>-static --website-settings '{"index": "index.html", "error": "index.html"}'
```

#### 2. Подключить CDN (опц.)

```bash
yc cdn resource create \
  --origin-bucket <project>-static.website.yandexcloud.net \
  --certificate-authority letsencrypt
```

#### 3. Заполнить `.env`

```bash
# Vite
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://<id>.apigw.yandexcloud.net/api

# YC storage (для AWS CLI)
YC_BUCKET=<project>-static
AWS_ACCESS_KEY_ID=YCAJExxxxx
AWS_SECRET_ACCESS_KEY=YCPxxxxxxxxxxxxxxxxx
AWS_ENDPOINT_URL=https://storage.yandexcloud.net
AWS_DEFAULT_REGION=ru-central1
```

#### 4. Запуск деплоя

**Windows (PowerShell):**
```powershell
./deploy/deploy.ps1
```

**Linux/macOS:**
```bash
./deploy/deploy.sh
```

Скрипт:
1. Проверяет `.env`
2. `npm ci`
3. `npm run build`
4. `aws s3 sync dist/ s3://$YC_BUCKET --endpoint-url=$AWS_ENDPOINT_URL --delete --cache-control "public, max-age=31536000, immutable"`

#### 5. CI/CD через GitHub Actions

В проекте два workflow:

- `.github/workflows/ci.yml` — запускается на push и pull request: `npm ci`,
  TypeScript-проверка, frontend-тесты, production build, а также отдельный job
  Yandex Functions с `npm ci`, `npm run lint` и `npm run build` внутри `yc-functions`.
- `.github/workflows/deploy.yml` — перед публикацией повторяет TypeScript,
  frontend tests, Yandex Functions typecheck/bundle и build. Перед проверками
  deploy явно устанавливает зависимости функций через `npm run install:functions`.
  Загрузка в Yandex Object Storage начинается только после успешного прохождения всех проверок.

Vitest использует `minWorkers: 1` и `maxWorkers: 2`: это предотвращает
случайные таймауты тяжёлых router loader-тестов в ограниченном CI-окружении.

Секреты в **Settings → Secrets and variables → Actions**:

| Secret | Где взять |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `VITE_API_URL` | Yandex API Gateway `/api` base URL |
| `YC_BUCKET` | Имя бакета |
| `AWS_ACCESS_KEY_ID` | `yc iam access-key create` |
| `AWS_SECRET_ACCESS_KEY` | то же |
| `AWS_ENDPOINT_URL` | `https://storage.yandexcloud.net` |
| `YC_CDN_RESOURCE_ID` | `yc cdn resource list` (для purge) |

`vars.environment` (Actions variable): `staging` | `production` — определяет URL-ы и секреты.

#### 6. После деплоя

- **Supabase → Authentication → URL Configuration:**
  - `Site URL`: `https://mykviz.ru`
  - `Redirect URLs`: добавить `https://mykviz.ru/**`
- **Supabase → Edge Functions → Secrets:** добавить `AI_PROXY_ALLOWED_ORIGINS=https://mykviz.ru`
- **Edge Functions deploy:** вручную через `supabase functions deploy` (см. раздел 18)

### Миграции БД

```bash
# Через Supabase CLI
supabase db push

# Или вручную в Supabase Dashboard → SQL Editor
# Порядок:
# 1. 20260604000000_billing.sql
# 2. 20260605000000_core.sql
# 3. 20260606000000_atomic.sql
# 4. 20260607000000_security_hardening.sql
```

### Cron-задачи (pg_cron)

| Задача | Расписание | SQL |
|---|---|---|
| Очистка `ai_rate_limits` | каждый час | `delete from public.ai_rate_limits where window_start < now() - interval '2 hours';` |
| Очистка `csp_rate_limits` | каждый час | `delete from public.csp_rate_limits where created_at < now() - interval '7 days';` |
| Автопродление PRO | каждый день 03:00 | `select net.http_post(url:='.../billing-auto-renew?secret=...', body:='{}');` |

---

## 21. Roadmap (план развития)

Документ актуален на **08.06.2026**. Roadmap разделён на **технический долг** (из security-аудита) и **продуктовые планы** (фичи). Phase 2/3/5(P0) завершены — подробности в §21.1 и §21.5.

### 21.1 Технический долг (security-аудит Phase 2-6)

**Phase 2 — SQL hardening (≈2 дня)** ✅ **завершено 08.06.2026** ([migration `20260608000000_phase2_sql_hardening.sql`](supabase/migrations/20260608000000_phase2_sql_hardening.sql))
- [x] CHECK constraints: `quiz_results.score` (0..10M), `quiz_sessions.score`, `subscriptions.current_period_end > current_period_start`, `subscriptions.status` enum, `payments.amount_kopecks >= 0`, `payments.status` enum, `path_data` (≤1000 elements, both tables), `participant_email` ≤320 chars, `time_spent_seconds` 0..604800 — **12 constraints**
- [x] FK indexes: `payments(plan_id)`, `subscriptions(plan_id)`, `subscriptions(last_payment_id)` (partial), `promo_redemptions(user_id)`, `promo_codes(plan_id)` — **5 indexes**
- [x] Cap `path_data` size (max 1000 элементов) в `save_quiz_result_atomic` + edge-function `slice(-1000)`
- [x] `uniq_user_quiz_in_progress` partial index для защиты от дубликатов + abandon-then-insert в `save-quiz-session`
- [x] Тесты: `supabase/functions/_shared/path_data_clamp.test.ts` (10 Deno-тестов) + `supabase/tests/phase2_sql_hardening.test.sql` (pgTAP-style integration tests) — **21/21 passed**

> Замечание: `quiz_results(quiz_id)` и `payments(user_id)` FK-indexes уже были (`idx_results_quiz`, `idx_payments_user_created`) — см. исчерпывающий аудит в комментарии Section 2 миграции. `csp_reports` не имеет `user_id` by design (анонимный endpoint).

**Phase 3.5 — Critical security hardening (≈1 день)** ✅ **завершено 08.06.2026**

Закрыты все 8 CRITICAL из [AUDIT_REPORT.md](AUDIT_REPORT.md):

- [x] **C-01 / C-02** — XSS через CSS `url()`. Добавлен helper `utils/safeCssUrl.ts` (28 vitest-тестов) с allowlist `http(s)`/`data:image|audio|video` протоколов + strip `' " ( ) \ \r \n \t` для CSS-контекста. Refactor `services/quizEngine.ts:407, 833` — заменён `sanitizeAssetUrl(...).replace(/'/g, "\\'")` на `safeCssUrl(...)`.
- [x] **C-03** — DOMPurify для `dangerouslySetInnerHTML`. Существующая защита подтверждена + 4 новых XSS-теста в `utils/parseText.test.ts` (nested `<sc<script>ript>`, SVG `onload`, entity decode, mixed-case `<ScRiPt>`).
- [x] **C-04** — `sandbox="allow-scripts"` без `allow-same-origin` ломал supabase-js auth + postMessage-мост в 4 компонентах. Добавлен `allow-same-origin` в `components/QuizPlayer.tsx`, `components/LivePreview.tsx`, `components/modals/HtmlPreviewModal.tsx`, `components/modals/PreviewModal.tsx`. Регрессионный snapshot-тест `components/__tests__/sandbox-attrs.test.ts` (8 тестов).
- [x] **C-05** — Порядок escape ↔ Markdown. Извлечены pure helpers (`escapeHtml`, `sanitizeAssetUrl`, `parseText`) из `quizEngine.ts` в `services/parseQuizText.ts` для тестируемости. 15 vitest-тестов в `services/parseQuizText.test.ts` фиксируют порядок: placeholders escape → links sanitize+escape → markdown transforms → final DOMPurify pass.
- [x] **C-06** — CDN-скрипты без SRI. Вычислены SHA-384 хеши для 7 unique URLs (`@supabase/supabase-js@2`, `canvas-confetti@1.6.0`/`1.9.2`, `mathjs@12.4.1`, `gsap@3.12.2`, `mathjax@3`, `@supabase/supabase-js@2/dist/umd/supabase.min.js`), добавлены `integrity="sha384-..." crossorigin="anonymous"` в 23 `<script>` тега через 9 template-файлов. Snapshot-тест `services/templates/__tests__/sri-integrity.test.ts` (9 тестов). Команда обновления хеша задокументирована в `package.json` scripts.
- [x] **C-07** — RLS для анонимных сессий. Текущие policies в `20260605000000_core.sql:127-149` уже корректны (split SELECT на owner+participant, нет ALL-policy). Регрессионный SQL-тест `supabase/tests/session_rls_hardening.test.sql` (6 тестов — `pg_policies` enumeration + 4 negative-теста для anon).
- [x] **C-08** — Дубликат `AutosavePayload` в `storeEvents.ts`. Подтверждено: импорт из `../types` уже единственный путь.

**Phase 3 — Code hardening (≈2 дня)** ✅ **завершено 08.06.2026**
- [x] Извлечены `_shared/crypto.ts` (`timingSafeEqual`, `sha256Hex`, `verifyHashedSecret`, `verifyCronSecretAsync`) и `_shared/validators.ts` (`UUID_RE`, `clampInt`, `str`, `clampPathData`, константы `MAX_PATH_ELEMENTS=1000`, `MAX_EMAIL_LEN=320`, `MAX_NAME_LEN=200`, `MAX_SCORE=1_000_000`, `MAX_TIME_SECONDS=604_800`, `MAX_FINAL_NODE_TITLE_LEN=300`)
- [x] SHA-256 hash `BILLING_WEBHOOK_SECRET` — два режима: `BILLING_WEBHOOK_SECRET_HASH` (preferred, async SHA-256 → constant-time compare) + legacy `BILLING_WEBHOOK_SECRET` (raw constant-time). Если ни один не задан → 503. Аналогично для `BILLING_CRON_SECRET_HASH` / `BILLING_CRON_SECRET` в `verifyCronSecretAsync`
- [x] CORS-allowlist в `_shared/cors.ts` — `ai-proxy`, `save-quiz-session`, `save-quiz-result` переведены на `handleCorsPreflight` / `jsonResponse` / `corsHeaders`; дубликаты удалены (3 файла, ~40 строк дубля)
- [x] Исправлен баг CORS в `csp-report`: добавлен `handleCorsPreflight` + `corsHeaders` на все ответы (405/413/429/204). `application/csp-report` и `application/reports+json` оба триггерят preflight — ранее OPTIONS возвращал 405 без CORS-заголовков, и браузер молча дропал отчёт
- [x] Free-tier feature flags: `_shared/free_tier_defaults.ts` (single source of truth: `{max_quizzes:3, ai_tier:'basic', hide_branding:false, premium_templates:false, unlimited_logic:false}`); `billing-yookassa-webhook` и `billing-auto-renew` теперь импортируют `getFreeTierFeatures()` вместо инлайн-литерала. Полный DB-driven config — отдельная миграция
- [x] Рефакторинг: `auth.ts` re-export `verifyCronSecret` from `crypto.ts`; `save-quiz-session` использует shared `timingSafeEqual`, `clampInt`, `clampPathData`, `corsHeaders`
- [x] Тесты: `crypto.test.ts` (17) + `validators.test.ts` (16) импортируют production-модули (раньше re-declare для drift-detection); добавлен `free_tier_defaults.test.ts` (6); `path_data_clamp.test.ts` (5) — **44/44 passed**

**Phase 4 — Auth & infra (≈3 дня)**
- [ ] **MFA для admin-аккаунтов** (TOTP через Supabase Auth)
- [ ] `supabaseConfig.functionsUrl` CVE: заменить на whitelist доменов
- [x] ESLint setup: flat config + `npm run lint` как `typecheck` + ESLint
- [ ] ESLint warnings burn-down: 419 → 331 → 0 по отдельной задаче `ESLINT_WARNINGS_TASK.md` (Phase 1 выполнена)
- [ ] Prettier setup
- [ ] Dependabot для `package.json` + `deno.json` (auto-PR)
- [ ] Sentry / Logflare для фронта + Edge Functions

**Phase 5 — Tests (≈3 дня)** ✅ **P0 завершён 08.06.2026** (см. §21.5)
- [x] **Vitest setup** + jsdom env + scripts `test`, `test:watch`, `test:ui` в `package.json`; coverage через `@vitest/coverage-v8` (P0 scope: `src/`, `utils/`, `services/`, `store/`, `hooks/`)
- [x] Компонентные и router-тесты включены в Vitest scope; полный результат — **412/412 passed**
- [x] `npm test` и `npm run test:functions` добавлены как обязательные CI/deploy gates
- [x] Deno-тесты для всех `_shared/*` модулей + edge function handler'ов (`cors`, `yookassa`, `entitlement`, `auth`, `crypto`, `validators`, `free_tier_defaults`, `path_data_clamp`, `billing-create-checkout`, `billing-yookassa-webhook`, `save-quiz-session`, `save-quiz-result`) — **197/197 passed**
- [x] SQL integration тесты для `process_payment_atomic` (`supabase/tests/billing_migration.test.sql`) + `save_quiz_result_atomic` (`supabase/tests/atomic_migration.test.sql`)
- [x] **README §21.5** — гайд по запуску всех 3 test runner'ов через `psql` + `npm run test:functions` + `npm test`
- [ ] Извлечь declared copy-paste в `services/dompurify-bundle.ts` → `_shared/crypto.ts`
- [ ] Real unit tests для `useCanvasStore`, `useEntitlementStore`, `services/quizEngine.ts`
- [ ] Edge Function integration tests (Deno test) — 11/11 пройдено, расширить coverage
- [ ] E2E: Playwright для критических путей (signup → editor → publish → play)

**Phase 6 — Production hardening (≈2 дня)**
- [ ] HSTS header на Yandex CDN (`Strict-Transport-Security: max-age=63072000`)
- [ ] Nonce-based CSP (убрать `unsafe-inline`)
- [ ] LICENSE файл + README badges (build status, deps)
- [ ] Bundle analyzer (`vite-bundle-visualizer`) — отслеживать рост
- [ ] Rate limit на `csp-report` per-IP (сейчас только per-URI)

### 21.2 Продуктовые планы

**Q3 2026 — Команда и совместная работа**
- [ ] **Shared editing** (real-time через Supabase Realtime): несколько пользователей редактируют один квиз
- [ ] **Комментарии и review** (mention, @assignee)
- [ ] **Версионирование квизов** (snapshot + diff)
- [ ] **Команды / Workspace**: роли owner / editor / viewer

**Q3 2026 — AI-усиление**
- [ ] **`generateQuizFromIdea`** — полная реализация (сейчас заглушка): идея → структура квиза → ноды
- [ ] **`analyzeQuizComplexity`** — метрики сложности, рекомендации
- [ ] **AI-feedback на весь квиз** (а не только на узел) через `ai-proxy`
- [ ] **Multimodal AI**: распознавание текста на фото, генерация voice-over

**Q4 2026 — Маркетплейс и шаблоны**
- [ ] **Публичный маркетплейс шаблонов** (community-driven)
- [ ] **Template ratings + comments**
- [ ] **Featured templates** в галерее
- [ ] **Template remix**: fork → edit → republish
- [ ] **Лидерборд авторов** (топ за месяц / год)

**Q4 2026 — Аналитика и экспорт**
- [ ] **Расширенная аналитика**: drop-off по нодам, heatmap прохождения
- [ ] **Export в PDF / SCORM 2004** (для LMS)
- [ ] **Webhook-и для результатов** (Slack, Telegram, email)
- [ ] **A/B тесты вариантов вопросов**

**Q1 2027 — Mobile и PWA**
- [ ] **PWA с offline-режимом** (Service Worker, кеш шаблонов)
- [ ] **Native iOS/Android плеер** (React Native, share-extension)
- [ ] **QR-код для прохождения** (генерация в один клик)
- [ ] **Apple Watch companion** (квиз-нотификации)

**Q1 2027 — White-label и B2B**
- [ ] **White-label**: кастомный домен, логотип, цветовая схема
- [ ] **SSO / SAML** для enterprise
- [ ] **API для интеграций** (REST + Webhooks)
- [ ] **Self-hosted deployment** (Helm chart для Kubernetes)

### 21.3 Исследования (R&D)

- [ ] **LLM-агенты для авторов**: агент, который сам пишет квиз по теме (multi-step planning)
- [ ] **Web3 / NFT certificates** (опц.) — выпуск сертификата о прохождении как NFT
- [ ] **VR/AR квизы** (WebXR) — иммерсивные квесты
- [ ] **Голосовые квизы** (Whisper API) — прохождение голосом

### 21.5 Запуск тестов (P0 sprint)

В проекте 3 test runner'а. Все они изолированы и могут запускаться независимо.

#### A. Deno — edge functions + shared modules (204 теста)

```bash
npm run test:functions
# внутри: deno test --allow-read --allow-env
#   supabase/functions/_shared/
#   supabase/functions/billing-create-checkout/index.test.ts
#   supabase/functions/billing-yookassa-webhook/index.test.ts
#   supabase/functions/save-quiz-session/index.test.ts
#   supabase/functions/save-quiz-result/index.test.ts
```

- Все тесты — pure unit-тесты shared/helpers. Edge function handler'ы покрыты через экспортированные валидаторы (`safeReturnPath`, `validateWebhookRequest`, `pickUpdatableFields`, `validateResultBody`).
- Окружение: Deno 2.8.1, npm 10.7.0. Первый запуск скачивает `@supabase/supabase-js` и зависимости из `esm.sh` (требуется `--allow-read`).
- Если тесты валятся с `NotCapable: ... --allow-env`, проверьте что `package.json:test:functions` содержит флаг `--allow-env` (нужен для `Deno.env.get` в env-driven тестах CORS/allow-list).

#### B. SQL — Postgres integration (psql + ручной запуск)

```bash
# 1. Применить все миграции (на свежем проекте)
supabase db reset

# 2. Запустить SQL-тесты. Внешняя обёртка не требуется —
#    каждый .sql файл содержит `begin;` ... `rollback;` и сам
#    печатает summary `RESULT: N failed, M passed`.
psql "$DATABASE_URL" -f supabase/tests/phase2_sql_hardening.test.sql
psql "$DATABASE_URL" -f supabase/tests/billing_migration.test.sql
psql "$DATABASE_URL" -f supabase/tests/atomic_migration.test.sql
psql "$DATABASE_URL" -f supabase/tests/admin_foundation.test.sql
```

- Файлы используют **только** plpgsql + `EXCEPTION`-catch, без pgTAP/pgUnit — нужен только `psql`.
- Тесты идемпотентны: все вставки в `SAVEPOINT`, outer transaction `ROLLBACK`, БД остаётся нетронутой.
- Многие тесты **skip'ают** data-bound проверки при отсутствии `auth.users` строки (с `RAISE NOTICE 'SKIP: ...'`); schema-only тесты (CHECK, FK indexes, RPC signature) выполняются всегда.
- Запуск в CI: `psql "$TEST_DATABASE_URL" -f supabase/tests/*.sql` как отдельный job перед `npm run build`.

#### C. Vitest — frontend, router и engine (562 теста)

```bash
npm test                    # one-shot
npm run test:watch         # watch mode
npm run test:ui            # browser UI (http://localhost:51204)
npm run test:coverage      # V8 coverage
```

- Scope: `src/`, `utils/`, `services/`, `store/`, `hooks/` и `components/`.
  Покрываются router guards/loaders/search schemas, quiz engine/generator,
  security helpers и устойчивые UI-контракты Header.
- `components/header/quizFile.test.ts` проверяет безопасный import/export;
  `HeaderSaveControls.test.tsx` — действия и disabled-state;
  `HeaderUserMenu.test.ts` — формирование fallback/initial.
- `utils/videoUtils.test.ts` содержит regression-тест: URL вида
  `https://evil.com/rutube.ru/video/...` отклоняется. Реализация разбирает URL
  через стандартный `URL` и разрешает только `rutube.ru` / `www.rutube.ru`.
- Окружение: `jsdom` (через `testEnvironment: 'jsdom'` в `vitest.config.ts`).
- Параллелизм ограничен двумя workers для стабильности полного CI-прогона.
- `.gitignore` исключает `coverage/` директорию.

#### Сводка

| Runner | Кол-во тестов | Scope | Команда |
|---|---|---|---|
| Yandex Functions | typecheck + bundle | `yc-functions` API router/domain handlers | `npm run lint:functions` + `npm run test:functions` |
| SQL   | ~48 (4+ файла: `billing_migration`, `atomic_migration`, `session_rls_hardening`, `admin_foundation`) | migrations + RPCs + RLS | `psql $URL -f supabase/tests/*.sql` |
| Vitest | 597 (64 файла) | frontend utils, services, engine, router, components | `npm test` |

> **При добавлении теста**: обнови соответствующий runner-блок в `package.json` (`test`/`test:watch` для Vitest, `lint:functions`/`test:functions` для Yandex Functions) — новые SQL-файлы достаточно положить в `supabase/tests/*.sql`, glob найдёт их автоматически.

### 21.4 Метрики успеха (North Star)

| Метрика | Текущее | Цель Q4 2026 | Цель Q4 2027 |
|---|---|---|---|
| MAU (monthly active users) | ~500 (private beta) | 5,000 | 50,000 |
| Созданных квизов в месяц | ~200 | 3,000 | 30,000 |
| PRO conversion | 0% (в процессе) | 5% | 8% |
| Avg. session time | — | 8 мин | 12 мин |
| P95 latency (Vite SPA) | — | < 2.5s LCP | < 1.5s LCP |
| Uptime (Supabase + YC) | — | 99.5% | 99.9% |

---

## Changelog документации

- **02.07.2026 (ESLint gate)** — добавлен настоящий ESLint flat config (`eslint.config.js`) для frontend-кода: recommended JS/TypeScript, React Hooks и React Refresh. `npm run lint` теперь выполняет `typecheck` + `lint:eslint`, а `npm run verify` получает ESLint как обязательный gate. Исправлены первые блокирующие ошибки правил hooks/no-constant-binary-expression/no-unused-expressions/no-empty.

- **02.07.2026 (ESLint warnings task)** — заведена отдельная задача `ESLINT_WARNINGS_TASK.md` на снижение ESLint warnings с baseline **419 → 0**. Порядок работ: unused vars / `prefer-const`, затем `no-explicit-any`, затем React Hooks / React Refresh.

- **02.07.2026 (ESLint warnings Phase 1)** — закрыта первая фаза `ESLINT_WARNINGS_TASK.md`: `no-unused-vars` **80 → 0**, `prefer-const` **3 → 0**. Общий ESLint warning baseline снижен **419 → 331**; следующий этап — `no-explicit-any` **286 → 0**.

- **02.07.2026 (Local/CI verify gate)** — добавлен корневой `npm run verify`, который устанавливает зависимости `yc-functions`, запускает frontend typecheck, Vitest, Yandex Functions typecheck/bundle и production build. `lint:functions` делегирует в новый `yc-functions` script `lint`; CI job для функций выполняет `npm run lint`/`npm run build` из `yc-functions`, а deploy перед проверками явно выполняет `npm run install:functions`.

- **23.06.2026 (Yandex Cloud migration)** — Supabase оставлен только для Auth/JWT. Клиентские CRUD, публичные квизы, аналитика, assets, support, billing promo, admin API, AI proxy и standalone-сохранение результатов переведены на `VITE_API_URL` → Yandex API Gateway/Cloud Functions. Supabase Edge Function fallback удалён из runtime-конфигов; CI/deploy secrets используют `VITE_API_URL`; Yandex functions собираются через `yc-functions`.

- **10.06.2026 (Yandex auth entry)** — включено обязательное подтверждение email в Supabase Auth, confirmation-шаблон теперь отправляет 6-значный `{{ .Token }}`, регистрация завершается через ввод кода в `AuthModal`, расширены redirect URL для hash-router callback/reset и добавлена кнопка «Войти через Яндекс» через custom OAuth provider `custom:yandex`. Custom SMTP Яндекса включён через `smtp.yandex.ru:465`; регистрация блокирует повторный email и требует пароль минимум 8 символов со строчной/заглавной буквой и цифрой.
- **10.06.2026 (User support center)** — добавлено компактное полупрозрачное окно технической поддержки с историей обращений, созданием тикета и перепиской без перехода на отдельную полноэкранную страницу. Окно доступно из меню аккаунта и по кнопке «Помощь» в личном кабинете. Миграция `20260610040000_support_messages.sql` добавляет защищённую RLS-таблицу `support_ticket_messages`; администраторы могут отвечать пользователю из `/#/admin/support`.
- **10.06.2026 (Admin operations)** — добавлены полноценные разделы `/#/admin/reports`, `/#/admin/support` и `/#/admin/finances`. Миграция `20260610030000_admin_reports_support.sql` создаёт защищённые RLS-таблицы `quiz_reports` и `support_tickets`; `admin-api` получил списки и смену статусов жалоб/тикетов, а также финансовую сводку и реестр платежей. Счётчики жалоб и поддержки на дашборде теперь используют реальные данные.
- **10.06.2026 (Admin dashboard phase 3)** — обзор администратора расширен реальными метриками подписок и прохождений, недельной динамикой регистраций/квизов/прохождений, распределением квизов по типу доступа и подписок по планам. Журнал действий теперь показывает сотрудника и IP. Для ещё не созданных хранилищ жалоб и поддержки API возвращает недоступное значение вместо фиктивного нуля.
- **10.06.2026 (Admin panel phase 3)** — добавлены безопасные admin-мутации: `POST action=user-status` для `profiles.status` (`active/temporarily_blocked/blocked`) и `POST action=quiz-moderation` для статусов квиза (`unreviewed/reviewing/approved/rejected/blocked/hidden/deleted`). UI получил кнопки блокировки пользователей и модерации квизов; destructive delete реализован как soft-delete. Добавлен bootstrap owner для `resarytrew@gmail.com`.
- **10.06.2026 (Admin panel phase 2)** — добавлены read-only разделы `/#/admin/users` и `/#/admin/quizzes`, пункты бокового меню, методы `fetchAdminUsers`/`fetchAdminQuizzes`, Zustand-состояние списков и actions `users`/`quizzes` в `admin-api`. Списки показывают `account_code`, display-коды квизов, владельца, статус, visibility и даты; поиск поддерживает цифровые ID и название квиза.
- **10.06.2026 (Admin panel phase 1)** — добавлен фундамент админ-панели: `profiles.account_code` (6 цифр), `quiz_display_codes` (2/3/4+ цифры по `private/unlisted/public`), staff-роли и permission overrides, MFA-gated `admin-api`, `useAdminStore` + admin routes `/#/admin/login`, `/#/admin/mfa`, `/#/admin`. Edge shared helper `_shared/admin.ts` проверяет Supabase Auth token, staff status, profile block status, IP allow-list, permission и `aal2`. Добавлены Deno-тесты `_shared/admin.test.ts`, SQL smoke-test `supabase/tests/admin_foundation.test.sql`, router guards для admin routes. Проверки: `npm run test:functions` — **204/204**, `npm test` — **562/562**, `npm run build` — OK; `npm run lint` сейчас блокируется существующим `dokuments/oferta.ts` (текстовый документ с расширением `.ts`).
- **09.06.2026 (Header refactor + CI gates)** — `Header.tsx` разделён на `useHeaderController`, `quizFile`, `HeaderSaveControls`, `HeaderUserMenu` и `HeaderModals`. JSON import теперь валидирует nodes/edges до записи в store, export использует Blob URL. `utils/videoUtils.ts` проверяет точный hostname RuTube через стандартный `URL`. Добавлены 8 тестов Header; полный frontend suite — **412/412**, Deno — **197/197**. Frontend/Deno tests включены в `.github/workflows/ci.yml` и `deploy.yml` как обязательные gates. Vitest ограничен двумя workers для устранения случайных таймаутов router loader-тестов. Архитектурные разделы обновлены с hash/App routing на TanStack Router.
- **08.06.2026 (Phase 3.5)** — **Critical security hardening**: закрыты все 8 CRITICAL из `AUDIT_REPORT.md`. (C-01/C-02) новый helper `utils/safeCssUrl.ts` (CSS-context strip для `url()` — strip `' " ( ) \ \r \n \t`, allowlist `http(s)`/`data:image|audio|video`) + refactor `services/quizEngine.ts:407, 833`. (C-03) расширены `utils/parseText.test.ts` +4 XSS-теста (nested `<sc<script>ript>`, SVG `onload`, entity decode, mixed-case `<ScRiPt>`). (C-04) добавлен `allow-same-origin` в 4 iframe-компонента + regression snapshot `components/__tests__/sandbox-attrs.test.ts` (8). (C-05) pure helpers извлечены в `services/parseQuizText.ts` + `services/parseQuizText.test.ts` (15). (C-06) вычислены SHA-384 для 7 unique CDN URLs, добавлены `integrity="sha384-..." crossorigin="anonymous"` в 23 `<script>` тега в 9 template-файлах + `services/templates/__tests__/sri-integrity.test.ts` (9). (C-07) regression SQL `supabase/tests/session_rls_hardening.test.sql` (6 — `pg_policies` enum + 4 negative-теста для anon). (C-08) верифицировано — дубля нет. Phase 3.5 не имеет breaking changes. Итог: 197 Deno + 36 SQL + 97 Vitest = **330 тестов passing**. Roadmap §21.1 — Phase 3.5 помечен как выполненный.
- **08.06.2026 (Phase 5 P0)** — Tests infrastructure: Vitest + jsdom + `@vitest/ui` + `@testing-library/react` + `@testing-library/jest-dom` + `@vitest/coverage-v8` в devDependencies; `vitest.config.ts` (jsdom env, include `src/utils/services/store/hooks/**`); scripts `test`, `test:watch`, `test:ui`, `test:coverage`. Deno-тесты: `cors.test.ts` (14) + `yookassa.test.ts` (33) + `entitlement.test.ts` (22) + `auth.test.ts` (9) + `billing-create-checkout/index.test.ts` (31) + `billing-yookassa-webhook/index.test.ts` (16) + `save-quiz-session/index.test.ts` (18) + `save-quiz-result/index.test.ts` (12) — **153 новых Deno-теста**, итого **197/197 passed**. Рефакторинг (no breaking changes): `cors.ts` lazy env read для testability; `billing-create-checkout` exported `safeReturnPath`/`resolveAllowedSiteOrigin`; `billing-yookassa-webhook` extracted `validateWebhookRequest`; `save-quiz-session` exported `pickUpdatableFields`/`extractUserIdForRequest`; `save-quiz-result` extracted `validateResultBody`; все `serve()` вызовы обёрнуты в `if (import.meta.main)` чтобы тесты не триггерили `Deno.serve()`. SQL-тесты: `supabase/tests/billing_migration.test.sql` (10 тестов для `process_payment_atomic` — idempotency/renewal/entitlement sync/cancel-then-grant) + `supabase/tests/atomic_migration.test.sql` (5 тестов для `save_quiz_result_atomic` — token mismatch/abandoned/idempotency/score clamp/path clamp). README §21.5 — гайд по запуску всех 3 runner'ов (`npm run test:functions` + `psql` + `npm test`). Roadmap §21.1 — Phase 5 P0 помечен как выполненный.
- **08.06.2026 (Phase 3)** — Code hardening: созданы `_shared/crypto.ts` (timingSafeEqual, sha256Hex, verifyHashedSecret, verifyCronSecretAsync), `_shared/validators.ts` (UUID_RE, clampInt, str, clampPathData, 6 cap-констант синхронизированных с Phase 2 CHECK), `_shared/free_tier_defaults.ts` (FREE_TIER_FEATURES + getFreeTierFeatures). `auth.ts` re-export verifyCronSecret. SHA-256 хэш-режим для webhook secret + cron secret (BILLING_WEBHOOK_SECRET_HASH, BILLING_CRON_SECRET_HASH) — preferred для production: raw secret не появляется в deployment manifests. CORS-allowlist в `_shared/cors.ts` использован во всех 4 save-quiz/billing/ai-proxy функциях — удалены 3 копии corsHeaders/jsonResponse. `csp-report` CORS-bug fix: preflight + CORS-заголовки на все ответы. Free-tier shape: единый `getFreeTierFeatures()` в `billing-yookassa-webhook` и `billing-auto-renew` вместо инлайн-литерала. Тесты: crypto (17) + validators (16) + free_tier_defaults (6) + path_data_clamp (5) = **44/44 passed**. Roadmap §21.1 — Phase 3 помечен как выполненный.
- **08.06.2026 (Phase 2)** — **Phase 2 SQL hardening завершён**. Добавлена миграция `20260608000000_phase2_sql_hardening.sql` (12 CHECK constraints, 5 FK indexes, 1 partial unique index, обновлённый `save_quiz_result_atomic` с clamp path_data до 1000 элементов). Edge function `save-quiz-result`: `slice(-1000)`. Edge function `save-quiz-session`: опциональный user_id из Authorization header + abandon-then-insert логика для partial unique index. Тесты: `path_data_clamp.test.ts` (10) + `phase2_sql_hardening.test.sql` (pgTAP-style). Roadmap §21.1 — Phase 2 помечен как выполненный.
- **04.06.2026** — добавлены разделы 17-21 (Биллинг, Edge Functions, Безопасность, Деплой, Roadmap). Обновлены TOC, tech stack, node types (DialogueNode), components, file structure. Актуализирована AI-секция (canonical `ai-proxy` Edge Function).
- **31.05.2026** — первая версия (1563 строки, 16 разделов).

Документация актуальна для версии проекта с TanStack Router, модульным Header,
8-сторовой архитектурой (`useEntitlementStore`, `useAdminStore`), 21 типом нод
(включая `DialogueNode`), биллингом через ЮKassa, деплоем в Yandex Cloud
(OS + CDN) и security-аудитом Phase 0+1+2+3+5(P0).
При добавлении новых возможностей обновляйте соответствующие разделы
и Changelog в конце.

# Quiz Engine Architecture

## Единственный источник логики

Вся исполняемая логика квиза находится в `src/engine`.

`services/quizEngine.ts` не содержит реализации. Это адаптер, импортирующий
собранный `dist/quizEngine.iife.js` как текст для standalone HTML.

Нельзя добавлять обработчики нод непосредственно в:

- `services/quizEngine.ts`;
- HTML-шаблоны, использующие `%%QUIZ_SCRIPT%%`;
- Vite middleware.

## Структура

```text
src/engine/
├── index.ts                 bootstrap и загрузка quizData
├── constants.ts             общие ограничения и списки типов
├── types.ts                 контракт runtime
├── indexing.ts              индексы нод и рёбер
├── state.ts                 очки, переменные, путь, достижения
├── navigation.ts            переходы, группы и защита от циклов
├── logic.ts                 служебные логические ноды
├── expression.ts            безопасная арифметика без eval
├── globalTimer.ts           глобальный таймер квиза
├── render.ts                оболочка экрана и dispatch renderer-а
├── renderers/
│   ├── index.ts             реестр renderer-ов
│   ├── types.ts             контракт renderer-а
│   ├── common.ts            общие DOM-компоненты
│   ├── choices.ts           question и multipleChoice
│   ├── arrangement.ts       matching и timeline
│   ├── input.ts             textInput, collectInfo, allocator
│   └── basic.ts             dialogue, timer, result, default
├── media.ts                 звук, RuTube и блокировка видео
├── design.ts                применение оформления
├── sanitize.ts              HTML и URL sanitization
├── persistence.ts           результаты и abandonment beacon
└── hud.ts                   обновление HUD
```

## Сборочный поток

```text
src/engine/index.ts
        |
        +-- Rollup --> dist/quizEngine.iife.js
        |                    |
        |                    +-- ?raw --> services/quizEngine.ts
        |                                  |
        |                                  +-- standalone HTML
        |
        +-- esbuild в vite-plugin-quiz-engine.ts
                             |
                             +-- /__quiz_engine.js для preview
```

Preview и standalone используют один исходный код.

## Команды

```powershell
npm run build:engine
npm test
npm run lint
npm run build
```

`predev` и `pretest` автоматически пересобирают IIFE.

## Как добавить UI-ноду

1. Добавить или проверить тип в корневом `types.ts`.
2. Добавить данные ноды в `src/engine/types.ts` либо использовать локальный
   структурный тип renderer-а.
3. Создать renderer в подходящем файле `src/engine/renderers`.
4. Зарегистрировать его в `src/engine/renderers/index.ts`.
5. Для перехода использовать только `context.continueFrom(node, handle)`.
6. Для прямого перехода использовать `context.navigateTo(nodeId)`.
7. Пользовательский текст выводить через `textContent` или `parseText`.
8. URL пропускать через `sanitizeAssetUrl`.
9. Добавить runtime-тест в `services/__tests__/quizEngineNodes.test.ts`.

## Как добавить логическую ноду

1. Добавить тип в `LOGIC_TYPES` внутри `src/engine/constants.ts`.
2. Добавить ветку в `executeLogic` внутри `src/engine/logic.ts`.
3. Возвращать ID следующей ноды, не вызывать `processNode` напрямую.
4. Добавить тест true/false/default веток.

## Требования безопасности

- Запрещены `eval` и `new Function`.
- Нельзя вставлять пользовательские данные необработанным `innerHTML`.
- Формулы без MathJS поддерживают числа, переменные, скобки и `+ - * / %`.
- Внешние изображения, аудио и видео проходят URL sanitization.
- Preview должен работать при CSP без `unsafe-inline`.

## Обязательная проверка

После изменения движка должны пройти:

- тест регистрации всех редакторских нод;
- runtime-тесты UI и логических нод;
- тесты реальных шаблонов;
- TypeScript;
- production build.

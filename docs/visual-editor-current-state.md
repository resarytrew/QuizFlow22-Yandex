# Текущее состояние визуального редактора

Дата аудита: 20 июля 2026 года
Ветка: `feat/visual-editor-stabilization`
Архитектурный источник истины: `RULS.md`

## Область аудита

Изучены `package.json`, `RULS.md`, `README_DOCUMENTATION.md`, оболочка редактора, `components/QuizEditor/index.tsx`, все хуки и стили `components/QuizEditor`, Zustand stores, пользовательские node/edge-компоненты, панели, поиск и breadcrumbs, AI Assistant, AI Quiz Wizard, JSON import/export, preview, ручное сохранение, backend autosave и локальное аварийное сохранение.

Этап ограничен стабилизацией выбора, drag и viewport. Runtime-прохождение квиза, генератор HTML, формат JSON, backend-контракты и общая архитектура истории не менялись.

## Команды проекта

По `package.json` обязательные команды имеют следующие имена:

- `npm run typecheck` — `tsc --noEmit`;
- `npm run lint` — typecheck и ESLint;
- `npm test` — сборка quiz engine и полный Vitest run;
- `npm run build` — сборка quiz engine и Vite production build.

`npm run verify` дополнительно устанавливает и проверяет `yc-functions`, поэтому он не является заменой перечисленных команд этапа.

## Архитектура редактора

### Компоновка

`components/editorShell.tsx` собирает верхний `Header`, левый `Sidebar`, центральный `QuizEditor` и правые панели дизайна/настроек. Боковые панели позиционируются поверх редактора абсолютными слоями. Это не уменьшает геометрию React Flow, но перекрывает часть рабочей области и элементов управления.

`components/QuizEditor/index.tsx` является координатором React Flow:

- получает граф и board settings из `useCanvasStore` через `useEditorData`;
- фильтрует видимые ноды и рёбра по `currentGroup` из `useUIStore`;
- передаёт controlled `nodes`/`edges` в React Flow;
- связывает события React Flow с `useCanvasInteraction`, `useCanvasLayout`, `useKeyboardShortcuts` и actions Zustand;
- рендерит breadcrumbs, поиск, minimap, status bar и нижнюю панель;
- включает `onlyRenderVisibleElements` только в simplified/reduce-motion режиме.

### Stores

- `store/useCanvasStore.ts` — граф, selection, board settings, lock, layout flag и undo/redo history.
- `store/useQuizDataStore.ts` — метаданные квиза, загрузка, ручное backend-сохранение и backend-autosave.
- `store/useAutosaveStore.ts` — локальная аварийная копия в `localStorage` и её восстановление.
- `store/useUIStore.ts` — панели, текущая группа, preview mode и editor UI state.
- `store/usePreferencesStore.ts` — persisted пользовательские предпочтения, включая параметры доски.
- `store/useAIStore.ts` — AI-диалог и предложения; фактическое применение предложений делегируется UI/Canvas actions.
- `store/storeEvents.ts` — меж-store события `QUIZ_LOADED`, `QUIZ_CLEARED`, `AUTOSAVE_RESTORED` и связанные уведомления.

`components/QuizEditor/hooks/useEditorStore.ts` создаёт стабильный фасад actions и подписку на минимальный срез editor data. Это пока фасад, а не единый command layer.

## Карта потока данных

```text
React Flow events
  onNodeClick / onEdgeClick / onPaneClick
  onSelectionChange / onNodeDragStart / onNodesChange / onEdgesChange
  onConnect / drop / keyboard shortcuts
        ↓
QuizEditor + hooks
  useCanvasInteraction / useCanvasLayout / useKeyboardShortcuts
        ↓
useEditorActions (тонкий фасад)
        ↓
useCanvasStore
  nodes + edges + EditorSelection (ID only)
  node.selected / edge.selected as React Flow projection
  history.past/future
        ↓
useEditorAutosave (наблюдает сигнатуру графа и quiz data)
  ├─ useAutosaveStore.saveAutosave → localStorage
  └─ useQuizDataStore.autosaveQuiz → backend API
        ↓
useQuizDataStore.saveQuiz / autosaveQuiz
  собирают nodes + edges из useCanvasStore и метаданные квиза
        ↓
preview/export
  Header / LivePreview → quizGenerator → HTML
  Header JSON export → serializeQuizFile
```

Загрузка идёт в обратную сторону: backend `loadQuiz` или restore создаёт store event, подписка `useCanvasStore` заменяет `nodes`/`edges`; JSON import, AI Wizard и pending template пока вызывают `setNodes`/`setEdges` напрямую.

## Точки мутации графа

### Канонические actions `useCanvasStore`

| Action | Что меняет | История сейчас |
| --- | --- | --- |
| `onNodesChange` | position, dimensions, selection, remove и другие `NodeChange` | snapshot самостоятельно не создаёт |
| `onEdgesChange` | selection/remove и другие `EdgeChange` | snapshot самостоятельно не создаёт |
| `onConnect` | добавляет edge | snapshot до изменения |
| `addNode` | добавляет node, учитывает `currentGroup` | snapshot до изменения |
| `setNodes` / `setEdges` | полная/функциональная замена | без snapshot |
| `deleteNode` / `deleteEdge` | удаление | snapshot до изменения |
| `updateNodeData` | data ноды | debounced snapshot после изменения |
| `updateEdgeData` | data edge | snapshot после изменения |
| `clearCanvas` | сброс графа и history | очищает history |
| `collapseVariableChainToEffects` | nodes и edges | snapshot после изменения |
| selection-команды | `EditorSelection` и проекцию `node.selected`/`edge.selected` | без snapshot |

### Обходы единого action/history потока

- `components/AIQuizWizard.tsx` — `setNodes`, `setEdges`, затем `setNeedsLayout(true)`.
- `components/AIAssistantPanel.tsx` — отдельно `addNode` и `onConnect`, поэтому одна операция создаёт два history snapshot.
- `components/header/useHeaderController.ts` — JSON import через прямые `setNodes`/`setEdges`.
- `src/router/routes/editorNew.tsx` — pending template через прямые `setNodes`/`setEdges`.
- `components/QuizEditor/hooks/useCanvasLayout.ts` — полная замена расположений через `setNodes`.
- `components/modals/VariableManagerModal.tsx` — явная навигация с `setCenter`, но selection проходит через `selectSingleNode`.
- `store/useQuizDataStore.ts` — загрузка и restore через store events.
- `store/useCanvasStore.ts` — обработчики `QUIZ_LOADED`/`AUTOSAVE_RESTORED` заменяют граф напрямую и очищают/сохраняют history по разным правилам.

Это главная причина непоследовательности undo/redo и основание для будущего command layer. На текущем этапе эти потоки не унифицировались.

## Selection и drag

До этапа selection хранился одновременно в `selectedNode` и `node.selected`, но `setSelectedNode` обновлял только объект `selectedNode`. React Flow мог сохранять скрытое множественное выделение. Дополнительно `QuizEditor` отбрасывал все position changes, кроме change активной drag-ноды. Такой фильтр маскировал рассинхронизацию и ломал корректный multi-drag.

После первого этапа обычный и групповой drag были стабилизированы. Текущая ID-based модель дополнительно устраняет конкурирующие источники истины:

- `primarySelectedNodeId`, `selectedNodeIds` и `selectedEdgeIds` являются единственным selection state;
- полный объект выбранной ноды не хранится и вычисляется memoized selector через `nodesById`;
- обычный click вызывает `selectSingleNode`;
- Shift/Ctrl/Cmd click использует toggle-семантику;
- selection rectangle помечается как явная групповая selection;
- обычный drag start очищает неявную группу;
- явно выбранная группа может двигаться совместно;
- `onNodesChange` принимает фактический набор position changes без фильтра по одному id;
- `node.selected` и `edge.selected` являются только проекцией ID-based selection;
- выбор edge очищает node selection и primary node;
- фильтрация `onEdgesChange` выполняется по id видимых edges, а не nodes.
- одинаковый `onSelectionChange` возвращает исходный Zustand state и не создаёт цикл уведомлений;
- переход между группами очищает selection, а `selectAllVisibleNodes` учитывает `currentGroup`.

`onNodeDrag` отдельно не требуется: controlled React Flow передаёт промежуточные координаты через `onNodesChange`. Snapshot drag создаётся один раз в `onNodeDragStart`; `onNodeDragStop` не добавляет дубликат.

## Viewport и навигация

До этапа `useCenterOnSelected` зависел от полного объекта `selectedNode` и вызывал `setCenter` с фиксированным zoom. Любое редактирование data создавало новый объект и повторно двигало камеру. `useCanvasResize` вызывал `fitView` после изменения размеров editor container, в том числе при UI-компоновке.

Автоматические selection/resize эффекты удалены. Оставшиеся viewport-команды являются явными пользовательскими или workflow-действиями:

- `CanvasSearch.tsx` — `setCenter` при переходе к найденной ноде;
- `VariableManagerModal.tsx` — `setCenter` при явной навигации к использованию переменной;
- `BottomControlBar.tsx` — reset viewport и fit view;
- `useCanvasLayout.ts` — fit view после ручного layout или `needsLayout` от AI Wizard.

Изменение текста, изображения, ответа и других node data, обычный click, selection и открытие SettingsPanel больше не вызывают viewport-команды.

## CSS и визуальный размер нод

До этапа selected state добавлял `scale-105`/`scale-110` в `BaseNode` и нескольких специализированных node-компонентах. `.react-flow__node` также анимировал `transform`, хотя React Flow использует этот transform для координат.

Теперь wrapper `.react-flow__node` не содержит transition по `transform`; selected state не меняет scale карточек или handles. Внутренние переходы ограничены border color, box-shadow, background color и opacity. Это устраняет визуальный скачок размера и интерполяцию координат wrapper-ноды.

## History и snapshot

Текущая модель хранит до 50 полных `structuredClone` snapshot графа. Undo/redo заменяет nodes/edges целиком и очищает `EditorSelection`, но snapshot содержит проекционное поле `node.selected`. Известные проблемы:

- часть actions создаёт snapshot до изменения, часть после;
- debounced snapshot `updateNodeData` снимается после изменения и может не представлять корректное undo-состояние;
- drag ранее не имел snapshot; на этом этапе добавлен один snapshot на drag start;
- AI/import/layout/template/load/restore имеют разные правила history;
- одна логическая AI Assistant операция создаёт несколько snapshot;
- selection попадает в полные snapshot как часть node objects.

Рекомендуется не исправлять эти пункты точечно: следующий архитектурный этап должен ввести команды с атомарными `before/after`, валидацией и единым history policy.

## Сохранение и autosave

`useEditorAutosave` вычисляет стабильную сигнатуру editor/quiz state, сохраняет локальную копию через `useAutosaveStore` и, при наличии сессии, вызывает `useQuizDataStore.autosaveQuiz`. Предусмотрены debounce, защита от параллельных сохранений и повтор при изменении во время запроса.

`useQuizDataStore.saveQuiz` и `autosaveQuiz` читают актуальные nodes/edges непосредственно из `useCanvasStore`, объединяют их с метаданными, design settings, timer и visibility и отправляют backend payload. Загрузка публикует `QUIZ_LOADED`; restore публикует `AUTOSAVE_RESTORED`.

Риск: autosave наблюдает конечное состояние stores, а не команды. Поэтому любая прямая мутация графа будет сохранена, даже если она обошла validation/history/lock.

## Import, export и preview

- JSON parser/validator/serializer расположен в `components/header/quizFile.ts`.
- Header controller импортирует валидированный файл прямыми `setNodes`/`setEdges` и отдельно применяет quiz/design data.
- JSON export сериализует текущий граф и настройки.
- HTML preview/export использует `services/quizGenerator`; `LivePreview` использует тот же генераторный контракт.
- Runtime engine в `src/engine` и его публичное поведение этим этапом не затронуты.

Риск: import является полной заменой состояния без атомарной команды, общего validation result и согласованного snapshot.

## Источники board/design settings

- Canvas `boardSettings` остаётся в `useCanvasStore`.
- Persisted board preferences находятся в `usePreferencesStore`.
- `hooks/useSyncBoardSettings.ts` синхронизирует preferences в canvas store.
- `useQuizDataStore` хранит quiz-level `designSettings`, которые используются SettingsPanel, preview/export и backend save.
- `useSyncBoardSettings` и import/load создают несколько направлений записи, поэтому источник истины для board settings не полностью однозначен.

## Lock mode

В UI lock проверяется в `QuizEditor`, `useCanvasInteraction`, `useKeyboardShortcuts` и отключает draggable/connectable/selectable controls. Однако actions самого `useCanvasStore` lock не проверяют. Lock можно обойти через:

- AI Assistant и AI Quiz Wizard;
- JSON import и pending templates;
- layout;
- прямые mutation actions AI/import/layout, которые пока не проверяют lock внутри store;
- прямой вызов store actions из любого компонента.

Lock пока является UI-ограничением, а не инвариантом mutation layer.

## Риски для графов 50–300 нод

1. Полные deep-clone snapshots и сериализация полной autosave-сигнатуры имеют стоимость O(nodes + edges) и могут совпадать по времени с редактированием.
2. Controlled React Flow получает новые массивы при selection и каждом position change; это нормально, но прямые массовые `setNodes` усиливают ререндеры.
3. `onlyRenderVisibleElements` включён не всегда, поэтому обычный режим рендерит весь текущий group.
4. Большие node-компоненты и SettingsPanel имеют широкие store-подписки и требуют отдельного profiling до оптимизации.
5. Полные графовые snapshot в history увеличивают память пропорционально размеру графа и глубине истории.
6. Overlay-панели физически перекрывают canvas, minimap и controls.
7. Поиск может выбрать ноду из другой группы без отдельной атомарной команды navigate-and-reveal.

## Рекомендуемый порядок следующих этапов

1. Добавить browser-тесты реального drag/selection rectangle на React Flow DOM поверх текущих unit/integration tests.
2. Ввести единый типизированный graph command dispatcher без миграции всех команд сразу.
3. Перевести drag, data edit, add/connect/delete на атомарные команды и унифицировать snapshot policy.
4. Перевести import, AI, layout, template/load/restore на тот же command/validation layer.
5. Сделать lock обязательной проверкой mutation layer с явными системными bypass-командами для load/restore.
6. Определить один источник истины для board settings и одно направление синхронизации.
7. Исправить layout shell так, чтобы панели резервировали рабочую область или React Flow учитывал safe insets.
8. Профилировать 50/100/300 нод и только после измерений оптимизировать subscriptions, snapshots и rendering.
9. Реализовать атомарную команду group/search navigate-and-reveal.

## Проверки

### Baseline до изменений

- `npm run typecheck` — успешно.
- `npm run lint` — успешно, 0 errors и 45 существовавших warnings.
- `npm test` — успешно.
- `npm run build` — успешно; существующие предупреждения о malformed generated CSS, смешанных dynamic/static imports, пустом `vendor-react` chunk и крупных chunks.

### Проверки новых контрактов

- targeted Vitest: 3 файла, 14 тестов — успешно;
- targeted `npm run typecheck` — успешно.

### Итоговый прогон этапа

- `npm run typecheck` — успешно, 0 ошибок;
- `npm run lint` — успешно, 0 errors и 45 существовавших warnings; новых warnings этап не добавил;
- `npm test` — успешно: 68 test files, 618 tests;
- `npm run build` — успешно.

Build сохраняет baseline-предупреждения: malformed generated CSS declaration `-: |>;`, пустой `vendor-react` chunk, смешанные dynamic/static imports и chunks крупнее 500 kB. Они не вызваны изменениями этого этапа.

### Этап единой модели selection

- targeted Vitest: 5 файлов, 33 теста — успешно;
- `npm run typecheck` — успешно, 0 ошибок;
- `npm run lint` — успешно, 0 errors и 45 существовавших warnings; новых warnings этап не добавил;
- `npm test -- --run` — успешно: 70 test files, 637 tests;
- `npm run build` — успешно; сохраняются baseline-предупреждения о malformed generated CSS, пустом `vendor-react` chunk, смешанных dynamic/static imports и chunks крупнее 500 kB.

## Известные ограничения этапа

- Selection централизован, но единый command/history/validation layer для остальных мутаций графа ещё не введён.
- Не унифицированы AI/import/layout/autosave mutations.
- Не исправлена семантика snapshot для редактирования data и edge data.
- Не переработана компоновка overlay-панелей.
- Не оптимизированы store subscriptions и history для 300 нод.
- Существующие явные команды поиска/layout/variable navigation по-прежнему двигают viewport по назначению.

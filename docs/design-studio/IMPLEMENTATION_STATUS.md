# Design Studio Implementation Status

Date: 2026-07-13

## Current Stage

Stage 11: Layers drawer and element operations.

Status: completed locally.

Commit target: `feat: add design layers and object operations`.

## Stage 11 Completed

- Added an editor-only `Слои` button to the existing design-mode toolbar.
- Added a closeable drawer overlay on top of the existing editor shell:
  - no permanent left column;
  - no new route;
  - no new editor shell;
  - no second Player renderer.
- Added a semantic layer tree for the current preview screen:
  - screen root;
  - canvas/background;
  - quiz shell/topbar;
  - question card hierarchy;
  - result hierarchy;
  - progress/timer/stats blocks.
- Kept one source of selection:
  - drawer row selection writes to `selectedDesignElement`;
  - the same state remains shared with LivePreview and SettingsPanel.
- Extended `LayoutDocument` safely for object operations:
  - user layer names;
  - normalized group records;
  - validation and migration preserve old quizzes.
- Added layer operations through existing `DesignHistory` patches:
  - rename;
  - lock/unlock;
  - hide/show with required-element protection;
  - delete with required-element protection;
  - duplicate;
  - copy;
  - paste with new safe IDs and current-screen node binding;
  - cut;
  - group;
  - ungroup;
  - auto-layout ordering via semantic `elementOrder`;
  - free-layout z-index changes.
- Added drawer keyboard shortcuts when focus is not inside editable controls:
  - Ctrl/Cmd+C;
  - Ctrl/Cmd+V;
  - Ctrl/Cmd+X;
  - Ctrl/Cmd+D;
  - Delete/Backspace;
  - Ctrl/Cmd+G;
  - Ctrl/Cmd+Shift+G;
  - Escape;
  - ArrowUp/ArrowDown and Shift variants.
- Kept clipboard data design-only:
  - no runtime answers;
  - no user contacts;
  - no Telegram/MAX init data;
  - no tokens;
  - no scripts.
- Added tests for:
  - layer hierarchy and selection;
  - auto-layout order;
  - free-layout z-index;
  - lock/hide/delete constraints;
  - duplicate;
  - clipboard/paste IDs;
  - group/ungroup;
  - drawer open/close;
  - drawer-to-preview selection state;
  - shortcuts;
  - UI store drawer state.

## Stage 11 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- src/designMode/designLayers.test.ts components/designMode/DesignLayersDrawer.test.tsx components/designMode/DesignModeToolbar.test.tsx store/useUIStore.test.ts` | Passed | 4 files, 29 tests passed. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 87 files, 714 tests passed. Expected stderr appears in existing negative-path tests; existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import notices and large chunk warnings. |

## Stage 11 Known Limitations

- Duplicated/pasted functional layers are persisted as safe layout objects, but templates do not yet render newly authored duplicate DOM elements in public Player.
- Grouping stores group metadata and preserves child positions; group drag/resize is not implemented yet.
- Multi-select is supported inside the drawer for batch clipboard/group actions, while `selectedDesignElement` remains the single primary selection source.
- Visibility and z-index are applied through the existing free-layout preview path; public Player and HTML export remain unchanged.
- Advanced layer thumbnails, drag-to-reorder inside the drawer and breakpoint-specific layer operations are not implemented in this stage.

## Previous Stage 10

Stage 10: Drag, resize and snapping in LivePreview.

Status: completed locally.

Commit target: `feat: add drag resize and snapping to live preview`.

## Stage 10 Completed

- Added a first-party DOM interaction layer for free layout in the existing `LivePreview`.
- Kept the existing iframe Player mounted; drag/resize does not regenerate HTML or remount the preview.
- Added editor-only selection handles:
  - selected element frame;
  - eight resize handles;
  - element label;
  - live size/coordinate label;
  - snap guide layer.
- Added free-layout direct manipulation:
  - pointer drag;
  - pointer resize;
  - proportional resize with Shift;
  - keyboard movement with arrow keys;
  - Escape cancellation during pointer interaction;
  - bounds clamping to the scene.
- Added snapping helpers:
  - scene edges;
  - scene center;
  - other element edges;
  - other element centers;
  - grid.
- Preserved functional constraints:
  - locked elements cannot move/resize;
  - `answer-card` is not moved independently;
  - `answers-container` remains the movable group;
  - `question-card` and actions keep minimum sizes and scene bounds;
  - rotation remains unsupported.
- Added normalized geometry utilities in `src/designMode/layoutInteraction.ts`.
- Wired drag/resize commits through existing `DesignHistory`:
  - one drag = one history operation;
  - one resize = one history operation;
  - keyboard movement is coalesced by selected element.
- Recorded the library decision in architecture docs:
  - `interactjs` and `react-moveable` were evaluated;
  - Stage 10 uses Pointer Events + `requestAnimationFrame` to avoid a canvas-like runtime and extra bundle weight.
- Updated embedded Canva documentation with direct manipulation behavior and current limits.

## Stage 10 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- --run src/designMode/layoutInteraction.test.ts` | Passed | 6 geometry tests passed: drag, resize, bounds, snap, locked elements, zoom-independent coordinate conversion and document frame update. |
| `npm test -- --run components/LivePreview.test.tsx` | Passed | 9 bridge/preview tests passed. Existing React `act(...)` warnings still appear in this test file. |
| `npm test -- --run store/useQuizDesignHistory.test.ts` | Passed | 9 history tests passed, including one committed layout-frame operation and undo. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 85 files, 700 tests passed. Expected stderr appears in existing negative-path tests; existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import notices and large chunk warnings. |

## Stage 10 Known Limitations

- Direct manipulation is available only in free layout and in visual-selection-supported templates: `default`, `newyear`, `screenQuiz`.
- Auto layout still uses semantic inspector controls for order, spacing, width and alignment; it does not support absolute pointer drag.
- Free-layout visual positioning is editor-preview-only in this stage; public Player and HTML export remain unchanged.
- Multi-select, group resize, advanced pan/zoom UI, breakpoint-specific frame editing and decorative layer authoring are not implemented yet.

## Previous Stage 9

Stage 9: Embedded Canva/free-layout model.

Status: completed locally.

Commit target: `feat: add embedded free-layout model`.

## Stage 9 Completed

- Added a versioned `LayoutDocument` model for embedded Canva/free layout:
  - `schemaVersion`;
  - `mode: auto | free`;
  - `baseViewport`;
  - semantic `LayoutElement` records;
  - tablet/mobile breakpoint override shape.
- Added layout scope support without copying full layouts into every node:
  - global;
  - node type;
  - current node.
- Added normalization, migration, serialization and validation:
  - rejects invalid roles;
  - rejects unsafe element IDs;
  - clamps coordinates and sizes;
  - rejects `NaN` and `Infinity`;
  - limits captured elements to 80;
  - loads old quizzes without `LayoutDocument`.
- Added constrained role rules:
  - background occupies the scene;
  - question card is required and viewport-constrained;
  - answers container moves as a group;
  - primary actions stay reachable;
  - functional elements cannot rotate;
  - text and inputs remain DOM.
- Added logical coordinate conversion from measured Preview DOM rectangles:
  - coordinates are normalized to `baseViewport`;
  - preview zoom/device scale does not affect saved values;
  - iframe offset is not persisted.
- Extended `PreviewBridge` with editor-only measurement messages:
  - parent -> Player: `MEASURE_LAYOUT_ELEMENTS`;
  - Player -> parent: `LAYOUT_ELEMENTS_MEASURED`.
- Added DOM measurement in the existing Player bridge via `getBoundingClientRect`.
- Wired the existing `LivePreview` to forward editor-only measurement requests and responses.
- Added the requested `Макет` switch inside the existing `DesignOverviewPanel`:
  - `Автоматический`;
  - `Свободный`;
  - scope selector for global/node type/current node.
- Wired auto/free transitions through existing `DesignHistory`:
  - auto -> free creates a measured `LayoutDocument`;
  - free -> auto asks for confirmation;
  - free layout can be preserved as a draft;
  - undo/redo restores the previous mode.
- Added architecture documentation:
  - `docs/design-studio/CANVA_MODE_ARCHITECTURE.md`.

## Stage 9 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit --pretty false` | Passed | No type errors after model/UI integration. |
| `npm test -- --run src/designMode/layoutDocument.test.ts src/previewBridge/protocol.test.ts src/engine/__tests__/previewBridge.test.ts components/designMode/DesignOverviewPanel.test.tsx store/useQuizDesignHistory.test.ts` | Passed | 5 files, 32 tests passed. |
| `npm test -- --run services/quizGenerator/__tests__/designSelectionExport.test.ts src/engine/__tests__/previewBridge.test.ts` | Passed | Verifies free-layout measurement support does not leak editor selection attributes into standalone HTML export. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 84 files, 693 tests passed. Expected stderr appears in existing negative-path tests. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 9 Known Limitations

- Drag and resize are intentionally not implemented.
- Free-layout rendering is not applied to Player visuals yet; this stage creates the safe model and capture path only.
- Breakpoint overrides are normalized and serializable, but no responsive editing UI exists yet.
- Unsupported templates may produce fewer measurable elements, but they continue to open safely.
- Returning to auto mode stores a draft document, but there is no dedicated draft manager UI yet.

## Previous Stage 8

Stage 8: Design Overview, styles and Brand Kit.

Status: completed locally.

Commit target: `feat: add integrated design styles and brand kits`.

## Stage 8 Completed

- Rebuilt the existing `DesignOverviewPanel` inside the current `SettingsPanel`; no new route, modal shell or separate editor shell was added.
- Added the requested overview sections:
  - Quick start;
  - Template;
  - Style;
  - Brand Kit;
  - Background;
  - General settings;
  - Advanced.
- Added a template catalog for all existing templates:
  - user-facing name;
  - purpose;
  - visual editing support;
  - compatibility notes;
  - preview-before-apply flow.
- Added one unified user-facing style level named `Style`, replacing the old split terminology in the overview:
  - Brief / Lead form;
  - Assessment;
  - Educational test;
  - Product selector;
  - Calculator;
  - Storytelling;
  - Minimal B2B;
  - Kiosk / event;
  - Magazine;
  - Quiet premium.
- Added real thumbnail modeling through the same `DesignResolver` used by Player design resolution:
  - background;
  - card;
  - title;
  - media block;
  - answers;
  - CTA;
  - progress.
- Added preview-before-apply for templates and styles:
  - hover/click creates a pending preview;
  - no store write happens until Apply;
  - Cancel clears pending state.
- Added a separate persisted design asset store under `potok-design-assets`, intentionally separate from workspace preferences:
  - saved Brand Kits;
  - custom design styles;
  - active Brand Kit marker.
- Added Brand Kit management:
  - save;
  - apply;
  - rename;
  - update;
  - delete;
  - apply without replacing layout or element overrides.
- Added custom style management:
  - save current design as style;
  - update;
  - duplicate;
  - delete;
  - import JSON;
  - export JSON.
- Added custom style JSON validation:
  - rejects invalid JSON;
  - rejects script-like content;
  - rejects secret/token-like keys;
  - separates Custom CSS from normalized design settings.
- Added design status display:
  - active template;
  - active style;
  - Brand Kit;
  - modified/custom state;
  - saved/new quiz state.
- Added `applyBrandKit` to the quiz design history flow so Brand Kit application is undoable and does not bypass `DesignHistory`.

## Stage 8 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm test -- --run src/designMode/designStyles.test.ts store/useDesignAssetsStore.test.ts components/designMode/DesignOverviewPanel.test.tsx store/useQuizDesignHistory.test.ts components/SettingsPanel.designMode.test.tsx` | Passed | 5 files, 26 tests passed. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. Warnings are unchanged categories from previous stages. |
| `npm test` | Passed | 83 files, 680 tests passed. Expected stderr appears in existing negative-path tests. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 8 Known Limitations

- Thumbnails are compact DOM renderings driven by `DesignResolver`; they are intentionally not full interactive iframe Players.
- Applying a template still changes `templateId` directly and does not yet open a larger modal comparison view.
- Custom style export copies JSON to the clipboard from the UI; no file picker/download flow was added in this stage.
- Brand Kit application changes brand and typography only. Layout and compact element overrides are intentionally preserved.
- Full render-time application of node type/current-node scoped overrides remains the next integration step from Stage 7.

## Previous Stage 7

Stage 7: contextual Design Element Inspector.

Status: completed locally.

Commit target: `feat: add contextual design element inspector`.

## Stage 7 Completed

- Reworked the design-mode right panel around the requested flow:
  - `DesignOverviewPanel` is shown when no visual element is selected;
  - `DesignElementInspector` is shown for the selected visual element;
  - node settings stay hidden in design mode;
  - closing the inspector clears only the selected design element and keeps design mode open;
  - returning to flow mode restores the selected node settings.
- Added schema-driven contextual inspectors by `DesignElementRole` instead of a large duplicated switch:
  - question title and description typography;
  - media source, fit, ratio, size, radius and alt text;
  - question card surface settings;
  - answer layout and answer card settings;
  - primary action settings;
  - progress settings;
  - result settings;
  - background settings;
  - semantic element order.
- Added reusable inspector building blocks:
  - `DesignScopeControl`;
  - `DesignPropertySource`;
  - `DesignResetActions`;
  - schema-driven `DesignControl`;
  - `inspectorSchemas`.
- Added scoped design override helpers:
  - global design updates;
  - node type overrides;
  - current node overrides;
  - compact element override patches;
  - reset property, reset element and reset current-screen helpers.
- Added compact override storage under `designSettings.elementOverrides` without copying full `DesignSettings` into nodes.
- Preserved and normalized compact extras in `DesignResolver`:
  - `elementOverrides`;
  - semantic `layout.elementOrder`.
- Added inheritance/source indicators for inspector properties:
  - template;
  - style;
  - global design;
  - node type;
  - current screen.
- Wired inspector changes through existing `DesignHistory`:
  - inspector edits;
  - coalesced range controls;
  - reset actions;
  - undo/redo compatibility.
- Kept Player architecture unchanged:
  - no second renderer;
  - no bitmap/canvas replacement;
  - no separate route;
  - no new editor shell;
  - no drag, resize or free-layout implementation in this stage.

## Stage 7 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm test -- --run src/designMode/designElementOverrides.test.ts components/SettingsPanel.designMode.test.tsx store/useQuizDesignHistory.test.ts components/designMode/DesignModeToolbar.test.tsx components/LivePreview.test.tsx src/previewBridge/protocol.test.ts src/designMode/elementRegistry.test.ts` | Passed | 7 files, 38 tests passed. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 80 files, 665 tests passed. Expected stderr appears in existing negative-path tests. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |
| `npm test -- --run src/designMode/designElementOverrides.test.ts components/SettingsPanel.designMode.test.tsx components/designMode/DesignModeToolbar.test.tsx` | Passed | 3 files, 15 tests passed after final inspector control cleanup. |

## Stage 7 Known Limitations

- Scoped node type and current-node overrides are stored, resolved and tested in the inspector layer, but Player rendering still primarily consumes global `DesignSettings`; applying all scoped overrides at render time is a later integration step.
- Some role-specific metadata fields can now be edited and saved as compact element overrides before every template visibly consumes them.
- Element selection remains supported only for the templates enabled in Stage 6: `default`, `newyear` and `screenQuiz`. Other templates continue to open safely through overview settings.
- Drag, resize, constrained Canva mode and free layout remain intentionally out of scope.

## Previous Stage 6

Stage 6: visual element selection in Live Preview.

Status: completed locally.

Commit target: `feat: add visual element selection to live preview`.

## Stage 6 Completed

- Added a semantic design element registry shared by editor UI and PreviewBridge protocol:
  - stable role list for canvas, shell, topbar, brand, title, progress, timer, question, media, answers, actions, achievements, variables, stats and result elements;
  - user-facing labels;
  - allowed properties;
  - movement, resize, visibility and scope metadata;
  - safe ID normalization helpers.
- Extended PreviewBridge validation for editor design selections:
  - `DESIGN_ELEMENT_SELECTED`;
  - `DESIGN_ELEMENT_SELECTION_CLEARED`;
  - strict role validation;
  - safe element ID validation;
  - current-node matching in `LivePreview`.
- Added editor-only visual element selection inside the existing `LivePreview` iframe:
  - hover highlight;
  - persistent selected outline;
  - selected element label;
  - Escape clears selection;
  - select mode blocks answers, buttons and links;
  - test mode restores normal Player behavior.
- Kept the visual overlay editor-only:
  - not emitted by public Player;
  - not emitted by standalone HTML export;
  - not emitted by preview HTML when no editor runtime is attached.
- Added runtime semantic annotations in editor preview only:
  - `data-design-role`;
  - `data-design-element-id`;
  - `data-design-node-id`.
- Supported first-pass visual selection for:
  - `default`;
  - `newyear`;
  - `screenQuiz`.
- Added a safe unsupported-template fallback:
  - Player opens normally;
  - `DesignOverviewPanel` remains available;
  - visual picking is disabled with an explanatory notice.
- Updated design mode SettingsPanel behavior:
  - selected visual element opens `DesignElementInspector`;
  - node settings stay hidden in design mode;
  - the previously selected graph node is preserved.
- Wired selected-element reset to existing design history section operations.
- Preserved the existing DOM Player, editor shell, route model and LivePreview architecture. No second renderer, fake preview, drag, resize or free-layout engine was added.

## Stage 6 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm test -- --run src/previewBridge/protocol.test.ts src/designMode/elementRegistry.test.ts components/LivePreview.test.tsx components/SettingsPanel.designMode.test.tsx store/useUIStore.test.ts services/quizGenerator/__tests__/designSelectionExport.test.ts` | Passed | 6 files, 32 tests passed. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 79 files, 656 tests passed. Expected stderr appears in existing negative-path tests. Existing React `act(...)` warnings appear in `LivePreview` tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 6 Known Limitations

- First-pass element picking is implemented as an editor-only same-origin LivePreview layer so public Player and HTML export stay clean.
- Native Player emission of semantic element selection can be added later per template, using the validated bridge protocol already added here.
- Element property editing is still section-level for many roles; fine-grained per-element property mapping is future work.
- Drag, resize, free layout and Canva-like constraints are intentionally not implemented in this stage.
- Visual selection is fully enabled only for `default`, `newyear` and `screenQuiz`; other templates open safely without visual picking.

## Previous Stage 5

Stage 5: integrated visual design mode.

Status: completed locally.

Commit target: `feat: integrate visual design mode into existing editor`.

## Stage 5 Completed

- Added the integrated editor mode model:
  - `flow`;
  - `design`.
- Extended `useUIStore` with design-mode UI state:
  - selected design element;
  - design interaction mode;
  - preview device;
  - saved flow viewport snapshot;
  - saved flow panel/sidebar snapshot.
- Added the main header switch:
  - `Scenario`;
  - `Design`.
- Embedded the existing real `LivePreview` into the existing editor shell for design mode.
- Kept the scenario graph as the center surface in flow mode.
- Preserved selected node and graph viewport when switching between flow and design.
- Added a compact design-mode toolbar:
  - previous/current/next screen navigation;
  - Desktop/Tablet/Mobile preview device;
  - select/test interaction mode;
  - undo/redo;
  - reset selected element.
- Added compact screen-order helpers for choosing the current preview screen without introducing a separate screen list.
- Updated `SettingsPanel` so design mode shows:
  - `DesignOverviewPanel` when no element is selected;
  - `DesignElementInspector` when a design element selection exists.
- Kept node settings out of the right panel in design mode.
- Reused the existing `PreviewBridge` and selected-node navigation path.
- Kept the player as the existing DOM Player. No bitmap/canvas replacement, no fake preview and no second renderer were added.
- Verified `default`, `newyear` and `screenQuiz` can open through the design-mode preview path.
- Added route-level coverage to guard against introducing a standalone design route.

## Stage 5 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- --run store/useUIStore.test.ts components/designMode/DesignModeToolbar.test.tsx components/SettingsPanel.designMode.test.tsx components/header/HeaderModeSwitch.test.tsx components/LivePreview.test.tsx src/designMode/screens.test.ts src/router/__tests__/design-mode-route.test.ts` | Passed | 7 files, 28 tests passed. |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 77 files, 648 tests passed. Expected stderr appears in existing negative-path tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 5 Known Limitations

- Player-side element picking is not implemented in this stage. `selectedDesignElement` and the inspector are ready for the next bridge step.
- `DESIGN_ELEMENT_SELECTED` remains reserved in the bridge protocol; the Player does not emit real element selections yet.
- ElementRegistry support for thematic templates is still future work. Unsupported templates open safely without visual picking.
- The small-screen inspector still relies on the existing responsive panel behavior; a dedicated drawer polish pass can follow later.
- Reset selected element currently works through section-level design history operations for supported roles.

## Previous Stage 4

Stage 4: stable live design preview.

Status: completed locally.

Commit target: `feat: stabilize live design preview`.

## Stage 4 Completed

- Reworked `LivePreview` so design changes no longer regenerate the iframe HTML or remount the iframe.
- Added an explicit versioned `PreviewBridge` protocol over `postMessage`.
- Added parent-to-player messages:
  - `PREVIEW_INIT`;
  - `DESIGN_PATCH`;
  - `DESIGN_REPLACE`;
  - `NAVIGATE_TO_NODE`;
  - `SET_PREVIEW_MODE`;
  - `RESET_PREVIEW_STATE`.
- Added player-to-parent messages:
  - `PREVIEW_READY`;
  - `PREVIEW_NODE_CHANGED`;
  - `PREVIEW_STATE_CHANGED`;
  - `PREVIEW_ERROR`;
  - `DESIGN_ELEMENT_SELECTED` reserved in the protocol for the next stage.
- Added origin, source and envelope validation for bridge messages.
- Kept the bridge disabled unless the generated preview payload explicitly sets `previewBridge.enabled`.
- Added selected-node navigation from the editor into the live player.
- Added device modes for the preview viewport:
  - Desktop;
  - Tablet;
  - Mobile;
  - Fullscreen.
- Added safe-area-aware preview viewport padding.
- Extended the engine build tsconfig to include the shared bridge protocol module.

## Stage 4 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- --run components/LivePreview.test.tsx src/previewBridge/protocol.test.ts src/engine/__tests__/previewBridge.test.ts` | Passed | 3 files, 10 tests passed. |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. |
| `npm test` | Passed | 72 files, 632 tests passed. Expected stderr appears in existing negative-path tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 4 Known Limitations

- The live bridge applies generic default-template design via CSS variables/classes. Hard-coded thematic templates still require controlled HTML reloads for template-specific visual changes.
- Screen quiz has its own standalone runner and remains outside the generic engine bridge in this stage.
- `DESIGN_ELEMENT_SELECTED` is reserved in the protocol only; element picking is planned for the next stage.

## Previous Stage 3

## Stage 3 Completed

- Added `DesignResolver` as a pure layer resolver:
  - defaults;
  - template base;
  - full normalized style preset;
  - Brand Kit logo/colors/fonts;
  - manual overrides.
- Added normalization for legacy partial `DesignSettings`, invalid enum values, nullable values and valid zero numeric values.
- Replaced design loading from `deepMerge` with resolver-based normalization for saved quizzes and autosave restore.
- Added design metadata:
  - `Стиль применён`;
  - `Стиль изменён`;
  - `Пользовательский дизайн`.
- Added `DesignHistory` to the quiz data store:
  - undo;
  - redo;
  - 50-entry limit;
  - coalescing by `coalesceKey` for slider-style operations;
  - preset application as one history step;
  - palette application as one history step.
- Added reset operations:
  - property;
  - section;
  - screen quiz screen settings;
  - full design.
- Added a toast action labelled `Отменить применение пресета`.
- Unified visible terminology toward `Стиль` while keeping old internal fields for compatibility.
- Fixed design-panel numeric fallbacks from `||` to `??` where zero is valid.
- Added tests for deterministic resolution, layer order, legacy migration, undo/redo, slider coalescing, resets, style-after-style behavior, modified style status and zero border radius.

## Stage 3 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- --run src/design/designResolver.test.ts store/useQuizDesignHistory.test.ts store/useQuizDataStore.test.ts components/DesignPanel.test.tsx` | Passed | 4 files, 14 tests passed. |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |

## Stage 3 Known Limitations

- Brand Kit is supported by `DesignResolver`, but a dedicated Brand Kit UI/import surface is not implemented yet.
- Reset property is implemented in the store; the current UI exposes section, screen and full-design reset controls first.
- Slider coalescing is keyed by store operation (`coalesceKey`); a later Design Studio can add explicit pointer start/end grouping.

## Previous Stage 2

## Stage 2 Completed

- Added an explicit top header button labelled `Дизайн`.
- Added UI state for opening/closing design independently from node selection.
- Preserved the currently selected node when opening design and returning from it.
- Moved quiz template selection into the design panel quick-start flow.
- Reduced the design panel top-level navigation to:
  - `Быстрый старт`
  - `Бренд`
  - `Экран`
  - `Элементы`
  - `Дополнительно`
- Kept screen quiz settings under the same five-section navigation model.
- Removed quiz template and global timer sections from workspace/global settings.
- Renamed workspace presets in UI to `Пресеты рабочего пространства` without changing persisted storage keys.
- Added tests for design entry, selected-node preservation, template selection from design, workspace-only settings, legacy localStorage compatibility and keyboard-focusable design button.

## Stage 2 Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- --run store/useUIStore.test.ts store/usePreferencesStore.test.ts components/header/HeaderDesignButton.test.tsx components/DesignPanel.test.tsx components/modals/GlobalSettingsModal.test.tsx` | Passed | 5 files, 18 tests passed. |
| `npx tsc --noEmit --pretty false` | Passed | No type errors. |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. Warnings are unchanged categories from the Stage 1 baseline. |
| `npm test` | Passed | 67 test files, 612 tests passed. Expected stderr appears in existing negative-path tests. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Stage 2 Known Limitations

- Design controls are reorganized in UI only; `DesignResolver`, capabilities and design history are still not implemented.
- `GlobalSettingsModal` no longer exposes quiz-level timer settings; this is intentional for workspace separation, but a future quiz-level settings surface may be needed outside workspace preferences.
- Existing lint/build warnings remain outside this stage's scope.

## Previous Stage

Stage 1: audit current design editor UX.

Status: completed locally.

Commit target: `docs: audit current design editor UX`.

## Completed In This Stage

- Read project rules and documentation:
  - `RULS.md`
  - `README_DOCUMENTATION.md`
- Checked git status, active branch and recent commits before changes.
- Confirmed `docs/design-studio/IMPLEMENTATION_STATUS.md` did not exist before this stage.
- Audited design-related stores, UI surfaces, templates, preview flow, generator and tests.
- Created the current UX audit:
  - `docs/design-studio/CURRENT_UX_AUDIT.md`
- Created the target design studio architecture:
  - `docs/design-studio/ARCHITECTURE.md`
- Created this implementation status document.

## Baseline Commands

All requested baseline commands were run before creating the audit docs.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Passed | 0 errors, 45 existing warnings. Warnings are mainly `react-hooks/exhaustive-deps` and `react-refresh/only-export-components`. |
| `npm test` | Passed | 65 test files, 604 tests passed. Some expected stderr output appears in tests that intentionally exercise error handling. |
| `npm run test:functions` | Passed | Yandex Cloud function bundles built successfully. |
| `npm run build` | Passed | Production build succeeded. Existing warnings include CSS minify warning for `-: |>`, empty `vendor-react` chunk, dynamic/static import chunking notices and large chunk warnings. |

## Existing Dirty Worktree Before This Stage

These unrelated changes were present before the audit and were not touched for the stage commit:

- `components/DesignPanel.tsx`
- `services/__tests__/quizGeneratorHtml.test.ts`
- `services/templates/screenQuiz.ts`
- `src/engine/types.ts`
- `types.ts`
- `admin-mfa-resarytrew-qr.png`
- `admin-mfa-resarytrew-qr.svg`
- `public/images/`

## Key Findings

- The complete design panel affects the `default` template only.
- Thematic templates keep hard-coded visual systems and mostly ignore generic design settings.
- Screen quiz uses a separate show-style system under `designSettings.screenQuiz`.
- `GlobalSettingsModal` mixes quiz-level settings and editor-only preferences.
- `deepMerge` preserves old nested values when applying partial presets.
- `undefined` cannot clear a value through `deepMerge`; `null` can be persisted even when the type does not expect it.
- LivePreview remounts the iframe whenever generated HTML changes, so preview runtime state is lost.
- Canvas undo/redo does not include design changes.
- Several UI controls use `||` where `??` or resolver-level validation would be safer.
- Some UI controls are exposed before a strict Player capability map exists.

## Known Limitations After Stage 1

- No runtime behavior was changed.
- No new automated tests were added because this stage is documentation/audit only.
- No `DesignResolver`, `DesignHistory`, `PreviewBridge`, `ElementRegistry` or `PropertyInspector` implementation exists yet.
- Preview still remounts on generated HTML changes.
- Design changes still have no undo/redo.
- Template capability warnings are documented but not enforced in UI.

## Next Stage Recommendation

Next stage should implement the smallest safe foundation:

1. Add `DesignResolver` with tests for defaults, legacy partial settings, `null`, `undefined`, valid falsy values and enum validation.
2. Add a template capability map for `default`, thematic templates and `screenQuiz`.
3. Update `DesignPanel` to read capability metadata before showing or enabling controls.
4. Add tests that prove old quiz JSON still resolves to the same visible defaults.

Do not start larger UI refactors until the resolver and capability tests are in place.

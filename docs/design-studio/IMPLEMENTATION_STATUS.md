# Design Studio Implementation Status

Date: 2026-07-13

## Current Stage

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

# Design Studio Implementation Status

Date: 2026-07-13

## Current Stage

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

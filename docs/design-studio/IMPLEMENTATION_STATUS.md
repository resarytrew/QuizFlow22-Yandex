# Design Studio Implementation Status

Date: 2026-07-13

## Current Stage

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

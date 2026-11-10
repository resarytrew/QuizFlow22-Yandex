# Refactor baseline

Baseline: `main` at `2b88b47a89e72122be53b21969414cf16d222708` (2026-11-09). Working branch: `refactor/editor-ux-design-and-stability`. The reference archive was found in Downloads; it is a separate prototype using React Flow v12 and must not replace the application.

## State and data ownership

- `src/router/routes/editorQuiz.tsx` loads a project; `useQuizDataStore.loadQuiz` populates quiz metadata, template, design and canvas. `useCanvasStore` owns graph, selection and history. `useUIStore` owns transient panels, preview and grouping. `useEditorAutosave` and `persistEditor` save the serialized graph and quiz data through the existing API.
- `editorShell.tsx` hosts the canvas, palette, properties panel, AI panel and real `LivePreview`. `EditorWorkspace` supplies the view tabs and validation list. `SettingsPanel` switches between node and global design based on selection. Its inspector also owns transitions and global color controls. `StatusBar` independently uses `validateEditorGraph`.
- Published runtime is built by `services/quizGenerator` and `src/engine`; player routing uses `src/router/routes/playQuiz.tsx` and `services/loadQuizForPlayer.ts`. Yandex functions under `yc-functions` implement the API, including results and AI proxy.
- `designSettings` are stored with quiz data, transformed through `src/engine/design.ts` and generator CSS. Changes must be checked against both real preview and published output. `screenQuiz` has shared template and per-node data; `importantTalks` has dedicated template/runtime/assets requiring a compatibility migration before removal.

## Confirmed risks and invariants

- `updateNodeData` snapshots after a 500 ms delay; `updateEdgeData` and `collapseVariableChainToEffects` snapshot after mutation. Undo can restore the new state; pending snapshots can contaminate later history. Regression tests cover node/edge edits and separate edits before changing behavior.
- Node/edge IDs, source/target handles, conditions, effects, nested groups, template fields and unknown old quiz fields must survive load, edit, undo, save, reload and publication. UI-only changes must not dirty quiz data.
- Default properties panel visibility is true and deselection renders `DesignPanel`; selection and mobile pane are coupled to visibility. Rework must retain explicit design access and edge editing, including complex conditions.
- AI quota reservation, result score trust, global timer lifecycle, IDs and numerical inputs need independent verification; do not change plans or production data. Full server and publication tests require configured backend credentials and infrastructure.

## Planned sequence

1. Regressions and state/history fixes; verify unit tests, then CI. Inspect timers and backend independently before changing them.
2. Canvas and contextual inspector; preserve validation, edge semantics, preview and keyboard/mobile accessibility.
3. Versioned compatibility for importantTalks, then remove specialized runtime only after migration tests.
4. Screen quiz editor and design surface, using the existing real renderer and preserving serialization.
5. Graph tools, end-to-end checks, screenshots and migration/release notes. Keep risky changes reviewable in sequential commits or PRs.

## P0 progress: global timer

- Fixed: entering a result stops the global interval; resetting a session or creating another timer disposes the previous one. The per-instance cleanup cannot cancel a newer timer. Page teardown clears its timer. A timeout target is checked against the runtime node index; a missing target shows the timeout message instead of navigating to a nonexistent node.
- Regression evidence: `src/engine/__tests__/globalTimerLifecycle.test.ts` reproduced all three failures before the fix. `services/__tests__/globalTimerHtml.test.ts` runs generated standalone HTML through the real bundled engine and verifies the result remains visible after the deadline.
- Scope: this addresses the global timer only; node-specific timers and other templates still need separate lifecycle checks. Production publication and cloud-backed end-to-end tests remain unverified.

## P0 progress: canvas workspace

- Removed `EditorWorkspace`, its view switcher, question table and obsolete styles. The canvas uses the entire workspace, while the existing toolbar retains preview, undo/redo, zoom, fit, grid, lock and layout.
- A toolbar action opens `ValidationDialog`, using the existing graph validator and allowing an issue to select and locate its node, including in a group. The dialog supports keyboard focus containment and Escape. Unit/integration tests cover opening an issue without mutating source handles and closing the dialog.
- Still pending: the contextual inspector, separate design mode, mobile drawer behavior and browser screenshots; no claim of complete editor UX or accessibility verification yet.

## P0 progress: panel ownership

- The node panel starts closed and is rendered only for a selected node. Loading another project closes transient design, preview and node panels. The group breadcrumb explicitly opens its inspector instead of toggling it.
- The header now opens a separate design workspace. It keeps the canvas and selection mounted, uses the existing `LivePreview` generator for an embedded real preview, and prevents canvas shortcuts from editing the hidden graph. Closing returns to the prior selection. On narrow screens the workspace stacks controls and preview.
- This is an intermediate migration: the old `DesignPanel` and tabbed `NodeInspector` remain and must be redesigned; the screen quiz separation, mobile focus/Escape behavior and browser-based responsive verification are still outstanding. Unit tests cover panel ownership, project reset and hidden-canvas shortcut protection; `npm run lint` and `npm run build` passed with pre-existing warnings.

## P0 progress: contextual node and edge editing

- Removed the four inspector tabs, search, duplicate global color controls and always-visible node ID. The selected node's fields are displayed directly; the author note and node image remain available, and a single shared sound section replaces per-type duplicates. Node IDs can be copied from the node context menu.
- Selecting a connection opens its editor. Retargeting preserves the source handle, metadata, effects and other parallel connections; an old target handle is cleared when changing destinations. Inserting a question preserves the original edge metadata and destination handle, in one undoable graph operation. Drafts are protected from an outside click.
- Targeted tests exercise retargeting, parallel edges, effects containing numeric strings, undo/redo, insertion, draft protection, direct node content and keyboard selection. The existing canvas handles remain the way to create an unconnected transition.
- Still pending: screenQuiz fields remain duplicated in ordinary node editors; the connection menu requires responsive, keyboard and browser verification; full E2E, publication and compatibility work remain incomplete.

Validation at this checkpoint: `npm run verify` completed (712 frontend tests, 22 Cloud Function unit tests, builds and SEO check). The function test command explicitly excludes `integration/**`; this does not prove database concurrency, live publication, browser behavior or deployment. Existing lint and CSS build warnings remain.

## P0 progress: AI quota

- Implemented per-user PostgreSQL transaction-lock reservation before the upstream call, compensation on ordinary failures, UTC-day accounting and 48-hour cleanup retention. Plan limits stay 5 and 200; the old two-hour cleanup meant the intended daily limit was not actually enforced. See `docs/ai-quota-refactor.md` for rollout and residual failure behavior.
- `npm --prefix yc-functions run lint`, `npm --prefix yc-functions test` (27 passed), and `npm --prefix yc-functions run build:ai-proxy` passed. The unit concurrency test uses a mock database; it is not evidence of PostgreSQL lock behavior.
- A real isolated-PostgreSQL concurrency suite was added and attempted with `PG_DATABASE=quizflow_ai_quota_test`, `PG_HOST=127.0.0.1`, `PG_PORT=5432`, `PG_DISABLE_SSL=true`, running `npx vitest run --environment node integration/ai-quota.test.ts` inside `yc-functions`. It failed before tests with `ECONNREFUSED 127.0.0.1:5432`. No local PostgreSQL service or running Docker daemon was available. This risk is implemented but remains unverified on PostgreSQL and must be tested before deployment.

## P0 progress: result trust and visibility

- The API now marks scores unverified, rejects malformed/out-of-range scores, prevents replay from overwriting an existing session result, and scopes session completion to the current authenticated user and quiz. Public/unlisted/private access checks now cover session creation too. The analytics UI uses chronological results rather than a score ranking and displays the trust limitation. See `docs/results-trust.md` for remaining replay and rate-limiter limitations.
- `npm --prefix yc-functions run lint`, `npm --prefix yc-functions test` (35 tests at the initial checkpoint; further targeted tests were added afterward), `npm --prefix yc-functions run build:results`, `npm --prefix yc-functions run build:session`, and targeted frontend tests passed. The isolated PostgreSQL test `npm --prefix yc-functions run test:results:integration` was attempted with `PG_DATABASE=quizflow_results_test`, `PG_HOST=127.0.0.1`, `PG_PORT=5432`, `PG_DISABLE_SSL=true`; it failed before testing with ECONNREFUSED. Full DB-backed authorization, replay and distributed rate-limit verification remain outstanding.

## Screen quiz workspace checkpoint

The screen-quiz template now has an explicit workspace for shared settings and per-screen overrides. Undefined local values inherit; zero and empty strings remain explicit values. The workspace uses the existing generated preview and video export, and suppresses autoplay in preview. Switching template leaves local screen settings intact. The old repeated screen controls were removed from node inspectors.

Validation: `npm run test:editor:e2e` passed 6 scenarios at desktop, tablet and mobile sizes with a mocked API; `npm run verify` passed 723 frontend and 38 backend unit tests, both builds and SEO checks. PostgreSQL integration tests and a real publish round-trip were not run. The screenshots in `refactor-screenshots` capture this intermediate state, not the completed design redesign. Existing lint and build warnings remain.

## Design workspace checkpoint

Replaced the nine-tab design panel with five themes and principal controls, preserving existing serialized fields and custom CSS. The generated preview can select a start/question/info/result screen and change viewport width. Design changes join canvas undo/redo history. Fixed the existing mobile interface grid override that squeezed the question card. This is an intermediate stage: token consolidation, full per-control preview/published parity, explicit field reset, old-theme migration and real publication remain outstanding; see `design-settings-audit.md`.

Validation: `npm run test:editor:e2e` passed 6 scenarios using a mocked API at three sizes, including theme undo/redo and mobile card width. `npm run verify` passed 730 frontend and 38 backend unit tests, builds and SEO. PostgreSQL integration tests and real publication remain unverified.

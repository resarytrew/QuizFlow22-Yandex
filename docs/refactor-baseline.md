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

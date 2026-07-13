# Current Design Editor UX Audit

Date: 2026-07-13

Scope: audit only. No runtime refactor was performed in this stage. The active branch already had unrelated local edits before this audit; they were intentionally left untouched.

## Executive Summary

QuizFlow currently has two separate customization systems that are visible from nearby UI surfaces:

- quiz/player design: persisted in `useQuizDataStore.designSettings`, saved with quizzes, restored from autosave/import, passed to `generateQuizHtml`, public links, Player and HTML export;
- editor workspace preferences: persisted in `usePreferencesStore`, applied to the builder UI and canvas only, not exported as quiz design.

The main risk is that the UI exposes many design controls, but only the `default` template receives the full design system. The `screenQuiz` template has a separate show-style system and audio/timeline settings. Other thematic templates keep their own hard-coded visual systems. This is partly intentional, but it is not represented as a formal capability matrix, so users can assume that a control affects every template when it does not.

The second risk is preset composition. `updateDesignSettings` uses recursive `deepMerge`, so applying a partial preset does not reset keys omitted by that preset. This preserves backward compatibility, but it also lets old fields from a previous preset remain active and produce mixed visual states.

## Entry Points Into Design Settings

1. Settings sidebar without a selected node
   - `components/SettingsPanel.tsx` renders `DesignPanel` when `selectedNode` is null.
   - This is the main advanced design surface for `designSettings`.

2. DesignPanel for the default template
   - `components/DesignPanel.tsx` exposes brand, background, typography, layout, buttons, answers, progress, result and advanced custom CSS.
   - It writes through `useQuizDataStore.updateDesignSettings`.

3. DesignPanel for screen quiz
   - When `templateId === "screenQuiz"`, `DesignPanel` returns a separate screen-quiz editor.
   - It writes `designSettings.screenQuiz` and uses `setPreviewMode` for live preview.

4. Template selector
   - `components/settings/quiz-settings/TemplateSection.tsx` writes `templateId` through `setTemplateId`.
   - `DesignPanel` also allows switching back to `default` when a non-default thematic template is selected.

5. Audio settings
   - `components/settings/quiz-settings/SoundSection.tsx` writes `designSettings.sound`.
   - The default DOM engine uses background music and basic click/result/achievement sounds.
   - `screenQuiz` additionally uses intro/tick/reveal/transition sounds, layer volumes and voiceover behavior.

6. Per-node settings
   - `components/SettingsPanel.tsx` exposes node data such as images, video, per-node `soundSettings`, and `data.screenQuiz` overrides.
   - These values are not global design presets, but they can override how a single node appears or behaves in the Player.

7. Global settings modal
   - `components/modals/GlobalSettingsModal.tsx` renders `CustomizationTab`.
   - `CustomizationTab` mixes quiz settings (`TemplateSection`, `SoundSection`, `TimerSection`) with editor preferences (`EditorSection`, `NodesVisualSection`, filters, appearance, performance).

8. Import/export/autosave/loading
   - `store/useQuizDataStore.ts` saves, loads, imports and restores `designSettings`, `templateId`, `globalTimer`.
   - `store/useAutosaveStore.ts` stores the same quiz-level values in localStorage.
   - `components/header/quizFile.ts` preserves template settings during JSON round trips.

9. Player surfaces
   - `components/LivePreview.tsx` generates preview HTML in an iframe.
   - `components/QuizPlayer.tsx` loads public quiz HTML into an iframe.
   - `services/loadQuizForPlayer.ts` and `services/quizGenerator` produce the HTML used by public links and standalone play surfaces.

10. Template-derived new quizzes
   - `src/router/routes/editorNew.tsx` applies a pending template by setting nodes, edges, timer, design settings and template id after resetting the editor.

## Quiz Design vs Editor Settings

Quiz design:

- source: `store/useQuizDataStore.ts`;
- persisted with quiz data and exported/imported;
- includes `designSettings`, `templateId`, `globalTimer`, `currentQuizName`;
- used by `LivePreview`, public Player, HTML export and generated standalone HTML;
- affects the user-facing quiz.

Editor settings:

- source: `store/usePreferencesStore.ts` and partially `store/useCanvasStore.ts`;
- persisted under `potok-preferences`;
- includes node animations, node shadows, grid, snapping, board background, sidebar filters, editor theme, performance flags;
- used by editor components and canvas preferences;
- does not affect Player, public links, HTML export or old quiz compatibility.

Important overlap:

- `GlobalSettingsModal` presents quiz settings and editor preferences in one modal.
- This is convenient but blurs ownership. A future design studio should label mode boundaries explicitly.

## Templates And Presets

Template ids:

- `default`
- `ww2`
- `economic`
- `yandex`
- `army`
- `science`
- `math`
- `history`
- `newyear`
- `screenQuiz`

Preset families in the current UI:

- Experience presets in `DesignPanel`: `conversational`, `leadForm`, `calculator`, `assessment`, `editorial`, `minimal`.
- Layout presets in `DesignPanel`: `classic`, `split`, `focus`, `editorial`, `compact`.
- Interface presets in `DesignPanel`: `studio`, `immersive`, `form`, `exam`, `kiosk`, `magazine`, `product`, `minimal`, `workshop`, `report`.
- Palette presets in `DesignPanel`: Forest, Graphite, Cobalt, Bordeaux.
- Screen quiz show styles: `pop`, `candy`, `aqua`, `yellow`, `travel`, `finance-express`.
- Editor preference presets in `usePreferencesStore`: user-saved presets for editor appearance/canvas/sidebar settings, not quiz design.

## Preset Conflicts

The same fields are controlled by multiple preset families:

- `layout.preset`, `contentWidth`, `cardPadding`, `cardRadius`, `surfaceStyle`, `questionAlign`, `verticalAlign`, `density` are touched by experience, layout and interface presets.
- `questionCard.mediaPosition` and `layout.mediaPosition` can conflict. Runtime prefers `questionCard.mediaPosition` before `layout.mediaPosition`.
- `buttons.style`, `buttons.width`, `buttons.height`, `buttons.borderRadius`, `buttons.shadow`, `answerCards.style`, `answerCards.columns`, `answerCards.markerStyle` are touched by experience and interface presets.
- `progress.style`, `progress.position`, `showPercent`, `showStepLabel` are touched by experience/interface presets and can conflict with `layout.blocks.progress`.
- `result.preset`, `result.scoreStyle`, `result.showScore` can conflict with node-level result data such as `showScore`.
- `screenQuiz.backgroundPreset` can be selected alone or through a show-style patch. Partial patches leave old custom colors/timing values in place.

## DeepMerge Impact

`store/useQuizDataStore.ts` uses a recursive `deepMerge` for design settings and loaded quiz data.

Observed behavior:

- plain objects are merged recursively;
- arrays and primitives replace previous values;
- `undefined` is ignored and cannot be used to reset a field;
- `null` is accepted and can overwrite a field even when the TypeScript shape does not expect null;
- omitted nested keys remain from the previous state.

Benefits:

- old quizzes with partial `designSettings` keep working;
- loading legacy quiz data receives modern defaults without losing persisted values;
- partial UI patches are easy to write.

Risks:

- applying a preset does not create a clean preset state;
- fields from old presets can survive invisibly;
- a UI control that sends `undefined` cannot clear an old value;
- a legacy/imported `null` can move into runtime code and trigger fallback differences;
- there is no normalized, resolved design object shared by UI, Player and export.

## Template Support Matrix

`default`

- Main supported target for the full design system.
- `src/engine/index.ts` calls `applyDesign` only when `templateId` is `default`.
- `services/quizGenerator/index.ts` injects `buildDesignCss` only for `DEFAULT_TEMPLATE_ID`.
- Supports brand, background, typography, layout, question card, buttons, answers, progress, result, advanced CSS and general sound settings.

Thematic templates: `ww2`, `economic`, `yandex`, `army`, `science`, `math`, `history`, `newyear`

- Have hard-coded visual systems in `services/templates`.
- `DesignPanel` explicitly tells users that deep design customization applies only to the base template.
- Template id is still saved and loaded.
- General `designSettings` can still be present in quiz data, but most visual fields are ignored by these templates.
- Generic engine sound settings can still be available where the shared DOM engine runs.

`screenQuiz`

- Uses its own template runner and does not receive the generic engine injection.
- Reads `designSettings.screenQuiz` and `designSettings.sound`.
- Uses node-level `data.screenQuiz` as local overrides.
- Intentionally skips logic nodes during playback.
- Supports screen-quiz-only timing, show style, media layout, intro phase, story timer, transition effect, voiceover, background music and layer volumes.
- Generic brand/layout/questionCard/buttons/answerCards/progress/result/custom CSS are not the controlling visual system for this template.

## UI Settings With Weak Or No Player Effect

These controls either do not affect every template or are currently partial:

- Most `DesignPanel` controls affect only the `default` template.
- `layout.blocks.*` hides selectors that may not exist in all DOM variants.
- `progress.position = "inside"` is exposed in UI and presets, but runtime CSS has top/bottom/hidden handling; inside does not have a distinct placement implementation.
- `buttons.shadow` is exposed, stored and used in presets, but no clear Player CSS variable/class currently applies it as a button shadow.
- `result.showShare` is stored, but share UI rendering is not guaranteed globally by the default engine.
- `result.showScore` can conflict with result node `showScore`.
- `brand.logoUrl` and `brand.brandName` affect the default header/brand lockup, but screen quiz and thematic templates generally ignore them.
- `advanced.customCss` applies in the default template/player path; it is intentionally not a universal styling contract for every template.
- Editor appearance, node visuals, sidebar filters and performance preferences do not affect Player output.

## Settings That Work Only In Specific Templates

- `screenQuiz.*`: only the `screenQuiz` template.
- `sound.screenQuizIntro`, `sound.screenQuizTick`, `sound.screenQuizReveal`, `sound.screenQuizTransition`: only the screen quiz runner.
- `data.screenQuiz` node-level overrides: only screen quiz.
- The full `DesignPanel` visual system: only `default`.
- Hard-coded thematic template visuals: only their corresponding template ids.

## LivePreview Iframe Lifecycle

`components/LivePreview.tsx` rebuilds preview HTML when these inputs change:

- nodes;
- edges;
- global timer;
- design settings;
- preview start node;
- template id;
- current quiz name.

The rebuild is debounced by 400 ms, then `generateQuizHtml` is called with `preview: true`.

The iframe has `key={htmlKey(htmlContent)}`. When the generated HTML changes, React remounts the iframe instead of updating it in place.

## Preview State Lost On Refresh

Because preview refresh remounts the iframe, the following state can be lost on design/node changes:

- current player node;
- selected answer;
- partially typed form/input values;
- global timer progress;
- screen quiz timeline progress;
- audio playback position;
- voiceover/audio unlock state;
- native video playback state;
- scroll/focus state inside the iframe;
- transient result/achievement/toast state.

This is acceptable for a basic preview, but a professional design studio should use a `PreviewBridge` for patch updates where possible.

## Undo/Redo Coverage

Current canvas undo/redo is in `store/useCanvasStore.ts`.

- It snapshots `nodes` and `edges`.
- `updateDesignSettings`, `setTemplateId`, global sound changes, editor preferences and global timer changes are not included in that history.
- Design changes therefore do not participate in undo/redo.

## Nullish And Fallback Findings

Design-related properties that may be missing in old quizzes:

- every optional nested section under `DesignSettings`;
- every field of `brand`, `layout`, `questionCard`, `progress`, `result`, `advanced`, `screenQuiz`, `sound`;
- legacy/imported data can also contain `null` because `deepMerge` accepts it.

Problematic `||` fallback patterns:

- `src/engine/design.ts`: class fallbacks for layout, interface, surface, alignment, density, chrome, button style, answer style, marker style, media position, texture, progress, result, shadow.
- `src/engine/design.ts`: gradient fallback uses `gradientFrom || background.color` and `gradientTo || default`.
- `src/engine/design.ts`: `imageFit`, `mediaFit`, `textTransform`, `answerCards.columns`.
- `components/DesignPanel.tsx`: many UI values use `value || fallback`, including numeric controls where `0` is valid (`cardRadius`, `letterSpacing`, `borderRadius`, `spacing`, etc.).
- `components/DesignPanel.tsx`: string controls use `value || ""`, which is fine for display but makes empty string indistinguishable from missing value.
- `components/settings/quiz-settings/SoundSection.tsx`: URL controls use `sound.field || ""`; acceptable for display but not a semantic clear/reset model.
- `components/settings/quiz-settings/TimerSection.tsx`: `onTimeoutNodeId || ""` is acceptable for a select, but semantically conflates empty and null.
- `services/templates/screenQuiz.ts`: many runtime fallbacks use `||`; for text and media fallback this is often intentional, but color/timing/config fields should use nullish semantics after validation.
- `services/templates/index.ts`: `id || "default"` is acceptable for empty template id fallback but should be kept out of a strict resolver layer.

Recommendation: introduce a resolver that converts legacy/partial/nullish settings into a fully normalized design object using `??` and explicit validation, then make both UI and Player read that resolved shape.

## Missing Tests

Current relevant coverage exists for:

- default engine design CSS transparency regression;
- legacy design settings merge in `useQuizDataStore`;
- template id compatibility;
- quiz settings section updates;
- screen quiz playback, audio cues, reveal, montage timing and export duration;
- generated HTML and template integrity.

Missing or insufficient coverage:

- `deepMerge` behavior with omitted nested fields, `undefined`, `null`, arrays and preset application.
- Clean application of experience/interface/layout presets without leftover conflicting values.
- Capability matrix: which settings affect which template.
- `DesignPanel` controls mapped to Player-visible output.
- Nullish fallback regressions for valid falsy design values such as `0`, empty string as an intentional clear, and booleans.
- LivePreview iframe remount behavior and preview state loss.
- Design undo/redo absence and future `DesignHistory`.
- Parity between `applyDesign` runtime CSS and `buildDesignCss` injected HTML CSS.
- `screenQuiz` local overrides vs global `screenQuiz` settings.
- `progress.position = "inside"` visual behavior.
- `buttons.shadow` visual behavior.
- Result share/score global behavior vs node-level result data.

## Stage 1 Conclusion

The current system is functional and backward-compatible, but it needs an explicit design resolver, a template capability registry and a clearer separation between scenario editing, design editing, preview and publishing. Without that layer, new design controls will continue to risk becoming either template-specific surprises or stale preset leftovers.

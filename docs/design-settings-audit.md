# Design settings audit — current checkpoint

The design workspace edits the existing `designSettings` object; it does not create a second design store. Preview and publication both use `generateQuizHtml`; preview additionally runs `applyDesign` in the existing engine. CSS is currently emitted by both `services/quizGenerator/designCss.ts` and `src/engine/design.ts`. They are not yet consolidated, and this audit is not a claim that parity has been fully established.

| Control | Stored fields | Existing consumer and effect | Current evidence |
| --- | --- | --- | --- |
| Theme | brand, background, typography, layout, questionCard, buttons, answerCards, progress, result | Existing generator CSS variables and engine classes; changes palette, font and composition | `DesignPanel.test.tsx`; editor Playwright checks five generated preview backgrounds |
| Primary color | buttons.backgroundColor, brand.primaryColor, progress.color, answerCards.selectedBorderColor, result.accentColor | `--btn-bg`, progress and selected-answer variables | Theme test checks emitted CSS; individual consumer parity remains to be tested |
| Accent | brand.accentColor, result.accentColor | `--brand-accent` and `--result-accent` | Individual consumer parity remains to be tested |
| Background mode/colors/image | background.mode/color/gradientFrom/gradientTo/imageUrl | `--bg-color`, `--bg-image`, body background | Theme CSS and browser tests; image and gradient need parity tests |
| Logo | brand.logoUrl | `applyDesign` updates `#header-logo` | Needs published/preview parity test and removal test |
| Font | typography.fontFamily/displayFontFamily | `--font-family`, `--display-family` | Theme CSS test; parity still needed |
| Composition | layout.preset | `design-layout-*` body classes | Theme browser test checks palette, not yet layout geometry |
| Geometry | questionCard.radius/layout.cardRadius, answer and button radius | `#quiz-view` uses `--question-card-radius` | Emitted CSS checked per theme |
| Card density | layout.cardPadding, questionCard.padding | `#quiz-view` uses `--card-padding`; questionCard.padding remains serialized for old data | Theme CSS checked; shared token normalization remains |
| Media position | questionCard.mediaPosition and layout.mediaPosition | engine `design-media-*` class; questionCard currently takes precedence | `DesignPanel.test.tsx`; visual parity still needed |
| Answer columns | answerCards.columns | `--answer-columns` on answer grid | Needs real-screen parity test |
| Progress | progress.style and layout.blocks.progress | CSS hides progress and runtime classes | `DesignPanel.test.tsx`; published parity still needed |

Legacy fields, including `advanced.customCss`, remain in serialized data even when the new panel does not expose them. Theme selection changes several fields at once and is recorded as one entry in the shared graph/design undo history (`store/designHistory.test.ts`); explicit per-field reset remains outstanding. Theme changes do not alter graph, answers or timers. These remaining gaps prevent treating the design stage as complete.

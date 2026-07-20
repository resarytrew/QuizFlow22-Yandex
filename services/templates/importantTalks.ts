import defaultTemplate from './default.ts';

const importantTalksStyles = `
<style id="important-talks-theme">
  body.important-talks-theme {
    --talks-blue: var(--brand-primary, #0b4dcc);
    --talks-red: var(--brand-accent, #e5242f);
    --talks-ink: var(--brand-neutral, #071f58);
    --talks-paper: var(--bg-color, #f8f7f3);
    --talks-line: color-mix(in srgb, var(--talks-blue) 15%, white);
    --talks-soft-blue: color-mix(in srgb, var(--talks-blue) 8%, white);
    --talks-shadow: 0 14px 38px rgba(22, 49, 110, 0.10), 0 2px 8px rgba(22, 49, 110, 0.05);
    min-height: 100dvh;
    color: var(--body-text-color, #16316e);
    background-color: var(--talks-paper) !important;
    background-image:
      var(--bg-image, none),
      radial-gradient(circle at 82% 14%, color-mix(in srgb, var(--talks-blue) 8%, transparent), transparent 24rem),
      repeating-linear-gradient(90deg, rgba(7, 31, 88, 0.018) 0 1px, transparent 1px 8px),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.46) 0 1px, transparent 1px 5px) !important;
    background-size: var(--bg-size, cover), auto, auto, auto !important;
    background-attachment: fixed;
  }

  body.important-talks-theme .quiz-shell {
    min-height: 100dvh;
    overflow: hidden;
    padding: clamp(14px, 2vw, 28px) clamp(14px, 2.5vw, 42px) clamp(112px, 13vw, 178px);
    isolation: isolate;
  }

  body.important-talks-theme .quiz-shell::before {
    content: "";
    position: fixed;
    z-index: -1;
    right: -8vw;
    bottom: -108px;
    left: -8vw;
    height: clamp(150px, 18vw, 230px);
    border-radius: 52% 48% 0 0 / 56% 62% 0 0;
    background: var(--talks-blue);
    box-shadow:
      0 -18px 0 rgba(255, 255, 255, 0.96),
      0 26px 0 var(--talks-red),
      0 42px 26px rgba(7, 31, 88, 0.16);
    transform: rotate(-1.8deg) skewX(-3deg);
    transform-origin: center;
    pointer-events: none;
  }

  body.important-talks-theme .quiz-shell::after {
    content: "";
    position: fixed;
    z-index: -1;
    right: -10vw;
    bottom: -126px;
    left: 28vw;
    height: clamp(132px, 15vw, 196px);
    border-radius: 48% 52% 0 0 / 64% 56% 0 0;
    background: color-mix(in srgb, var(--talks-red) 96%, #ff4050);
    box-shadow: 0 -24px 0 var(--talks-blue), 0 -41px 0 rgba(255, 255, 255, 0.96);
    transform: rotate(2.2deg);
    pointer-events: none;
  }

  body.important-talks-theme.design-hide-background-decor .quiz-shell::before,
  body.important-talks-theme.design-hide-background-decor .quiz-shell::after {
    display: none;
  }

  body.important-talks-theme .quiz-topbar {
    position: relative;
    top: auto;
    width: min(1540px, 100%);
    max-width: none;
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  body.important-talks-theme .topbar-inner {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) auto;
    align-items: center;
    gap: 18px 28px;
    padding: 0;
  }

  body.important-talks-theme .brand-lockup {
    gap: 14px;
  }

  body.important-talks-theme #header-logo {
    width: 72px;
    height: 58px;
    position: relative;
    overflow: visible;
    border: 0;
    border-radius: 22px 22px 22px 7px;
    background-color: var(--talks-blue);
    color: white;
    font-size: 0.92rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    box-shadow: 19px -10px 0 -5px #73c8f7, 23px 13px 0 -10px var(--talks-red), var(--talks-shadow);
  }

  body.important-talks-theme #header-logo::after {
    content: "";
    position: absolute;
    bottom: -9px;
    left: 11px;
    width: 18px;
    height: 18px;
    background: inherit;
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  body.important-talks-theme .brand-copy {
    gap: 3px;
  }

  body.important-talks-theme .brand-kicker {
    color: var(--talks-red);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  body.important-talks-theme #header-title {
    max-width: min(44vw, 520px);
    color: var(--talks-blue);
    font-family: var(--display-family, 'Manrope', sans-serif);
    font-size: clamp(1.28rem, 2.15vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.045em;
    line-height: 1.02;
    text-transform: uppercase;
    white-space: normal;
  }

  body.important-talks-theme .talks-user-hud {
    min-height: 74px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding: 10px 18px 10px 10px;
    border: 1px solid var(--talks-line);
    border-radius: 24px;
    background: color-mix(in srgb, white 94%, var(--talks-soft-blue));
    box-shadow: var(--talks-shadow);
  }

  body.important-talks-theme .talks-avatar {
    width: 54px;
    height: 54px;
    flex: 0 0 auto;
    overflow: hidden;
    border: 3px solid white;
    border-radius: 50%;
    background: linear-gradient(145deg, #cce7ff, #8cc5f2);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--talks-blue) 18%, white);
  }

  body.important-talks-theme #hud-avatar-image,
  body.important-talks-theme #hud-avatar-fallback {
    width: 100%;
    height: 100%;
  }

  body.important-talks-theme #hud-avatar-image {
    display: block;
    object-fit: cover;
  }

  body.important-talks-theme #hud-avatar-fallback {
    display: grid;
    place-items: center;
    color: var(--talks-blue);
    font-size: 1.35rem;
    font-weight: 900;
  }

  body.important-talks-theme #hud-avatar-image.hidden,
  body.important-talks-theme #hud-avatar-fallback.hidden {
    display: none;
  }

  body.important-talks-theme .talks-person,
  body.important-talks-theme .talks-score {
    min-width: 0;
    display: grid;
    gap: 1px;
  }

  body.important-talks-theme .talks-hud-label,
  body.important-talks-theme #hud-score-label {
    color: #65759a;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  body.important-talks-theme #hud-name,
  body.important-talks-theme #hud-score {
    max-width: 150px;
    overflow: hidden;
    color: var(--talks-ink);
    font-size: 1rem;
    font-weight: 900;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  body.important-talks-theme #hud-score {
    color: var(--talks-red);
    font-size: 1.35rem;
    font-variant-numeric: tabular-nums;
  }

  body.important-talks-theme .talks-divider {
    width: 1px;
    height: 36px;
    background: var(--talks-line);
  }

  body.important-talks-theme .timer-pill {
    min-width: 94px;
    min-height: 42px;
    padding: 0 15px 0 42px;
    position: relative;
    border: 0;
    border-radius: 999px;
    background: var(--talks-soft-blue);
    color: var(--talks-blue);
    font-size: 1rem;
    font-weight: 900;
  }

  body.important-talks-theme .timer-pill::before {
    content: "";
    position: absolute;
    left: 12px;
    width: 18px;
    height: 18px;
    border: 3px solid currentColor;
    border-radius: 50%;
  }

  body.important-talks-theme .timer-pill::after {
    content: "";
    position: absolute;
    top: 14px;
    left: 21px;
    width: 2px;
    height: 9px;
    border-radius: 2px;
    background: currentColor;
    transform-origin: bottom;
    transform: rotate(-32deg);
  }

  body.important-talks-theme .timer-pill.is-urgent,
  body.important-talks-theme .timer-pill.text-red-600 {
    background: color-mix(in srgb, var(--talks-red) 9%, white);
    color: var(--talks-red);
  }

  body.important-talks-theme .top-progress {
    grid-column: 1 / -1;
    width: min(660px, 100%);
    min-width: 0;
    justify-self: center;
    justify-content: center;
    gap: 12px;
    color: var(--talks-blue);
  }

  body.important-talks-theme .top-progress-track {
    width: min(520px, 70vw);
    height: 12px;
    padding: 3px;
    overflow: hidden;
    border-radius: 999px;
    background:
      radial-gradient(circle, #cfd6e2 0 4px, transparent 4.5px) 0 50% / 16.666% 100% repeat-x,
      rgba(255, 255, 255, 0.9);
    box-shadow: 0 6px 18px rgba(22, 49, 110, 0.08);
  }

  body.important-talks-theme .top-progress-fill {
    min-width: 10px;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--talks-blue) 72%, #4ba7ff), var(--talks-blue));
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.72);
  }

  body.important-talks-theme .talks-progress-copy {
    min-width: 44px;
    color: var(--talks-blue);
    font-size: 0.78rem;
    font-weight: 900;
  }

  body.important-talks-theme .quiz-main {
    width: min(1540px, 100%);
    max-width: none;
    margin: 0 auto;
    padding: clamp(20px, 3vw, 42px) 0 24px;
  }

  body.important-talks-theme .quiz-layout {
    display: block;
  }

  body.important-talks-theme .quiz-stage {
    min-width: 0;
  }

  body.important-talks-theme #quiz-view {
    width: 100%;
    max-width: none;
    min-height: clamp(480px, 55vh, 650px);
    display: grid;
    align-items: center;
    padding: clamp(28px, 3.4vw, 56px);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--question-card-border, var(--talks-line));
    border-radius: var(--question-card-radius, 30px);
    background: color-mix(in srgb, var(--question-card-bg, white) 97%, var(--talks-soft-blue));
    color: var(--question-card-text, var(--talks-ink));
    box-shadow: var(--talks-shadow);
  }

  body.important-talks-theme #quiz-view::before {
    content: "";
    position: absolute;
    top: 34px;
    right: 38px;
    width: 106px;
    height: 150px;
    opacity: 0.26;
    background:
      radial-gradient(ellipse at 70% 14%, var(--talks-blue) 0 8%, transparent 9%),
      radial-gradient(ellipse at 54% 34%, var(--talks-blue) 0 9%, transparent 10%),
      radial-gradient(ellipse at 73% 53%, var(--talks-blue) 0 8%, transparent 9%),
      radial-gradient(ellipse at 43% 66%, var(--talks-blue) 0 8%, transparent 9%),
      linear-gradient(65deg, transparent 48%, var(--talks-blue) 49% 51%, transparent 52%);
    transform: rotate(8deg);
    pointer-events: none;
  }

  body.important-talks-theme .node-frame {
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    z-index: 1;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  body.important-talks-theme .node-title {
    max-width: min(840px, 100%);
    margin: 0 0 16px;
    color: var(--heading-color, var(--talks-ink));
    font-family: var(--display-family, 'Manrope', sans-serif);
    font-size: calc(clamp(2rem, 4.1vw, 4.45rem) * var(--heading-scale, 1));
    font-weight: var(--heading-weight, 850);
    line-height: var(--heading-line-height, 1.06);
    letter-spacing: -0.045em;
    text-wrap: balance;
  }

  body.important-talks-theme .node-desc {
    max-width: var(--paragraph-width, 760px);
    margin: 0 0 28px;
    color: var(--body-text-color, #16316e);
    font-size: calc(clamp(1rem, 1.5vw, 1.3rem) * var(--body-scale, 1));
    line-height: var(--body-line-height, 1.55);
  }

  body.important-talks-theme .node-frame:has(.media-frame) {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(340px, var(--question-media-width, 48%));
    grid-template-rows: auto auto 1fr;
    column-gap: clamp(28px, 4vw, 72px);
    align-items: center;
  }

  body.important-talks-theme .node-frame:has(.media-frame) > :not(.media-frame) {
    grid-column: 1;
  }

  body.important-talks-theme .node-frame:has(.media-frame) .media-frame {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: stretch;
  }

  body.important-talks-theme .node-frame:has(.media-frame) .node-controls {
    grid-column: 1 / -1 !important;
    grid-row: 3 !important;
    margin-top: clamp(24px, 3vw, 42px);
  }

  body.important-talks-theme .media-frame {
    min-height: clamp(230px, 28vw, 360px);
    overflow: hidden;
    position: relative;
    border: 7px solid white;
    border-radius: var(--question-media-radius, 26px);
    background: linear-gradient(145deg, #dceeff, #f9fbff);
    box-shadow: 0 16px 34px rgba(22, 49, 110, 0.13);
  }

  body.important-talks-theme .media-frame::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 28%;
    background: linear-gradient(176deg, transparent 0 24%, rgba(255,255,255,0.96) 25% 39%, var(--talks-blue) 40% 63%, var(--talks-red) 64% 86%, transparent 87%);
    pointer-events: none;
  }

  body.important-talks-theme .media-frame img,
  body.important-talks-theme .media-frame iframe,
  body.important-talks-theme .quiz-media-image {
    width: 100%;
    height: 100%;
    min-height: inherit;
    display: block;
    object-fit: var(--question-media-fit, cover);
  }

  body.important-talks-theme .node-controls {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(var(--answer-columns, 2), minmax(0, 1fr));
    gap: var(--answer-gap, 14px);
    --answer-columns: 2;
  }

  body.important-talks-theme.design-interface-product .node-controls,
  body.important-talks-theme.design-interface-product .options-grid,
  body.important-talks-theme.design-interface-product .answers-grid {
    --answer-columns: 2;
  }

  body.important-talks-theme .option {
    width: 100%;
    min-height: var(--answer-min-height, 68px);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    border: 1px solid var(--answer-border, #dce4f1);
    border-radius: var(--answer-radius, 18px);
    background: var(--card-bg, white);
    color: var(--card-text, var(--talks-ink));
    box-shadow: 0 7px 20px rgba(22, 49, 110, 0.07);
    text-align: left;
    transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, translate 180ms ease;
  }

  body.important-talks-theme.design-interface-product .option,
  body.important-talks-theme.design-interface-product .answer-card {
    min-height: var(--answer-min-height, 68px);
    align-content: center;
    padding: 14px 18px;
  }

  body.important-talks-theme .option:hover {
    border-color: color-mix(in srgb, var(--talks-blue) 42%, white);
    background: var(--card-hover-bg, #f1f6ff);
    box-shadow: 0 11px 28px rgba(22, 49, 110, 0.11);
    translate: 0 -1px;
  }

  body.important-talks-theme .option-marker,
  body.important-talks-theme .badge {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 2px solid #cdd6e5;
    border-radius: 50%;
    background: white;
    color: var(--talks-blue);
    font-size: 0.9rem;
    font-weight: 900;
  }

  body.important-talks-theme .option.selected,
  body.important-talks-theme .option[aria-pressed="true"] {
    border-color: var(--answer-selected-border, var(--talks-blue));
    background: var(--card-selected-bg, #edf4ff);
    color: var(--card-selected-text, var(--talks-blue));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--talks-blue) 12%, transparent), 0 10px 26px rgba(22, 49, 110, 0.10);
  }

  body.important-talks-theme .option.selected .option-marker,
  body.important-talks-theme .option[aria-pressed="true"] .option-marker {
    border-color: var(--talks-blue);
    background: var(--talks-blue);
    color: white;
  }

  body.important-talks-theme .node-frame[data-node-type="multipleChoiceNode"] .option-marker {
    border-radius: 10px;
  }

  body.important-talks-theme .node-frame[data-node-type="multipleChoiceNode"] .option.selected .option-marker::before,
  body.important-talks-theme .node-frame[data-node-type="multipleChoiceNode"] .option[aria-pressed="true"] .option-marker::before {
    content: "✓";
    font-size: 1.25rem;
  }

  body.important-talks-theme .node-frame[data-node-type="multipleChoiceNode"] .option.selected .option-marker,
  body.important-talks-theme .node-frame[data-node-type="multipleChoiceNode"] .option[aria-pressed="true"] .option-marker {
    font-size: 0;
  }

  body.important-talks-theme .option-copy {
    color: inherit;
    font-size: clamp(0.98rem, 1.3vw, 1.2rem);
    font-weight: 650;
    line-height: 1.35;
  }

  body.important-talks-theme .btn,
  body.important-talks-theme .action-btn,
  body.important-talks-theme button[type="submit"] {
    min-width: min(320px, 100%);
    min-height: var(--btn-height, 58px);
    grid-column: 1 / -1;
    justify-self: end;
    padding: 12px 34px;
    border: 1px solid transparent;
    border-radius: var(--btn-radius, 20px);
    background: linear-gradient(145deg, color-mix(in srgb, var(--btn-bg, var(--talks-blue)) 86%, #2b7cff), var(--btn-bg, var(--talks-blue)));
    color: var(--btn-text, white);
    box-shadow: 0 12px 24px color-mix(in srgb, var(--btn-bg, var(--talks-blue)) 22%, transparent), inset 0 1px 0 rgba(255,255,255,0.28);
    font-size: 1.05rem;
    font-weight: var(--btn-weight, 800);
    letter-spacing: 0.01em;
  }

  body.important-talks-theme .btn:hover,
  body.important-talks-theme .action-btn:hover,
  body.important-talks-theme button[type="submit"]:hover {
    background: var(--btn-hover-bg, #063ca8);
    color: var(--btn-hover-text, white);
    translate: 0 -1px;
  }

  body.important-talks-theme .match-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(18px, 3vw, 60px);
  }

  body.important-talks-theme .match-col {
    display: grid;
    align-content: start;
    gap: 12px;
    counter-reset: match-item;
  }

  body.important-talks-theme .match-item {
    min-height: 64px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 11px 16px;
    counter-increment: match-item;
    border: 1px solid var(--answer-border, #dce4f1);
    border-radius: var(--answer-radius, 18px);
    background: var(--card-bg, white);
    color: var(--card-text, var(--talks-ink));
    box-shadow: 0 7px 18px rgba(22, 49, 110, 0.07);
    text-align: left;
  }

  body.important-talks-theme .match-item::before {
    content: counter(match-item);
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--talks-blue);
    color: white;
    font-weight: 900;
    box-shadow: 0 5px 12px rgba(11, 77, 204, 0.18);
  }

  body.important-talks-theme .match-col:nth-child(2) .match-item::before {
    content: counter(match-item, upper-alpha);
    background: var(--talks-red);
  }

  body.important-talks-theme .match-item::after {
    content: "";
    width: 12px;
    height: 12px;
    border: 2px solid color-mix(in srgb, var(--talks-blue) 34%, white);
    border-radius: 50%;
    background: white;
  }

  body.important-talks-theme .match-item.selected,
  body.important-talks-theme .match-item.matched {
    border-color: var(--talks-blue);
    background: var(--talks-soft-blue);
  }

  body.important-talks-theme .timeline-container {
    grid-column: 1 / -1;
    display: grid;
    gap: 12px;
    counter-reset: talks-step;
  }

  body.important-talks-theme .timeline-item {
    min-height: 68px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    counter-increment: talks-step;
    border: 1px solid var(--answer-border, #dce4f1);
    border-radius: var(--answer-radius, 18px);
    background: white;
    box-shadow: 0 7px 18px rgba(22, 49, 110, 0.07);
  }

  body.important-talks-theme .timeline-item::before {
    content: counter(talks-step);
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--talks-blue);
    color: white;
    font-weight: 900;
  }

  body.important-talks-theme .timeline-controls {
    grid-column: 3;
    grid-row: 1;
    display: flex;
    gap: 6px;
  }

  body.important-talks-theme .timeline-controls button {
    width: 34px;
    height: 34px;
    border: 1px solid var(--talks-line);
    border-radius: 10px;
    background: var(--talks-soft-blue);
    color: var(--talks-blue);
    font-weight: 900;
  }

  body.important-talks-theme .timeline-content {
    grid-column: 2;
    grid-row: 1;
    color: var(--talks-ink);
    font-size: 1.05rem;
    font-weight: 650;
  }

  body.important-talks-theme .text-field {
    min-height: 58px;
    width: 100%;
    grid-column: 1 / -1;
    padding: 15px 18px;
    border: 1px solid color-mix(in srgb, var(--talks-blue) 45%, white);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--talks-ink);
    font-size: 1.05rem;
    outline: 0;
    box-shadow: inset 0 1px 3px rgba(22, 49, 110, 0.04);
  }

  body.important-talks-theme .node-frame[data-node-type="textInputNode"] .text-field {
    min-height: 112px;
    align-self: stretch;
    padding-block: 22px;
  }

  body.important-talks-theme .text-field:focus {
    border-color: var(--talks-blue);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--talks-blue) 11%, transparent);
  }

  body.important-talks-theme .field,
  body.important-talks-theme .allocator-row,
  body.important-talks-theme .allocator-summary,
  body.important-talks-theme .feedback-bubble,
  body.important-talks-theme .dialogue-card,
  body.important-talks-theme .timer-display,
  body.important-talks-theme .result-stat {
    border: 1px solid var(--answer-border, #dce4f1);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 8px 22px rgba(22, 49, 110, 0.07);
  }

  body.important-talks-theme .field,
  body.important-talks-theme .allocator-row {
    grid-column: 1 / -1;
    padding: 16px;
  }

  body.important-talks-theme .field-label,
  body.important-talks-theme .allocator-label {
    color: var(--talks-ink);
    font-size: 0.82rem;
    font-weight: 850;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  body.important-talks-theme .range-field {
    accent-color: var(--talks-blue);
  }

  body.important-talks-theme .dialogue-card {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 18px;
    padding: 22px;
  }

  body.important-talks-theme .dialogue-avatar,
  body.important-talks-theme .dialogue-avatar-fallback {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--talks-soft-blue);
    color: var(--talks-blue);
  }

  body.important-talks-theme .dialogue-name {
    color: var(--talks-blue);
    font-size: 1.1rem;
    font-weight: 900;
  }

  body.important-talks-theme .dialogue-role {
    color: var(--talks-red);
  }

  body.important-talks-theme .feedback-bubble {
    grid-column: 1 / -1;
    padding: 22px;
    color: var(--talks-ink);
    font-size: 1.05rem;
  }

  body.important-talks-theme .timer-display {
    grid-column: 1 / -1;
    justify-self: center;
    min-width: 240px;
    padding: 26px;
    text-align: center;
  }

  body.important-talks-theme .timer-value {
    color: var(--talks-blue);
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 900;
    line-height: 1;
  }

  body.important-talks-theme .timer-label {
    margin-top: 8px;
    color: #65759a;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  body.important-talks-theme .result-summary {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  body.important-talks-theme .result-stat {
    padding: 24px;
    text-align: center;
  }

  body.important-talks-theme .result-stat-label {
    color: #65759a;
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  body.important-talks-theme .result-stat-value {
    margin-top: 8px;
    color: var(--result-accent, var(--talks-blue));
    font-size: clamp(2.4rem, 6vw, 4.5rem);
    font-weight: 900;
    line-height: 1;
  }

  body.important-talks-theme .talks-support-hud {
    display: none !important;
  }

  body.important-talks-theme .achievement-toast {
    border: 1px solid var(--talks-line);
    border-radius: 18px;
    background: white;
    color: var(--talks-ink);
    box-shadow: var(--talks-shadow);
  }

  body.important-talks-theme .achievement-toast-title {
    color: var(--talks-red);
  }

  @media (max-width: 1050px) {
    body.important-talks-theme .topbar-inner {
      grid-template-columns: 1fr;
    }

    body.important-talks-theme .talks-user-hud {
      justify-self: stretch;
      justify-content: flex-start;
      overflow-x: auto;
    }

    body.important-talks-theme .node-frame:has(.media-frame) {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
    }

    body.important-talks-theme .node-frame:has(.media-frame) > :not(.media-frame),
    body.important-talks-theme .node-frame:has(.media-frame) .media-frame,
    body.important-talks-theme .node-frame:has(.media-frame) .node-controls {
      grid-column: 1;
      grid-row: auto;
    }

    body.important-talks-theme .node-frame:has(.media-frame) .media-frame {
      margin: 18px 0 0;
    }
  }

  @media (max-width: 720px) {
    body.important-talks-theme .quiz-shell {
      padding: 12px 12px 108px;
    }

    body.important-talks-theme #header-logo {
      width: 54px;
      height: 46px;
      border-radius: 17px 17px 17px 6px;
    }

    body.important-talks-theme .brand-kicker,
    body.important-talks-theme .talks-hud-label,
    body.important-talks-theme #hud-score-label,
    body.important-talks-theme .talks-divider {
      display: none;
    }

    body.important-talks-theme #header-title {
      max-width: none;
      font-size: 1.2rem;
    }

    body.important-talks-theme .talks-user-hud {
      min-height: 60px;
      gap: 10px;
      padding: 8px;
      border-radius: 18px;
    }

    body.important-talks-theme .talks-avatar {
      width: 42px;
      height: 42px;
    }

    body.important-talks-theme #hud-name,
    body.important-talks-theme #hud-score {
      max-width: 92px;
      font-size: 0.92rem;
    }

    body.important-talks-theme .timer-pill {
      min-width: 80px;
      padding-right: 10px;
      font-size: 0.86rem;
    }

    body.important-talks-theme #quiz-view {
      min-height: 0;
      padding: 24px 18px;
      border-radius: 22px;
    }

    body.important-talks-theme .node-title {
      font-size: calc(clamp(1.72rem, 9vw, 2.55rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .node-controls,
    body.important-talks-theme .match-grid,
    body.important-talks-theme .result-summary {
      grid-template-columns: 1fr;
    }

    body.important-talks-theme .media-frame {
      min-height: 220px;
    }

    body.important-talks-theme .btn,
    body.important-talks-theme .action-btn {
      width: 100%;
      min-width: 0;
      justify-self: stretch;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body.important-talks-theme *,
    body.important-talks-theme *::before,
    body.important-talks-theme *::after {
      scroll-behavior: auto !important;
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
</style>`;

const importantTalksHeader = `
        <header class="quiz-topbar talks-topbar">
            <div class="topbar-inner">
                <div class="brand-lockup">
                    <div id="header-logo">РВ</div>
                    <div class="brand-copy">
                        <div class="brand-kicker">Образовательный диалог</div>
                        <div id="header-title">Разговоры о важном</div>
                    </div>
                </div>

                <div class="talks-user-hud" aria-label="Состояние участника">
                    <div class="talks-avatar" aria-hidden="true">
                        <img id="hud-avatar-image" class="hidden" alt="" />
                        <span id="hud-avatar-fallback">Г</span>
                    </div>
                    <div class="talks-person">
                        <span class="talks-hud-label">Участник</span>
                        <strong id="hud-name">Гость</strong>
                    </div>
                    <span class="talks-divider" aria-hidden="true"></span>
                    <div id="global-timer-container" class="timer-pill hidden">00:00</div>
                    <span class="talks-divider" aria-hidden="true"></span>
                    <div class="talks-score">
                        <span id="hud-score-label">Искры добра</span>
                        <strong id="hud-score">0</strong>
                    </div>
                </div>

                <div class="top-progress" aria-label="Прогресс прохождения">
                    <div class="top-progress-track" aria-hidden="true">
                        <div id="top-progress-fill" class="top-progress-fill"></div>
                    </div>
                    <span class="talks-progress-copy"><span id="progress-text">0</span>%</span>
                </div>
            </div>
        </header>`;

const importantTalksSupportHud = `
                <aside class="quiz-hud talks-support-hud" aria-hidden="true">
                    <section class="hud-panel hidden">
                        <span id="ach-count">0</span>
                        <div id="achievements-list"></div>
                    </section>
                    <section id="hud-variables-container" class="hud-panel hidden">
                        <div id="hud-variables-list"></div>
                    </section>
                    <section class="hud-panel hidden">
                        <div class="hud-stats">
                            <div class="progress-ring-container">
                                <svg class="progress-ring" viewBox="0 0 48 48" aria-hidden="true">
                                    <circle id="progress-ring" class="progress-ring-fill" cx="24" cy="24" r="20"></circle>
                                </svg>
                                <span id="progress-text-sidebar">0%</span>
                            </div>
                        </div>
                    </section>
                </aside>`;

function replaceRequired(source: string, pattern: RegExp, replacement: string, label: string): string {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`[importantTalks template] Missing ${label} in base template`);
  return next;
}

let importantTalksTemplate = defaultTemplate.replace(
  '</head>',
  `${importantTalksStyles}\n</head>`,
);
importantTalksTemplate = replaceRequired(
  importantTalksTemplate,
  /<body>/,
  '<body class="important-talks-theme">',
  'body',
);
importantTalksTemplate = replaceRequired(
  importantTalksTemplate,
  /<header class="quiz-topbar">[\s\S]*?<\/header>/,
  importantTalksHeader,
  'header',
);
importantTalksTemplate = replaceRequired(
  importantTalksTemplate,
  /<aside class="quiz-hud"[\s\S]*?<\/aside>/,
  importantTalksSupportHud,
  'HUD',
);

export default importantTalksTemplate;

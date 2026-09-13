export const importantTalksQuestionSceneStyles = `
<style id="important-talks-question-scene-v4">
  body.important-talks-theme #quiz-view:has(> .talks-question-scene) {
    width: 100%;
    max-width: none !important;
    min-height: clamp(500px, calc(100dvh - 280px), 620px);
    padding: 0 !important;
    overflow: visible;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  body.important-talks-theme #quiz-view:has(> .talks-question-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-question-scene)::after {
    display: none;
  }

  body.important-talks-theme .talks-question-scene {
    width: 100%;
    min-height: inherit;
    display: grid;
    grid-template-rows: minmax(286px, 1fr) auto;
    gap: 16px;
    align-content: stretch;
  }

  body.important-talks-theme .talks-question-hero {
    min-width: 0;
    min-height: 286px;
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.16fr);
    align-items: stretch;
    border: 1px solid rgba(11, 82, 214, 0.08);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 17px 42px rgba(25, 55, 118, 0.11), 0 3px 9px rgba(25, 55, 118, 0.06);
    isolation: isolate;
  }

  body.important-talks-theme .talks-question-copy {
    min-width: 0;
    position: relative;
    z-index: 4;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: clamp(32px, 4vw, 64px) clamp(28px, 4vw, 68px) clamp(66px, 7vw, 92px);
  }

  body.important-talks-theme .talks-question-copy::before {
    content: "";
    position: absolute;
    left: clamp(28px, 4vw, 68px);
    bottom: clamp(58px, 6.2vw, 78px);
    width: 64px;
    height: 5px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--talks-blue), #7fc4f3);
    opacity: 0.95;
  }

  body.important-talks-theme .talks-question-eyebrow {
    order: 0;
    margin: 0 0 10px;
    color: var(--talks-blue);
    font-size: clamp(0.72rem, 0.82vw, 0.86rem);
    font-weight: 800;
    letter-spacing: 0.1em;
    line-height: 1;
    text-transform: uppercase;
  }

  body.important-talks-theme .talks-question-prompt {
    order: 1;
    max-width: 720px;
    margin: 0;
    display: block !important;
    color: var(--talks-ink);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: calc(clamp(2rem, 3vw, 3.55rem) * var(--heading-scale, 1));
    font-weight: 800;
    letter-spacing: -0.047em;
    line-height: 1.1;
    text-wrap: balance;
  }

  body.important-talks-theme .talks-question-instruction {
    order: 2;
    margin: 26px 0 0;
    color: var(--talks-copy);
    font-size: calc(clamp(1rem, 1.25vw, 1.28rem) * var(--body-scale, 1));
    font-weight: 550;
    line-height: 1.35;
  }

  body.important-talks-theme .talks-question-visual {
    min-width: 0;
    min-height: 0;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }

  body.important-talks-theme .talks-question-visual::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.60) 16%, transparent 43%);
    pointer-events: none;
  }

  body.important-talks-theme .talks-question-visual .media-frame,
  body.important-talks-theme .talks-question-media-fallback {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 0;
    background: #f8fbff;
    box-shadow: none;
  }

  body.important-talks-theme .talks-question-media-fallback {
    background: #f8fbff url("/assets/important-talks/single-choice-friendship.webp") 72% center / cover no-repeat;
  }

  body.important-talks-theme .talks-question-visual .media-frame::after {
    display: none;
  }

  body.important-talks-theme .talks-question-visual .media-frame img,
  body.important-talks-theme .talks-question-visual .media-frame iframe,
  body.important-talks-theme .talks-question-visual .quiz-media-image {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: var(--question-media-fit, cover);
    object-position: center;
  }

  body.important-talks-theme .talks-question-wave {
    position: absolute;
    right: -2%;
    bottom: -16px;
    left: -2%;
    z-index: 5;
    height: 76px;
    border-radius: 48% 53% 0 0 / 45% 42% 0 0;
    background: rgba(255, 255, 255, 0.98);
    transform: rotate(-0.35deg);
    pointer-events: none;
  }

  body.important-talks-theme .talks-question-wave::before,
  body.important-talks-theme .talks-question-wave::after {
    content: "";
    position: absolute;
    right: -1%;
    left: -1%;
    border-radius: 50% 50% 0 0 / 75% 66% 0 0;
  }

  body.important-talks-theme .talks-question-wave::before {
    top: 18px;
    height: 48px;
    background: linear-gradient(90deg, #0a45bd, var(--talks-blue), #146ce6);
  }

  body.important-talks-theme .talks-question-wave::after {
    top: 42px;
    height: 38px;
    background: linear-gradient(90deg, #ef2430, var(--talks-red), #f24149);
  }

  body.important-talks-theme .talks-question-options {
    width: 100%;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px 18px !important;
    margin: 0 !important;
  }

  body.important-talks-theme .talks-question-options .option {
    min-height: 72px;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 18px;
    padding: 12px 24px;
    border: 1px solid #dce3ef;
    border-radius: 19px;
    background: rgba(255, 255, 255, 0.96);
    color: var(--talks-ink);
    box-shadow: 0 7px 20px rgba(22, 49, 110, 0.07);
  }

  body.important-talks-theme .talks-question-options .option-marker {
    width: 42px;
    height: 42px;
    position: relative;
    border: 2px solid #cbd4e3;
    border-radius: 50%;
    background: white;
    color: transparent;
    font-size: 0;
  }

  body.important-talks-theme .talks-question-options .option-marker::after {
    content: "";
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: transparent;
    transition: background-color 170ms ease, box-shadow 170ms ease, transform 170ms ease;
  }

  body.important-talks-theme .talks-question-options .option-copy {
    max-width: none;
    font-size: clamp(1rem, 1.42vw, 1.3rem);
    font-weight: 650;
    line-height: 1.25;
  }

  body.important-talks-theme .talks-question-options .option:hover {
    border-color: color-mix(in srgb, var(--talks-blue) 45%, white);
    background: #f7faff;
    translate: 0 -1px;
  }

  body.important-talks-theme .talks-question-options .option.selected,
  body.important-talks-theme .talks-question-options .option[aria-pressed="true"] {
    border-color: var(--talks-blue);
    background: linear-gradient(105deg, #edf4ff, #f8fbff);
    color: var(--talks-ink);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--talks-blue) 11%, transparent), 0 10px 26px rgba(22, 49, 110, 0.10);
  }

  body.important-talks-theme .talks-question-options .option.selected .option-marker,
  body.important-talks-theme .talks-question-options .option[aria-pressed="true"] .option-marker {
    border-color: var(--talks-blue);
    background: white;
  }

  body.important-talks-theme .talks-question-options .option.selected .option-marker::after,
  body.important-talks-theme .talks-question-options .option[aria-pressed="true"] .option-marker::after {
    background: var(--talks-blue);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--talks-blue) 12%, transparent);
    transform: scale(0.9);
  }

  body.important-talks-theme .talks-question-options .option:disabled {
    opacity: 0.72;
    cursor: default;
  }

  body.important-talks-theme .talks-question-options .option.selected:disabled,
  body.important-talks-theme .talks-question-options .option[aria-pressed="true"]:disabled {
    opacity: 1;
  }

  @media (max-width: 1380px) {
    body.important-talks-theme #quiz-view:has(> .talks-question-scene) {
      min-height: clamp(470px, calc(100dvh - 240px), 540px);
    }

    body.important-talks-theme .talks-question-scene {
      grid-template-rows: minmax(278px, 1fr) auto;
      gap: 13px;
    }

    body.important-talks-theme .talks-question-hero {
      min-height: 278px;
      border-radius: 26px;
    }

    body.important-talks-theme .talks-question-copy {
      padding: 26px 40px 68px;
    }

    body.important-talks-theme .talks-question-copy::before {
      left: 40px;
      bottom: 55px;
      width: 54px;
      height: 4px;
    }

    body.important-talks-theme .talks-question-prompt {
      font-size: calc(clamp(1.8rem, 2.75vw, 2.65rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-question-instruction {
      margin-top: 18px;
      font-size: calc(clamp(0.92rem, 1.18vw, 1.08rem) * var(--body-scale, 1));
    }

    body.important-talks-theme .talks-question-wave {
      height: 66px;
    }

    body.important-talks-theme .talks-question-options {
      gap: 10px 16px !important;
    }

    body.important-talks-theme .talks-question-options .option {
      min-height: 65px;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 14px;
      padding: 10px 20px;
      border-radius: 17px;
    }

    body.important-talks-theme .talks-question-options .option-marker {
      width: 38px;
      height: 38px;
    }

    body.important-talks-theme .talks-question-options .option-marker::after {
      width: 19px;
      height: 19px;
    }
  }

  @media (max-width: 900px) {
    body.important-talks-theme #quiz-view:has(> .talks-question-scene) {
      min-height: 0;
    }

    body.important-talks-theme .talks-question-scene {
      grid-template-rows: auto auto;
    }

    body.important-talks-theme .talks-question-hero {
      min-height: 430px;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(220px, 1fr);
    }

    body.important-talks-theme .talks-question-copy {
      padding: 28px 30px 22px;
    }

    body.important-talks-theme .talks-question-copy::before {
      display: none;
    }

    body.important-talks-theme .talks-question-prompt {
      max-width: 680px;
      font-size: calc(clamp(1.65rem, 5vw, 2.4rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-question-instruction {
      margin-top: 12px;
    }

    body.important-talks-theme .talks-question-visual::before {
      background: linear-gradient(180deg, rgba(255,255,255,0.82), transparent 28%);
    }
  }

  @media (max-width: 620px) {
    body.important-talks-theme .talks-question-hero {
      min-height: 410px;
      grid-template-rows: auto minmax(210px, 1fr);
      border-radius: 22px;
    }

    body.important-talks-theme .talks-question-copy {
      padding: 24px 22px 16px;
    }

    body.important-talks-theme .talks-question-prompt {
      font-size: calc(clamp(1.45rem, 7vw, 2rem) * var(--heading-scale, 1));
      line-height: 1.08;
    }

    body.important-talks-theme .talks-question-instruction {
      font-size: calc(0.94rem * var(--body-scale, 1));
    }

    body.important-talks-theme .talks-question-wave {
      height: 54px;
      bottom: -12px;
    }

    body.important-talks-theme .talks-question-wave::before {
      top: 15px;
      height: 36px;
    }

    body.important-talks-theme .talks-question-wave::after {
      top: 32px;
      height: 30px;
    }

    body.important-talks-theme .talks-question-options {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 9px !important;
    }

    body.important-talks-theme .talks-question-options .option {
      min-height: 62px;
      padding: 9px 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body.important-talks-theme .talks-question-options .option,
    body.important-talks-theme .talks-question-options .option-marker::after {
      transition: none;
    }
  }
</style>`;

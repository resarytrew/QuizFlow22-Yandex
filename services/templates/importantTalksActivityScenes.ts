export const importantTalksActivitySceneStyles = `
<style id="important-talks-activity-scenes-v6">
  body.important-talks-theme #quiz-view:has(> .talks-text-scene),
  body.important-talks-theme #quiz-view:has(> .talks-multiple-scene),
  body.important-talks-theme #quiz-view:has(> .talks-timeline-scene) {
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

  body.important-talks-theme #quiz-view:has(> .talks-text-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-text-scene)::after,
  body.important-talks-theme #quiz-view:has(> .talks-multiple-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-multiple-scene)::after,
  body.important-talks-theme #quiz-view:has(> .talks-timeline-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-timeline-scene)::after {
    display: none;
  }

  body.important-talks-theme .talks-text-scene,
  body.important-talks-theme .talks-multiple-scene,
  body.important-talks-theme .talks-timeline-scene {
    width: 100%;
    min-height: inherit;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr);
    gap: 18px;
    align-items: stretch;
  }

  body.important-talks-theme .talks-text-prompt,
  body.important-talks-theme .talks-multiple-prompt,
  body.important-talks-theme .talks-timeline-prompt {
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
    border: 5px solid rgba(255, 255, 255, 0.96);
    border-radius: 30px;
    background: #f8fbff;
    box-shadow: 0 17px 42px rgba(25, 55, 118, 0.12), 0 3px 9px rgba(25, 55, 118, 0.07);
    isolation: isolate;
  }

  body.important-talks-theme .talks-text-visual {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
  }

  body.important-talks-theme .talks-text-visual .media-frame,
  body.important-talks-theme .talks-text-media-fallback,
  body.important-talks-theme .talks-multiple-prompt .media-frame,
  body.important-talks-theme .talks-multiple-media-fallback,
  body.important-talks-theme .talks-timeline-prompt .media-frame,
  body.important-talks-theme .talks-timeline-media-fallback {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 25px;
    background-color: #f8fbff;
    box-shadow: none;
  }

  body.important-talks-theme .talks-text-media-fallback {
    background-image: url("/assets/important-talks/text-values-reflection.webp");
    background-position: center;
    background-size: cover;
  }

  body.important-talks-theme .talks-multiple-media-fallback {
    background-image: url("/assets/important-talks/multiple-choice-respect.webp");
    background-position: center;
    background-size: cover;
  }

  body.important-talks-theme .talks-timeline-media-fallback {
    background-image: url("/assets/important-talks/timeline-good-deed.webp");
    background-position: center;
    background-size: cover;
  }

  body.important-talks-theme .talks-text-prompt .media-frame::after,
  body.important-talks-theme .talks-multiple-prompt .media-frame::after,
  body.important-talks-theme .talks-timeline-prompt .media-frame::after {
    display: none;
  }

  body.important-talks-theme .talks-text-prompt .media-frame img,
  body.important-talks-theme .talks-multiple-prompt .media-frame img,
  body.important-talks-theme .talks-timeline-prompt .media-frame img,
  body.important-talks-theme .talks-text-prompt .quiz-media-image,
  body.important-talks-theme .talks-multiple-prompt .quiz-media-image,
  body.important-talks-theme .talks-timeline-prompt .quiz-media-image {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: var(--question-media-fit, cover);
    object-position: center;
  }

  body.important-talks-theme .talks-text-copy,
  body.important-talks-theme .talks-multiple-copy,
  body.important-talks-theme .talks-timeline-copy {
    width: min(48%, 440px);
    position: absolute;
    top: 11%;
    left: 6%;
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  body.important-talks-theme .talks-text-copy::after,
  body.important-talks-theme .talks-multiple-copy::after,
  body.important-talks-theme .talks-timeline-copy::after {
    content: "";
    width: 62px;
    height: 5px;
    margin-top: 20px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--talks-blue), #80c6f3);
  }

  body.important-talks-theme .talks-text-copy .node-title,
  body.important-talks-theme .talks-multiple-copy .node-title,
  body.important-talks-theme .talks-timeline-copy .node-title {
    order: 0;
    margin: 0 0 8px;
    color: var(--talks-blue);
    font-size: clamp(0.72rem, 0.9vw, 0.9rem);
    font-weight: 900;
    letter-spacing: 0.1em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  body.important-talks-theme .talks-text-copy .node-desc,
  body.important-talks-theme .talks-multiple-copy .node-desc,
  body.important-talks-theme .talks-timeline-copy .node-desc,
  body.important-talks-theme .talks-text-copy .node-title:only-child,
  body.important-talks-theme .talks-multiple-copy .node-title:only-child,
  body.important-talks-theme .talks-timeline-copy .node-title:only-child {
    order: 1;
    max-width: none;
    margin: 0;
    color: var(--talks-ink);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: calc(clamp(1.9rem, 2.85vw, 3.25rem) * var(--heading-scale, 1));
    font-weight: 850;
    letter-spacing: -0.047em;
    line-height: 1.08;
    text-wrap: balance;
  }

  body.important-talks-theme .talks-activity-wave {
    position: absolute;
    right: -3%;
    bottom: -18px;
    left: -3%;
    z-index: 5;
    height: 82px;
    border-radius: 50% 50% 0 0 / 62% 52% 0 0;
    background: rgba(255, 255, 255, 0.98);
    transform: rotate(0.4deg);
    pointer-events: none;
  }

  body.important-talks-theme .talks-activity-wave::before,
  body.important-talks-theme .talks-activity-wave::after {
    content: "";
    position: absolute;
    right: -1%;
    left: -1%;
    border-radius: 50% 50% 0 0 / 74% 66% 0 0;
  }

  body.important-talks-theme .talks-activity-wave::before {
    top: 20px;
    height: 50px;
    background: linear-gradient(90deg, #0a45bd, var(--talks-blue), #1671e8);
  }

  body.important-talks-theme .talks-activity-wave::after {
    top: 45px;
    height: 39px;
    background: linear-gradient(90deg, #ef2430, var(--talks-red), #f34049);
  }

  body.important-talks-theme .talks-activity-hint {
    min-height: 58px;
    position: absolute;
    right: 18px;
    bottom: 16px;
    left: 18px;
    z-index: 7;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 10px 16px;
    border: 1px solid rgba(11, 82, 214, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.94);
    color: var(--talks-blue);
    font-size: clamp(0.86rem, 1.08vw, 1.05rem);
    font-weight: 650;
    box-shadow: 0 9px 24px rgba(25, 55, 118, 0.10);
  }

  body.important-talks-theme .talks-activity-hint > span:first-child {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--talks-soft-blue);
    color: var(--talks-blue);
    font-size: 1.15rem;
  }

  body.important-talks-theme .talks-text-response {
    min-width: 0;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: minmax(250px, 1fr) auto auto;
    gap: 14px !important;
  }

  body.important-talks-theme .talks-text-entry {
    min-height: 0;
    position: relative;
    overflow: hidden;
    border: 2px solid color-mix(in srgb, var(--talks-blue) 52%, white);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 15px 38px rgba(25, 55, 118, 0.10);
  }

  body.important-talks-theme .talks-text-entry .text-field {
    width: 100%;
    height: 100%;
    min-height: 250px;
    resize: none;
    display: block;
    padding: 25px 28px 54px;
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: var(--talks-ink);
    font-family: inherit;
    font-size: clamp(1rem, 1.35vw, 1.22rem);
    line-height: 1.55;
    box-shadow: none;
  }

  body.important-talks-theme .talks-text-entry .text-field:focus-visible {
    outline: 0;
    box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--talks-blue) 14%, transparent);
  }

  body.important-talks-theme .talks-text-entry .text-field::placeholder {
    color: #7b88a7;
  }

  body.important-talks-theme .talks-text-count {
    position: absolute;
    right: 24px;
    bottom: 17px;
    color: #65759a;
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
  }

  body.important-talks-theme .talks-text-insight {
    min-height: 90px;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    padding: 15px 20px;
    border: 1px solid rgba(11, 82, 214, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 12px 30px rgba(25, 55, 118, 0.09);
  }

  body.important-talks-theme .talks-activity-icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 50% 50% 50% 14px;
    background: linear-gradient(155deg, #176ce9, #073aab);
    color: white;
    font-size: 1.25rem;
    box-shadow: 0 8px 18px rgba(11, 82, 214, 0.22);
  }

  body.important-talks-theme .talks-text-insight h2 {
    margin: 0;
    color: var(--talks-blue);
    font-size: clamp(1.02rem, 1.3vw, 1.25rem);
    font-weight: 850;
  }

  body.important-talks-theme .talks-text-insight p {
    margin: 3px 0 0;
    color: var(--talks-ink);
    font-size: clamp(0.82rem, 0.98vw, 0.96rem);
    line-height: 1.42;
  }

  body.important-talks-theme .talks-text-cta,
  body.important-talks-theme .talks-multiple-cta,
  body.important-talks-theme .talks-timeline-cta {
    width: 100%;
    min-height: 68px;
    margin: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 12px 28px 12px 42px;
    border: 4px solid rgba(255, 255, 255, 0.9);
    border-radius: 24px;
    background: linear-gradient(180deg, #176ce9, #073aab);
    color: white;
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: clamp(1.12rem, 1.55vw, 1.55rem);
    font-weight: 850;
    text-transform: uppercase;
    box-shadow: 0 11px 24px rgba(8, 62, 166, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.34);
  }

  body.important-talks-theme .talks-text-cta::after { content: "✓"; }
  body.important-talks-theme .talks-multiple-cta::after,
  body.important-talks-theme .talks-timeline-cta::after {
    content: "→";
    font-size: 1.5em;
    font-weight: 500;
  }

  body.important-talks-theme .talks-multiple-options,
  body.important-talks-theme .talks-timeline-stack {
    min-width: 0;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;
    align-content: center;
    gap: 10px !important;
    padding: 16px;
    border: 1px solid rgba(11, 82, 214, 0.08);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 17px 42px rgba(25, 55, 118, 0.11), 0 3px 9px rgba(25, 55, 118, 0.06);
  }

  body.important-talks-theme .talks-multiple-options .option {
    min-height: 66px;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 17px;
    padding: 10px 22px;
    border: 1px solid #dce3ef;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.97);
    color: var(--talks-ink);
    box-shadow: 0 7px 20px rgba(22, 49, 110, 0.07);
  }

  body.important-talks-theme .talks-multiple-options .option-marker {
    width: 42px;
    height: 42px;
    border: 2px solid #c7d0df;
    border-radius: 11px;
    background: white;
    color: transparent;
    font-size: 0;
  }

  body.important-talks-theme .talks-multiple-options .option-marker::before {
    content: "";
  }

  body.important-talks-theme .talks-multiple-options .option.selected .option-marker::before,
  body.important-talks-theme .talks-multiple-options .option[aria-pressed="true"] .option-marker::before {
    content: "✓";
    color: white;
    font-size: 1.24rem;
  }

  body.important-talks-theme .talks-multiple-options .option-copy {
    font-size: clamp(0.98rem, 1.3vw, 1.18rem);
    font-weight: 620;
  }

  body.important-talks-theme .talks-multiple-cta,
  body.important-talks-theme .talks-timeline-cta {
    margin-top: 2px;
  }

  body.important-talks-theme .talks-timeline-list {
    display: grid;
    gap: 10px;
    counter-reset: talks-timeline-order;
  }

  body.important-talks-theme .talks-timeline-card {
    min-height: 82px;
    position: relative;
    overflow: visible;
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) 34px;
    align-items: center;
    gap: 15px;
    padding: 11px 20px 11px 14px;
    counter-increment: talks-timeline-order;
    border: 1px solid #dce3ef;
    border-radius: 19px;
    background: rgba(255, 255, 255, 0.98);
    color: var(--talks-ink);
    box-shadow: 0 8px 21px rgba(22, 49, 110, 0.08);
  }

  body.important-talks-theme .talks-timeline-card::before {
    content: counter(talks-timeline-order);
    width: 50px;
    height: 50px;
    grid-column: 1;
    grid-row: 1;
    display: grid;
    place-items: center;
    border: 3px solid white;
    border-radius: 50%;
    background: linear-gradient(155deg, #176ce9, #073aab);
    color: white;
    font-size: 1.3rem;
    font-weight: 900;
    box-shadow: 0 6px 14px rgba(11, 82, 214, 0.22);
  }

  body.important-talks-theme .talks-timeline-card .timeline-content {
    grid-column: 2;
    grid-row: 1;
    font-size: clamp(0.98rem, 1.3vw, 1.18rem);
    font-weight: 620;
  }

  body.important-talks-theme .talks-timeline-grip {
    grid-column: 3;
    grid-row: 1;
    color: #a9b4c9;
    font-size: 1.5rem;
    letter-spacing: -0.2em;
  }

  body.important-talks-theme .talks-timeline-card .timeline-controls {
    width: 76px;
    position: absolute;
    right: 54px;
    z-index: 2;
    display: flex;
    gap: 5px;
    opacity: 0;
    transition: opacity 160ms ease;
  }

  body.important-talks-theme .talks-timeline-card:hover .timeline-controls,
  body.important-talks-theme .talks-timeline-card:focus-within .timeline-controls {
    opacity: 1;
  }

  body.important-talks-theme .talks-timeline-card .timeline-controls button {
    width: 34px;
    height: 34px;
    border: 1px solid var(--talks-line);
    border-radius: 10px;
    background: white;
    color: var(--talks-blue);
    box-shadow: 0 4px 10px rgba(22, 49, 110, 0.08);
  }

  @media (max-width: 1380px) {
    body.important-talks-theme #quiz-view:has(> .talks-text-scene),
    body.important-talks-theme #quiz-view:has(> .talks-multiple-scene),
    body.important-talks-theme #quiz-view:has(> .talks-timeline-scene) {
      min-height: clamp(470px, calc(100dvh - 240px), 540px);
    }

    body.important-talks-theme .talks-text-scene,
    body.important-talks-theme .talks-multiple-scene,
    body.important-talks-theme .talks-timeline-scene {
      grid-template-columns: minmax(0, 1fr) minmax(390px, 1fr);
      gap: 15px;
    }

    body.important-talks-theme .talks-text-copy .node-desc,
    body.important-talks-theme .talks-multiple-copy .node-desc,
    body.important-talks-theme .talks-timeline-copy .node-desc,
    body.important-talks-theme .talks-text-copy .node-title:only-child,
    body.important-talks-theme .talks-multiple-copy .node-title:only-child,
    body.important-talks-theme .talks-timeline-copy .node-title:only-child {
      font-size: calc(clamp(1.65rem, 2.55vw, 2.55rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-text-response {
      grid-template-rows: minmax(230px, 1fr) auto auto;
      gap: 10px !important;
    }

    body.important-talks-theme .talks-text-entry .text-field {
      min-height: 230px;
    }

    body.important-talks-theme .talks-text-insight {
      min-height: 78px;
      padding: 11px 16px;
    }

    body.important-talks-theme .talks-text-cta,
    body.important-talks-theme .talks-multiple-cta,
    body.important-talks-theme .talks-timeline-cta {
      min-height: 62px;
    }

    body.important-talks-theme .talks-multiple-options,
    body.important-talks-theme .talks-timeline-stack {
      gap: 8px !important;
      padding: 13px;
      border-radius: 26px;
    }

    body.important-talks-theme .talks-multiple-options .option {
      min-height: 58px;
      padding: 8px 18px;
    }

    body.important-talks-theme .talks-multiple-options .option-marker {
      width: 38px;
      height: 38px;
    }

    body.important-talks-theme .talks-timeline-card {
      min-height: 68px;
      grid-template-columns: 48px minmax(0, 1fr) 30px;
      padding-block: 8px;
    }

    body.important-talks-theme .talks-timeline-card::before {
      width: 44px;
      height: 44px;
    }
  }

  @media (max-width: 900px) {
    body.important-talks-theme #quiz-view:has(> .talks-text-scene),
    body.important-talks-theme #quiz-view:has(> .talks-multiple-scene),
    body.important-talks-theme #quiz-view:has(> .talks-timeline-scene) {
      min-height: 0;
    }

    body.important-talks-theme .talks-text-scene,
    body.important-talks-theme .talks-multiple-scene,
    body.important-talks-theme .talks-timeline-scene {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
      gap: 14px;
    }

    body.important-talks-theme .talks-text-prompt,
    body.important-talks-theme .talks-multiple-prompt,
    body.important-talks-theme .talks-timeline-prompt {
      min-height: 420px;
    }
  }

  @media (max-width: 620px) {
    body.important-talks-theme .talks-text-prompt,
    body.important-talks-theme .talks-multiple-prompt,
    body.important-talks-theme .talks-timeline-prompt {
      min-height: 350px;
      border-width: 4px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-text-copy,
    body.important-talks-theme .talks-multiple-copy,
    body.important-talks-theme .talks-timeline-copy {
      width: 54%;
      top: 8%;
      left: 6%;
    }

    body.important-talks-theme .talks-text-copy .node-desc,
    body.important-talks-theme .talks-multiple-copy .node-desc,
    body.important-talks-theme .talks-timeline-copy .node-desc,
    body.important-talks-theme .talks-text-copy .node-title:only-child,
    body.important-talks-theme .talks-multiple-copy .node-title:only-child,
    body.important-talks-theme .talks-timeline-copy .node-title:only-child {
      font-size: calc(clamp(1.35rem, 6.6vw, 1.8rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-activity-hint {
      right: 10px;
      bottom: 10px;
      left: 10px;
      min-height: 50px;
      padding: 8px 11px;
      border-radius: 15px;
      font-size: 0.8rem;
    }

    body.important-talks-theme .talks-activity-hint > span:first-child {
      width: 34px;
      height: 34px;
    }

    body.important-talks-theme .talks-text-response {
      grid-template-rows: 250px auto auto;
    }

    body.important-talks-theme .talks-text-entry {
      border-radius: 22px;
    }

    body.important-talks-theme .talks-text-entry .text-field {
      min-height: 250px;
      padding: 20px 20px 48px;
    }

    body.important-talks-theme .talks-text-insight {
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      border-radius: 19px;
    }

    body.important-talks-theme .talks-activity-icon {
      width: 44px;
      height: 44px;
    }

    body.important-talks-theme .talks-multiple-options,
    body.important-talks-theme .talks-timeline-stack {
      padding: 10px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-multiple-options .option {
      min-height: 60px;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 12px;
      padding: 8px 13px;
    }

    body.important-talks-theme .talks-timeline-card {
      min-height: 66px;
      grid-template-columns: 44px minmax(0, 1fr) 26px;
      gap: 10px;
      padding-inline: 10px 12px;
    }

    body.important-talks-theme .talks-timeline-card::before {
      width: 40px;
      height: 40px;
      font-size: 1.05rem;
    }

    body.important-talks-theme .talks-timeline-card .timeline-controls {
      right: 42px;
    }

    body.important-talks-theme .talks-text-cta,
    body.important-talks-theme .talks-multiple-cta,
    body.important-talks-theme .talks-timeline-cta {
      min-height: 60px;
      padding: 10px 18px 10px 28px;
      border-width: 3px;
      border-radius: 20px;
      font-size: 1.05rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body.important-talks-theme .talks-timeline-card .timeline-controls {
      transition: none;
    }
  }
</style>`;

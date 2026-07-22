export const importantTalksResultSceneStyles = `
<style id="important-talks-result-scene-v5">
  body.important-talks-theme #quiz-view:has(> .talks-result-scene) {
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

  body.important-talks-theme #quiz-view:has(> .talks-result-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-result-scene)::after {
    display: none;
  }

  body.important-talks-theme .talks-result-scene {
    width: 100%;
    min-height: inherit;
    display: grid;
    grid-template-columns: minmax(0, 1.18fr) minmax(390px, 0.82fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      "visual content"
      "visual controls";
    gap: 14px 20px;
    align-items: stretch;
  }

  body.important-talks-theme .talks-result-visual {
    grid-area: visual;
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
    border: 6px solid rgba(255, 255, 255, 0.96);
    border-radius: 32px;
    background: linear-gradient(145deg, #dceeff, #f9fcff);
    box-shadow: 0 19px 46px rgba(25, 55, 118, 0.14), 0 3px 9px rgba(25, 55, 118, 0.08);
    isolation: isolate;
  }

  body.important-talks-theme .talks-result-visual::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 2;
    background:
      radial-gradient(circle at 17% 18%, rgba(255, 255, 255, 0.72) 0 3px, transparent 4px),
      radial-gradient(circle at 23% 12%, rgba(11, 82, 214, 0.25) 0 4px, transparent 5px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 64%);
    pointer-events: none;
  }

  body.important-talks-theme .talks-result-visual::after {
    content: "✦";
    position: absolute;
    top: 7%;
    right: 8%;
    z-index: 4;
    color: #f4b942;
    font-size: clamp(2rem, 3.6vw, 4rem);
    filter: drop-shadow(0 6px 12px rgba(224, 154, 24, 0.22));
    transform: rotate(12deg);
    pointer-events: none;
  }

  body.important-talks-theme .talks-result-visual .media-frame,
  body.important-talks-theme .talks-result-media-fallback {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 26px;
    background: #eaf5ff;
    box-shadow: none;
  }

  body.important-talks-theme .talks-result-media-fallback {
    background: #eaf5ff url("/assets/important-talks/result-shared-values.webp") center / cover no-repeat;
  }

  body.important-talks-theme .talks-result-visual .media-frame::after {
    display: none;
  }

  body.important-talks-theme .talks-result-visual .media-frame img,
  body.important-talks-theme .talks-result-visual .media-frame iframe,
  body.important-talks-theme .talks-result-visual .quiz-media-image {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: var(--question-media-fit, cover);
    object-position: center;
  }

  body.important-talks-theme .talks-result-wave {
    position: absolute;
    right: -3%;
    bottom: -18px;
    left: -3%;
    z-index: 5;
    height: 84px;
    border-radius: 51% 49% 0 0 / 55% 48% 0 0;
    background: rgba(255, 255, 255, 0.98);
    transform: rotate(0.6deg);
    pointer-events: none;
  }

  body.important-talks-theme .talks-result-wave::before,
  body.important-talks-theme .talks-result-wave::after {
    content: "";
    position: absolute;
    right: -1%;
    left: -1%;
    border-radius: 50% 50% 0 0 / 72% 66% 0 0;
  }

  body.important-talks-theme .talks-result-wave::before {
    top: 20px;
    height: 52px;
    background: linear-gradient(90deg, #0a45bd, var(--talks-blue), #1671e8);
  }

  body.important-talks-theme .talks-result-wave::after {
    top: 46px;
    height: 40px;
    background: linear-gradient(90deg, #ef2430, var(--talks-red), #f34049);
  }

  body.important-talks-theme .talks-result-content {
    grid-area: content;
    min-width: 0;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(22px, 2.8vw, 42px) clamp(24px, 3.2vw, 48px);
    border: 1px solid rgba(11, 82, 214, 0.08);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 17px 42px rgba(25, 55, 118, 0.11), 0 3px 9px rgba(25, 55, 118, 0.06);
    text-align: center;
  }

  body.important-talks-theme .talks-result-content::before,
  body.important-talks-theme .talks-result-content::after {
    content: "✦";
    position: absolute;
    color: #f4b942;
    font-size: 1.25rem;
    opacity: 0.82;
    pointer-events: none;
  }

  body.important-talks-theme .talks-result-content::before {
    top: 10%;
    left: 10%;
  }

  body.important-talks-theme .talks-result-content::after {
    top: 20%;
    right: 9%;
    font-size: 0.85rem;
  }

  body.important-talks-theme .talks-result-kicker {
    order: 0;
    margin: 0 0 10px;
    color: var(--talks-red);
    font-size: clamp(0.75rem, 0.95vw, 0.92rem);
    font-weight: 900;
    letter-spacing: 0.11em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  body.important-talks-theme .talks-result-title {
    order: 1;
    max-width: 620px;
    margin: 0;
    color: var(--talks-ink);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: calc(clamp(2.1rem, 3.35vw, 3.7rem) * var(--heading-scale, 1));
    font-weight: 850;
    letter-spacing: -0.052em;
    line-height: 1.02;
    text-wrap: balance;
  }

  body.important-talks-theme .talks-result-content > .result-summary {
    order: 2;
    width: 100%;
    margin: clamp(18px, 2.2vw, 28px) 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  body.important-talks-theme .talks-result-content .result-stat {
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  body.important-talks-theme .talks-result-primary-stat {
    width: clamp(132px, 13vw, 174px);
    aspect-ratio: 1;
    position: relative;
    display: grid;
    place-content: center;
    padding: 18px !important;
    border: 5px solid white !important;
    border-radius: 50%;
    background: linear-gradient(155deg, #196be8, #073aab) !important;
    box-shadow:
      0 0 0 5px #f2c15a,
      0 14px 28px rgba(8, 62, 166, 0.24),
      inset 0 2px 0 rgba(255, 255, 255, 0.35) !important;
  }

  body.important-talks-theme .talks-result-primary-stat::before,
  body.important-talks-theme .talks-result-primary-stat::after {
    content: "✦";
    position: absolute;
    color: #f2c15a;
    font-size: 1.15rem;
  }

  body.important-talks-theme .talks-result-primary-stat::before {
    top: -12px;
    left: -18px;
  }

  body.important-talks-theme .talks-result-primary-stat::after {
    right: -20px;
    bottom: 8px;
    font-size: 0.85rem;
  }

  body.important-talks-theme .talks-result-primary-stat .result-stat-label {
    order: 2;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.84);
    font-size: clamp(0.62rem, 0.72vw, 0.72rem);
    letter-spacing: 0.08em;
  }

  body.important-talks-theme .talks-result-primary-stat .result-stat-value {
    order: 1;
    margin: 0;
    color: white;
    font-size: clamp(3rem, 5vw, 4.8rem);
    line-height: 0.88;
    text-shadow: 0 3px 0 rgba(3, 32, 91, 0.18);
  }

  body.important-talks-theme .talks-result-secondary-stat {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 0 !important;
  }

  body.important-talks-theme .talks-result-secondary-stat .result-stat-label {
    color: #65759a;
    font-size: 0.72rem;
  }

  body.important-talks-theme .talks-result-secondary-stat .result-stat-value {
    margin: 0;
    color: var(--talks-blue);
    font-size: 1.05rem;
  }

  body.important-talks-theme .talks-result-insight {
    order: 3;
    width: 100%;
    margin-top: clamp(16px, 2vw, 24px);
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: center;
    gap: 15px;
    padding: 15px 18px;
    border-radius: 20px;
    background: linear-gradient(110deg, #eef5ff, rgba(248, 251, 255, 0.88));
    text-align: left;
  }

  body.important-talks-theme .talks-result-insight-icon {
    width: 50px;
    height: 50px;
    position: relative;
    display: grid;
    place-items: center;
    border-radius: 50% 50% 50% 14px;
    background: linear-gradient(155deg, #176ce9, #073aab);
    color: white;
    font-size: 1.35rem;
    box-shadow: 0 7px 16px rgba(11, 82, 214, 0.20);
  }

  body.important-talks-theme .talks-result-insight-title {
    margin: 0;
    color: var(--talks-blue);
    font-size: clamp(1rem, 1.25vw, 1.2rem);
    font-weight: 850;
    letter-spacing: -0.02em;
  }

  body.important-talks-theme .talks-result-insight .node-desc {
    margin: 3px 0 0;
    color: var(--talks-ink);
    font-size: calc(clamp(0.82rem, 0.98vw, 0.96rem) * var(--body-scale, 1));
    line-height: 1.4;
  }

  body.important-talks-theme .talks-result-scene > .node-controls {
    grid-area: controls !important;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    justify-items: stretch;
    gap: 10px;
    margin: 0 !important;
  }

  body.important-talks-theme .talks-result-cta {
    width: 100%;
    grid-column: 1 / -1;
    min-height: 72px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 20px;
    padding: 13px 32px 13px 46px;
    border: 4px solid rgba(255, 255, 255, 0.90);
    border-radius: 25px;
    background: linear-gradient(180deg, #176ce9, #073aab);
    color: white;
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: clamp(1.16rem, 1.65vw, 1.65rem);
    font-weight: 850;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    box-shadow: 0 11px 24px rgba(8, 62, 166, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.34);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }

  body.important-talks-theme .talks-result-cta::after {
    content: "↻";
    font-size: 1.5em;
    font-weight: 500;
  }

  body.important-talks-theme .talks-result-cta:hover {
    filter: brightness(1.045) saturate(1.05);
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(8, 62, 166, 0.27), inset 0 1px 0 rgba(255, 255, 255, 0.36);
  }

  body.important-talks-theme .talks-result-cta:active {
    transform: translateY(1px) scale(0.99);
  }

  body.important-talks-theme .talks-result-cta:focus-visible {
    outline: 4px solid color-mix(in srgb, var(--talks-blue) 30%, white);
    outline-offset: 3px;
  }

  body.important-talks-theme .talks-result-scene > .node-controls > .action-btn:not(.talks-result-cta) {
    min-width: 132px;
    min-height: 72px;
    grid-column: auto;
    padding-inline: 18px;
    border: 1px solid color-mix(in srgb, var(--talks-blue) 22%, white);
    background: white;
    color: var(--talks-blue);
    box-shadow: none;
  }

  body.important-talks-theme.design-hide-description .talks-result-insight .node-desc {
    display: none;
  }

  body.important-talks-theme .talks-result-tools {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 !important;
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool {
    flex: 1 1 200px;
    min-width: 0;
    min-height: 56px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 12px 18px;
    border: 1px solid color-mix(in srgb, var(--talks-blue) 22%, white);
    border-radius: 18px;
    background: white;
    color: var(--talks-blue);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: 0.98rem;
    font-weight: 800;
    line-height: 1;
    box-shadow: none;
    cursor: pointer;
    transition: transform 160ms ease, background-color 160ms ease, color 160ms ease, border-color 160ms ease;
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool::before {
    content: "";
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    background: currentColor;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
  }

  body.important-talks-theme .talks-result-tools .talks-result-copy::before {
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z'/%3E%3C/svg%3E");
  }

  body.important-talks-theme .talks-result-tools .talks-result-print::before {
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M19 8V3H5v5H3v8h4v5h10v-5h4V8h-2ZM8 5h8v3H8V5Zm8 13H8v-4h8v4Zm3-5h-2V9h2v4Z'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M19 8V3H5v5H3v8h4v5h10v-5h4V8h-2ZM8 5h8v3H8V5Zm8 13H8v-4h8v4Zm3-5h-2V9h2v4Z'/%3E%3C/svg%3E");
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool:hover {
    background: #f3f8ff;
    transform: translateY(-1px);
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool:active {
    transform: translateY(1px);
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--talks-blue) 32%, white);
    outline-offset: 3px;
  }

  body.important-talks-theme .talks-result-tools .talks-result-tool.is-done {
    border-color: color-mix(in srgb, var(--talks-red) 40%, white);
    color: var(--talks-red);
    background: color-mix(in srgb, var(--talks-red) 8%, white);
  }

  body.important-talks-theme .talks-result-meta {
    order: 4;
    width: 100%;
    margin-top: clamp(16px, 2vw, 24px);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  body.important-talks-theme .talks-result-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    padding: 9px 17px;
    border-radius: 999px;
    background: linear-gradient(110deg, #eef5ff, rgba(248, 251, 255, 0.9));
    border: 1px solid rgba(11, 82, 214, 0.10);
    color: var(--talks-ink);
    font-size: 0.94rem;
    font-weight: 600;
  }

  body.important-talks-theme .talks-result-chip-label {
    color: #53688f;
    font-weight: 650;
  }

  body.important-talks-theme .talks-result-chip-value {
    color: var(--talks-blue);
    font-weight: 850;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 1380px) {
    body.important-talks-theme #quiz-view:has(> .talks-result-scene) {
      min-height: clamp(470px, calc(100dvh - 240px), 540px);
    }

    body.important-talks-theme .talks-result-scene {
      grid-template-columns: minmax(0, 1.18fr) minmax(350px, 0.82fr);
      gap: 12px 16px;
    }

    body.important-talks-theme .talks-result-visual {
      border-width: 5px;
      border-radius: 27px;
    }

    body.important-talks-theme .talks-result-content {
      padding: 16px 28px;
      border-radius: 26px;
    }

    body.important-talks-theme .talks-result-title {
      font-size: calc(clamp(1.9rem, 3vw, 2.8rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-result-primary-stat {
      width: 112px;
    }

    body.important-talks-theme .talks-result-content > .result-summary {
      margin-top: 14px;
    }

    body.important-talks-theme .talks-result-insight {
      margin-top: 10px;
      padding: 10px 14px;
    }

    body.important-talks-theme .talks-result-cta {
      min-height: 64px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-result-scene > .node-controls > .action-btn:not(.talks-result-cta) {
      min-height: 64px;
    }
  }

  @media (max-width: 900px) {
    body.important-talks-theme #quiz-view:has(> .talks-result-scene) {
      min-height: 0;
    }

    body.important-talks-theme .talks-result-scene {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      grid-template-areas:
        "visual"
        "content"
        "controls";
      gap: 14px;
    }

    body.important-talks-theme .talks-result-visual {
      min-height: clamp(330px, 58vw, 480px);
    }
  }

  @media (max-width: 620px) {
    body.important-talks-theme .talks-result-visual {
      min-height: 300px;
      border-width: 4px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-result-content {
      padding: 24px 18px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-result-title {
      font-size: calc(clamp(1.75rem, 9vw, 2.35rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-result-primary-stat {
      width: 122px;
    }

    body.important-talks-theme .talks-result-insight {
      grid-template-columns: 46px minmax(0, 1fr);
      gap: 12px;
      padding: 13px;
      border-radius: 18px;
    }

    body.important-talks-theme .talks-result-insight-icon {
      width: 44px;
      height: 44px;
    }

    body.important-talks-theme .talks-result-cta {
      min-height: 60px;
      padding: 11px 20px 11px 30px;
      border-width: 3px;
      border-radius: 20px;
      font-size: 1.08rem;
    }

    body.important-talks-theme .talks-result-scene > .node-controls {
      grid-template-columns: minmax(0, 1fr);
    }

    body.important-talks-theme .talks-result-scene > .node-controls > .action-btn:not(.talks-result-cta) {
      min-height: 48px;
      grid-column: 1 / -1;
      order: 2;
    }

    body.important-talks-theme .talks-result-tools {
      gap: 8px;
    }

    body.important-talks-theme .talks-result-tools .talks-result-tool {
      flex-basis: 100%;
      min-height: 50px;
      padding: 11px 16px;
      font-size: 0.94rem;
    }

    body.important-talks-theme .talks-result-meta {
      gap: 8px;
    }

    body.important-talks-theme .talks-result-chip {
      flex: 1 1 auto;
      justify-content: center;
      padding: 8px 13px;
      font-size: 0.86rem;
    }

    body.important-talks-theme .talks-result-cta {
      grid-column: 1 / -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body.important-talks-theme .talks-result-cta {
      transition: none;
    }
  }
</style>`;

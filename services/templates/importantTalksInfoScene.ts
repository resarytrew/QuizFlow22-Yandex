export const importantTalksInfoSceneStyles = `
<style id="important-talks-info-scene-v3">
  body.important-talks-theme #quiz-view:has(> .talks-info-scene) {
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

  body.important-talks-theme #quiz-view:has(> .talks-info-scene)::before,
  body.important-talks-theme #quiz-view:has(> .talks-info-scene)::after {
    display: none;
  }

  body.important-talks-theme .talks-info-scene {
    width: 100%;
    min-height: inherit;
    display: grid;
    grid-template-columns: minmax(0, 1.56fr) minmax(330px, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      "visual aside"
      "visual controls";
    gap: 14px 18px;
    align-items: stretch;
  }

  body.important-talks-theme .talks-info-visual {
    grid-area: visual;
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
    border: 6px solid rgba(255, 255, 255, 0.96);
    border-radius: 30px;
    background: linear-gradient(145deg, #ddecff, #f8fbff);
    box-shadow: 0 18px 44px rgba(25, 55, 118, 0.14), 0 3px 9px rgba(25, 55, 118, 0.08);
    isolation: isolate;
  }

  body.important-talks-theme .talks-info-visual::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(247, 252, 255, 0.97) 0%, rgba(247, 252, 255, 0.88) 28%, rgba(247, 252, 255, 0.34) 51%, transparent 67%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 60%);
    pointer-events: none;
  }

  body.important-talks-theme .talks-info-visual::after {
    content: "";
    position: absolute;
    top: 5%;
    right: 4%;
    z-index: 3;
    width: 90px;
    height: 140px;
    opacity: 0.30;
    background:
      radial-gradient(ellipse at 65% 12%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 39% 30%, #4d91eb 0 9%, transparent 10%),
      radial-gradient(ellipse at 71% 47%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 42% 65%, #4d91eb 0 9%, transparent 10%),
      linear-gradient(67deg, transparent 48.5%, #4d91eb 49% 51%, transparent 51.5%);
    transform: rotate(8deg);
    pointer-events: none;
  }

  body.important-talks-theme .talks-info-visual .media-frame,
  body.important-talks-theme .talks-info-media-fallback {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: 24px;
    box-shadow: none;
  }

  body.important-talks-theme .talks-info-media-fallback {
    background: #dceeff url("/assets/important-talks/family-values.webp") center / cover no-repeat;
  }

  body.important-talks-theme .talks-info-visual .media-frame img,
  body.important-talks-theme .talks-info-visual .media-frame iframe,
  body.important-talks-theme .talks-info-visual .quiz-media-image {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: var(--question-media-fit, cover);
  }

  body.important-talks-theme .talks-info-visual .media-frame::after {
    z-index: 2;
    height: 31%;
    background: linear-gradient(176deg, transparent 0 24%, rgba(255,255,255,0.98) 25% 39%, var(--talks-blue) 40% 63%, var(--talks-red) 64% 86%, transparent 87%);
  }

  body.important-talks-theme .talks-info-visual .node-title {
    width: min(54%, 520px);
    max-width: none;
    margin: 0;
    position: absolute;
    top: 11%;
    left: 5%;
    z-index: 4;
    color: var(--talks-blue-deep);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: calc(clamp(2.25rem, 3.5vw, 4rem) * var(--heading-scale, 1));
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 1.03;
    text-transform: uppercase;
    text-wrap: balance;
    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.82), 0 0 24px rgba(255, 255, 255, 0.72);
  }

  body.important-talks-theme .talks-info-visual .talks-title-accent {
    color: var(--talks-red);
  }

  body.important-talks-theme .talks-info-aside {
    grid-area: aside;
    min-width: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
  }

  body.important-talks-theme .talks-info-intro,
  body.important-talks-theme .talks-info-agenda {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(13, 77, 196, 0.07);
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 14px 34px rgba(25, 55, 118, 0.10), 0 3px 9px rgba(25, 55, 118, 0.06);
  }

  body.important-talks-theme .talks-info-intro {
    min-height: 138px;
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    align-items: center;
    gap: 18px;
    padding: 22px 30px 22px 22px;
    border-radius: 28px 28px 22px 28px;
  }

  body.important-talks-theme .talks-info-intro::after,
  body.important-talks-theme .talks-info-agenda::after {
    content: "";
    position: absolute;
    right: 18px;
    bottom: 8px;
    width: 66px;
    height: 112px;
    opacity: 0.34;
    background:
      radial-gradient(ellipse at 62% 12%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 37% 31%, #4d91eb 0 9%, transparent 10%),
      radial-gradient(ellipse at 69% 49%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 41% 68%, #4d91eb 0 9%, transparent 10%),
      linear-gradient(67deg, transparent 48.5%, #4d91eb 49% 51%, transparent 51.5%);
    pointer-events: none;
  }

  body.important-talks-theme .talks-info-intro-icon {
    width: 64px;
    height: 64px;
    position: relative;
    display: grid;
    place-items: center;
    border: 4px solid white;
    border-radius: 50% 50% 50% 16px;
    background: linear-gradient(155deg, #176ce9, var(--talks-blue-deep));
    color: white;
    font-size: 1.72rem;
    line-height: 1;
    box-shadow: 0 8px 18px rgba(11, 82, 214, 0.22);
  }

  body.important-talks-theme .talks-info-intro-icon::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 8px;
    width: 15px;
    height: 15px;
    background: var(--talks-blue-deep);
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  body.important-talks-theme .talks-info-intro .node-desc {
    max-width: 36rem;
    margin: 0;
    position: relative;
    z-index: 1;
    color: var(--talks-ink);
    font-size: calc(clamp(0.96rem, 1.25vw, 1.16rem) * var(--body-scale, 1));
    font-weight: 520;
    line-height: 1.55;
    text-wrap: pretty;
  }

  body.important-talks-theme .talks-info-agenda {
    min-height: 0;
    padding: 24px 30px 20px;
    border-radius: 28px 22px 28px 28px;
  }

  body.important-talks-theme .talks-info-agenda::after {
    width: 88px;
    height: 152px;
    right: 14px;
    bottom: -12px;
  }

  body.important-talks-theme .talks-info-agenda-title {
    margin: 0 0 13px;
    position: relative;
    z-index: 1;
    color: var(--talks-blue-deep);
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: clamp(1.28rem, 1.7vw, 1.72rem);
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-transform: uppercase;
  }

  body.important-talks-theme .talks-info-agenda-list {
    margin: 0;
    padding: 0;
    position: relative;
    z-index: 1;
    display: grid;
    list-style: none;
  }

  body.important-talks-theme .talks-info-agenda-item {
    min-height: 59px;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: center;
    gap: 15px;
    color: var(--talks-ink);
    font-size: clamp(0.96rem, 1.26vw, 1.18rem);
    font-weight: 560;
  }

  body.important-talks-theme .talks-info-agenda-item + .talks-info-agenda-item {
    border-top: 1px solid rgba(13, 77, 196, 0.09);
  }

  body.important-talks-theme .talks-info-agenda-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--talks-soft-blue);
    color: var(--talks-blue);
    font-size: 1.2rem;
    font-weight: 800;
  }

  body.important-talks-theme .talks-info-agenda-icon::before { content: "▦"; }
  body.important-talks-theme .talks-info-agenda-item-2 .talks-info-agenda-icon::before { content: "◆"; }
  body.important-talks-theme .talks-info-agenda-item-3 .talks-info-agenda-icon {
    background: color-mix(in srgb, var(--talks-red) 9%, white);
    color: var(--talks-red);
  }
  body.important-talks-theme .talks-info-agenda-item-3 .talks-info-agenda-icon::before { content: "✦"; }

  body.important-talks-theme .talks-info-scene > .node-controls {
    grid-area: controls !important;
    width: 100%;
    display: block;
    margin: 0 !important;
  }

  body.important-talks-theme .talks-info-cta {
    width: 100%;
    min-height: 76px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 22px;
    padding: 14px 34px 14px 58px;
    border: 4px solid rgba(255, 255, 255, 0.90);
    border-radius: 26px;
    background: linear-gradient(180deg, #176ce9, var(--talks-blue-deep));
    color: white;
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: clamp(1.3rem, 2vw, 2rem);
    font-weight: 800;
    letter-spacing: 0.015em;
    line-height: 1;
    text-transform: uppercase;
    box-shadow: 0 11px 24px rgba(8, 62, 166, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.34);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }

  body.important-talks-theme .talks-info-cta::after {
    content: "→";
    font-size: 1.65em;
    font-weight: 500;
  }

  body.important-talks-theme .talks-info-cta:hover {
    filter: brightness(1.045) saturate(1.05);
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(8, 62, 166, 0.27), inset 0 1px 0 rgba(255, 255, 255, 0.36);
  }

  body.important-talks-theme .talks-info-cta:active {
    transform: translateY(1px) scale(0.99);
  }

  body.important-talks-theme .talks-info-cta:focus-visible {
    outline: 4px solid color-mix(in srgb, var(--talks-blue) 30%, white);
    outline-offset: 3px;
  }

  body.important-talks-theme.design-hide-description .talks-info-intro {
    display: none;
  }

  body.important-talks-theme.design-hide-description .talks-info-aside {
    grid-template-rows: minmax(0, 1fr);
  }

  @media (max-width: 1380px) {
    body.important-talks-theme #quiz-view:has(> .talks-info-scene) {
      min-height: clamp(470px, calc(100dvh - 240px), 540px);
    }

    body.important-talks-theme .talks-info-scene {
      grid-template-columns: minmax(0, 1.56fr) minmax(320px, 1fr);
      gap: 12px 16px;
    }

    body.important-talks-theme .talks-info-visual {
      border-width: 5px;
      border-radius: 26px;
    }

    body.important-talks-theme .talks-info-visual .node-title {
      width: 56%;
      font-size: calc(clamp(2rem, 3.45vw, 3.2rem) * var(--heading-scale, 1));
    }

    body.important-talks-theme .talks-info-intro {
      min-height: 118px;
      grid-template-columns: 56px minmax(0, 1fr);
      gap: 14px;
      padding: 17px 23px 17px 18px;
    }

    body.important-talks-theme .talks-info-intro-icon {
      width: 54px;
      height: 54px;
      font-size: 1.4rem;
    }

    body.important-talks-theme .talks-info-intro .node-desc {
      font-size: calc(clamp(0.88rem, 1.18vw, 1.02rem) * var(--body-scale, 1));
      line-height: 1.48;
    }

    body.important-talks-theme .talks-info-agenda {
      padding: 19px 24px 15px;
    }

    body.important-talks-theme .talks-info-agenda-title { margin-bottom: 8px; }
    body.important-talks-theme .talks-info-agenda-item { min-height: 51px; }

    body.important-talks-theme .talks-info-cta {
      min-height: 66px;
      padding: 12px 27px 12px 48px;
      border-radius: 23px;
    }
  }

  @media (max-width: 980px) {
    body.important-talks-theme #quiz-view:has(> .talks-info-scene) {
      min-height: 0;
    }

    body.important-talks-theme .talks-info-scene {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      grid-template-areas:
        "visual"
        "aside"
        "controls";
      gap: 14px;
    }

    body.important-talks-theme .talks-info-visual {
      min-height: clamp(330px, 54vw, 480px);
    }

    body.important-talks-theme .talks-info-aside {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      grid-template-rows: auto;
    }
  }

  @media (max-width: 640px) {
    body.important-talks-theme .talks-info-visual {
      min-height: 320px;
      border-width: 4px;
      border-radius: 22px;
    }

    body.important-talks-theme .talks-info-visual::before {
      background: linear-gradient(180deg, rgba(247, 252, 255, 0.96) 0%, rgba(247, 252, 255, 0.68) 48%, transparent 72%);
    }

    body.important-talks-theme .talks-info-visual .node-title {
      width: 88%;
      top: 9%;
      left: 6%;
      font-size: calc(clamp(1.65rem, 8vw, 2.25rem) * var(--heading-scale, 1));
      line-height: 1.01;
    }

    body.important-talks-theme .talks-info-aside {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
    }

    body.important-talks-theme .talks-info-intro,
    body.important-talks-theme .talks-info-agenda {
      border-radius: 22px;
    }

    body.important-talks-theme .talks-info-intro {
      min-height: 0;
      grid-template-columns: 48px minmax(0, 1fr);
      padding: 17px;
    }

    body.important-talks-theme .talks-info-intro-icon {
      width: 46px;
      height: 46px;
      font-size: 1.18rem;
    }

    body.important-talks-theme .talks-info-agenda {
      padding: 20px;
    }

    body.important-talks-theme .talks-info-agenda-item {
      grid-template-columns: 42px minmax(0, 1fr);
      min-height: 52px;
    }

    body.important-talks-theme .talks-info-agenda-icon {
      width: 38px;
      height: 38px;
    }

    body.important-talks-theme .talks-info-cta {
      min-height: 60px;
      padding: 11px 22px 11px 34px;
      border-width: 3px;
      border-radius: 20px;
      font-size: 1.22rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    body.important-talks-theme .talks-info-cta {
      transition: none;
    }
  }
</style>`;

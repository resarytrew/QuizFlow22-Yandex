export const importantTalksShellStyles = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style id="important-talks-shell-v2">
  body.important-talks-theme {
    --talks-blue: var(--brand-primary, #0b52d6);
    --talks-blue-deep: color-mix(in srgb, var(--talks-blue) 82%, #05286f);
    --talks-red: var(--brand-accent, #e5242f);
    --talks-ink: var(--brand-neutral, #071f58);
    --talks-copy: #17346f;
    --talks-muted: #7180a2;
    --talks-paper: var(--bg-color, #faf9f5);
    --talks-line: color-mix(in srgb, var(--talks-blue) 15%, white);
    --talks-soft-blue: color-mix(in srgb, var(--talks-blue) 8%, white);
    --talks-gold: #f4b620;
    --talks-shadow: 0 16px 42px rgba(25, 55, 118, 0.12), 0 3px 10px rgba(25, 55, 118, 0.08);
    --talks-shell-max: 1570px;
    font-family: var(--font-family, 'Manrope', 'Plus Jakarta Sans', system-ui, sans-serif);
    background-image:
      var(--bg-image, none),
      radial-gradient(circle at 88% 10%, color-mix(in srgb, var(--talks-blue) 9%, transparent), transparent 26rem),
      radial-gradient(circle at 8% 80%, rgba(94, 158, 242, 0.08), transparent 22rem),
      repeating-linear-gradient(90deg, rgba(7, 31, 88, 0.017) 0 1px, transparent 1px 9px),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.58) 0 1px, transparent 1px 5px) !important;
  }

  body.important-talks-theme .quiz-shell {
    min-height: 100dvh;
    padding: clamp(18px, 2.4vw, 34px) clamp(18px, 3.3vw, 58px) clamp(86px, 10vh, 116px);
    position: relative;
    overflow-x: clip;
    overflow-y: visible;
    isolation: isolate;
  }

  body.important-talks-theme .quiz-shell::before,
  body.important-talks-theme .quiz-shell::after {
    display: none;
  }

  body.important-talks-theme .talks-background-decor,
  body.important-talks-theme .talks-ribbon {
    pointer-events: none;
    user-select: none;
  }

  body.important-talks-theme .talks-background-decor {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  body.important-talks-theme .talks-botanical {
    position: absolute;
    width: 112px;
    height: 190px;
    opacity: 0.22;
    background:
      radial-gradient(ellipse at 58% 12%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 35% 27%, #4d91eb 0 9%, transparent 10%),
      radial-gradient(ellipse at 68% 43%, #4d91eb 0 8%, transparent 9%),
      radial-gradient(ellipse at 38% 58%, #4d91eb 0 9%, transparent 10%),
      radial-gradient(ellipse at 65% 73%, #4d91eb 0 8%, transparent 9%),
      linear-gradient(68deg, transparent 48.5%, #4d91eb 49% 51%, transparent 51.5%);
    filter: saturate(0.8);
  }

  body.important-talks-theme .talks-botanical-left {
    left: -20px;
    bottom: 96px;
    transform: rotate(-11deg);
  }

  body.important-talks-theme .talks-botanical-right {
    right: -14px;
    top: 39%;
    transform: rotate(168deg);
  }

  body.important-talks-theme .talks-dot-field {
    position: absolute;
    right: 7.5vw;
    bottom: 124px;
    width: 116px;
    height: 76px;
    opacity: 0.28;
    background: radial-gradient(circle, #77aaf1 0 3px, transparent 3.5px) 0 0 / 22px 22px;
    mask-image: linear-gradient(135deg, transparent 8%, black 62%, transparent 100%);
  }

  body.important-talks-theme .talks-ribbon {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 0;
    height: clamp(84px, 11.5vh, 120px);
    filter: drop-shadow(0 -10px 18px rgba(7, 31, 88, 0.08));
  }

  body.important-talks-theme .talks-ribbon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  body.important-talks-theme .talks-ribbon-white { fill: rgba(255, 255, 255, 0.98); }
  body.important-talks-theme .talks-ribbon-blue { fill: var(--talks-blue); }
  body.important-talks-theme .talks-ribbon-red { fill: var(--talks-red); }

  body.important-talks-theme.design-hide-background-decor .talks-background-decor,
  body.important-talks-theme.design-hide-background-decor .talks-ribbon {
    display: none;
  }

  body.important-talks-theme .quiz-topbar,
  body.important-talks-theme .quiz-main {
    width: min(var(--talks-shell-max), 100%);
    position: relative;
    z-index: 2;
  }

  body.important-talks-theme .quiz-topbar {
    margin: 0 auto;
  }

  body.important-talks-theme .topbar-inner {
    display: grid;
    grid-template-columns: minmax(320px, 0.92fr) minmax(330px, 1.18fr) minmax(420px, 1fr);
    grid-template-areas:
      "brand mode hud"
      "journey journey journey";
    align-items: center;
    gap: clamp(14px, 1.4vw, 24px) clamp(18px, 2vw, 36px);
    padding: 0;
  }

  body.important-talks-theme .brand-lockup {
    grid-area: brand;
    min-width: 0;
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    align-items: center;
    gap: 18px;
  }

  body.important-talks-theme #header-logo {
    width: 82px;
    height: 66px;
    position: relative;
    overflow: visible;
    border: 0;
    border-radius: 24px 24px 24px 8px;
    background: var(--talks-blue);
    color: transparent;
    box-shadow: 20px -12px 0 -5px #72c8f5, 25px 14px 0 -11px var(--talks-red), var(--talks-shadow);
  }

  body.important-talks-theme #header-logo::before,
  body.important-talks-theme #header-logo::after {
    content: "";
    position: absolute;
    pointer-events: none;
  }

  body.important-talks-theme #header-logo::before {
    right: -15px;
    top: 3px;
    width: 39px;
    height: 31px;
    border-radius: 13px 13px 13px 4px;
    background: linear-gradient(145deg, #8dd8fb, #49b3ee);
    box-shadow: -39px 24px 0 -7px #fff;
  }

  body.important-talks-theme #header-logo::after {
    bottom: -10px;
    left: 13px;
    width: 20px;
    height: 20px;
    background: var(--talks-blue);
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  body.important-talks-theme #header-logo[style*="background-image"] {
    overflow: hidden;
    border-radius: 22px;
    box-shadow: var(--talks-shadow);
  }

  body.important-talks-theme #header-logo[style*="background-image"]::before,
  body.important-talks-theme #header-logo[style*="background-image"]::after {
    display: none;
  }

  body.important-talks-theme .brand-copy {
    min-width: 0;
    display: block;
  }

  body.important-talks-theme .brand-kicker {
    margin-bottom: 2px;
    color: var(--talks-blue);
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  body.important-talks-theme #header-title {
    max-width: none;
    display: grid;
    gap: 0;
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: clamp(1.45rem, 2.1vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.045em;
    line-height: 0.98;
    text-transform: uppercase;
    white-space: normal;
  }

  body.important-talks-theme #talks-brand-primary { color: var(--talks-blue); }
  body.important-talks-theme #talks-brand-secondary { color: var(--talks-red); }
  body.important-talks-theme #talks-brand-secondary:empty { display: none; }

  body.important-talks-theme .talks-mode {
    grid-area: mode;
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(220px, 390px) auto;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }

  body.important-talks-theme .talks-mode-dots {
    width: 46px;
    height: 12px;
    opacity: 0.96;
    background: radial-gradient(circle, var(--talks-blue) 0 4px, transparent 4.5px) 0 50% / 18px 12px repeat-x;
  }

  body.important-talks-theme .talks-mode-dots:last-child {
    transform: scaleX(-1);
  }

  body.important-talks-theme #talks-mode-title {
    min-height: 58px;
    display: grid;
    place-items: center;
    padding: 10px 28px;
    border: 3px solid rgba(255, 255, 255, 0.88);
    border-radius: 999px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--talks-blue) 82%, #2c7bff), var(--talks-blue-deep));
    color: #fff;
    font-size: clamp(1.08rem, 1.5vw, 1.55rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
    box-shadow: 0 8px 0 rgba(9, 62, 169, 0.10), 0 13px 26px rgba(7, 57, 157, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.36);
  }

  body.important-talks-theme .talks-user-hud {
    grid-area: hud;
    min-width: 0;
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: clamp(10px, 1vw, 16px);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  body.important-talks-theme .talks-avatar {
    width: 66px;
    height: 66px;
    border: 4px solid #fff;
    border-radius: 24px;
    background: linear-gradient(145deg, #d9efff, #8fc9f5);
    box-shadow: 0 0 0 1px var(--talks-line), var(--talks-shadow);
  }

  body.important-talks-theme .talks-person {
    min-width: 72px;
    display: grid;
    gap: 1px;
  }

  body.important-talks-theme .talks-hud-label,
  body.important-talks-theme #hud-score-label {
    color: var(--talks-blue);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.065em;
  }

  body.important-talks-theme #hud-name {
    color: var(--talks-ink);
    font-size: 1.05rem;
    font-weight: 700;
  }

  body.important-talks-theme .talks-divider { display: none; }

  body.important-talks-theme .timer-pill {
    --talks-global-timer-progress: 360deg;
    width: 66px;
    min-width: 66px;
    height: 66px;
    min-height: 66px;
    display: grid;
    place-items: center;
    padding: 0;
    position: relative;
    isolation: isolate;
    border: 5px solid transparent;
    border-radius: 50%;
    background:
      linear-gradient(rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.98)) padding-box,
      conic-gradient(currentColor var(--talks-global-timer-progress), #dfe8f5 0) border-box;
    color: var(--talks-blue);
    font-size: 0.95rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 7px 18px rgba(25, 55, 118, 0.10);
  }

  body.important-talks-theme .timer-pill::before,
  body.important-talks-theme .timer-pill::after {
    display: none;
  }

  body.important-talks-theme .timer-pill.is-warning {
    color: #b77900;
  }

  body.important-talks-theme .timer-pill.is-urgent,
  body.important-talks-theme .timer-pill.is-expired,
  body.important-talks-theme .timer-pill.text-red-600 {
    color: var(--talks-red);
  }

  body.important-talks-theme .talks-score {
    min-width: 104px;
    display: grid;
    grid-template-columns: auto 22px;
    grid-template-rows: auto auto;
    column-gap: 5px;
    align-items: center;
  }

  body.important-talks-theme #hud-score-label {
    grid-column: 1 / -1;
    max-width: 126px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  body.important-talks-theme #hud-score {
    color: var(--talks-blue-deep);
    font-size: 1.82rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  body.important-talks-theme .talks-score-spark {
    width: 18px;
    height: 25px;
    display: block;
    background: var(--talks-gold);
    clip-path: polygon(50% 0, 62% 36%, 100% 50%, 62% 64%, 50% 100%, 38% 64%, 0 50%, 38% 36%);
    filter: drop-shadow(0 2px 3px rgba(165, 112, 0, 0.2));
  }

  body.important-talks-theme .talks-info-button {
    width: 52px;
    height: 52px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 3px solid var(--talks-blue);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.82);
    color: var(--talks-blue);
    font-family: Georgia, serif;
    font-size: 1.7rem;
    font-weight: 700;
    line-height: 1;
  }

  body.important-talks-theme .talks-journey {
    grid-area: journey;
    display: grid;
    grid-template-columns: max-content minmax(320px, 460px);
    align-items: center;
    gap: 26px;
  }

  body.important-talks-theme .talks-step,
  body.important-talks-theme .top-progress-track {
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--talks-shadow);
  }

  body.important-talks-theme .talks-step {
    min-height: 56px;
    display: inline-flex;
    align-items: center;
    gap: 13px;
    padding: 10px 22px;
    border: 1px solid rgba(13, 77, 196, 0.08);
    border-radius: 999px;
    color: var(--talks-blue-deep);
    font-size: 1rem;
    font-weight: 650;
    white-space: nowrap;
  }

  body.important-talks-theme .talks-step svg {
    width: 25px;
    height: 25px;
    color: var(--talks-blue);
  }

  body.important-talks-theme .top-progress {
    grid-column: auto;
    width: 100%;
    display: block;
    justify-self: stretch;
    color: var(--talks-blue);
  }

  body.important-talks-theme .top-progress-track {
    width: 100%;
    height: 56px;
    padding: 0;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(13, 77, 196, 0.08);
    border-radius: 999px;
    background:
      radial-gradient(circle, #cfdaea 0 7px, transparent 7.5px) 0 50% / var(--talks-progress-step, 16.6667%) 100% repeat-x,
      rgba(255, 255, 255, 0.94);
  }

  body.important-talks-theme .top-progress-fill {
    min-width: 0;
    height: 100%;
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 999px 0 0 999px;
    background: radial-gradient(circle, var(--talks-blue) 0 8px, transparent 8.5px) 0 50% / var(--talks-progress-step, 16.6667%) 100% repeat-x;
    box-shadow: none;
    transition: width 260ms ease-out;
  }

  body.important-talks-theme .talks-progress-copy {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  body.important-talks-theme .quiz-main {
    margin: 0 auto;
    padding: clamp(16px, 2vh, 24px) 0 0;
  }

  body.important-talks-theme #quiz-view {
    min-height: clamp(450px, calc(100dvh - 298px), 650px);
  }

  @media (max-width: 1380px) {
    body.important-talks-theme { --talks-shell-max: 1288px; }

    body.important-talks-theme .quiz-shell {
      padding: 18px 38px 78px;
    }

    body.important-talks-theme .topbar-inner {
      grid-template-columns: minmax(290px, 0.9fr) minmax(300px, 1.08fr) minmax(380px, 1fr);
      gap: 12px 22px;
    }

    body.important-talks-theme .brand-lockup {
      grid-template-columns: 72px minmax(0, 1fr);
      gap: 15px;
    }

    body.important-talks-theme #header-logo {
      width: 68px;
      height: 56px;
      border-radius: 20px 20px 20px 7px;
      box-shadow: 17px -9px 0 -5px #72c8f5, 20px 12px 0 -10px var(--talks-red), var(--talks-shadow);
    }

    body.important-talks-theme #header-title { font-size: clamp(1.32rem, 2vw, 1.75rem); }
    body.important-talks-theme .brand-kicker { display: none; }

    body.important-talks-theme #talks-mode-title {
      min-height: 50px;
      padding: 8px 22px;
      font-size: 1.08rem;
    }

    body.important-talks-theme .talks-mode-dots { width: 36px; }

    body.important-talks-theme .talks-user-hud {
      min-height: 62px;
      gap: 10px;
    }

    body.important-talks-theme .talks-avatar {
      width: 56px;
      height: 56px;
      border-radius: 20px;
    }

    body.important-talks-theme .talks-person { min-width: 62px; }

    body.important-talks-theme .timer-pill {
      width: 56px;
      min-width: 56px;
      height: 56px;
      min-height: 56px;
      font-size: 0.82rem;
    }

    body.important-talks-theme .talks-score { min-width: 88px; }
    body.important-talks-theme #hud-score { font-size: 1.5rem; }

    body.important-talks-theme .talks-info-button {
      width: 45px;
      height: 45px;
      font-size: 1.4rem;
    }

    body.important-talks-theme .talks-journey {
      grid-template-columns: max-content minmax(300px, 390px);
      gap: 22px;
    }

    body.important-talks-theme .talks-step,
    body.important-talks-theme .top-progress-track {
      min-height: 50px;
      height: 50px;
    }

    body.important-talks-theme #quiz-view {
      min-height: clamp(430px, calc(100dvh - 260px), 560px);
    }
  }

  @media (max-width: 1050px) {
    body.important-talks-theme .topbar-inner {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        "brand hud"
        "mode mode"
        "journey journey";
    }

    body.important-talks-theme .talks-mode { justify-self: center; }

    body.important-talks-theme .talks-person,
    body.important-talks-theme .talks-info-button { display: none; }

    body.important-talks-theme .talks-journey {
      grid-template-columns: max-content minmax(240px, 1fr);
    }
  }

  @media (max-width: 720px) {
    body.important-talks-theme .quiz-shell { padding: 12px 12px 72px; }

    body.important-talks-theme .topbar-inner {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px 12px;
    }

    body.important-talks-theme .brand-lockup {
      grid-template-columns: 48px minmax(0, 1fr);
      gap: 10px;
    }

    body.important-talks-theme #header-logo {
      width: 46px;
      height: 39px;
      border-radius: 14px 14px 14px 5px;
      box-shadow: 11px -6px 0 -3px #72c8f5, 13px 8px 0 -6px var(--talks-red), 0 7px 16px rgba(25, 55, 118, 0.12);
    }

    body.important-talks-theme #header-logo::before,
    body.important-talks-theme #header-logo::after { display: none; }

    body.important-talks-theme #header-title {
      font-size: clamp(0.86rem, 4.7vw, 1.12rem);
      line-height: 1.02;
    }

    body.important-talks-theme .talks-user-hud {
      min-height: 44px;
      gap: 7px;
      overflow: visible;
    }

    body.important-talks-theme .talks-avatar {
      width: 42px;
      height: 42px;
      border-width: 2px;
      border-radius: 14px;
    }

    body.important-talks-theme .timer-pill {
      width: 43px;
      min-width: 43px;
      height: 43px;
      min-height: 43px;
      border-width: 2px;
      font-size: 0.65rem;
    }

    body.important-talks-theme .talks-score {
      min-width: 42px;
      grid-template-columns: auto 12px;
    }

    body.important-talks-theme #hud-score-label,
    body.important-talks-theme .talks-score-spark { display: none; }

    body.important-talks-theme #hud-score { font-size: 1.1rem; }

    body.important-talks-theme .talks-mode {
      width: 100%;
      grid-template-columns: 28px minmax(0, 270px) 28px;
      gap: 8px;
    }

    body.important-talks-theme .talks-mode-dots {
      width: 28px;
      height: 8px;
      background-size: 12px 8px;
    }

    body.important-talks-theme #talks-mode-title {
      min-height: 38px;
      padding: 7px 14px;
      border-width: 2px;
      font-size: 0.82rem;
    }

    body.important-talks-theme .talks-journey {
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 9px;
    }

    body.important-talks-theme .talks-step {
      min-height: 38px;
      height: 38px;
      gap: 6px;
      padding: 6px 10px;
      font-size: 0.75rem;
    }

    body.important-talks-theme .talks-step svg {
      width: 18px;
      height: 18px;
    }

    body.important-talks-theme .top-progress-track {
      min-height: 38px;
      height: 38px;
      background-size: var(--talks-progress-step, 16.6667%) 100%, auto;
    }

    body.important-talks-theme .top-progress-fill { background-size: var(--talks-progress-step, 16.6667%) 100%; }
    body.important-talks-theme .quiz-main { padding-top: 10px; }
    body.important-talks-theme #quiz-view { min-height: 0; }
    body.important-talks-theme .talks-ribbon { height: 70px; }

    body.important-talks-theme .talks-botanical,
    body.important-talks-theme .talks-dot-field { opacity: 0.12; }
  }
</style>`;

export const importantTalksBackgroundDecor = `
        <div class="talks-background-decor" aria-hidden="true">
            <span class="talks-botanical talks-botanical-left"></span>
            <span class="talks-botanical talks-botanical-right"></span>
            <span class="talks-dot-field"></span>
        </div>`;

export const importantTalksRibbon = `
    <div class="talks-ribbon" aria-hidden="true">
        <svg viewBox="0 0 1600 150" preserveAspectRatio="none" focusable="false">
            <path class="talks-ribbon-white" d="M0 70 C210 5 345 118 560 62 C780 4 930 119 1160 58 C1330 14 1450 32 1600 4 L1600 150 L0 150 Z"></path>
            <path class="talks-ribbon-blue" d="M0 88 C210 23 350 136 570 80 C790 24 940 136 1165 76 C1340 30 1470 50 1600 20 L1600 150 L0 150 Z"></path>
            <path class="talks-ribbon-red" d="M0 116 C215 51 360 158 585 108 C805 60 955 157 1175 104 C1350 61 1480 78 1600 48 L1600 150 L0 150 Z"></path>
        </svg>
    </div>`;

export const importantTalksHeader = `
        <header class="quiz-topbar talks-topbar">
            <div class="topbar-inner">
                <div class="brand-lockup">
                    <div id="header-logo" data-logo-mark="talks" aria-hidden="true"></div>
                    <div class="brand-copy">
                        <div class="brand-kicker">Образовательный диалог</div>
                        <div id="header-title">
                            <span id="talks-brand-primary">РАЗГОВОРЫ</span>
                            <span id="talks-brand-secondary">О ВАЖНОМ</span>
                        </div>
                    </div>
                </div>

                <div class="talks-mode" aria-live="polite">
                    <span class="talks-mode-dots" aria-hidden="true"></span>
                    <strong id="talks-mode-title">ИНФОРМАЦИЯ</strong>
                    <span class="talks-mode-dots" aria-hidden="true"></span>
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
                    <div id="global-timer-container" class="timer-pill hidden">00:00</div>
                    <div class="talks-score">
                        <span id="hud-score-label">Искры добра</span>
                        <strong id="hud-score">0</strong>
                        <span class="talks-score-spark" aria-hidden="true"></span>
                    </div>
                    <span class="talks-info-button" role="img" aria-label="Информация">i</span>
                </div>

                <div class="talks-journey">
                    <div class="talks-step" aria-label="Текущий шаг">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M6 21V4m0 1h10.2l-1.9 3 1.9 3H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                        <span>Шаг <strong id="talks-step-current">1</strong> из <strong id="talks-step-total">1</strong></span>
                    </div>
                    <div class="top-progress" aria-label="Прогресс прохождения">
                        <div class="top-progress-track" aria-hidden="true">
                            <div id="top-progress-fill" class="top-progress-fill"></div>
                        </div>
                        <span class="talks-progress-copy"><span id="progress-text">0</span>%</span>
                    </div>
                </div>
            </div>
        </header>`;

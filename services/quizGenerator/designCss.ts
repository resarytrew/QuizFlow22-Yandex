import { injectBeforeHeadClose } from "./htmlInject";

type DesignRecord = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): DesignRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DesignRecord)
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true;
}

function cssString(value: string): string {
  return value.replace(/[<>{}]/g, "").slice(0, 180);
}

function cssColor(value: unknown, fallback: string): string {
  const raw = text(value, fallback).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) return raw;
  if (/^rgba?\(\s*[\d.\s,%]+\)$/.test(raw)) return raw;
  if (/^hsla?\(\s*[\d.\s,%degturnrad]+\)$/.test(raw)) return raw;
  return fallback;
}

function cssUrl(value: unknown): string {
  const raw = text(value).trim();
  if (!raw || /[\n\r"'<>]/.test(raw) || /^javascript:/i.test(raw)) return "";
  return raw;
}

function sanitizeCustomCss(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<\/style/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/@import/gi, "")
    .slice(0, 12000);
}

export function buildDesignCss(designSettings: unknown): string {
  const ds = asRecord(designSettings);
  const brand = asRecord(ds.brand);
  const background = asRecord(ds.background);
  const typography = asRecord(ds.typography);
  const layout = asRecord(ds.layout);
  const blocks = asRecord(layout.blocks);
  const questionCard = asRecord(ds.questionCard);
  const buttons = asRecord(ds.buttons);
  const answers = asRecord(ds.answerCards);
  const progress = asRecord(ds.progress);
  const result = asRecord(ds.result);
  const advanced = asRecord(ds.advanced);

  const bgColor = cssColor(background.color, "#f6f3ee");
  const bgMode = text(background.mode, "solid");
  const bgUrl = cssUrl(background.imageUrl);
  const bgImage =
    bgMode === "gradient"
      ? `linear-gradient(135deg, ${cssColor(background.gradientFrom, bgColor)}, ${cssColor(background.gradientTo, "#ebe5db")})`
      : bgMode === "image" && bgUrl
        ? `url("${bgUrl}")`
        : "none";
  const bgFit = text(background.imageFit, "cover");
  const bgSize = bgFit === "repeat" ? "320px" : cssString(bgFit);
  const overlayOpacity = Math.max(0, Math.min(1, num(background.overlayOpacity, 0)));
  const layoutPreset = cssString(text(layout.preset, "classic"));
  const questionAlign = text(layout.questionAlign, "left") === "center" ? "center" : "left";
  const verticalAlign = text(layout.verticalAlign, "center") === "top" ? "top" : "center";
  const buttonWidth = text(buttons.width, "auto") === "full" ? "full" : "auto";
  const buttonTransform = text(buttons.textTransform, "none") === "uppercase" ? "uppercase" : "none";
  const answerColumns = Math.max(1, Math.min(3, Math.round(num(answers.columns, 1))));
  const mediaAspectRatio = cssString(text(answers.mediaAspectRatio, "auto"));
  const questionMediaPosition = text(questionCard.mediaPosition, text(layout.mediaPosition, "top"));
  const questionShadow = text(questionCard.shadow, "soft");
  const progressHidden = text(progress.style) === "hidden";
  const chrome = text(layout.chrome, "full");
  const progressBottom = text(progress.position) === "bottom";
  const reducedMotion = bool(advanced.reducedMotion);
  const highContrast = bool(advanced.highContrast);
  const customCss = sanitizeCustomCss(advanced.customCss);
  const blockVisible = (key: string, fallback = true) => {
    const value = blocks[key];
    return typeof value === "boolean" ? value : fallback;
  };
  const hideTopbar = chrome === "none" || !blockVisible("topbar");
  const hideBrand = !blockVisible("brand");
  const hideLogo = !blockVisible("logo");
  const hideTitle = !blockVisible("title");
  const hideProgress = progressHidden || !blockVisible("progress");
  const hideTimer = !blockVisible("timer");
  const hideDescription = !blockVisible("description");
  const hideMedia = !blockVisible("media");
  const hideAchievements = !blockVisible("achievements");
  const hideVariables = !blockVisible("variables");
  const hideStats = !blockVisible("stats");
  const hideResultStats = !blockVisible("resultStats");
  const hideBackgroundDecor = !blockVisible("backgroundDecor");
  const hideHud = hideAchievements && hideVariables && hideStats;

  return `
<style id="quiz-design-settings">
  :root {
    --brand-primary: ${cssColor(brand.primaryColor, "#2f5d50")};
    --brand-accent: ${cssColor(brand.accentColor, "#b9852b")};
    --brand-neutral: ${cssColor(brand.neutralColor, "#1d1a16")};
    --bg-color: ${bgColor};
    --bg-image: ${bgImage};
    --bg-size: ${bgSize};
    --overlay-color: ${cssColor(background.overlayColor, "rgba(246, 243, 238, 0)")};
    --overlay-opacity: ${overlayOpacity};
    --font-family: ${cssString(text(typography.fontFamily, "'Plus Jakarta Sans', system-ui, sans-serif"))};
    --display-family: ${cssString(text(typography.displayFontFamily, "'Newsreader', Georgia, serif"))};
    --heading-color: ${cssColor(typography.headingColor, "#1d1a16")};
    --body-text-color: ${cssColor(typography.bodyTextColor, "#615d54")};
    --heading-weight: ${num(typography.headingWeight, 650)};
    --body-weight: ${num(typography.bodyWeight, 450)};
    --heading-scale: ${num(typography.headingScale, 1)};
    --body-scale: ${num(typography.bodyScale, 1)};
    --body-line-height: ${num(typography.lineHeight, 1.55)};
    --heading-line-height: ${num(typography.headingLineHeight, 1.04)};
    --paragraph-width: ${num(typography.paragraphWidth, 680)}px;
    --letter-spacing: ${num(typography.letterSpacing, 0)}px;
    --content-width: ${num(layout.contentWidth, 920)}px;
    --card-radius: ${num(layout.cardRadius, 28)}px;
    --card-padding: ${num(layout.cardPadding, 32)}px;
    --surface-opacity: ${Math.max(0, Math.min(1, num(layout.cardOpacity, 0.94)))};
    --question-card-bg: ${cssColor(questionCard.backgroundColor, "#fffefa")};
    --question-card-border: ${cssColor(questionCard.borderColor, "#dfd8cc")};
    --question-card-text: ${cssColor(questionCard.textColor, "#24211c")};
    --question-card-radius: ${num(questionCard.radius, num(layout.cardRadius, 28))}px;
    --question-card-padding: ${num(questionCard.padding, num(layout.cardPadding, 32))}px;
    --question-media-width: ${Math.max(28, Math.min(58, num(questionCard.mediaWidth, 42)))}%;
    --question-media-radius: ${num(questionCard.mediaRadius, 22)}px;
    --question-media-fit: ${text(questionCard.mediaFit, "cover") === "contain" ? "contain" : "cover"};
    --question-align: ${questionAlign};
    --vertical-align: ${verticalAlign === "top" ? "flex-start" : "center"};
    --btn-bg: ${cssColor(buttons.backgroundColor, "#2f5d50")};
    --accent: ${cssColor(buttons.backgroundColor, "#2f5d50")};
    --btn-text: ${cssColor(buttons.textColor, "#ffffff")};
    --btn-hover-bg: ${cssColor(buttons.hoverBackgroundColor, "#25493f")};
    --accent-hover: ${cssColor(buttons.hoverBackgroundColor, "#25493f")};
    --btn-hover-text: ${cssColor(buttons.hoverTextColor, "#ffffff")};
    --btn-radius: ${num(buttons.borderRadius, 18)}px;
    --btn-height: ${num(buttons.height, 54)}px;
    --btn-weight: ${num(buttons.fontWeight, 800)};
    --btn-display-width: ${buttonWidth === "full" ? "100%" : "auto"};
    --btn-text-transform: ${buttonTransform};
    --card-bg: ${cssColor(answers.backgroundColor, "#fffefa")};
    --card-text: ${cssColor(answers.textColor, "#24211c")};
    --card-hover-bg: ${cssColor(answers.hoverBackgroundColor, "#f7f4ed")};
    --card-hover-text: ${cssColor(answers.hoverTextColor, "#171512")};
    --card-selected-bg: ${cssColor(answers.selectedBackgroundColor, "#e5f0ea")};
    --card-selected-text: ${cssColor(answers.selectedTextColor, "#183b32")};
    --answer-border: ${cssColor(answers.borderColor, "rgba(39, 35, 28, 0.11)")};
    --answer-selected-border: ${cssColor(answers.selectedBorderColor, "#2f5d50")};
    --answer-radius: ${num(answers.borderRadius, 18)}px;
    --answer-gap: ${num(answers.spacing, 12)}px;
    --answer-columns: ${answerColumns};
    --answer-min-height: ${num(answers.minHeight, 58)}px;
    --answer-media-ratio: ${mediaAspectRatio === "16/9" ? "16 / 9" : mediaAspectRatio === "4/3" ? "4 / 3" : mediaAspectRatio === "1/1" ? "1 / 1" : "auto"};
    --progress-color: ${cssColor(progress.color, "#2f5d50")};
    --progress-track: ${cssColor(progress.trackColor, "rgba(29, 26, 22, 0.1)")};
    --progress-height: ${num(progress.height, 8)}px;
    --result-bg: ${cssColor(result.backgroundColor, "#fffefa")};
    --result-text: ${cssColor(result.textColor, "#1d1a16")};
    --result-accent: ${cssColor(result.accentColor, "#2f5d50")};
  }
  html, body {
    background-color: var(--bg-color) !important;
  }
  body {
    font-family: var(--font-family) !important;
    color: var(--body-text-color);
    font-size: calc(16px * var(--body-scale, 1));
    font-weight: var(--body-weight);
    line-height: var(--body-line-height);
    letter-spacing: var(--letter-spacing);
    background-image: var(--bg-image) !important;
    background-size: var(--bg-size) !important;
    background-position: center !important;
    background-repeat: ${bgFit === "repeat" ? "repeat" : "no-repeat"} !important;
  }
  body::before {
    background: var(--overlay-color);
    opacity: var(--overlay-opacity);
  }
  ${hideBackgroundDecor ? "body::after { display: none !important; }" : ""}
  .node-title, h1, h2, h3 {
    color: var(--heading-color);
    font-family: var(--display-family);
    font-weight: var(--heading-weight);
    line-height: var(--heading-line-height);
  }
  .node-desc, p, .option-copy {
    color: inherit;
    max-width: var(--paragraph-width);
  }
  #quiz-view, .content-card {
    border-radius: var(--card-radius);
  }
  #quiz-view {
    max-width: min(var(--content-width), calc(100vw - 28px));
    padding: var(--card-padding);
    text-align: var(--question-align);
    border-color: var(--question-card-border);
    border-radius: var(--question-card-radius);
    background: var(--question-card-bg);
    color: var(--question-card-text);
    ${questionShadow === "none" ? "box-shadow: none !important;" : questionShadow === "strong" ? "box-shadow: 0 14px 36px rgba(29, 26, 22, 0.10);" : "box-shadow: 0 8px 22px rgba(29, 26, 22, 0.06);"}
  }
  .node-frame {
    position: relative;
    overflow: visible;
    color: inherit;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .media-frame {
    border-radius: var(--question-media-radius);
    overflow: hidden;
  }
  .media-frame img,
  .media-frame iframe,
  .quiz-media-image {
    object-fit: var(--question-media-fit);
  }
  ${questionMediaPosition === "left" || questionMediaPosition === "right" ? `
  .node-frame:has(.media-frame) {
    display: grid;
    grid-template-columns: ${questionMediaPosition === "left" ? "minmax(180px, var(--question-media-width)) minmax(0, 1fr)" : "minmax(0, 1fr) minmax(180px, var(--question-media-width))"};
    column-gap: clamp(20px, 4vw, 48px);
    align-items: center;
  }
  .node-frame:has(.media-frame) > :not(.media-frame) {
    grid-column: ${questionMediaPosition === "left" ? "2" : "1"};
  }
  .media-frame {
    grid-column: ${questionMediaPosition === "left" ? "1" : "2"};
    grid-row: 1 / span 3;
  }
  ` : ""}
  ${questionMediaPosition === "background" ? `
  .node-frame {
    z-index: 0;
  }
  .node-frame .media-frame {
    position: absolute;
    inset: 0;
    z-index: -1;
    margin: 0;
    border-radius: inherit;
    opacity: 0.26;
    filter: saturate(0.88);
  }
  .node-frame .media-frame img,
  .node-frame .media-frame iframe {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  ` : ""}
  .quiz-content {
    align-items: var(--vertical-align);
  }
  .btn, .action-btn, button[type="submit"] {
    min-height: var(--btn-height);
    width: var(--btn-display-width);
    border-radius: var(--btn-radius);
    background: var(--btn-bg);
    color: var(--btn-text);
    font-weight: var(--btn-weight);
    text-transform: var(--btn-text-transform);
  }
  .btn:hover, .action-btn:hover, button[type="submit"]:hover {
    background: var(--btn-hover-bg);
    color: var(--btn-hover-text);
  }
  .option, .answer-card, .match-item {
    border-color: var(--answer-border);
    border-radius: var(--answer-radius);
    background: var(--card-bg);
    color: var(--card-text);
    min-height: var(--answer-min-height);
  }
  .option:hover, .answer-card:hover, .match-item:hover {
    background: var(--card-hover-bg);
    color: var(--card-hover-text);
  }
  .option.selected, .option[aria-pressed="true"] {
    border-color: var(--answer-selected-border);
    background: var(--card-selected-bg);
    color: var(--card-selected-text);
  }
  .node-controls {
    gap: var(--answer-gap);
  }
  .node-controls, .options-grid, .answers-grid {
    grid-template-columns: repeat(var(--answer-columns), minmax(0, 1fr));
  }
  .option img, .answer-card img {
    aspect-ratio: var(--answer-media-ratio);
    object-fit: cover;
  }
  .top-progress-fill, .progress-fill {
    background: var(--progress-color);
  }
  .top-progress-track, .progress-track {
    background: var(--progress-track);
    height: var(--progress-height);
  }
  body.design-layout-${layoutPreset} #quiz-view {
    max-width: min(var(--content-width), calc(100vw - 28px));
  }
  body.design-interface-studio .quiz-layout {
    grid-template-columns: minmax(0, 1fr) minmax(250px, 318px);
  }
  body.design-interface-immersive .quiz-main {
    max-width: min(1320px, calc(100vw - 34px));
  }
  body.design-interface-immersive .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-immersive .quiz-hud {
    display: none !important;
  }
  body.design-interface-immersive #quiz-view {
    min-height: min(780px, calc(100dvh - 138px));
    padding: clamp(34px, 7vw, 92px);
    border-radius: 34px 6px 34px 6px;
  }
  body.design-interface-immersive .node-title {
    max-width: min(860px, 78vw);
    font-size: calc(clamp(3.25rem, 8vw, 7.4rem) * var(--heading-scale, 1));
  }
  body.design-interface-form .quiz-main {
    max-width: min(760px, calc(100vw - 28px));
  }
  body.design-interface-form .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-form .quiz-hud {
    display: none !important;
  }
  body.design-interface-form #quiz-view,
  body.design-interface-form .node-frame {
    min-height: auto;
  }
  body.design-interface-form .node-title {
    font-family: var(--font-family);
    font-size: calc(clamp(1.8rem, 3.2vw, 3rem) * var(--heading-scale, 1));
    line-height: 1.08;
  }
  body.design-interface-exam .quiz-layout {
    grid-template-columns: minmax(0, 860px) minmax(220px, 280px);
    justify-content: center;
  }
  body.design-interface-exam #quiz-view {
    min-height: calc(100dvh - 168px);
    border-radius: 10px;
    box-shadow: 0 1px 0 rgba(15,23,42,0.08), 0 8px 24px rgba(15,23,42,0.06);
  }
  body.design-interface-exam .node-title {
    font-family: var(--font-family);
    font-size: calc(clamp(1.7rem, 3vw, 2.75rem) * var(--heading-scale, 1));
    line-height: 1.16;
  }
  body.design-interface-kiosk .quiz-shell {
    display: grid;
    place-items: center;
    padding: clamp(26px, 5vw, 72px);
  }
  body.design-interface-kiosk .quiz-main,
  body.design-interface-kiosk .quiz-layout,
  body.design-interface-kiosk .quiz-stage {
    width: 100%;
    max-width: none;
  }
  body.design-interface-kiosk .quiz-layout {
    display: block;
  }
  body.design-interface-kiosk .quiz-hud {
    display: none !important;
  }
  body.design-interface-kiosk #quiz-view {
    min-height: calc(100dvh - clamp(52px, 10vw, 144px));
    display: grid;
    place-items: center;
    padding: clamp(42px, 7vw, 110px);
    border: 0;
    border-radius: 42px;
  }
  body.design-interface-kiosk .node-frame {
    min-height: auto;
    width: min(1120px, 100%);
    text-align: center;
  }
  body.design-interface-kiosk .node-title {
    max-width: 100%;
    margin-inline: auto;
    font-size: calc(clamp(3.5rem, 8.5vw, 8.5rem) * var(--heading-scale, 1));
  }
  body.design-interface-kiosk .node-desc {
    margin-inline: auto;
    font-size: clamp(1.18rem, 2vw, 1.65rem);
  }
  body.design-interface-magazine .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-magazine .quiz-hud {
    display: none !important;
  }
  body.design-interface-magazine #quiz-view {
    min-height: calc(100dvh - 150px);
    padding: clamp(36px, 8vw, 118px) clamp(28px, 6vw, 86px);
    border: 0;
    border-radius: 0;
  }
  body.design-interface-magazine .node-title {
    max-width: min(780px, 86vw);
    font-size: calc(clamp(3.4rem, 9vw, 8.2rem) * var(--heading-scale, 1));
    line-height: 0.9;
  }
  body.design-interface-product .quiz-main {
    max-width: min(1260px, calc(100vw - 34px));
  }
  body.design-interface-product .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-product .quiz-hud {
    display: none !important;
  }
  body.design-interface-product .node-controls,
  body.design-interface-product .options-grid,
  body.design-interface-product .answers-grid {
    --answer-columns: 3;
  }
  body.design-interface-product .option,
  body.design-interface-product .answer-card {
    min-height: 128px;
    align-content: start;
    padding: 22px;
  }
  body.design-interface-minimal .quiz-main {
    max-width: min(720px, calc(100vw - 28px));
  }
  body.design-interface-minimal .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-minimal .quiz-hud,
  body.design-interface-minimal .quiz-stage::before,
  body.design-interface-minimal #quiz-view::before,
  body.design-interface-minimal #quiz-view::after {
    display: none !important;
  }
  body.design-interface-minimal #quiz-view {
    min-height: auto;
    border: 0;
    background: transparent;
    box-shadow: none;
    padding: 0;
  }
  body.design-interface-minimal .node-frame {
    min-height: auto;
  }
  body.design-interface-workshop .quiz-layout {
    grid-template-columns: minmax(0, 780px) minmax(220px, 290px);
    justify-content: center;
  }
  body.design-interface-report .quiz-main {
    max-width: min(1040px, calc(100vw - 34px));
  }
  body.design-interface-report .quiz-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  body.design-interface-report .quiz-hud {
    display: none !important;
  }
  body.design-interface-report #quiz-view {
    min-height: auto;
    border-radius: 18px;
  }
  body.design-interface-report .node-title {
    font-family: var(--font-family);
    font-size: calc(clamp(2rem, 4vw, 4rem) * var(--heading-scale, 1));
  }
  body.design-surface-solid #quiz-view,
  body.design-surface-solid .content-card {
    background: rgba(255, 254, 250, var(--surface-opacity));
    border: 1px solid rgba(39, 35, 28, 0.08);
    box-shadow: 0 10px 28px rgba(29, 26, 22, 0.07);
  }
  body.design-surface-paper #quiz-view,
  body.design-surface-paper .content-card {
    background: linear-gradient(135deg, rgba(255, 254, 250, var(--surface-opacity)), rgba(247, 244, 237, var(--surface-opacity)));
    border: 1px solid rgba(118, 109, 95, 0.16);
    box-shadow: 0 10px 26px rgba(66, 56, 44, 0.06);
  }
  body.design-surface-outline #quiz-view,
  body.design-surface-outline .content-card {
    background: rgba(255, 255, 255, calc(var(--surface-opacity) * 0.82));
    border: 1px solid rgba(28, 25, 23, 0.14);
    box-shadow: none;
  }
  body.design-surface-glass #quiz-view,
  body.design-surface-glass .content-card {
    background: rgba(255, 255, 255, calc(var(--surface-opacity) * 0.56));
    border: 1px solid rgba(255, 255, 255, 0.44);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(12px);
  }
  body.design-surface-minimal #quiz-view,
  body.design-surface-minimal .content-card {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
  body.design-density-compact #quiz-view { --card-padding: min(28px, var(--card-padding)); --answer-gap: min(10px, var(--answer-gap)); }
  body.design-density-relaxed #quiz-view { --answer-gap: max(16px, var(--answer-gap)); }
  ${chrome === "compact" ? ".quiz-topbar { max-width: min(var(--content-width), calc(100vw - 28px)) !important; border-radius: 999px !important; } .topbar-inner { padding: 9px 12px !important; }" : ""}
  ${hideTopbar ? ".quiz-topbar { display: none !important; } .quiz-shell { padding-top: 18px !important; }" : ""}
  ${hideBrand ? ".brand-lockup { display: none !important; } .topbar-inner { grid-template-columns: minmax(0, 1fr) auto !important; }" : ""}
  ${hideLogo ? "#header-logo { display: none !important; }" : ""}
  ${hideTitle ? "#header-title, .brand-kicker { display: none !important; }" : ""}
  ${hideProgress ? ".top-progress, .progress-ring-container { display: none !important; }" : ""}
  ${hideTimer ? ".timer-pill, #global-timer-container { display: none !important; }" : ""}
  ${hideDescription ? ".node-desc, #node-description, .node-description { display: none !important; }" : ""}
  ${hideMedia ? ".media-frame, .image-wrapper, .image-container, .node-image-container, #node-image-wrapper, .quiz-media-image, .node-image, .match-item-image { display: none !important; }" : ""}
  ${hideAchievements ? ".hud-achievements-panel, .quiz-hud .hud-panel:has(#achievements-list) { display: none !important; }" : ""}
  ${hideVariables ? "#hud-variables-container { display: none !important; }" : ""}
  ${hideStats ? ".hud-stats-panel, .quiz-hud .hud-panel:has(.hud-stats) { display: none !important; }" : ""}
  ${hideHud ? ".quiz-hud { display: none !important; } .quiz-layout { grid-template-columns: minmax(0, 1fr) !important; }" : ""}
  ${hideResultStats ? ".result-summary, .result-stat { display: none !important; }" : ""}
  ${progress.showStepLabel === false ? ".progress-label, .step-label, .top-progress-label { display: none !important; }" : ""}
  ${progressBottom ? ".top-progress { top: auto !important; bottom: 16px !important; }" : ""}
  ${reducedMotion ? "*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }" : ""}
  ${highContrast ? "body { filter: contrast(1.08); }" : ""}
  ${customCss}
</style>`;
}

export function injectDesignCss(html: string, designSettings: unknown): string {
  return injectBeforeHeadClose(html, buildDesignCss(designSettings));
}

import type { DesignSettings } from "./types";
import { safeCssUrl } from "./sanitize";

function setVar(root: HTMLElement, name: string, value: string | number | undefined): void {
  if (value === undefined || value === null || value === "") return;
  root.style.setProperty(name, String(value));
}

function setRadius(root: HTMLElement, name: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  root.style.setProperty(name, `${Math.max(0, value)}px`);
}

function setPx(root: HTMLElement, name: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  root.style.setProperty(name, `${Math.max(0, value)}px`);
}

function clampOpacity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function sanitizeCustomCss(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<\/style/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, 12000);
}

function safeCss(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/[<>{}]/g, "").slice(0, 180);
}

function splitTalksBrandName(value: string): readonly [string, string] {
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!normalized) return ["РАЗГОВОРЫ", "О ВАЖНОМ"];

  const importantSuffix = normalized.toLocaleLowerCase("ru-RU").lastIndexOf(" о важном");
  if (importantSuffix > 0) {
    return [
      normalized.slice(0, importantSuffix).toLocaleUpperCase("ru-RU"),
      normalized.slice(importantSuffix + 1).toLocaleUpperCase("ru-RU"),
    ];
  }

  const words = normalized.split(" ");
  if (words.length === 1) return [normalized.toLocaleUpperCase("ru-RU"), ""];
  const splitAt = Math.ceil(words.length / 2);
  return [
    words.slice(0, splitAt).join(" ").toLocaleUpperCase("ru-RU"),
    words.slice(splitAt).join(" ").toLocaleUpperCase("ru-RU"),
  ];
}

export function applyDesign(ds: DesignSettings | undefined): void {
  if (!ds) return;
  const root = document.documentElement;

  if (!document.getElementById("quiz-dynamic-styles")) {
    const style = document.createElement("style");
    style.id = "quiz-dynamic-styles";
    style.textContent = `
      .locked-controls {
        pointer-events: none;
        filter: saturate(0.7);
        transition: opacity 220ms ease, filter 220ms ease;
      }
      .video-lock-overlay {
        position: absolute;
        inset: 0;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        border: 1px solid var(--border);
        border-radius: var(--answer-radius, 18px);
        background: rgba(255, 254, 250, 0.88);
        color: var(--heading-color);
        text-align: center;
        padding: 18px;
        pointer-events: auto;
        backdrop-filter: blur(12px);
      }
      .manual-unlock-btn {
        min-height: 42px;
        border: 0;
        border-radius: 999px;
        background: var(--btn-bg);
        color: var(--btn-text);
        padding: 0 16px;
        cursor: pointer;
        font-weight: 800;
      }
      .manual-unlock-btn:hover {
        background: var(--btn-hover-bg);
        color: var(--btn-hover-text);
      }
      body.design-layout-compact .quiz-shell { padding: 10px; }
      body.design-layout-focus .top-progress { max-width: min(620px, calc(100vw - 28px)); }
      body.design-layout-editorial .quiz-content { align-items: flex-start; }
      body.design-layout-editorial .content-card { max-width: min(var(--content-width, 920px), calc(100vw - 36px)); }
      body.design-layout-split .content-card { max-width: min(var(--content-width, 1040px), calc(100vw - 36px)); }
      body.design-align-center #quiz-view,
      body.design-align-center .content-card,
      body.design-align-center .node-frame { text-align: center; }
      body.design-valign-top .quiz-content { align-items: flex-start; }
      body.design-valign-center .quiz-content { align-items: center; }
      body.design-surface-solid #quiz-view,
      body.design-surface-solid .content-card {
        background: rgba(255, 254, 250, var(--surface-opacity, 0.94));
        border: 1px solid rgba(39, 35, 28, 0.08);
        box-shadow: 0 10px 28px rgba(29, 26, 22, 0.07);
      }
      body.design-surface-paper #quiz-view,
      body.design-surface-paper .content-card {
        background: linear-gradient(135deg, rgba(255, 254, 250, var(--surface-opacity, 0.94)), rgba(247, 244, 237, var(--surface-opacity, 0.94)));
        border: 1px solid rgba(118, 109, 95, 0.16);
        box-shadow: 0 10px 26px rgba(66, 56, 44, 0.06);
      }
      body.design-surface-outline #quiz-view,
      body.design-surface-outline .content-card {
        background: rgba(255, 255, 255, calc(var(--surface-opacity, 0.94) * 0.82));
        border: 1px solid rgba(28, 25, 23, 0.14);
        box-shadow: none;
      }
      body.design-surface-glass #quiz-view,
      body.design-surface-glass .content-card {
        background: rgba(255, 255, 255, calc(var(--surface-opacity, 0.94) * 0.56));
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
      body.design-density-compact #quiz-view { --card-padding: min(28px, var(--card-padding, 32px)); --answer-gap: min(10px, var(--answer-gap, 12px)); }
      body.design-density-relaxed #quiz-view { --answer-gap: max(16px, var(--answer-gap, 12px)); }
      body.design-texture-none::after { display: none; }
      body.design-texture-grain::after {
        background-image: radial-gradient(rgba(29, 26, 22, 0.12) 0.7px, transparent 0.7px);
        background-size: 5px 5px;
        opacity: 0.08;
      }
      body.design-texture-grid::after {
        background-image:
          linear-gradient(rgba(29, 26, 22, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(29, 26, 22, 0.06) 1px, transparent 1px);
        background-size: 28px 28px;
        opacity: 0.16;
      }
      body.design-texture-paper::after {
        background-image:
          radial-gradient(circle at 12% 18%, rgba(29, 26, 22, 0.055), transparent 18%),
          radial-gradient(circle at 78% 62%, rgba(185, 133, 43, 0.05), transparent 20%),
          repeating-linear-gradient(0deg, rgba(29, 26, 22, 0.018) 0 1px, transparent 1px 6px);
        opacity: 0.22;
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
      body.design-interface-form #quiz-view {
        min-height: auto;
        padding: clamp(24px, 4vw, 42px);
      }
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
        box-shadow: 0 1px 0 rgba(15,23,42,0.08), 0 20px 60px rgba(15,23,42,0.08);
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
      body.design-interface-magazine #quiz-view::before {
        inset: 22px;
        border-color: rgba(29,26,22,0.16);
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
      body.design-interface-product .node-title {
        max-width: 920px;
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
      body.design-interface-workshop .hud-panel {
        border-radius: 18px;
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
      body.design-chrome-compact .quiz-topbar {
        max-width: min(var(--content-width, 920px), calc(100vw - 28px));
        border-radius: 999px;
      }
      body.design-chrome-compact .topbar-inner { padding: 9px 12px; }
      body.design-chrome-none .quiz-topbar,
      body.design-hide-topbar .quiz-topbar { display: none !important; }
      body.design-hide-background-decor::after { display: none !important; }
      body.design-hide-brand .brand-lockup { display: none !important; }
      body.design-hide-brand .topbar-inner { grid-template-columns: minmax(0, 1fr) auto !important; }
      body.design-hide-logo #header-logo { display: none !important; }
      body.design-hide-title #header-title,
      body.design-hide-title .brand-kicker { display: none !important; }
      body.design-hide-progress .top-progress,
      body.design-hide-progress .progress-ring-container { display: none !important; }
      body.design-hide-timer .timer-pill,
      body.design-hide-timer #global-timer-container { display: none !important; }
      body.design-hide-description .node-desc,
      body.design-hide-description #node-description,
      body.design-hide-description .node-description { display: none !important; }
      body.design-hide-media .media-frame,
      body.design-hide-media .image-wrapper,
      body.design-hide-media .image-container,
      body.design-hide-media .node-image-container,
      body.design-hide-media #node-image-wrapper,
      body.design-hide-media .quiz-media-image,
      body.design-hide-media .node-image,
      body.design-hide-media .match-item-image { display: none !important; }
      body.design-hide-result-stats .result-summary,
      body.design-hide-result-stats .result-stat { display: none !important; }
      body.design-hide-achievements .hud-achievements-panel,
      body.design-hide-achievements .quiz-hud .hud-panel:has(#achievements-list) { display: none !important; }
      body.design-hide-variables #hud-variables-container { display: none !important; }
      body.design-hide-stats .hud-stats-panel,
      body.design-hide-stats .quiz-hud .hud-panel:has(.hud-stats) { display: none !important; }
      body.design-hide-achievements.design-hide-variables.design-hide-stats .quiz-hud { display: none !important; }
      body.design-media-left .node-frame:has(.media-frame),
      body.design-media-right .node-frame:has(.media-frame) {
        display: grid;
        grid-template-columns: minmax(180px, var(--question-media-width, 42%)) minmax(0, 1fr);
        column-gap: clamp(20px, 4vw, 48px);
        align-items: center;
      }
      body.design-media-right .node-frame:has(.media-frame) {
        grid-template-columns: minmax(0, 1fr) minmax(180px, var(--question-media-width, 42%));
      }
      body.design-media-left .node-frame:has(.media-frame) > :not(.media-frame) {
        grid-column: 2;
      }
      body.design-media-right .node-frame:has(.media-frame) > :not(.media-frame) {
        grid-column: 1;
      }
      body.design-media-left .media-frame {
        grid-column: 1;
        grid-row: 1 / span 3;
      }
      body.design-media-right .media-frame {
        grid-column: 2;
        grid-row: 1 / span 3;
      }
      body.design-media-background .media-frame {
        position: absolute;
        inset: 0;
        z-index: -1;
        margin: 0;
        border-radius: inherit;
        opacity: 0.26;
        filter: saturate(0.88);
      }
      body.design-media-background .media-frame img,
      body.design-media-background .media-frame iframe {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      body {
        font-family: var(--font-family) !important;
        color: var(--body-text-color);
        font-size: calc(16px * var(--body-scale, 1));
        font-weight: var(--body-weight, 450);
        line-height: var(--body-line-height, 1.55);
        letter-spacing: var(--letter-spacing, 0px);
        background-color: var(--bg-color) !important;
        background-image: var(--bg-image) !important;
        background-size: var(--bg-size, cover) !important;
        background-position: center !important;
      }
      .node-title, h1, h2, h3 {
        color: var(--heading-color);
        font-family: var(--display-family);
        font-weight: var(--heading-weight, 650);
        line-height: var(--heading-line-height, 1.04);
      }
      .node-desc, p, .option-copy { max-width: var(--paragraph-width, 680px); }
      #quiz-view {
        max-width: min(var(--content-width, 920px), calc(100vw - 28px));
        padding: var(--card-padding, 32px);
        border-color: var(--question-card-border, var(--answer-border));
        border-radius: var(--question-card-radius, var(--card-radius, 28px));
        background: var(--question-card-bg, transparent);
        color: var(--question-card-text, inherit);
      }
      .node-frame {
        position: relative;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        box-shadow: none;
      }
      body.design-question-shadow-none #quiz-view { box-shadow: none !important; }
      body.design-question-shadow-soft #quiz-view { box-shadow: 0 8px 22px rgba(29, 26, 22, 0.06); }
      body.design-question-shadow-strong #quiz-view { box-shadow: 0 14px 36px rgba(29, 26, 22, 0.10); }
      .media-frame {
        border-radius: var(--question-media-radius, 22px);
        overflow: hidden;
      }
      .media-frame img,
      .media-frame iframe,
      .quiz-media-image {
        object-fit: var(--question-media-fit, cover);
      }
      .btn, .action-btn, button[type="submit"] {
        min-height: var(--btn-height, 54px);
        width: var(--btn-display-width, auto);
        border-radius: var(--btn-radius, 18px);
        background: var(--btn-bg);
        color: var(--btn-text);
        font-weight: var(--btn-weight, 800);
        text-transform: var(--btn-text-transform, none);
      }
      body.design-button-outline .btn,
      body.design-button-outline .action-btn {
        border: 1px solid var(--btn-bg);
        background: transparent;
        color: var(--btn-bg);
        box-shadow: none;
      }
      body.design-button-ghost .btn,
      body.design-button-ghost .action-btn {
        border: 0;
        background: transparent;
        color: var(--btn-bg);
        box-shadow: none;
      }
      body.design-button-soft .btn,
      body.design-button-soft .action-btn {
        background: color-mix(in srgb, var(--btn-bg) 14%, white);
        color: var(--btn-bg);
        box-shadow: none;
      }
      body.design-button-premium .btn,
      body.design-button-premium .action-btn {
        background: linear-gradient(135deg, var(--btn-bg), var(--brand-accent, var(--btn-hover-bg)));
        box-shadow: 0 18px 42px rgba(29, 26, 22, 0.18), inset 0 1px 0 rgba(255,255,255,0.28);
      }
      .option, .answer-card, .match-item {
        border-color: var(--answer-border);
        border-radius: var(--answer-radius, 18px);
        background: var(--card-bg);
        color: var(--card-text);
        min-height: var(--answer-min-height, 58px);
      }
      body.design-answer-list .option {
        border-inline: 0;
        border-top: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: inset 0 -1px 0 var(--answer-border);
      }
      body.design-answer-tiles .node-controls,
      body.design-answer-tiles .options-grid,
      body.design-answer-tiles .answers-grid {
        grid-template-columns: repeat(var(--answer-columns, 2), minmax(0, 1fr));
      }
      body.design-answer-tiles .option {
        min-height: max(var(--answer-min-height, 58px), 112px);
        align-content: start;
        padding: 22px;
      }
      body.design-answer-minimal .option {
        border-color: transparent;
        background: transparent;
        box-shadow: none;
      }
      body.design-answer-minimal .option:hover,
      body.design-answer-minimal .option.selected {
        background: color-mix(in srgb, var(--card-selected-bg) 62%, transparent);
      }
      .option-no-marker {
        grid-template-columns: minmax(0, 1fr);
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
      .node-controls { gap: var(--answer-gap, 12px); }
      .options-grid, .answers-grid { grid-template-columns: repeat(var(--answer-columns, 1), minmax(0, 1fr)); }
      .option img, .answer-card img { aspect-ratio: var(--answer-media-ratio, auto); object-fit: cover; }
      .top-progress-track, .progress-track { height: var(--progress-height, 8px); }
      body.design-progress-steps .top-progress-track {
        background:
          repeating-linear-gradient(90deg, var(--progress-color) 0 16px, transparent 16px 22px),
          var(--progress-track);
      }
      body.design-progress-ring .top-progress {
        display: none !important;
      }
      body.design-progress-no-percent .top-progress span,
      body.design-progress-no-percent .progress-ring-text {
        display: none !important;
      }
      body.design-progress-hidden .top-progress,
      body.design-progress-hidden .progress-ring-container { display: none !important; }
      body.design-progress-bottom .top-progress { top: auto; bottom: 16px; }
      body.design-progress-no-step-label .progress-label,
      body.design-progress-no-step-label .step-label,
      body.design-progress-no-step-label .top-progress-label { display: none !important; }
      body.design-reduced-motion *, body.design-reduced-motion *::before, body.design-reduced-motion *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.001ms !important;
      }
      .result-summary {
        background: var(--result-bg, transparent);
        color: var(--result-text, inherit);
      }
      .result-preset-certificate {
        padding: clamp(24px, 5vw, 56px);
        border: 2px solid var(--result-accent, var(--accent));
        border-radius: 2px;
        background:
          linear-gradient(135deg, rgba(255,255,255,0.72), transparent),
          var(--result-bg, var(--card-bg));
      }
      .result-preset-report {
        grid-template-columns: 1fr;
        padding: 20px;
        border-left: 6px solid var(--result-accent, var(--accent));
      }
      .result-preset-landing {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: 24px;
        border-radius: calc(var(--card-radius, 28px) * 0.8);
        background: linear-gradient(135deg, var(--result-accent, var(--accent)), var(--brand-neutral, #171717));
      }
      .result-preset-landing .result-stat,
      .result-preset-landing .result-stat-label,
      .result-preset-landing .result-stat-value {
        color: white;
      }
      .result-score-ring .result-stat:first-child {
        aspect-ratio: 1;
        border-radius: 999px;
        display: grid;
        place-items: center;
        border-width: 8px;
        border-color: var(--result-accent, var(--accent));
      }
      .result-score-stat .result-stat-value {
        font-size: clamp(2.4rem, 6vw, 5rem);
      }
    `;
    document.head.appendChild(style);
  }

  document.body.classList.remove(
    "design-layout-classic",
    "design-layout-split",
    "design-layout-focus",
    "design-layout-editorial",
    "design-layout-compact",
    "design-layout-conversational",
    "design-layout-calculator",
    "design-layout-assessment",
    "design-interface-studio",
    "design-interface-immersive",
    "design-interface-form",
    "design-interface-exam",
    "design-interface-kiosk",
    "design-interface-magazine",
    "design-interface-product",
    "design-interface-minimal",
    "design-interface-workshop",
    "design-interface-report",
    "design-surface-solid",
    "design-surface-paper",
    "design-surface-outline",
    "design-surface-glass",
    "design-surface-minimal",
    "design-align-left",
    "design-align-center",
    "design-valign-top",
    "design-valign-center",
    "design-density-compact",
    "design-density-balanced",
    "design-density-relaxed",
    "design-chrome-full",
    "design-chrome-compact",
    "design-chrome-none",
    "design-hide-topbar",
    "design-hide-brand",
    "design-hide-logo",
    "design-hide-title",
    "design-hide-progress",
    "design-hide-timer",
    "design-hide-description",
    "design-hide-media",
    "design-hide-achievements",
    "design-hide-variables",
    "design-hide-stats",
    "design-hide-result-stats",
    "design-hide-background-decor",
    "design-progress-hidden",
    "design-progress-bottom",
    "design-progress-no-step-label",
    "design-progress-no-percent",
    "design-progress-bar",
    "design-progress-steps",
    "design-progress-ring",
    "design-button-solid",
    "design-button-outline",
    "design-button-ghost",
    "design-button-soft",
    "design-button-premium",
    "design-answer-card",
    "design-answer-list",
    "design-answer-tiles",
    "design-answer-minimal",
    "design-marker-none",
    "design-marker-letters",
    "design-marker-numbers",
    "design-media-top",
    "design-media-left",
    "design-media-right",
    "design-media-background",
    "design-texture-none",
    "design-texture-grain",
    "design-texture-grid",
    "design-texture-paper",
    "design-result-card",
    "design-result-certificate",
    "design-result-report",
    "design-result-landing",
    "design-question-shadow-none",
    "design-question-shadow-soft",
    "design-question-shadow-strong",
    "design-reduced-motion",
    "design-high-contrast",
  );
  document.body.classList.add(`design-layout-${ds.layout?.preset || "classic"}`);
  document.body.classList.add(`design-interface-${ds.layout?.interfacePreset || "studio"}`);
  document.body.classList.add(`design-surface-${ds.layout?.surfaceStyle || "paper"}`);
  document.body.classList.add(`design-align-${ds.layout?.questionAlign || "left"}`);
  document.body.classList.add(`design-valign-${ds.layout?.verticalAlign || "center"}`);
  document.body.classList.add(`design-density-${ds.layout?.density || "balanced"}`);
  document.body.classList.add(`design-chrome-${ds.layout?.chrome || "full"}`);
  document.body.classList.add(`design-button-${ds.buttons?.style || "solid"}`);
  document.body.classList.add(`design-answer-${ds.answerCards?.style || "card"}`);
  document.body.classList.add(`design-marker-${ds.answerCards?.markerStyle || "letters"}`);
  document.body.classList.add(`design-media-${ds.questionCard?.mediaPosition || ds.layout?.mediaPosition || "top"}`);
  document.body.classList.add(`design-texture-${ds.background?.texture || "none"}`);
  document.body.classList.add(`design-progress-${ds.progress?.style || "bar"}`);
  document.body.classList.add(`design-result-${ds.result?.preset || "card"}`);
  document.body.classList.add(`design-question-shadow-${ds.questionCard?.shadow || "soft"}`);
  const blocks = ds.layout?.blocks || {};
  const isVisible = (key: keyof NonNullable<NonNullable<DesignSettings["layout"]>["blocks"]>, fallback = true) => blocks[key] ?? fallback;
  if (!isVisible("topbar") || ds.layout?.chrome === "none") document.body.classList.add("design-hide-topbar");
  if (!isVisible("brand")) document.body.classList.add("design-hide-brand");
  if (!isVisible("logo")) document.body.classList.add("design-hide-logo");
  if (!isVisible("title")) document.body.classList.add("design-hide-title");
  if (!isVisible("progress")) document.body.classList.add("design-hide-progress");
  if (!isVisible("timer")) document.body.classList.add("design-hide-timer");
  if (!isVisible("description")) document.body.classList.add("design-hide-description");
  if (!isVisible("media")) document.body.classList.add("design-hide-media");
  if (!isVisible("achievements")) document.body.classList.add("design-hide-achievements");
  if (!isVisible("variables")) document.body.classList.add("design-hide-variables");
  if (!isVisible("stats")) document.body.classList.add("design-hide-stats");
  if (!isVisible("resultStats")) document.body.classList.add("design-hide-result-stats");
  if (!isVisible("backgroundDecor")) document.body.classList.add("design-hide-background-decor");
  if (ds.progress?.style === "hidden") document.body.classList.add("design-progress-hidden");
  if (ds.progress?.position === "bottom") document.body.classList.add("design-progress-bottom");
  if (ds.progress?.showStepLabel === false) document.body.classList.add("design-progress-no-step-label");
  if (ds.progress?.showPercent === false) document.body.classList.add("design-progress-no-percent");
  if (ds.advanced?.reducedMotion) document.body.classList.add("design-reduced-motion");
  if (ds.advanced?.highContrast) document.body.classList.add("design-high-contrast");

  setVar(root, "--brand-primary", ds.brand?.primaryColor);
  setVar(root, "--brand-accent", ds.brand?.accentColor);
  setVar(root, "--brand-neutral", ds.brand?.neutralColor);

  setVar(root, "--bg-color", ds.background?.color);
  if (ds.background?.imageUrl) {
    const safe = safeCssUrl(ds.background.imageUrl);
    root.style.setProperty("--bg-image", safe ? `url("${safe}")` : "none");
  } else {
    root.style.setProperty("--bg-image", "none");
  }
  if (ds.background?.mode === "gradient") {
    root.style.setProperty(
      "--bg-image",
      `linear-gradient(135deg, ${ds.background.gradientFrom || ds.background.color || "#f6f3ee"}, ${ds.background.gradientTo || "#ebe5db"})`,
    );
  }
  setVar(root, "--bg-size", ds.background?.imageFit === "repeat" ? "320px" : ds.background?.imageFit || "cover");
  document.body.style.backgroundRepeat = ds.background?.imageFit === "repeat" ? "repeat" : "no-repeat";
  setVar(root, "--overlay-color", ds.background?.overlayColor);
  const overlayOpacity = clampOpacity(ds.background?.overlayOpacity);
  if (overlayOpacity !== null) setVar(root, "--overlay-opacity", overlayOpacity);

  setVar(root, "--font-family", ds.typography?.fontFamily);
  setVar(root, "--display-family", ds.typography?.displayFontFamily);
  setVar(root, "--heading-color", ds.typography?.headingColor);
  setVar(root, "--body-text-color", ds.typography?.bodyTextColor);
  setVar(root, "--heading-weight", ds.typography?.headingWeight);
  setVar(root, "--body-weight", ds.typography?.bodyWeight);
  setVar(root, "--heading-scale", ds.typography?.headingScale);
  setVar(root, "--body-scale", ds.typography?.bodyScale);
  setVar(root, "--body-line-height", ds.typography?.lineHeight);
  setVar(root, "--heading-line-height", ds.typography?.headingLineHeight);
  setPx(root, "--paragraph-width", ds.typography?.paragraphWidth);
  setVar(root, "--letter-spacing", `${ds.typography?.letterSpacing ?? 0}px`);

  setPx(root, "--content-width", ds.layout?.contentWidth);
  setRadius(root, "--card-radius", ds.layout?.cardRadius);
  setPx(root, "--card-padding", ds.layout?.cardPadding);
  setVar(root, "--surface-opacity", ds.layout?.cardOpacity);
  setVar(root, "--question-card-bg", ds.questionCard?.backgroundColor);
  setVar(root, "--question-card-border", ds.questionCard?.borderColor);
  setVar(root, "--question-card-text", ds.questionCard?.textColor);
  setRadius(root, "--question-card-radius", ds.questionCard?.radius);
  setPx(root, "--question-card-padding", ds.questionCard?.padding);
  setVar(root, "--question-media-width", `${ds.questionCard?.mediaWidth ?? 42}%`);
  setRadius(root, "--question-media-radius", ds.questionCard?.mediaRadius);
  setVar(root, "--question-media-fit", ds.questionCard?.mediaFit || "cover");

  setVar(root, "--btn-bg", ds.buttons?.backgroundColor);
  setVar(root, "--accent", ds.buttons?.backgroundColor);
  setVar(root, "--btn-text", ds.buttons?.textColor);
  setVar(root, "--btn-hover-bg", ds.buttons?.hoverBackgroundColor);
  setVar(root, "--accent-hover", ds.buttons?.hoverBackgroundColor);
  setVar(root, "--btn-hover-text", ds.buttons?.hoverTextColor);
  setRadius(root, "--btn-radius", ds.buttons?.borderRadius);
  setPx(root, "--btn-height", ds.buttons?.height);
  setVar(root, "--btn-weight", ds.buttons?.fontWeight);
  setVar(root, "--btn-display-width", ds.buttons?.width === "full" ? "100%" : "auto");
  setVar(root, "--btn-text-transform", ds.buttons?.textTransform || "none");

  setVar(root, "--card-bg", ds.answerCards?.backgroundColor);
  setVar(root, "--card-text", ds.answerCards?.textColor);
  setVar(root, "--card-hover-bg", ds.answerCards?.hoverBackgroundColor);
  setVar(root, "--card-hover-text", ds.answerCards?.hoverTextColor);
  setVar(root, "--card-selected-bg", ds.answerCards?.selectedBackgroundColor);
  setVar(root, "--card-selected-text", ds.answerCards?.selectedTextColor);
  setVar(root, "--answer-border", ds.answerCards?.borderColor);
  setVar(root, "--answer-selected-border", ds.answerCards?.selectedBorderColor);
  setPx(root, "--answer-gap", ds.answerCards?.spacing);
  setRadius(root, "--answer-radius", ds.answerCards?.borderRadius);
  setVar(root, "--answer-columns", ds.answerCards?.columns || 1);
  setPx(root, "--answer-min-height", ds.answerCards?.minHeight);
  const mediaAspectRatio = ds.answerCards?.mediaAspectRatio;
  setVar(root, "--answer-media-ratio", mediaAspectRatio === "16/9" ? "16 / 9" : mediaAspectRatio === "4/3" ? "4 / 3" : mediaAspectRatio === "1/1" ? "1 / 1" : "auto");

  setVar(root, "--progress-color", ds.progress?.color);
  setVar(root, "--progress-track", ds.progress?.trackColor);
  setPx(root, "--progress-height", ds.progress?.height);

  setVar(root, "--result-bg", ds.result?.backgroundColor);
  setVar(root, "--result-text", ds.result?.textColor);
  setVar(root, "--result-accent", ds.result?.accentColor);

  const logo = document.getElementById("header-logo");
  if (logo instanceof HTMLElement) {
    const logoUrl = ds.brand?.logoUrl;
    if (logoUrl) {
      logo.textContent = "";
      logo.style.backgroundImage = `url("${safeCss(logoUrl)}")`;
      logo.style.backgroundSize = "cover";
      logo.style.backgroundPosition = "center";
    } else if (logo.dataset.logoMark === "talks") {
      logo.textContent = "";
      logo.style.backgroundImage = "";
    } else if (ds.brand?.brandName) {
      logo.textContent = ds.brand.brandName.trim().slice(0, 2).toUpperCase();
      logo.style.backgroundImage = "";
    }
  }

  const talksBrandPrimary = document.getElementById("talks-brand-primary");
  const talksBrandSecondary = document.getElementById("talks-brand-secondary");
  if (
    talksBrandPrimary instanceof HTMLElement
    && talksBrandSecondary instanceof HTMLElement
    && ds.brand?.brandName
  ) {
    const [primary, secondary] = splitTalksBrandName(ds.brand.brandName);
    talksBrandPrimary.textContent = primary;
    talksBrandSecondary.textContent = secondary;
  }

  const avatarImage = document.getElementById("hud-avatar-image");
  const avatarFallback = document.getElementById("hud-avatar-fallback");
  const avatarUrl = safeCssUrl(ds.brand?.avatarUrl ?? "");
  if (avatarImage instanceof HTMLImageElement) {
    if (avatarUrl) {
      avatarImage.src = avatarUrl;
      avatarImage.classList.remove("hidden");
      avatarFallback?.classList.add("hidden");
    } else {
      avatarImage.removeAttribute("src");
      avatarImage.classList.add("hidden");
      avatarFallback?.classList.remove("hidden");
    }
  }

  const scoreLabel = document.getElementById("hud-score-label");
  if (scoreLabel && ds.brand?.scoreLabel) {
    scoreLabel.textContent = ds.brand.scoreLabel.trim().slice(0, 48);
  }

  let customStyle = document.getElementById("quiz-custom-design-css") as HTMLStyleElement | null;
  const customCss = sanitizeCustomCss(ds.advanced?.customCss);
  if (customCss) {
    if (!customStyle) {
      customStyle = document.createElement("style");
      customStyle.id = "quiz-custom-design-css";
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = customCss;
  } else if (customStyle) {
    customStyle.remove();
  }
}

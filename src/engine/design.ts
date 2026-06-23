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

function clampOpacity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
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
    `;
    document.head.appendChild(style);
  }

  setVar(root, "--bg-color", ds.background?.color);
  if (ds.background?.imageUrl) {
    const safe = safeCssUrl(ds.background.imageUrl);
    root.style.setProperty("--bg-image", safe ? `url("${safe}")` : "none");
  } else {
    root.style.setProperty("--bg-image", "none");
  }
  setVar(root, "--overlay-color", ds.background?.overlayColor);
  const overlayOpacity = clampOpacity(ds.background?.overlayOpacity);
  if (overlayOpacity !== null) setVar(root, "--overlay-opacity", overlayOpacity);

  setVar(root, "--font-family", ds.typography?.fontFamily);
  setVar(root, "--heading-color", ds.typography?.headingColor);
  setVar(root, "--body-text-color", ds.typography?.bodyTextColor);

  setVar(root, "--btn-bg", ds.buttons?.backgroundColor);
  setVar(root, "--accent", ds.buttons?.backgroundColor);
  setVar(root, "--btn-text", ds.buttons?.textColor);
  setVar(root, "--btn-hover-bg", ds.buttons?.hoverBackgroundColor);
  setVar(root, "--accent-hover", ds.buttons?.hoverBackgroundColor);
  setVar(root, "--btn-hover-text", ds.buttons?.hoverTextColor);
  setRadius(root, "--btn-radius", ds.buttons?.borderRadius);

  setVar(root, "--card-bg", ds.answerCards?.backgroundColor);
  setVar(root, "--card-text", ds.answerCards?.textColor);
  setVar(root, "--card-hover-bg", ds.answerCards?.hoverBackgroundColor);
  setVar(root, "--card-hover-text", ds.answerCards?.hoverTextColor);
  setVar(root, "--card-selected-bg", ds.answerCards?.selectedBackgroundColor);
  setVar(root, "--card-selected-text", ds.answerCards?.selectedTextColor);
  setRadius(root, "--answer-radius", ds.answerCards?.borderRadius);
}

// services/hud.ts
import { getState } from "./state";

export function updateHUD(): void {
  const state = getState();
  const el = document.getElementById("hud-score");
  if (!el) return;

  const current = parseInt(el.textContent ?? "0", 10) || 0;
  if (current === state.score) return;

  animateValue(el, current, state.score, 500);
}

function animateValue(
  el: HTMLElement,
  start: number,
  end: number,
  durationMs: number,
): void {
  if (start === end) return;
  const t0 = performance.now();

  function step(now: number): void {
    const progress = Math.min((now - t0) / durationMs, 1);
    el.textContent = String(Math.round(start + (end - start) * progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
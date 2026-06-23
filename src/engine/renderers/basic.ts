import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { getState } from "../state";
import { parseText, sanitizeAssetUrl } from "../sanitize";
import { saveResults } from "../persistence";

export const renderDialogue: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  const card = document.createElement("div");
  card.className = "dialogue-card";

  const avatarUrl = sanitizeAssetUrl(data.characterAvatar);
  if (avatarUrl) {
    const avatar = document.createElement("img");
    avatar.src = avatarUrl;
    avatar.alt = data.characterName ?? "";
    avatar.className = "dialogue-avatar";
    avatar.loading = "lazy";
    card.appendChild(avatar);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "dialogue-avatar-fallback";
    fallback.textContent = String(data.characterName ?? "П").trim().charAt(0).toUpperCase() || "П";
    card.appendChild(fallback);
  }

  const body = document.createElement("div");
  const meta = document.createElement("div");
  const name = document.createElement("div");
  meta.className = "dialogue-meta";
  name.className = "dialogue-name";
  name.textContent = data.characterName ?? "Персонаж";
  meta.appendChild(name);

  if (data.characterRole) {
    const role = document.createElement("div");
    role.className = "dialogue-role";
    role.textContent = data.characterRole;
    meta.appendChild(role);
  }

  const text = document.createElement("div");
  text.className = "dialogue-text md-content";
  text.innerHTML = parseText(data.dialogueText ?? "");
  body.append(meta, text);
  card.appendChild(body);

  controls.appendChild(card);
  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    context.continueFrom(node, null);
  }));
};

export const renderTimer: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  let seconds = Math.max(0, Number(data.duration ?? 0));
  let finished = false;

  const display = document.createElement("div");
  display.className = "timer-display";
  const value = document.createElement("div");
  value.className = "timer-value";
  value.textContent = String(seconds);
  const label = document.createElement("div");
  label.className = "timer-label";
  label.textContent = "секунд осталось";
  display.append(value, label);
  controls.appendChild(display);

  const timer = setInterval(() => {
    seconds -= 1;
    value.textContent = String(Math.max(0, seconds));
    if (seconds > 0) return;
    clearInterval(timer);
    if (finished) return;
    finished = true;
    if (data.onTimeoutNodeId) {
      context.navigateTo(data.onTimeoutNodeId);
    } else if (!context.continueFrom(node, "timeout")) {
      context.continueFrom(node, null);
    }
  }, 1000);

  if (data.action !== "wait") {
    controls.appendChild(createActionButton(data.buttonText ?? "Продолжить", () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      context.continueFrom(node, null);
    }));
  }
};

export const renderResult: NodeRenderer = (node, controls) => {
  const state = getState();
  saveResults((node.data.title as string | undefined) ?? "Финиш");

  const summary = document.createElement("div");
  summary.className = "result-summary";

  const score = createResultStat("Очки", String(state.score));
  const steps = createResultStat("Экранов", String(state.path.length));
  summary.append(score, steps);

  controls.appendChild(summary);
  controls.appendChild(createActionButton("Начать заново", () => location.reload()));
};

export const renderInfo: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    context.continueFrom(node, null);
  }));
};

export const renderFeedback: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  if (data.explanation) {
    const bubble = document.createElement("div");
    bubble.className = "feedback-bubble md-content";
    bubble.innerHTML = parseText(data.explanation);
    controls.appendChild(bubble);
  }

  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    context.continueFrom(node, null);
  }));
};

export const renderDefault: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    context.continueFrom(node, null);
  }));
};

function createResultStat(label: string, value: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "result-stat";

  const labelEl = document.createElement("div");
  labelEl.className = "result-stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "result-stat-value";
  valueEl.textContent = value;

  card.append(labelEl, valueEl);
  return card;
}

import type { QuizNode } from "./types";
import type { RendererContext } from "./renderers/types";

export type ImportantTalksOutcome = "correct" | "incorrect" | "timeout";

interface ImportantTalksInteractionData {
  timer?: unknown;
  importantTalks?: {
    correctTitle?: string;
    correctText?: string;
    incorrectTitle?: string;
    incorrectText?: string;
    timeoutTitle?: string;
    timeoutText?: string;
    feedbackButtonText?: string;
  };
}

export interface ImportantTalksCompletion {
  outcome: ImportantTalksOutcome;
  handles: Array<string | null>;
  soundOverride?: string;
}

export interface ImportantTalksInteractionController {
  complete(completion: ImportantTalksCompletion): void;
  dispose(): void;
}

let disposeActiveInteraction: (() => void) | null = null;

export function disposeActiveImportantTalksInteraction(): void {
  disposeActiveInteraction?.();
  disposeActiveInteraction = null;
}

export function setupImportantTalksInteraction(
  node: QuizNode,
  controls: HTMLElement,
  context: RendererContext,
): ImportantTalksInteractionController | null {
  if (!document.body.classList.contains("important-talks-theme")) return null;

  disposeActiveImportantTalksInteraction();

  const data = node.data as ImportantTalksInteractionData;
  const container = controls.parentElement;
  if (!(container instanceof HTMLElement)) return null;

  let settled = false;
  let timerInterval: number | null = null;
  let timerElement: HTMLElement | null = null;

  const stopTimer = () => {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  const dispose = () => {
    stopTimer();
    if (disposeActiveInteraction === dispose) disposeActiveInteraction = null;
  };

  const route = (handles: Array<string | null>) => {
    dispose();
    for (const handle of handles) {
      if (context.continueFrom(node, handle)) return;
    }
  };

  const complete = (completion: ImportantTalksCompletion) => {
    if (settled) return;
    settled = true;
    stopTimer();
    timerElement?.classList.toggle("is-expired", completion.outcome === "timeout");

    context.playSound(
      completion.outcome === "correct" ? "correctAnswer" : "incorrectAnswer",
      completion.soundOverride,
    );

    disableInteractiveControls(controls);
    showImportantTalksFeedback(container, data, completion.outcome, () => {
      route(completion.handles);
    });
  };

  const timerSeconds = clampTimerSeconds(data.timer);
  if (timerSeconds > 0) {
    timerElement = createNodeTimer(timerSeconds);
    container.classList.add("has-talks-node-timer");
    container.appendChild(timerElement);

    let remaining = timerSeconds;
    const renderTimer = () => {
      if (!timerElement) return;
      const value = timerElement.querySelector<HTMLElement>(".talks-node-timer-value");
      const progress = remaining / timerSeconds;
      timerElement.style.setProperty("--talks-node-timer-progress", `${Math.max(0, progress) * 360}deg`);
      timerElement.classList.toggle("is-warning", remaining <= Math.max(10, Math.ceil(timerSeconds / 3)));
      timerElement.classList.toggle("is-urgent", remaining <= 10);
      timerElement.setAttribute("aria-label", `Осталось ${remaining} секунд`);
      if (value) value.textContent = formatTime(remaining);
    };

    renderTimer();
    timerInterval = window.setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      renderTimer();
      if (remaining > 0) return;
      complete({ outcome: "timeout", handles: ["timeout", "incorrect", null] });
    }, 1000);
  }

  const controller = { complete, dispose };
  disposeActiveInteraction = dispose;
  return controller;
}

function clampTimerSeconds(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(3600, Math.max(1, Math.round(parsed)));
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function createNodeTimer(seconds: number): HTMLElement {
  const timer = document.createElement("aside");
  timer.className = "talks-node-timer";
  timer.setAttribute("role", "timer");
  timer.setAttribute("aria-live", "polite");

  const dial = document.createElement("span");
  dial.className = "talks-node-timer-dial";
  dial.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = "talks-node-timer-copy";
  const label = document.createElement("span");
  label.className = "talks-node-timer-label";
  label.textContent = "Время на ответ";
  const value = document.createElement("strong");
  value.className = "talks-node-timer-value";
  value.textContent = formatTime(seconds);
  copy.append(label, value);
  timer.append(dial, copy);
  return timer;
}

function disableInteractiveControls(controls: HTMLElement): void {
  controls.querySelectorAll<HTMLElement>("button, input, textarea, select").forEach((element) => {
    if (
      element instanceof HTMLButtonElement
      || element instanceof HTMLInputElement
      || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement
    ) {
      element.disabled = true;
    }
  });
}

function showImportantTalksFeedback(
  container: HTMLElement,
  data: ImportantTalksInteractionData,
  outcome: ImportantTalksOutcome,
  onContinue: () => void,
): void {
  const content = data.importantTalks;
  const defaults = getFeedbackDefaults(outcome);
  const feedback = document.createElement("section");
  feedback.className = `talks-inline-feedback is-${outcome}`;
  feedback.setAttribute("role", "dialog");
  feedback.setAttribute("aria-modal", "true");
  feedback.setAttribute(
    "aria-label",
    `${defaults.kicker}: ${feedbackValue(content, outcome, "Title") || defaults.title}`,
  );
  feedback.setAttribute("aria-live", "assertive");

  const mark = document.createElement("span");
  mark.className = "talks-inline-feedback-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = outcome === "correct" ? "✓" : outcome === "timeout" ? "⌛" : "↺";

  const body = document.createElement("div");
  body.className = "talks-inline-feedback-body";
  const kicker = document.createElement("span");
  kicker.className = "talks-inline-feedback-kicker";
  kicker.textContent = defaults.kicker;
  const title = document.createElement("h2");
  title.textContent = feedbackValue(content, outcome, "Title") || defaults.title;
  const text = document.createElement("p");
  text.textContent = feedbackValue(content, outcome, "Text") || defaults.text;
  body.append(kicker, title, text);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "talks-inline-feedback-button";
  button.textContent = content?.feedbackButtonText?.trim() || "Продолжить";
  button.addEventListener("click", onContinue, { once: true });

  const continueFlow = () => {
    if (feedback.isConnected) button.click();
  };

  feedback.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      continueFlow();
      return;
    }
    if (event.key === "Tab") {
      // Ловушка фокуса: в окне единственный интерактивный элемент.
      event.preventDefault();
      button.focus();
    }
  });

  container.addEventListener("click", (event) => {
    if (event.target === container) continueFlow();
  });

  feedback.append(mark, body, button);
  container.classList.add("talks-feedback-open");
  container.appendChild(feedback);
  window.setTimeout(() => button.focus(), 0);
}

function feedbackValue(
  content: ImportantTalksInteractionData["importantTalks"],
  outcome: ImportantTalksOutcome,
  suffix: "Title" | "Text",
): string {
  if (!content) return "";
  if (outcome === "correct") return content[`correct${suffix}`]?.trim() ?? "";
  if (outcome === "incorrect") return content[`incorrect${suffix}`]?.trim() ?? "";
  return content[`timeout${suffix}`]?.trim() ?? "";
}

function getFeedbackDefaults(outcome: ImportantTalksOutcome): {
  kicker: string;
  title: string;
  text: string;
} {
  if (outcome === "correct") {
    return {
      kicker: "Ответ принят",
      title: "Вы зажгли искру добра",
      text: "Верное решение помогает увидеть, как ценности проявляются в ежедневных поступках.",
    };
  }
  if (outcome === "timeout") {
    return {
      kicker: "Время завершилось",
      title: "Продолжим размышление",
      text: "Можно двигаться дальше — важные ответы иногда приходят не сразу.",
    };
  }
  return {
    kicker: "Есть повод подумать",
    title: "Посмотрите на ситуацию ещё раз",
    text: "Ошибка — часть размышления. Обратите внимание на смысл каждого варианта.",
  };
}

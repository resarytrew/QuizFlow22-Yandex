import type { Answer } from "../types";
import type { NodeRenderer } from "./types";
import { createActionButton, enableRovingFocus } from "./common";
import { parseText } from "../sanitize";
import { getDesignSettings } from "../designState";
import {
  setupImportantTalksInteraction,
  type ImportantTalksInteractionController,
} from "../importantTalksInteraction";

interface ChoiceData {
  answers?: Answer[];
  options?: Answer[];
  correctOptions?: string[];
  minSelections?: number;
  maxSelections?: number;
  buttonText?: string;
  timer?: number;
  soundSettings?: {
    onButtonPress?: string;
  };
  importantTalks?: {
    instruction?: string;
    hint?: string;
    correctTitle?: string;
    correctText?: string;
    incorrectTitle?: string;
    incorrectText?: string;
    timeoutTitle?: string;
    timeoutText?: string;
    feedbackButtonText?: string;
  };
}

function markerFor(index: number): string {
  const markerStyle = getDesignSettings()?.answerCards?.markerStyle ?? "letters";
  if (markerStyle === "none") return "";
  if (markerStyle === "numbers") return String(index + 1);
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function createAnswerButton(
  answer: Answer,
  index: number,
  selected = false,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  const answerStyle = getDesignSettings()?.answerCards?.style ?? "card";
  const markerStyle = getDesignSettings()?.answerCards?.markerStyle ?? "letters";
  button.className = [
    "option",
    `option-style-${answerStyle}`,
    markerStyle === "none" ? "option-no-marker" : "",
    selected ? "selected" : "",
  ].filter(Boolean).join(" ");
  button.style.setProperty("--control-index", String(index));
  button.setAttribute("aria-pressed", String(selected));

  const markerText = markerFor(index);
  if (markerText) {
    const marker = document.createElement("span");
    marker.className = "option-marker";
    marker.textContent = markerText;
    button.appendChild(marker);
  }

  const copy = document.createElement("span");
  copy.className = "option-copy md-content";
  copy.innerHTML = parseText(answer.text ?? "");

  button.appendChild(copy);
  return button;
}

function findDirectChild(container: HTMLElement, className: string): HTMLElement | null {
  return Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(className),
  ) ?? null;
}

function enhanceImportantTalksQuestionScene(
  controls: HTMLElement,
  data: ChoiceData,
): void {
  if (!document.body.classList.contains("important-talks-theme")) return;

  const container = controls.parentElement;
  if (!container) return;

  container.classList.add("talks-question-scene");
  controls.classList.add("talks-question-options");
  controls.setAttribute("aria-label", "Варианты ответа");

  const hero = document.createElement("section");
  hero.className = "talks-question-hero";

  const copy = document.createElement("div");
  copy.className = "talks-question-copy";

  const title = findDirectChild(container, "node-title");
  const question = findDirectChild(container, "node-desc");
  if (title) {
    title.classList.add(question ? "talks-question-eyebrow" : "talks-question-prompt");
    copy.appendChild(title);
  }
  if (question) {
    question.classList.add("talks-question-prompt");
    question.setAttribute("role", "heading");
    question.setAttribute("aria-level", title ? "2" : "1");
    copy.appendChild(question);
  }

  const instruction = document.createElement("p");
  instruction.className = "talks-question-instruction";
  instruction.textContent = data.importantTalks?.instruction?.trim() || "Выберите один ответ";
  copy.appendChild(instruction);

  const visual = document.createElement("div");
  visual.className = "talks-question-visual";
  const media = findDirectChild(container, "media-frame");
  if (media) {
    visual.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-question-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    visual.appendChild(fallback);
  }

  const wave = document.createElement("div");
  wave.className = "talks-question-wave";
  wave.setAttribute("aria-hidden", "true");

  hero.append(copy, visual, wave);
  container.insertBefore(hero, controls);
}

export const renderQuestion: NodeRenderer = (node, controls, context) => {
  const data = node.data as ChoiceData;
  const buttons: HTMLButtonElement[] = [];
  let interaction: ImportantTalksInteractionController | null = null;

  (data.answers ?? data.options ?? []).forEach((answer, index) => {
    const button = createAnswerButton(answer, index);
    button.addEventListener("click", () => {
      button.classList.add("selected", "confirm-flash");
      button.setAttribute("aria-pressed", "true");
      for (const item of buttons) item.disabled = true;

      if (interaction) {
        interaction.complete({
          outcome: answer.isCorrect ? "correct" : "incorrect",
          handles: [answer.id ?? String(index)],
          soundOverride: data.soundSettings?.onButtonPress,
        });
      } else {
        context.playSound(
          answer.isCorrect ? "correctAnswer" : "incorrectAnswer",
          data.soundSettings?.onButtonPress,
        );
        setTimeout(() => context.continueFrom(node, answer.id ?? String(index)), 260);
      }
    });
    buttons.push(button);
    controls.appendChild(button);
  });

  enhanceImportantTalksQuestionScene(controls, data);
  enableRovingFocus(controls, ".option");
  interaction = setupImportantTalksInteraction(node, controls, context);
};

export const renderMultipleChoice: NodeRenderer = (node, controls, context) => {
  const data = node.data as ChoiceData;
  const selected = new Set<string>();
  const answers = data.answers ?? [];
  const min = Math.max(0, Number(data.minSelections ?? 0));
  const max = Math.max(min, Number(data.maxSelections ?? answers.length));
  let confirmButton: HTMLButtonElement | null = null;
  let interaction: ImportantTalksInteractionController | null = null;

  const updateConfirm = () => {
    if (!confirmButton) return;
    confirmButton.disabled = selected.size < min || selected.size > max;
  };

  answers.forEach((answer, index) => {
    const answerId = String(answer.id ?? index);
    const button = createAnswerButton(answer, index);
    button.addEventListener("click", () => {
      if (selected.has(answerId)) {
        selected.delete(answerId);
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      } else {
        if (selected.size >= max) return;
        selected.add(answerId);
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
      }
      updateConfirm();
    });
    controls.appendChild(button);
  });

  confirmButton = createActionButton(data.buttonText ?? "Подтвердить", () => {
    const correct = (data.correctOptions ?? []).map(String);
    const values = [...selected].map(String);
    if (values.length < min || values.length > max) return;

    const hits = values.filter((id) => correct.includes(id)).length;
    const hasWrong = values.some((id) => !correct.includes(id));
    const isCorrect = hits === correct.length && !hasWrong && values.length === correct.length;
    if (interaction) {
      interaction.complete({
        outcome: isCorrect ? "correct" : "incorrect",
        handles: [`correct-${hits}`, isCorrect ? "correct" : "incorrect"],
      });
    } else {
      context.playSound(isCorrect ? "correctAnswer" : "incorrectAnswer");
      if (!context.continueFrom(node, `correct-${hits}`)) {
        context.continueFrom(node, isCorrect ? "correct" : "incorrect");
      }
    }
  });
  updateConfirm();
  controls.appendChild(confirmButton);

  enhanceImportantTalksMultipleChoiceScene(controls, data, confirmButton);
  enableRovingFocus(controls, ".option");
  interaction = setupImportantTalksInteraction(node, controls, context);
};

function enhanceImportantTalksMultipleChoiceScene(
  controls: HTMLElement,
  data: ChoiceData,
  confirmButton: HTMLButtonElement,
): void {
  if (!document.body.classList.contains("important-talks-theme")) return;
  const container = controls.parentElement;
  if (!container) return;

  container.classList.add("talks-multiple-scene");
  controls.classList.add("talks-multiple-options");
  confirmButton.classList.add("talks-multiple-cta");

  const media = findDirectChild(container, "media-frame");
  const title = findDirectChild(container, "node-title");
  const question = findDirectChild(container, "node-desc");

  const prompt = document.createElement("section");
  prompt.className = "talks-multiple-prompt";
  if (media) {
    prompt.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-multiple-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    prompt.appendChild(fallback);
  }

  const copy = document.createElement("div");
  copy.className = "talks-multiple-copy";
  if (title) copy.appendChild(title);
  if (question) copy.appendChild(question);
  prompt.appendChild(copy);

  const wave = document.createElement("div");
  wave.className = "talks-activity-wave";
  wave.setAttribute("aria-hidden", "true");
  prompt.appendChild(wave);

  const hint = document.createElement("aside");
  hint.className = "talks-activity-hint talks-multiple-hint";
  const hintIcon = document.createElement("span");
  hintIcon.setAttribute("aria-hidden", "true");
  hintIcon.textContent = "✦";
  const hintText = document.createElement("span");
  hintText.textContent = data.importantTalks?.hint?.trim() || "Можно выбрать несколько вариантов";
  hint.append(hintIcon, hintText);
  prompt.appendChild(hint);

  container.insertBefore(prompt, controls);
}

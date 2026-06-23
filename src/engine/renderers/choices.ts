import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { parseText } from "../sanitize";

function markerFor(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function createAnswerButton(
  answer: any,
  index: number,
  selected = false,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `option${selected ? " selected" : ""}`;
  button.style.setProperty("--control-index", String(index));
  button.setAttribute("aria-pressed", String(selected));

  const marker = document.createElement("span");
  marker.className = "option-marker";
  marker.textContent = markerFor(index);

  const copy = document.createElement("span");
  copy.className = "option-copy md-content";
  copy.innerHTML = parseText(answer.text ?? "");

  button.append(marker, copy);
  return button;
}

export const renderQuestion: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  const buttons: HTMLButtonElement[] = [];

  (data.answers ?? data.options ?? []).forEach((answer: any, index: number) => {
    const button = createAnswerButton(answer, index);
    button.addEventListener("click", () => {
      button.classList.add("selected", "confirm-flash");
      button.setAttribute("aria-pressed", "true");
      for (const item of buttons) item.disabled = true;

      context.playSound(
        answer.isCorrect ? "correctAnswer" : "incorrectAnswer",
        data.soundSettings?.onButtonPress,
      );
      setTimeout(() => context.continueFrom(node, answer.id ?? String(index)), 260);
    });
    buttons.push(button);
    controls.appendChild(button);
  });
};

export const renderMultipleChoice: NodeRenderer = (node, controls, context) => {
  const data: any = node.data;
  const selected = new Set<string>();
  const answers = data.answers ?? [];
  const min = Math.max(0, Number(data.minSelections ?? 0));
  const max = Math.max(min, Number(data.maxSelections ?? answers.length));
  let confirmButton: HTMLButtonElement | null = null;

  const updateConfirm = () => {
    if (!confirmButton) return;
    confirmButton.disabled = selected.size < min || selected.size > max;
  };

  answers.forEach((answer: any, index: number) => {
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
    context.playSound(isCorrect ? "correctAnswer" : "incorrectAnswer");
    if (!context.continueFrom(node, `correct-${hits}`)) {
      context.continueFrom(node, isCorrect ? "correct" : "incorrect");
    }
  });
  updateConfirm();
  controls.appendChild(confirmButton);
};

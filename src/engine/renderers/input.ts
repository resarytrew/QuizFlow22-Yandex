import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { getState, setVariable } from "../state";
import {
  setupImportantTalksInteraction,
  type ImportantTalksInteractionController,
} from "../importantTalksInteraction";

interface TextInputData {
  placeholder?: string;
  buttonText?: string;
  acceptedAnswers?: unknown[];
  keyword?: string;
  timer?: number;
  importantTalks?: {
    hint?: string;
    insightTitle?: string;
    maxLength?: number;
    correctTitle?: string;
    correctText?: string;
    incorrectTitle?: string;
    incorrectText?: string;
    timeoutTitle?: string;
    timeoutText?: string;
    feedbackButtonText?: string;
  };
}

interface CollectInfoField {
  label?: string;
  variableName: string;
  type?: string;
  required?: boolean;
}

interface CollectInfoData {
  fields?: CollectInfoField[];
  buttonText?: string;
}

interface AllocatorItem {
  label?: string;
  variableName: string;
  defaultValue?: number;
}

interface AllocatorData {
  maxTotal?: number;
  requireExactTotal?: boolean;
  items?: AllocatorItem[];
  buttonText?: string;
}

export const renderTextInput: NodeRenderer = (node, controls, context) => {
  const data = node.data as TextInputData;
  const isImportantTalks = document.body.classList.contains("important-talks-theme");
  const input = isImportantTalks
    ? document.createElement("textarea")
    : document.createElement("input");
  let interaction: ImportantTalksInteractionController | null = null;
  input.className = "text-field";
  input.placeholder = data.placeholder ?? "Ваш ответ...";
  if (input instanceof HTMLInputElement) input.type = "text";
  if (input instanceof HTMLTextAreaElement) {
    input.rows = 7;
    input.maxLength = clampTextInputLength(data.importantTalks?.maxLength);
  }
  controls.appendChild(input);

  const button = createActionButton(data.buttonText ?? "Проверить", () => {
    const actual = input.value.trim().toLowerCase();
    const accepted = data.acceptedAnswers ?? [data.keyword ?? ""];
    const correct = accepted.some(
      (answer: unknown) => actual === String(answer).trim().toLowerCase(),
    );
    if (interaction) {
      interaction.complete({
        outcome: correct ? "correct" : "incorrect",
        handles: [correct ? "correct" : "incorrect"],
      });
    } else {
      context.playSound(correct ? "correctAnswer" : "incorrectAnswer");
      context.continueFrom(node, correct ? "correct" : "incorrect");
    }
  });
  controls.appendChild(button);

  if (isImportantTalks && input instanceof HTMLTextAreaElement) {
    enhanceImportantTalksTextInputScene(controls, data, input, button);
    interaction = setupImportantTalksInteraction(node, controls, context);
  }
};

function clampTextInputLength(value: number | undefined): number {
  const parsed = Number(value ?? 300);
  if (!Number.isFinite(parsed)) return 300;
  return Math.min(1000, Math.max(50, Math.round(parsed)));
}

function enhanceImportantTalksTextInputScene(
  controls: HTMLElement,
  data: TextInputData,
  input: HTMLTextAreaElement,
  button: HTMLButtonElement,
): void {
  const container = controls.parentElement;
  if (!container) return;

  container.classList.add("talks-text-scene");
  controls.classList.add("talks-text-response");
  button.classList.add("talks-text-cta");

  const media = findDirectChild(container, "media-frame");
  const title = findDirectChild(container, "node-title");
  const description = findDirectChild(container, "node-desc");

  const prompt = document.createElement("section");
  prompt.className = "talks-text-prompt";
  const visual = document.createElement("div");
  visual.className = "talks-text-visual";
  if (media) {
    visual.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-text-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    visual.appendChild(fallback);
  }

  const copy = document.createElement("div");
  copy.className = "talks-text-copy";
  if (title) copy.appendChild(title);
  if (description) copy.appendChild(description);
  visual.appendChild(copy);

  const wave = document.createElement("div");
  wave.className = "talks-activity-wave";
  wave.setAttribute("aria-hidden", "true");
  visual.appendChild(wave);
  prompt.appendChild(visual);

  const entry = document.createElement("section");
  entry.className = "talks-text-entry";
  entry.appendChild(input);

  const count = document.createElement("span");
  count.className = "talks-text-count";
  count.setAttribute("aria-live", "polite");
  const updateCount = () => {
    count.textContent = `${input.value.length} / ${input.maxLength}`;
  };
  input.addEventListener("input", updateCount);
  updateCount();
  entry.appendChild(count);

  const insight = document.createElement("aside");
  insight.className = "talks-text-insight";
  const icon = document.createElement("span");
  icon.className = "talks-activity-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "♥";
  const insightCopy = document.createElement("div");
  const insightTitle = document.createElement("h2");
  insightTitle.textContent = data.importantTalks?.insightTitle?.trim() || "Ваше мнение важно";
  const insightText = document.createElement("p");
  insightText.textContent = data.importantTalks?.hint?.trim()
    || "Ваш ответ поможет понять, что действительно имеет значение для каждого из нас.";
  insightCopy.append(insightTitle, insightText);
  insight.append(icon, insightCopy);

  controls.insertBefore(entry, button);
  controls.insertBefore(insight, button);
  container.insertBefore(prompt, controls);
}

function findDirectChild(container: HTMLElement, className: string): HTMLElement | null {
  return Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(className),
  ) ?? null;
}

export const renderCollectInfo: NodeRenderer = (node, controls, context) => {
  const data = node.data as CollectInfoData;
  const state = getState();
  const inputs: Array<{ field: CollectInfoField; input: HTMLInputElement }> = [];

  for (const field of data.fields ?? []) {
    const label = document.createElement("label");
    const title = document.createElement("span");
    const input = document.createElement("input");
    label.className = "field";
    title.className = "field-label";
    title.textContent = field.label ?? field.variableName ?? "";
    input.className = "text-field";
    const fieldType = field.type ?? "text";
    input.type = ["email", "number", "tel", "date"].includes(fieldType)
      ? fieldType
      : "text";
    input.required = Boolean(field.required);
    input.name = field.variableName ?? "";
    input.value = String(state.variables[field.variableName] ?? "");
    label.append(title, input);
    controls.appendChild(label);
    inputs.push({ field, input });
  }

  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    if (!inputs.every(({ input }) => input.reportValidity())) return;
    for (const { field, input } of inputs) {
      if (field.variableName) setVariable(field.variableName, input.value);
    }
    context.continueFrom(node, null);
  }));
};

export const renderAllocator: NodeRenderer = (node, controls, context) => {
  const data = node.data as AllocatorData;
  const state = getState();
  const values: Record<string, number> = {};
  const maxTotal = Number(data.maxTotal ?? 100);
  const totalLabel = document.createElement("div");
  totalLabel.className = "allocator-summary";
  totalLabel.setAttribute("aria-live", "polite");

  const updateTotal = () => {
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    totalLabel.textContent = `Распределено: ${total} / ${maxTotal}`;
  };

  for (const item of data.items ?? []) {
    const row = document.createElement("label");
    const header = document.createElement("span");
    const title = document.createElement("span");
    const value = document.createElement("span");
    const range = document.createElement("input");

    row.className = "allocator-row";
    header.className = "allocator-row-header";
    title.className = "allocator-label";
    value.className = "allocator-value";
    range.className = "range-field";
    range.type = "range";
    range.min = "0";
    range.max = String(maxTotal);

    values[item.variableName] = Number(
      state.variables[item.variableName] ?? item.defaultValue ?? 0,
    );
    range.value = String(values[item.variableName]);

    const updateValue = () => {
      title.textContent = item.label ?? item.variableName ?? "";
      value.textContent = range.value;
    };

    range.addEventListener("input", () => {
      values[item.variableName] = Number(range.value);
      updateValue();
      updateTotal();
    });

    updateValue();
    header.append(title, value);
    row.append(header, range);
    controls.appendChild(row);
  }

  updateTotal();
  controls.appendChild(totalLabel);
  controls.appendChild(createActionButton(data.buttonText ?? "Далее", () => {
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    if (data.requireExactTotal && total !== maxTotal) return;
    for (const [name, value] of Object.entries(values)) setVariable(name, value);
    context.continueFrom(node, null);
  }));
};

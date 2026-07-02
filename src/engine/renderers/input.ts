import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { getState, setVariable } from "../state";

interface TextInputData {
  placeholder?: string;
  buttonText?: string;
  acceptedAnswers?: unknown[];
  keyword?: string;
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
  const input = document.createElement("input");
  input.className = "text-field";
  input.placeholder = data.placeholder ?? "Ваш ответ...";
  input.type = "text";
  controls.appendChild(input);

  controls.appendChild(createActionButton(data.buttonText ?? "Проверить", () => {
    const actual = input.value.trim().toLowerCase();
    const accepted = data.acceptedAnswers ?? [data.keyword ?? ""];
    const correct = accepted.some(
      (answer: unknown) => actual === String(answer).trim().toLowerCase(),
    );
    context.playSound(correct ? "correctAnswer" : "incorrectAnswer");
    context.continueFrom(node, correct ? "correct" : "incorrect");
  }));
};

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

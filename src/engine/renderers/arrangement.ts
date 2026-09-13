import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { makeImageZoomable } from "../lightbox";
import { sanitizeAssetUrl } from "../sanitize";
import {
  setupImportantTalksInteraction,
  type ImportantTalksInteractionController,
} from "../importantTalksInteraction";

interface MatchItem {
  id: string;
  text?: string;
  imageUrl?: string;
}

interface MatchPair {
  leftId: string;
  rightId: string;
}

interface MatchingData {
  leftColumn?: MatchItem[];
  rightColumn?: MatchItem[];
  correctPairs?: MatchPair[];
  buttonText?: string;
  timer?: number;
  importantTalks?: {
    hint?: string;
    leftTitle?: string;
    rightTitle?: string;
    correctTitle?: string;
    correctText?: string;
    incorrectTitle?: string;
    incorrectText?: string;
    timeoutTitle?: string;
    timeoutText?: string;
    feedbackButtonText?: string;
  };
}

interface TimelineItem {
  id: string;
  text?: string;
}

interface TimelineData {
  events?: TimelineItem[];
  buttonText?: string;
  timer?: number;
  importantTalks?: {
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

export const renderMatching: NodeRenderer = (node, controls, context) => {
  const data = node.data as MatchingData;
  const pairs: Array<{ left: string; right: string }> = [];
  let selectedLeft: string | null = null;
  let selectedRight: string | null = null;
  let confirmButton: HTMLButtonElement | null = null;
  let interaction: ImportantTalksInteractionController | null = null;
  const grid = document.createElement("div");
  grid.className = "match-grid";
  const status = document.createElement("p");
  status.className = "match-status";
  status.setAttribute("aria-live", "polite");

  const updateCompletionState = () => {
    const expectedCount = data.correctPairs?.length ?? 0;
    status.textContent = expectedCount > 0
      ? `Составлено пар: ${pairs.length} из ${expectedCount}`
      : `Составлено пар: ${pairs.length}`;
    if (confirmButton) {
      confirmButton.disabled = expectedCount > 0 && pairs.length !== expectedCount;
    }
  };

  const completePair = () => {
    if (!selectedLeft || !selectedRight) return;
    for (let index = pairs.length - 1; index >= 0; index -= 1) {
      if (pairs[index].left === selectedLeft || pairs[index].right === selectedRight) {
        pairs.splice(index, 1);
      }
    }
    pairs.push({ left: selectedLeft, right: selectedRight });
    selectedLeft = null;
    selectedRight = null;
  };

  const createItem = (item: MatchItem, side: "left" | "right", index: number) => {
    const button = document.createElement("button");
    const isSelected = side === "left"
      ? selectedLeft === item.id
      : selectedRight === item.id;
    const isMatched = pairs.some(
      (pair) => side === "left" ? pair.left === item.id : pair.right === item.id,
    );

    button.type = "button";
    button.className = `match-item${isSelected ? " selected" : ""}${isMatched ? " matched" : ""}`;
    button.dataset.matchId = String(item.id);
    button.dataset.matchSide = side;
    button.setAttribute("aria-pressed", String(isSelected || isMatched));

    const pairIndex = pairs.findIndex(
      (pair) => side === "left" ? pair.left === item.id : pair.right === item.id,
    );
    if (pairIndex >= 0) {
      button.dataset.pairIndex = String(pairIndex);
      button.style.setProperty("--talks-match-pair", String(pairIndex));
    }

    const marker = document.createElement("span");
    marker.className = `match-item-marker match-item-marker-${side}`;
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = side === "left"
      ? String(index + 1)
      : index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
    button.appendChild(marker);

    const safeImageUrl = sanitizeAssetUrl(item.imageUrl);
    if (safeImageUrl) {
      const image = document.createElement("img");
      image.src = safeImageUrl;
      image.alt = item.text ?? "";
      image.loading = "lazy";
      image.className = "match-item-image";
      makeImageZoomable(image, safeImageUrl, image.alt);
      button.appendChild(image);
    }

    if (item.text) {
      const label = document.createElement("span");
      label.className = "match-item-text";
      label.textContent = item.text;
      button.appendChild(label);
    }

    button.addEventListener("click", () => {
      if (side === "left") selectedLeft = item.id;
      else selectedRight = item.id;
      completePair();
      draw();
    });
    return button;
  };

  const draw = () => {
    const left = document.createElement("div");
    const right = document.createElement("div");
    left.className = right.className = "match-col";

    const leftHeading = document.createElement("h2");
    leftHeading.className = "match-col-title";
    leftHeading.textContent = data.importantTalks?.leftTitle?.trim() || "Ценность";
    const rightHeading = document.createElement("h2");
    rightHeading.className = "match-col-title";
    rightHeading.textContent = data.importantTalks?.rightTitle?.trim() || "Пример поведения";
    left.appendChild(leftHeading);
    right.appendChild(rightHeading);

    for (const [index, item] of (data.leftColumn ?? []).entries()) {
      left.appendChild(createItem(item, "left", index));
    }
    for (const [index, item] of (data.rightColumn ?? []).entries()) {
      right.appendChild(createItem(item, "right", index));
    }

    grid.replaceChildren(left, right);
    updateCompletionState();
  };

  draw();
  controls.appendChild(grid);
  controls.appendChild(status);
  confirmButton = createActionButton(data.buttonText ?? "Проверить", () => {
    const expected = data.correctPairs ?? [];
    const correct = expected.length === pairs.length && expected.every((pair) =>
      pairs.some((value) => value.left === pair.leftId && value.right === pair.rightId));
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
  controls.appendChild(confirmButton);
  updateCompletionState();

  enhanceImportantTalksMatchingScene(controls, data, grid, status, confirmButton);
  interaction = setupImportantTalksInteraction(node, controls, context);
};

function enhanceImportantTalksMatchingScene(
  controls: HTMLElement,
  data: MatchingData,
  grid: HTMLElement,
  status: HTMLElement,
  button: HTMLButtonElement,
): void {
  if (!document.body.classList.contains("important-talks-theme")) return;
  const container = controls.parentElement;
  if (!(container instanceof HTMLElement)) return;

  container.classList.add("talks-matching-scene");
  controls.classList.add("talks-matching-workspace");
  grid.classList.add("talks-matching-grid");
  status.classList.add("talks-matching-status");
  button.classList.add("talks-matching-cta");

  const title = findTimelineDirectChild(container, "node-title");
  const question = findTimelineDirectChild(container, "node-desc");
  const instruction = document.createElement("section");
  instruction.className = "talks-matching-instruction";

  const icon = document.createElement("span");
  icon.className = "talks-matching-instruction-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✓";

  const copy = document.createElement("div");
  copy.className = "talks-matching-instruction-copy";
  if (title) {
    title.classList.add("talks-matching-eyebrow");
    copy.appendChild(title);
  }
  if (question) copy.appendChild(question);

  const hint = document.createElement("p");
  hint.className = "talks-matching-hint";
  hint.textContent = data.importantTalks?.hint?.trim() || "Выберите ценность слева, затем подходящий пример справа";
  copy.appendChild(hint);

  const branch = document.createElement("span");
  branch.className = "talks-matching-branch";
  branch.setAttribute("aria-hidden", "true");

  instruction.append(icon, copy, branch);
  container.insertBefore(instruction, controls);
}

export const renderTimeline: NodeRenderer = (node, controls, context) => {
  const data = node.data as TimelineData;
  const original = data.events ?? [];
  const items = [...original].sort(() => Math.random() - 0.5);
  const list = document.createElement("div");
  list.className = "timeline-container";
  const live = document.createElement("p");
  live.className = "timeline-order-live";
  live.setAttribute("aria-live", "polite");
  let interaction: ImportantTalksInteractionController | null = null;

  const focusGrip = (itemId: string) => {
    window.setTimeout(() => {
      const grip = Array.from(list.querySelectorAll<HTMLButtonElement>(".talks-timeline-grip"))
        .find((candidate) => candidate.dataset.timelineGrip === itemId);
      grip?.focus();
    }, 0);
  };

  const announcePosition = (item: TimelineItem, index: number) => {
    live.textContent = `${item.text ?? "Карточка"}: позиция ${index + 1} из ${items.length}`;
  };

  const moveItem = (fromIndex: number, toIndex: number, shouldFocus = false) => {
    const targetIndex = Math.min(items.length - 1, Math.max(0, toIndex));
    if (fromIndex < 0 || fromIndex >= items.length || fromIndex === targetIndex) return;
    const item = items[fromIndex];
    if (!item) return;
    items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, item);
    announcePosition(item, targetIndex);
    draw();
    if (shouldFocus) focusGrip(item.id);
  };

  const startPointerDrag = (event: PointerEvent, row: HTMLElement, item: TimelineItem) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    event.preventDefault();
    row.classList.add("is-dragging");
    row.setAttribute("aria-grabbed", "true");
    list.classList.add("is-reordering");
    document.body.classList.add("talks-timeline-dragging");

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const rows = Array.from(list.querySelectorAll<HTMLElement>(":scope > .timeline-item"));
      const otherRows = rows.filter((candidate) => candidate !== row);
      let targetIndex = otherRows.length;
      for (let index = 0; index < otherRows.length; index += 1) {
        const rect = otherRows[index]?.getBoundingClientRect();
        if (rect && moveEvent.clientY < rect.top + rect.height / 2) {
          targetIndex = index;
          break;
        }
      }

      const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
      if (currentIndex < 0 || currentIndex === targetIndex) return;
      const currentItem = items.splice(currentIndex, 1)[0];
      if (!currentItem) return;
      items.splice(targetIndex, 0, currentItem);
      list.insertBefore(row, otherRows[targetIndex] ?? null);
      announcePosition(currentItem, targetIndex);
    };

    const finishPointerDrag = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishPointerDrag);
      window.removeEventListener("pointercancel", finishPointerDrag);
      document.body.classList.remove("talks-timeline-dragging");
      list.classList.remove("is-reordering");
      row.classList.remove("is-dragging");
      row.setAttribute("aria-grabbed", "false");
      const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
      draw();
      announcePosition(item, currentIndex);
      focusGrip(item.id);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", finishPointerDrag, { once: true });
    window.addEventListener("pointercancel", finishPointerDrag, { once: true });
  };

  const draw = () => {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement("div");
      const controlsWrap = document.createElement("div");
      const up = document.createElement("button");
      const down = document.createElement("button");
      const text = document.createElement("span");

      row.className = "timeline-item";
      controlsWrap.className = "timeline-controls";
      up.type = "button";
      down.type = "button";
      up.textContent = "↑";
      down.textContent = "↓";
      up.setAttribute("aria-label", "Поднять");
      down.setAttribute("aria-label", "Опустить");
      text.className = "timeline-content";
      text.textContent = item.text ?? "";
      up.disabled = index === 0;
      down.disabled = index === items.length - 1;

      up.addEventListener("click", () => {
        moveItem(index, index - 1);
      });
      down.addEventListener("click", () => {
        moveItem(index, index + 1);
      });

      controlsWrap.append(up, down);
      row.append(controlsWrap, text);
      if (document.body.classList.contains("important-talks-theme")) {
        row.classList.add("talks-timeline-card");
        row.dataset.timelineId = item.id;
        row.setAttribute("aria-grabbed", "false");
        const grip = document.createElement("button");
        grip.type = "button";
        grip.className = "talks-timeline-grip";
        grip.dataset.timelineGrip = item.id;
        grip.setAttribute(
          "aria-label",
          `Переместить «${item.text ?? "карточку"}», позиция ${index + 1} из ${items.length}`,
        );
        grip.title = "Перетащите или используйте стрелки на клавиатуре";
        grip.textContent = "⠿";
        grip.addEventListener("pointerdown", (event) => startPointerDrag(event, row, item));
        grip.addEventListener("keydown", (event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            moveItem(index, index - 1, true);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveItem(index, index + 1, true);
          } else if (event.key === "Home") {
            event.preventDefault();
            moveItem(index, 0, true);
          } else if (event.key === "End") {
            event.preventDefault();
            moveItem(index, items.length - 1, true);
          }
        });
        row.appendChild(grip);
      }
      list.appendChild(row);
    });
  };

  draw();
  controls.appendChild(list);
  controls.appendChild(live);
  const button = createActionButton(data.buttonText ?? "Проверить", () => {
    const correct = JSON.stringify(items.map((item) => item.id)) ===
      JSON.stringify(original.map((item) => item.id));
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

  enhanceImportantTalksTimelineScene(controls, data, list, button);
  interaction = setupImportantTalksInteraction(node, controls, context);
};

function enhanceImportantTalksTimelineScene(
  controls: HTMLElement,
  data: TimelineData,
  list: HTMLElement,
  button: HTMLButtonElement,
): void {
  if (!document.body.classList.contains("important-talks-theme")) return;
  const container = controls.parentElement;
  if (!container) return;

  container.classList.add("talks-timeline-scene");
  controls.classList.add("talks-timeline-stack");
  list.classList.add("talks-timeline-list");
  button.classList.add("talks-timeline-cta");

  const media = findTimelineDirectChild(container, "media-frame");
  const title = findTimelineDirectChild(container, "node-title");
  const question = findTimelineDirectChild(container, "node-desc");

  const prompt = document.createElement("section");
  prompt.className = "talks-timeline-prompt";
  if (media) {
    prompt.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-timeline-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    prompt.appendChild(fallback);
  }

  const copy = document.createElement("div");
  copy.className = "talks-timeline-copy";
  if (title) copy.appendChild(title);
  if (question) copy.appendChild(question);
  prompt.appendChild(copy);

  const hint = document.createElement("aside");
  hint.className = "talks-activity-hint talks-timeline-hint";
  const hintIcon = document.createElement("span");
  hintIcon.setAttribute("aria-hidden", "true");
  hintIcon.textContent = "☝";
  const hintText = document.createElement("span");
  hintText.textContent = data.importantTalks?.hint?.trim()
    || "Переместите карточки в правильном порядке";
  hint.append(hintIcon, hintText);
  prompt.appendChild(hint);

  container.insertBefore(prompt, controls);
}

function findTimelineDirectChild(container: HTMLElement, className: string): HTMLElement | null {
  return Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(className),
  ) ?? null;
}

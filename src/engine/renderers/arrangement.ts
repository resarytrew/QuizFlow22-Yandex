import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { makeImageZoomable } from "../lightbox";
import { sanitizeAssetUrl } from "../sanitize";

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
}

interface TimelineItem {
  id: string;
  text?: string;
}

interface TimelineData {
  events?: TimelineItem[];
  buttonText?: string;
  importantTalks?: {
    hint?: string;
  };
}

export const renderMatching: NodeRenderer = (node, controls, context) => {
  const data = node.data as MatchingData;
  const pairs: Array<{ left: string; right: string }> = [];
  let selectedLeft: string | null = null;
  let selectedRight: string | null = null;
  const grid = document.createElement("div");
  grid.className = "match-grid";

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

  const createItem = (item: MatchItem, side: "left" | "right") => {
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

    for (const item of data.leftColumn ?? []) left.appendChild(createItem(item, "left"));
    for (const item of data.rightColumn ?? []) right.appendChild(createItem(item, "right"));

    grid.replaceChildren(left, right);
  };

  draw();
  controls.appendChild(grid);
  controls.appendChild(createActionButton(data.buttonText ?? "Проверить", () => {
    const expected = data.correctPairs ?? [];
    const correct = expected.length === pairs.length && expected.every((pair) =>
      pairs.some((value) => value.left === pair.leftId && value.right === pair.rightId));
    context.playSound(correct ? "correctAnswer" : "incorrectAnswer");
    context.continueFrom(node, correct ? "correct" : "incorrect");
  }));
};

export const renderTimeline: NodeRenderer = (node, controls, context) => {
  const data = node.data as TimelineData;
  const original = data.events ?? [];
  const items = [...original].sort(() => Math.random() - 0.5);
  const list = document.createElement("div");
  list.className = "timeline-container";

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
        items.splice(index - 1, 0, items.splice(index, 1)[0]);
        draw();
      });
      down.addEventListener("click", () => {
        items.splice(index + 1, 0, items.splice(index, 1)[0]);
        draw();
      });

      controlsWrap.append(up, down);
      row.append(controlsWrap, text);
      if (document.body.classList.contains("important-talks-theme")) {
        row.classList.add("talks-timeline-card");
        const grip = document.createElement("span");
        grip.className = "talks-timeline-grip";
        grip.setAttribute("aria-hidden", "true");
        grip.textContent = "⠿";
        row.appendChild(grip);
      }
      list.appendChild(row);
    });
  };

  draw();
  controls.appendChild(list);
  const button = createActionButton(data.buttonText ?? "Проверить", () => {
    const correct = JSON.stringify(items.map((item) => item.id)) ===
      JSON.stringify(original.map((item) => item.id));
    context.playSound(correct ? "correctAnswer" : "incorrectAnswer");
    context.continueFrom(node, correct ? "correct" : "incorrect");
  });
  controls.appendChild(button);

  enhanceImportantTalksTimelineScene(controls, data, list, button);
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

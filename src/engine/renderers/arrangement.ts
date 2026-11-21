import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { makeImageZoomable } from "../lightbox";
import { sanitizeAssetUrl } from "../sanitize";

interface MatchItem { id: string; text?: string; imageUrl?: string; }
interface MatchPair { leftId: string; rightId: string; }
interface MatchingData { leftColumn?: MatchItem[]; rightColumn?: MatchItem[]; correctPairs?: MatchPair[]; buttonText?: string; timer?: number; }
interface TimelineItem { id: string; text?: string; }
interface TimelineData { events?: TimelineItem[]; buttonText?: string; timer?: number; }

export const renderMatching: NodeRenderer = (node, controls, context) => {
  const data = node.data as MatchingData;
  const pairs: Array<{ left: string; right: string }> = [];
  let selectedLeft: string | null = null;
  let selectedRight: string | null = null;
  let confirmButton: HTMLButtonElement | null = null;
  const grid = document.createElement("div"); grid.className = "match-grid";
  const status = document.createElement("p"); status.className = "match-status"; status.setAttribute("aria-live", "polite");
  const updateCompletionState = () => {
    const expectedCount = data.correctPairs?.length ?? 0;
    status.textContent = expectedCount > 0 ? `Составлено пар: ${pairs.length} из ${expectedCount}` : `Составлено пар: ${pairs.length}`;
    if (confirmButton) confirmButton.disabled = expectedCount > 0 && pairs.length !== expectedCount;
  };
  const completePair = () => {
    if (!selectedLeft || !selectedRight) return;
    for (let index = pairs.length - 1; index >= 0; index -= 1) if (pairs[index].left === selectedLeft || pairs[index].right === selectedRight) pairs.splice(index, 1);
    pairs.push({ left: selectedLeft, right: selectedRight }); selectedLeft = null; selectedRight = null;
  };
  const createItem = (item: MatchItem, side: "left" | "right", index: number) => {
    const button = document.createElement("button");
    const isSelected = side === "left" ? selectedLeft === item.id : selectedRight === item.id;
    const isMatched = pairs.some(pair => side === "left" ? pair.left === item.id : pair.right === item.id);
    button.type = "button"; button.className = `match-item${isSelected ? " selected" : ""}${isMatched ? " matched" : ""}`; button.dataset.matchId = String(item.id); button.dataset.matchSide = side; button.setAttribute("aria-pressed", String(isSelected || isMatched));
    const pairIndex = pairs.findIndex(pair => side === "left" ? pair.left === item.id : pair.right === item.id);
    if (pairIndex >= 0) button.dataset.pairIndex = String(pairIndex);
    const marker = document.createElement("span"); marker.className = `match-item-marker match-item-marker-${side}`; marker.setAttribute("aria-hidden", "true"); marker.textContent = side === "left" ? String(index + 1) : index < 26 ? String.fromCharCode(65 + index) : String(index + 1); button.appendChild(marker);
    const safeImageUrl = sanitizeAssetUrl(item.imageUrl);
    if (safeImageUrl) { const image = document.createElement("img"); image.src = safeImageUrl; image.alt = item.text ?? ""; image.loading = "lazy"; image.className = "match-item-image"; makeImageZoomable(image, safeImageUrl, image.alt); button.appendChild(image); }
    if (item.text) { const label = document.createElement("span"); label.className = "match-item-text"; label.textContent = item.text; button.appendChild(label); }
    button.addEventListener("click", () => { if (side === "left") selectedLeft = item.id; else selectedRight = item.id; completePair(); draw(); });
    return button;
  };
  const draw = () => { const left = document.createElement("div"); const right = document.createElement("div"); left.className = right.className = "match-col"; const lh = document.createElement("h2"); lh.className = "match-col-title"; lh.textContent = "Левая колонка"; const rh = document.createElement("h2"); rh.className = "match-col-title"; rh.textContent = "Правая колонка"; left.appendChild(lh); right.appendChild(rh); for (const [index, item] of (data.leftColumn ?? []).entries()) left.appendChild(createItem(item, "left", index)); for (const [index, item] of (data.rightColumn ?? []).entries()) right.appendChild(createItem(item, "right", index)); grid.replaceChildren(left, right); updateCompletionState(); };
  draw(); controls.appendChild(grid); controls.appendChild(status);
  confirmButton = createActionButton(data.buttonText ?? "Проверить", () => { const expected = data.correctPairs ?? []; const correct = expected.length === pairs.length && expected.every(pair => pairs.some(value => value.left === pair.leftId && value.right === pair.rightId)); context.playSound(correct ? "correctAnswer" : "incorrectAnswer"); context.continueFrom(node, correct ? "correct" : "incorrect"); });
  controls.appendChild(confirmButton); updateCompletionState();
};

export const renderTimeline: NodeRenderer = (node, controls, context) => {
  const data = node.data as TimelineData;
  const original = data.events ?? []; const items = [...original].sort(() => Math.random() - 0.5);
  const list = document.createElement("div"); list.className = "timeline-container";
  const live = document.createElement("p"); live.className = "timeline-order-live"; live.setAttribute("aria-live", "polite");
  const moveItem = (fromIndex: number, toIndex: number) => { const target = Math.min(items.length - 1, Math.max(0, toIndex)); if (fromIndex === target) return; const item = items.splice(fromIndex, 1)[0]; if (!item) return; items.splice(target, 0, item); draw(); live.textContent = `${item.text ?? "Карточка"}: позиция ${target + 1} из ${items.length}`; };
  const draw = () => { list.replaceChildren(); items.forEach((item, index) => { const row = document.createElement("div"); row.className = "timeline-item"; const wrap = document.createElement("div"); wrap.className = "timeline-controls"; const up = document.createElement("button"); const down = document.createElement("button"); up.type = down.type = "button"; up.textContent = "↑"; down.textContent = "↓"; up.setAttribute("aria-label", "Поднять"); down.setAttribute("aria-label", "Опустить"); up.disabled = index === 0; down.disabled = index === items.length - 1; up.addEventListener("click", () => moveItem(index, index - 1)); down.addEventListener("click", () => moveItem(index, index + 1)); wrap.append(up, down); const text = document.createElement("span"); text.className = "timeline-content"; text.textContent = item.text ?? ""; row.append(wrap, text); list.appendChild(row); }); };
  draw(); controls.append(list, live); const button = createActionButton(data.buttonText ?? "Проверить", () => { const correct = JSON.stringify(items.map(item => item.id)) === JSON.stringify(original.map(item => item.id)); context.playSound(correct ? "correctAnswer" : "incorrectAnswer"); context.continueFrom(node, correct ? "correct" : "incorrect"); }); controls.appendChild(button);
};

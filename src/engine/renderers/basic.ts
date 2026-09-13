import type { NodeRenderer } from "./types";
import { createActionButton } from "./common";
import { getState } from "../state";
import { parseText, sanitizeAssetUrl } from "../sanitize";
import { saveResults } from "../persistence";
import { getDesignSettings } from "../designState";

interface BasicNodeData {
  buttonText?: string;
  characterAvatar?: string;
  characterName?: string;
  characterRole?: string;
  dialogueText?: string;
  duration?: number;
  action?: string;
  onTimeoutNodeId?: string;
  explanation?: string;
  importantTalks?: {
    agendaTitle?: string;
    agendaItems?: string[];
    kicker?: string;
    insightTitle?: string;
  };
}

const DEFAULT_IMPORTANT_TALKS_AGENDA = [
  "6 заданий",
  "проверка знаний",
  "полезные размышления",
] as const;

export const renderDialogue: NodeRenderer = (node, controls, context) => {
  const data = node.data as BasicNodeData;
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
  const data = node.data as BasicNodeData;
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
  const data = node.data as BasicNodeData;
  const state = getState();
  const resultDesign = getDesignSettings()?.result;
  const isImportantTalks = document.body.classList.contains("important-talks-theme");
  saveResults((node.data.title as string | undefined) ?? "Финиш");

  const summary = document.createElement("div");
  summary.className = [
    "result-summary",
    `result-preset-${resultDesign?.preset ?? "card"}`,
    `result-score-${resultDesign?.scoreStyle ?? "badge"}`,
  ].join(" ");

  if (resultDesign?.showScore !== false) {
    const scoreLabel = isImportantTalks
      ? document.getElementById("hud-score-label")?.textContent?.trim() || "Искры добра"
      : "Очки";
    const score = createResultStat(scoreLabel, String(state.score));
    summary.appendChild(score);
  }
  const steps = createResultStat("Экранов", String(state.path.length));
  summary.appendChild(steps);

  controls.appendChild(summary);
  if (resultDesign?.showShare !== false && navigator.share) {
    controls.appendChild(createActionButton("Поделиться", () => {
      void navigator.share({
        title: document.title || "Результат квиза",
        text: `Мой результат: ${state.score}`,
        url: location.href,
      }).catch(() => undefined);
    }));
  }
  const restartButton = createActionButton(
    data.buttonText ?? (isImportantTalks ? "Пройти ещё раз" : "Начать заново"),
    () => location.reload(),
  );
  controls.appendChild(restartButton);

  if (isImportantTalks) {
    enhanceImportantTalksResultScene(controls, data, restartButton);
  }
};

export const renderInfo: NodeRenderer = (node, controls, context) => {
  const data = node.data as BasicNodeData;
  const button = createActionButton(data.buttonText ?? "Далее", () => {
    context.continueFrom(node, null);
  });
  controls.appendChild(button);

  if (document.body.classList.contains("important-talks-theme")) {
    enhanceImportantTalksInfoScene(controls, data, button);
  }
};

export const renderFeedback: NodeRenderer = (node, controls, context) => {
  const data = node.data as BasicNodeData;
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
  const data = node.data as BasicNodeData;
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

function enhanceImportantTalksResultScene(
  controls: HTMLElement,
  data: BasicNodeData,
  restartButton: HTMLButtonElement,
): void {
  const container = controls.parentElement;
  if (!(container instanceof HTMLElement)) return;

  container.classList.add("talks-result-scene");
  restartButton.classList.add("talks-result-cta");

  const media = findDirectChild(container, "media-frame");
  const title = findDirectChild(container, "node-title");
  const description = findDirectChild(container, "node-desc");
  const summary = controls.querySelector<HTMLElement>(":scope > .result-summary");

  const visual = document.createElement("section");
  visual.className = "talks-result-visual";
  visual.setAttribute("aria-label", "Итоговая иллюстрация");
  if (media) {
    visual.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-result-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    visual.appendChild(fallback);
  }

  const visualWave = document.createElement("div");
  visualWave.className = "talks-result-wave";
  visualWave.setAttribute("aria-hidden", "true");
  visual.appendChild(visualWave);

  const content = document.createElement("section");
  content.className = "talks-result-content";

  const kicker = document.createElement("p");
  kicker.className = "talks-result-kicker";
  kicker.textContent = data.importantTalks?.kicker?.trim() || "Важный разговор завершён";
  content.appendChild(kicker);

  if (title) {
    title.classList.add("talks-result-title");
    content.appendChild(title);
  }

  if (summary) {
    const stats = Array.from(summary.querySelectorAll<HTMLElement>(":scope > .result-stat"));
    if (stats.length > 1) {
      stats[0]?.classList.add("talks-result-primary-stat");
      stats[1]?.classList.add("talks-result-secondary-stat");
    } else {
      stats[0]?.classList.add("talks-result-secondary-stat");
    }
    content.appendChild(summary);
  }

  const insight = document.createElement("section");
  insight.className = "talks-result-insight";

  const insightIcon = document.createElement("span");
  insightIcon.className = "talks-result-insight-icon";
  insightIcon.setAttribute("aria-hidden", "true");
  insightIcon.textContent = "♥";

  const insightCopy = document.createElement("div");
  const insightTitle = document.createElement("h2");
  insightTitle.className = "talks-result-insight-title";
  insightTitle.textContent = data.importantTalks?.insightTitle?.trim() || "Искры добра";
  insightCopy.appendChild(insightTitle);
  if (description) {
    insightCopy.appendChild(description);
  }
  insight.append(insightIcon, insightCopy);
  content.appendChild(insight);

  container.insertBefore(visual, controls);
  container.insertBefore(content, controls);
}

function enhanceImportantTalksInfoScene(
  controls: HTMLElement,
  data: BasicNodeData,
  button: HTMLButtonElement,
): void {
  const container = controls.parentElement;
  if (!(container instanceof HTMLElement)) return;

  container.classList.add("talks-info-scene");
  button.classList.add("talks-info-cta");

  const media = findDirectChild(container, "media-frame");
  const title = findDirectChild(container, "node-title");
  const description = findDirectChild(container, "node-desc");

  const visual = document.createElement("section");
  visual.className = "talks-info-visual";
  visual.setAttribute("aria-label", title?.textContent?.trim() || "Информационная сцена");

  if (media) {
    visual.appendChild(media);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "talks-info-media-fallback";
    fallback.setAttribute("aria-hidden", "true");
    visual.appendChild(fallback);
  }

  if (title) {
    applyImportantTalksTitleAccent(title);
    visual.appendChild(title);
  }

  const aside = document.createElement("aside");
  aside.className = "talks-info-aside";

  if (description) {
    const intro = document.createElement("section");
    intro.className = "talks-info-intro";

    const introIcon = document.createElement("span");
    introIcon.className = "talks-info-intro-icon";
    introIcon.setAttribute("aria-hidden", "true");
    introIcon.textContent = "♥";

    intro.append(introIcon, description);
    aside.appendChild(intro);
  }

  const agenda = document.createElement("section");
  agenda.className = "talks-info-agenda";

  const agendaTitle = data.importantTalks?.agendaTitle ?? "Что вас ждёт";
  if (agendaTitle.trim()) {
    const heading = document.createElement("h2");
    heading.className = "talks-info-agenda-title";
    heading.textContent = agendaTitle;
    agenda.appendChild(heading);
  }

  const items = (data.importantTalks?.agendaItems ?? DEFAULT_IMPORTANT_TALKS_AGENDA)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (items.length > 0) {
    const list = document.createElement("ul");
    list.className = "talks-info-agenda-list";
    items.forEach((item, index) => {
      const row = document.createElement("li");
      row.className = `talks-info-agenda-item talks-info-agenda-item-${index + 1}`;

      const icon = document.createElement("span");
      icon.className = "talks-info-agenda-icon";
      icon.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.textContent = item;
      row.append(icon, copy);
      list.appendChild(row);
    });
    agenda.appendChild(list);
  }

  aside.appendChild(agenda);
  container.insertBefore(visual, controls);
  container.insertBefore(aside, controls);
}

function findDirectChild(container: HTMLElement, className: string): HTMLElement | null {
  const child = Array.from(container.children)
    .find((candidate) => candidate instanceof HTMLElement && candidate.classList.contains(className));
  return child instanceof HTMLElement ? child : null;
}

function applyImportantTalksTitleAccent(title: HTMLElement): void {
  if (title.children.length > 0) return;
  const text = title.textContent ?? "";
  const parts = text.split(/(\s+)/);
  if (!parts.some((part) => /^(нас|объединяют)$/iu.test(part))) return;

  const fragment = document.createDocumentFragment();
  parts.forEach((part) => {
    if (/^(нас|объединяют)$/iu.test(part)) {
      const accent = document.createElement("span");
      accent.className = "talks-title-accent";
      accent.textContent = part;
      fragment.appendChild(accent);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  });
  title.replaceChildren(fragment);
}

import { RENDERED_TYPES } from './constants';
import { nodeById } from './indexing';
import { getState } from './state';

const RING_CIRCUMFERENCE = 125.66;
const NAME_KEYS = ['playerName', 'player_name', 'userName', 'username', 'name', 'Имя', 'имя'];

let lastProgress = -1;
let lastAchievementCount = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function updateHUD(): void {
  const state = getState();

  updateScore(state.score);
  updateProgress();
  updateName();
  updateAchievements();
  updateVariables();
}

function isRenderedNode(nodeId: string): boolean {
  const node = nodeById[nodeId];
  return Boolean(node && (RENDERED_TYPES as readonly string[]).includes(node.type));
}

function updateScore(score: number): void {
  const scoreEl = document.getElementById('hud-score');
  if (!scoreEl) return;

  const current = parseInt(scoreEl.innerText, 10) || 0;
  if (current !== score) addPulse(scoreEl.closest('.stat-card') ?? scoreEl);
  animateValue(scoreEl, current, score, 500);
}

function updateProgress(): void {
  const total = Object.values(nodeById)
    .filter((node) => (RENDERED_TYPES as readonly string[]).includes(node.type))
    .length;
  const visited = new Set(
    getState().path
      .map((entry) => entry.nodeId)
      .filter(isRenderedNode),
  ).size;
  const progress = total > 0 ? Math.min(100, Math.round((visited / total) * 100)) : 0;

  const topText = document.getElementById('progress-text');
  const sideText = document.getElementById('progress-text-sidebar');
  const topFill = document.getElementById('top-progress-fill');
  const ring = document.getElementById('progress-ring') as SVGCircleElement | null;

  if (topText) topText.textContent = String(progress);
  if (sideText) sideText.textContent = `${progress}%`;
  if (topFill) topFill.style.width = `${progress}%`;
  if (ring) {
    const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100;
    ring.style.strokeDashoffset = String(offset);
  }

  if (lastProgress !== -1 && progress !== lastProgress) {
    const ringContainer = document.querySelector('.progress-ring-container');
    const topProgress = document.querySelector('.top-progress');
    if (ringContainer instanceof HTMLElement) addPulse(ringContainer);
    if (topProgress instanceof HTMLElement) addPulse(topProgress);
  }
  lastProgress = progress;
}

function updateName(): void {
  const state = getState();
  const nameEl = document.getElementById('hud-name');
  if (!nameEl) return;

  const key = NAME_KEYS.find((candidate) => state.variables[candidate] !== undefined);
  const value = key ? state.variables[key] : undefined;
  const next = value === undefined || value === '' ? 'Гость' : String(value);
  if (nameEl.textContent !== next) {
    nameEl.textContent = next;
    addPulse(nameEl.closest('.stat-card') ?? nameEl);
  }
}

function updateAchievements(): void {
  const state = getState();
  const count = document.getElementById('ach-count');
  const list = document.getElementById('achievements-list');
  if (count) count.textContent = String(state.achievements.length);

  if (state.achievements.length < lastAchievementCount) {
    lastAchievementCount = state.achievements.length;
  } else if (state.achievements.length > lastAchievementCount) {
    const newest = state.achievements[state.achievements.length - 1];
    if (newest) showAchievementToast(newest);
    addPulse(count ?? list);
    lastAchievementCount = state.achievements.length;
  }

  if (!list) return;

  const slotCount = Math.max(4, state.achievements.length);
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < slotCount; index += 1) {
    const title = state.achievements[index];
    const slot = document.createElement('div');
    slot.className = `ach-slot${title ? ' unlocked' : ''}`;
    slot.textContent = title ? String(index + 1) : '';

    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.textContent = title ?? 'Пока закрыто';
    slot.appendChild(tooltip);
    fragment.appendChild(slot);
  }

  list.replaceChildren(fragment);
}

function updateVariables(): void {
  const state = getState();
  const container = document.getElementById('hud-variables-container');
  const list = document.getElementById('hud-variables-list');
  if (!container || !list) return;

  const hiddenKeys = new Set(NAME_KEYS.map((key) => key.toLowerCase()));
  hiddenKeys.add('score');

  const entries = Object.entries(state.variables)
    .filter(([key]) => !hiddenKeys.has(key.toLowerCase()))
    .slice(0, 8);

  container.classList.toggle('hidden', entries.length === 0);
  if (entries.length === 0) {
    list.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const [key, value] of entries) {
    const row = document.createElement('div');
    row.className = 'var-card';

    const name = document.createElement('span');
    name.className = 'var-name';
    name.textContent = key;

    const renderedValue = document.createElement('span');
    renderedValue.className = 'var-value';
    renderedValue.textContent = formatValue(value);

    row.append(name, renderedValue);
    fragment.appendChild(row);
  }

  list.replaceChildren(fragment);
}

function addPulse(target: Element | null): void {
  if (!(target instanceof HTMLElement)) return;
  target.classList.remove('hud-pulse');
  void target.offsetWidth;
  target.classList.add('hud-pulse');
}

function showAchievementToast(title: string): void {
  let toast = document.getElementById('achievement-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'achievement-toast';
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const label = document.createElement('div');
    label.className = 'achievement-toast-title';
    label.textContent = 'Достижение открыто';

    const copy = document.createElement('div');
    copy.className = 'achievement-toast-copy';

    toast.append(label, copy);
    document.body.appendChild(toast);
  }

  const copy = toast.querySelector('.achievement-toast-copy');
  if (copy) copy.textContent = title;

  if (toastTimer) clearTimeout(toastTimer);
  requestAnimationFrame(() => toast?.classList.add('show'));
  toastTimer = setTimeout(() => {
    toast?.classList.remove('show');
  }, 2800);
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'да' : 'нет';
  return String(value);
}

function animateValue(
  el: HTMLElement,
  start: number,
  end: number,
  duration: number,
): void {
  if (start === end) {
    el.textContent = String(end);
    return;
  }

  const startTime = performance.now();

  function step(now: number): void {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = String(Math.round(start + (end - start) * progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

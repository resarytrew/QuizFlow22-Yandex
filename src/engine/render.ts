import type { QuizNode } from './types';
import { escapeHtml, parseText, sanitizeAssetUrl } from './sanitize';
import { playSound } from './media';
import { getDesignSettings } from './designState';
import {
  cleanupAllMedia,
  getRutubeId,
  pauseBgMusic,
  setupRutubeListener,
  unlockVideoControls,
  videoLock,
} from './media';
import { makeImageZoomable } from './lightbox';
import { nodeRenderers, renderDefault } from './renderers';
import { disposeActiveImportantTalksInteraction } from './importantTalksInteraction';

export function renderError(message: string): void {
  const view = document.getElementById('quiz-view');
  if (!view) return;

  const div = document.createElement('div');
  div.className = 'node-frame animate-fade-in';
  div.dataset.nodeType = 'error';

  const h = document.createElement('h2');
  h.className = 'node-title';
  h.textContent = 'Ошибка';
  div.appendChild(h);

  const p = document.createElement('div');
  p.className = 'node-desc';
  p.textContent = message;
  div.appendChild(p);

  const btn = document.createElement('button');
  btn.className = 'btn action-btn';
  btn.type = 'button';
  btn.textContent = 'Перезагрузить';
  btn.addEventListener('click', () => location.reload());
  div.appendChild(btn);

  view.replaceChildren(div);
}

export interface RenderNavigation {
  resolveNextNode(nodeId: string, handle: string | null): string | null;
  processNode(nodeId: string): void;
}

export function renderNode(node: QuizNode, navigation: RenderNavigation): void {
  disposeActiveImportantTalksInteraction();
  cleanupAllMedia();

  const view = document.getElementById('quiz-view');
  if (!view) return;

  const container = document.createElement('div');
  container.className = 'node-frame animate-fade-in';
  container.dataset.nodeType = node.type;

  renderMedia(node, container);

  const title = node.data.title ?? node.data.label;
  if (title) {
    const h = document.createElement('h1');
    h.className = 'node-title md-content';
    h.innerHTML = parseText(title);
    container.appendChild(h);
  }

  const desc = node.data.description ?? node.data.message ?? node.data.question ?? node.data.text;
  if (desc) {
    const p = document.createElement('div');
    p.className = 'node-desc md-content';
    p.innerHTML = parseText(desc);
    container.appendChild(p);
  }

  const controls = document.createElement('div');
  controls.id = 'quiz-controls-container';
  controls.className = 'node-controls';
  container.appendChild(controls);

  if (videoLock.isLocked) {
    applyVideoLock(controls, node);
  }

  const renderer = nodeRenderers[node.type] ?? renderDefault;
  renderer(node, controls, {
    continueFrom(currentNode, handle) {
      const next = navigation.resolveNextNode(currentNode.id, handle);
      if (!next) return false;
      navigation.processNode(next);
      return true;
    },
    navigateTo: navigation.processNode,
    playSound(type, overrideUrl) {
      playSound(type, getDesignSettings(), overrideUrl);
    },
  });

  Array.from(controls.children).forEach((child, index) => {
    if (!(child instanceof HTMLElement) || child.classList.contains('video-lock-overlay')) return;
    if (!child.style.getPropertyValue('--control-index')) {
      child.style.setProperty('--control-index', String(index));
    }
  });

  view.replaceChildren(container);
}

function renderMedia(node: QuizNode, container: HTMLElement): void {
  const rutubeId = getRutubeId(node.data.videoUrl);

  if (rutubeId) {
    const wrap = document.createElement('div');
    wrap.className = 'media-frame video-frame';

    const iframe = document.createElement('iframe');
    iframe.src = `https://rutube.ru/play/embed/${escapeHtml(rutubeId)}`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.loading = 'lazy';
    wrap.appendChild(iframe);
    container.appendChild(wrap);

    if (node.data.isRequiredWatch) {
      pauseBgMusic();
      videoLock.isLocked = true;
      videoLock.iframeWindow = iframe.contentWindow;
      setupRutubeListener();
    }
  } else if (node.data.imageUrl) {
    const safe = sanitizeAssetUrl(node.data.imageUrl);
    if (safe) {
      const media = document.createElement('div');
      media.className = 'media-frame image-frame';

      const img = document.createElement('img');
      img.src = safe;
      img.className = 'quiz-media-image';
      img.alt = node.data.title ?? node.data.label ?? '';
      img.loading = 'lazy';
      makeImageZoomable(img, safe, img.alt);

      media.appendChild(img);
      container.appendChild(media);
    }
  }
}

function applyVideoLock(controls: HTMLElement, node: QuizNode): void {
  controls.classList.add('locked-controls');

  const overlay = document.createElement('div');
  overlay.className = 'video-lock-overlay';

  const msg = document.createElement('div');
  msg.textContent = 'Посмотрите видео, чтобы продолжить';
  overlay.appendChild(msg);

  videoLock.overlayElement = overlay;
  videoLock.controlsElement = controls;
  controls.appendChild(overlay);

  const delay = (node.data.videoDuration ?? 15) * 1000;
  videoLock.manualUnlockTimer = setTimeout(() => {
    if (!videoLock.isLocked) return;
    const btn = document.createElement('button');
    btn.className = 'manual-unlock-btn';
    btn.type = 'button';
    btn.textContent = 'Я посмотрел(а) видео';
    btn.addEventListener('click', unlockVideoControls);
    overlay.appendChild(btn);
  }, delay);
}

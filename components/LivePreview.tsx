import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { generateQuizHtml } from '../services/quizGenerator';
import {
  createParentPreviewMessage,
  isAllowedPreviewOrigin,
  isPreviewPlayerMessage,
  toLayoutMeasurementPayload,
  toDesignElementSelectedPayload,
  type PreviewDesignElementSelectedPayload,
  type PreviewDeviceMode,
  type PreviewParentMessageType,
} from '../src/previewBridge/protocol';
import {
  getDesignElementEntry,
  isDesignElementRole,
  sanitizeDesignElementId,
  type DesignElementRole,
} from '../src/designMode/elementRegistry';
import {
  createLayoutDocumentPatch,
  normalizeLayoutDocumentState,
  resolveLayoutDocument,
  type LayoutDocument,
  type LayoutFrame,
  type LayoutScopeContext,
} from '../src/designMode/layoutDocument';
import {
  canMoveLayoutElement,
  canResizeLayoutElement,
  logicalFrameToViewport,
  moveLayoutFrame,
  resizeLayoutFrame,
  snapLayoutFrame,
  updateLayoutDocumentElementFrame,
  viewportFrameToLogical,
  type ResizeHandle,
  type SnapGuide,
} from '../src/designMode/layoutInteraction';
import type { DesignSettings } from '../types';

const STRUCTURE_DEBOUNCE_MS = 400;
const VISUAL_SELECTION_TEMPLATE_IDS = new Set(['default', 'newyear', 'screenQuiz']);
export const REQUEST_LAYOUT_MEASUREMENT_EVENT = 'quizflow:request-layout-measurement';
export const LAYOUT_MEASURED_EVENT = 'quizflow:layout-measured';

const DEVICE_VIEWPORTS: Record<PreviewDeviceMode, { label: string; width?: number; height?: number }> = {
  desktop: { label: 'Desktop', width: 1280, height: 820 },
  tablet: { label: 'Tablet', width: 834, height: 1112 },
  mobile: { label: 'Mobile', width: 390, height: 844 },
  fullscreen: { label: 'Fullscreen' },
};

interface LivePreviewProps {
  showHeader?: boolean;
  deviceMode?: PreviewDeviceMode;
  onDeviceModeChange?: (mode: PreviewDeviceMode) => void;
  allowedDeviceModes?: PreviewDeviceMode[];
  className?: string;
}

function stringifyPreviewStructure(value: unknown): string {
  return JSON.stringify(value);
}

function toDesignElementSelectedNodeId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as { currentNodeId?: unknown }).currentNodeId;
  return sanitizeDesignElementId(value);
}

function isSelectionForCurrentScreen(
  selectionNodeId: string | null,
  previewNodeId: string | null,
  requestedNodeId: string | null,
): boolean {
  if (!selectionNodeId) return true;
  const currentNodeId = previewNodeId ?? requestedNodeId;
  return !currentNodeId || selectionNodeId === currentNodeId;
}

interface FallbackSelectionOptions {
  readonly doc: Document;
  readonly getNodeId: () => string | null;
  readonly getMode: () => 'select' | 'test';
  readonly getSelection: () => PreviewDesignElementSelectedPayload | null;
  readonly getLayoutDocument: () => LayoutDocument | undefined;
  readonly onSelect: (selection: PreviewDesignElementSelectedPayload) => void;
  readonly onClear: () => void;
  readonly onLayoutFrameCommit: (commit: {
    elementId: string;
    role: DesignElementRole;
    nodeId: string | null;
    frame: LayoutFrame;
    action: 'move' | 'resize' | 'keyboard';
  }) => void;
}

const FALLBACK_ROLE_SELECTORS: Array<{ role: DesignElementRole; selector: string }> = [
  { role: 'answer-card', selector: '.sq-option, .sq-choice-card, .option, .answer-card, .option-btn, .sci-btn, .chalk-btn' },
  { role: 'primary-action', selector: '.btn, .action-btn, .sq-next, .sq-start-button, button[type="submit"]' },
  { role: 'question-title', selector: '.sq-title, .node-title, h1' },
  { role: 'question-description', selector: '.sq-desc, .node-desc, .story-body, .sq-story-body' },
  { role: 'media', selector: '.sq-media-card, .media-frame, .image-frame, .video-frame, img, video, iframe' },
  { role: 'answers-container', selector: '.sq-answers, .node-controls, #quiz-controls-container' },
  { role: 'timer', selector: '.sq-timer, .timer-display, #global-timer-display' },
  { role: 'progress', selector: '.progress, .progress-bar, .sq-progress' },
  { role: 'quiz-title', selector: '.sq-badge, #header-title' },
  { role: 'result-card', selector: '.result-card' },
  { role: 'question-card', selector: '.sq-question-card, .sq-info-card, .sq-feedback-card, .node-frame' },
  { role: 'quiz-shell', selector: '.sq-frame, .sq-stage, .sq-shell, #quiz-view' },
];

function fallbackElementId(role: DesignElementRole, element: Element): string {
  const explicit = sanitizeDesignElementId((element as HTMLElement).dataset.designElementId);
  if (explicit) return explicit;
  const fromId = sanitizeDesignElementId(element.id);
  if (fromId) return `${role}-${fromId}`;
  const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
  const index = Math.max(0, siblings.indexOf(element));
  return `${role}-${index}`;
}

function annotateFallbackElement(element: HTMLElement, role: DesignElementRole, nodeId: string | null): void {
  element.dataset.designRole = role;
  element.dataset.designElementId = fallbackElementId(role, element);
  if (nodeId) {
    element.dataset.designNodeId = nodeId;
  } else {
    delete element.dataset.designNodeId;
  }
}

function annotateFallbackElements(doc: Document, nodeId: string | null): void {
  FALLBACK_ROLE_SELECTORS.forEach((item) => {
    doc.querySelectorAll<HTMLElement>(item.selector).forEach((element) => {
      if (!element.dataset.designRole || !element.dataset.designElementId) {
        annotateFallbackElement(element, item.role, nodeId);
      }
    });
  });
}

function inferFallbackSelection(
  target: EventTarget | null,
  nodeId: string | null,
): { element: HTMLElement; selection: PreviewDesignElementSelectedPayload } | null {
  if (!(target instanceof Element)) return null;
  const explicit = target.closest<HTMLElement>('[data-design-role][data-design-element-id]');
  if (explicit && isDesignElementRole(explicit.dataset.designRole)) {
    const elementId = sanitizeDesignElementId(explicit.dataset.designElementId);
    if (elementId) {
      return {
        element: explicit,
        selection: {
          elementId,
          role: explicit.dataset.designRole,
          nodeId: sanitizeDesignElementId(explicit.dataset.designNodeId) ?? nodeId,
        },
      };
    }
  }

  for (const item of FALLBACK_ROLE_SELECTORS) {
    const element = target.closest<HTMLElement>(item.selector);
    if (element) {
      return {
        element,
        selection: {
          elementId: fallbackElementId(item.role, element),
          role: item.role,
          nodeId,
        },
      };
    }
  }

  return null;
}

function setupFallbackElementSelection(options: FallbackSelectionOptions): () => void {
  const { doc } = options;
  const overlay = doc.createElement('div');
  const label = doc.createElement('div');
  const selected = doc.createElement('div');
  const guidesLayer = doc.createElement('div');
  const style = doc.createElement('style');
  const handles: HTMLElement[] = [];
  const originalStyles = new WeakMap<HTMLElement, string | null>();
  const styledElements = new Set<HTMLElement>();
  let hoveredElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let interaction: {
    action: 'move' | 'resize';
    handle?: ResizeHandle;
    pointerId: number;
    startX: number;
    startY: number;
    initialFrame: LayoutFrame;
    liveFrame: LayoutFrame;
    target: HTMLElement;
    selection: PreviewDesignElementSelectedPayload;
    layout: LayoutDocument;
    raf: number | null;
    lastEvent: PointerEvent | null;
  } | null = null;
  annotateFallbackElements(doc, options.getNodeId());

  style.textContent = `
    .qf-fallback-design-hover,
    .qf-fallback-design-selected {
      position: fixed;
      z-index: 2147483000;
      box-sizing: border-box;
      border-radius: 10px;
      opacity: 0;
      transform: translate3d(0,0,0);
    }
    .qf-fallback-design-hover {
      pointer-events: none;
    }
    .qf-fallback-design-hover {
      border: 2px solid rgba(99, 102, 241, 0.85);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
    }
    .qf-fallback-design-selected {
      border: 2px solid rgba(14, 165, 233, 0.98);
      box-shadow: 0 0 0 5px rgba(14, 165, 233, 0.18);
      cursor: move;
      pointer-events: auto;
    }
    .qf-fallback-design-selected[data-qf-layout-disabled="true"] {
      cursor: default;
    }
    .qf-fallback-design-label {
      position: fixed;
      z-index: 2147483001;
      pointer-events: none;
      border-radius: 999px;
      background: #0f172a;
      color: #fff;
      font: 700 12px/1.2 system-ui, sans-serif;
      padding: 7px 10px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
      opacity: 0;
      white-space: nowrap;
    }
    .qf-layout-handle {
      position: fixed;
      z-index: 2147483002;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid #ffffff;
      border-radius: 999px;
      background: #0ea5e9;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
      opacity: 0;
      pointer-events: auto;
      touch-action: none;
    }
    .qf-layout-handle[data-handle="n"],
    .qf-layout-handle[data-handle="s"] { cursor: ns-resize; }
    .qf-layout-handle[data-handle="e"],
    .qf-layout-handle[data-handle="w"] { cursor: ew-resize; }
    .qf-layout-handle[data-handle="ne"],
    .qf-layout-handle[data-handle="sw"] { cursor: nesw-resize; }
    .qf-layout-handle[data-handle="nw"],
    .qf-layout-handle[data-handle="se"] { cursor: nwse-resize; }
    .qf-layout-guide-layer {
      position: fixed;
      inset: 0;
      z-index: 2147482999;
      pointer-events: none;
      overflow: hidden;
    }
    .qf-layout-guide {
      position: fixed;
      background: rgba(245, 158, 11, 0.95);
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.2);
    }
    .qf-layout-guide[data-axis="x"] {
      top: 0;
      bottom: 0;
      width: 2px;
    }
    .qf-layout-guide[data-axis="y"] {
      left: 0;
      right: 0;
      height: 2px;
    }
    .qf-layout-size-label {
      position: fixed;
      z-index: 2147483003;
      pointer-events: none;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.92);
      color: #fff;
      font: 700 11px/1.25 system-ui, sans-serif;
      padding: 5px 7px;
      opacity: 0;
      white-space: nowrap;
    }
  `;
  overlay.className = 'qf-fallback-design-hover';
  selected.className = 'qf-fallback-design-selected';
  label.className = 'qf-fallback-design-label';
  guidesLayer.className = 'qf-layout-guide-layer';
  overlay.setAttribute('aria-hidden', 'true');
  selected.tabIndex = 0;
  selected.setAttribute('aria-label', 'Selected design element drag and resize frame');
  label.setAttribute('aria-hidden', 'true');
  guidesLayer.setAttribute('aria-hidden', 'true');
  (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).forEach((handle) => {
    const node = doc.createElement('div');
    node.className = 'qf-layout-handle';
    node.dataset.handle = handle;
    node.setAttribute('aria-hidden', 'true');
    handles.push(node);
  });
  doc.head.appendChild(style);
  doc.body.append(guidesLayer, overlay, selected, label, ...handles);

  const getViewport = () => ({
    width: Math.max(1, doc.defaultView?.innerWidth ?? doc.documentElement.clientWidth ?? 1280),
    height: Math.max(1, doc.defaultView?.innerHeight ?? doc.documentElement.clientHeight ?? 720),
  });

  const annotatedElements = () => Array.from(doc.querySelectorAll<HTMLElement>('[data-design-role][data-design-element-id]'));

  const elementById = (elementId: string): HTMLElement | null => (
    annotatedElements().find((element) => element.dataset.designElementId === elementId) ?? null
  );

  const saveOriginalStyle = (element: HTMLElement) => {
    if (!originalStyles.has(element)) originalStyles.set(element, element.getAttribute('style'));
    styledElements.add(element);
  };

  const setElementViewportFrame = (element: HTMLElement, frame: LayoutFrame, zIndex?: number) => {
    saveOriginalStyle(element);
    element.style.position = 'fixed';
    element.style.left = `${frame.x}px`;
    element.style.top = `${frame.y}px`;
    element.style.width = `${frame.width}px`;
    element.style.height = `${frame.height}px`;
    element.style.maxWidth = 'none';
    element.style.boxSizing = 'border-box';
    element.style.zIndex = String(zIndex ?? 1);
  };

  const restoreElementStyles = () => {
    styledElements.forEach((element) => {
      const original = originalStyles.get(element);
      if (original === null) element.removeAttribute('style');
      else if (original !== undefined) element.setAttribute('style', original);
    });
    styledElements.clear();
  };

  const otherLayoutFrames = (layout: LayoutDocument, elementId: string) => (
    Object.values(layout.elements)
      .filter((item) => item.id !== elementId && !item.hidden)
      .map((item) => ({
        id: item.id,
        frame: logicalFrameToViewport(item.frame, layout.baseViewport, getViewport()),
      }))
  );

  const applyFreeLayout = () => {
    const layout = options.getLayoutDocument();
    if (!layout || layout.mode !== 'free' || options.getMode() !== 'select') {
      restoreElementStyles();
      return;
    }
    annotateFallbackElements(doc, options.getNodeId());
    Object.values(layout.elements).forEach((item) => {
      if (item.role === 'canvas-background') return;
      const element = elementById(item.id);
      if (!element) return;
      if (item.hidden) {
        saveOriginalStyle(element);
        element.style.display = 'none';
        return;
      }
      setElementViewportFrame(
        element,
        logicalFrameToViewport(item.frame, layout.baseViewport, getViewport()),
        item.zIndex,
      );
    });
  };

  const renderGuides = (guides: SnapGuide[], frame: LayoutFrame | null = null) => {
    guidesLayer.replaceChildren();
    guides.forEach((guide) => {
      const line = doc.createElement('div');
      line.className = 'qf-layout-guide';
      line.dataset.axis = guide.axis;
      if (guide.axis === 'x') line.style.left = `${guide.position}px`;
      else line.style.top = `${guide.position}px`;
      guidesLayer.appendChild(line);
    });
    if (frame) {
      label.textContent = `${Math.round(frame.width)} x ${Math.round(frame.height)} · x ${Math.round(frame.x)}, y ${Math.round(frame.y)}`;
      label.style.left = `${Math.max(8, frame.x)}px`;
      label.style.top = `${Math.max(8, frame.y - 34)}px`;
      label.style.opacity = '1';
    }
  };

  const clearGuides = () => {
    guidesLayer.replaceChildren();
  };

  const position = (box: HTMLElement, element: HTMLElement | null) => {
    if (!element || options.getMode() !== 'select') {
      box.style.opacity = '0';
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      box.style.opacity = '0';
      return;
    }
    box.style.left = `${Math.max(0, rect.left)}px`;
    box.style.top = `${Math.max(0, rect.top)}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.opacity = '1';
  };

  const positionHandles = () => {
    const selection = options.getSelection();
    const layout = options.getLayoutDocument();
    const layoutElement = selection && layout?.elements[selection.elementId];
    const canEdit = Boolean(layout && layout.mode === 'free' && layoutElement && canResizeLayoutElement(layoutElement));
    if (!selectedElement || !canEdit || options.getMode() !== 'select') {
      handles.forEach((handle) => { handle.style.opacity = '0'; });
      selected.dataset.qfLayoutDisabled = 'true';
      return;
    }
    selected.dataset.qfLayoutDisabled = 'false';
    const rect = selectedElement.getBoundingClientRect();
    const points: Record<ResizeHandle, [number, number]> = {
      nw: [rect.left, rect.top],
      n: [rect.left + rect.width / 2, rect.top],
      ne: [rect.right, rect.top],
      e: [rect.right, rect.top + rect.height / 2],
      se: [rect.right, rect.bottom],
      s: [rect.left + rect.width / 2, rect.bottom],
      sw: [rect.left, rect.bottom],
      w: [rect.left, rect.top + rect.height / 2],
    };
    handles.forEach((handle) => {
      const key = handle.dataset.handle as ResizeHandle;
      const point = points[key];
      handle.style.left = `${point[0]}px`;
      handle.style.top = `${point[1]}px`;
      handle.style.opacity = '1';
    });
  };

  const update = () => {
    if (!interaction) applyFreeLayout();
    position(overlay, hoveredElement && hoveredElement !== selectedElement ? hoveredElement : null);
    position(selected, selectedElement);
    positionHandles();
    const selection = options.getSelection();
    if (!selectedElement || !selection || options.getMode() !== 'select') {
      label.style.opacity = '0';
      return;
    }
    const rect = selectedElement.getBoundingClientRect();
    label.textContent = getDesignElementEntry(selection.role).label;
    label.style.left = `${Math.max(8, Math.min(rect.left, doc.defaultView?.innerWidth ?? 9999))}px`;
    label.style.top = `${Math.max(8, rect.top - 34)}px`;
    label.style.opacity = '1';
  };

  const observe = (element: HTMLElement | null) => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (!element || typeof ResizeObserver === 'undefined') return;
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
  };

  const initialSelection = options.getSelection();
  if (initialSelection) {
    selectedElement = elementById(initialSelection.elementId);
    observe(selectedElement);
  }

  const onPointerMove = (event: PointerEvent) => {
    if (interaction) return;
    if (options.getMode() !== 'select') return;
    annotateFallbackElements(doc, options.getNodeId());
    hoveredElement = inferFallbackSelection(event.target, options.getNodeId())?.element ?? null;
    update();
  };

  const onClick = (event: MouseEvent) => {
    if (options.getMode() !== 'select') return;
    annotateFallbackElements(doc, options.getNodeId());
    const inferred = inferFallbackSelection(event.target, options.getNodeId());
    if (!inferred) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    selectedElement = inferred.element;
    observe(selectedElement);
    options.onSelect(inferred.selection);
    update();
    selected.focus({ preventScroll: true });
  };

  const restoreInteractionFrame = () => {
    if (!interaction) return;
    setElementViewportFrame(interaction.target, interaction.initialFrame, interaction.layout.elements[interaction.selection.elementId]?.zIndex);
    interaction.liveFrame = interaction.initialFrame;
    update();
  };

  const finishInteraction = (commit: boolean) => {
    if (!interaction) return;
    const current = interaction;
    if (current.raf !== null && doc.defaultView) {
      doc.defaultView.cancelAnimationFrame(current.raf);
    }
    interaction = null;
    clearGuides();
    try {
      selected.releasePointerCapture(current.pointerId);
    } catch {
      // Pointer capture can already be gone after iframe focus changes.
    }
    if (commit) {
      options.onLayoutFrameCommit({
        elementId: current.selection.elementId,
        role: current.selection.role,
        nodeId: current.selection.nodeId,
        frame: viewportFrameToLogical(current.liveFrame, getViewport(), current.layout.baseViewport),
        action: current.action,
      });
    } else {
      setElementViewportFrame(current.target, current.initialFrame, current.layout.elements[current.selection.elementId]?.zIndex);
    }
    update();
  };

  const scheduleInteraction = (event: PointerEvent) => {
    if (!interaction) return;
    interaction.lastEvent = event;
    if (interaction.raf !== null || !doc.defaultView) return;
    interaction.raf = doc.defaultView.requestAnimationFrame(() => {
      if (!interaction?.lastEvent) return;
      const current = interaction;
      const latest = current.lastEvent;
      if (!latest) return;
      current.raf = null;
      const dx = latest.clientX - current.startX;
      const dy = latest.clientY - current.startY;
      const element = current.layout.elements[current.selection.elementId];
      const rawFrame = current.action === 'resize' && current.handle
        ? resizeLayoutFrame(current.initialFrame, current.handle, dx, dy, {
            viewport: getViewport(),
            element,
            preserveAspectRatio: latest.shiftKey,
          })
        : moveLayoutFrame(current.initialFrame, dx, dy, {
            viewport: getViewport(),
            element,
          });
      const snapped = snapLayoutFrame(rawFrame, getViewport(), otherLayoutFrames(current.layout, current.selection.elementId));
      current.liveFrame = snapped.frame;
      setElementViewportFrame(current.target, snapped.frame, element?.zIndex);
      renderGuides(snapped.guides, snapped.frame);
      position(selected, current.target);
      positionHandles();
    });
  };

  const beginInteraction = (event: PointerEvent, handle?: ResizeHandle) => {
    if (options.getMode() !== 'select') return;
    const selection = options.getSelection();
    const layout = options.getLayoutDocument();
    if (!selection || !selectedElement || !layout || layout.mode !== 'free') return;
    const element = layout.elements[selection.elementId];
    if (!element) return;
    const allowed = handle ? canResizeLayoutElement(element) : canMoveLayoutElement(element);
    if (!allowed) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const rect = selectedElement.getBoundingClientRect();
    interaction = {
      action: handle ? 'resize' : 'move',
      ...(handle ? { handle } : {}),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialFrame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      liveFrame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      target: selectedElement,
      selection,
      layout,
      raf: null,
      lastEvent: null,
    };
    try {
      selected.setPointerCapture(event.pointerId);
    } catch {
      // Some iframe/browser combinations only allow capture on the event target.
    }
  };

  const onSelectedPointerDown = (event: PointerEvent) => {
    const handle = (event.target as HTMLElement | null)?.dataset.handle as ResizeHandle | undefined;
    beginInteraction(event, handle);
  };

  const onDocumentPointerMove = (event: PointerEvent) => {
    if (!interaction) return;
    event.preventDefault();
    event.stopPropagation();
    scheduleInteraction(event);
  };

  const onDocumentPointerUp = (event: PointerEvent) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishInteraction(true);
  };

  const moveSelectionByKeyboard = (event: KeyboardEvent) => {
    const selection = options.getSelection();
    const layout = options.getLayoutDocument();
    if (!selection || !selectedElement || !layout || layout.mode !== 'free') return false;
    const element = layout.elements[selection.elementId];
    if (!element || !canMoveLayoutElement(element)) return false;
    const step = event.shiftKey ? 10 : 1;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    if (dx === 0 && dy === 0) return false;
    const rect = selectedElement.getBoundingClientRect();
    const moved = moveLayoutFrame(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      dx,
      dy,
      { viewport: getViewport(), element },
    );
    setElementViewportFrame(selectedElement, moved, element.zIndex);
    options.onLayoutFrameCommit({
      elementId: selection.elementId,
      role: selection.role,
      nodeId: selection.nodeId,
      frame: viewportFrameToLogical(moved, getViewport(), layout.baseViewport),
      action: 'keyboard',
    });
    update();
    return true;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (options.getMode() !== 'select') return;
    if (interaction && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      restoreInteractionFrame();
      finishInteraction(false);
      return;
    }
    if (event.key.startsWith('Arrow') && moveSelectionByKeyboard(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Escape' || !selectedElement) return;
    event.preventDefault();
    event.stopPropagation();
    selectedElement = null;
    observe(null);
    options.onClear();
    clearGuides();
    update();
  };

  doc.addEventListener('pointermove', onPointerMove, true);
  doc.addEventListener('pointermove', onDocumentPointerMove, true);
  doc.addEventListener('pointerup', onDocumentPointerUp, true);
  selected.addEventListener('pointerdown', onSelectedPointerDown);
  handles.forEach((handle) => handle.addEventListener('pointerdown', onSelectedPointerDown));
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('scroll', update, true);
  doc.defaultView?.addEventListener('resize', update);
  doc.fonts?.ready.then(update).catch(() => undefined);
  doc.querySelectorAll('img').forEach((image) => image.addEventListener('load', update));
  update();

  return () => {
    doc.removeEventListener('pointermove', onPointerMove, true);
    doc.removeEventListener('pointermove', onDocumentPointerMove, true);
    doc.removeEventListener('pointerup', onDocumentPointerUp, true);
    selected.removeEventListener('pointerdown', onSelectedPointerDown);
    handles.forEach((handle) => handle.removeEventListener('pointerdown', onSelectedPointerDown));
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('keydown', onKeyDown, true);
    doc.removeEventListener('scroll', update, true);
    doc.defaultView?.removeEventListener('resize', update);
    doc.querySelectorAll('img').forEach((image) => image.removeEventListener('load', update));
    resizeObserver?.disconnect();
    restoreElementStyles();
    style.remove();
    overlay.remove();
    selected.remove();
    guidesLayer.remove();
    handles.forEach((handle) => handle.remove());
    label.remove();
  };
}

const LivePreview: React.FC<LivePreviewProps> = ({
  showHeader = true,
  deviceMode: controlledDeviceMode,
  onDeviceModeChange,
  allowedDeviceModes,
  className = '',
}) => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNodeId = useCanvasStore((state) => state.selectedNode?.id ?? null);
  const globalTimer = useQuizDataStore((state) => state.globalTimer);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const previewStartNodeId = useUIStore((state) => state.previewStartNodeId);
  const editorMode = useUIStore((state) => state.editorMode);
  const designInteractionMode = useUIStore((state) => state.designInteractionMode);
  const selectedDesignElement = useUIStore((state) => state.selectedDesignElement);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
  const templateId = useQuizDataStore((state) => state.templateId);
  const currentQuizName = useQuizDataStore((state) => state.currentQuizName);
  const [htmlContent, setHtmlContent] = useState('');
  const [bridgeReady, setBridgeReady] = useState(false);
  const [uncontrolledDeviceMode, setUncontrolledDeviceMode] = useState<PreviewDeviceMode>('desktop');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDesignRef = useRef(designSettings);
  const latestNodesRef = useRef(nodes);
  const latestNodeIdRef = useRef<string | null>(selectedNodeId ?? previewStartNodeId ?? null);
  const latestPreviewNodeIdRef = useRef<string | null>(selectedNodeId ?? previewStartNodeId ?? null);
  const deviceMode = controlledDeviceMode ?? uncontrolledDeviceMode;
  const modes = allowedDeviceModes ?? (Object.keys(DEVICE_VIEWPORTS) as PreviewDeviceMode[]);
  const latestDeviceModeRef = useRef<PreviewDeviceMode>(deviceMode);
  const latestInteractionModeRef = useRef(designInteractionMode);
  const [iframeLoadCount, setIframeLoadCount] = useState(0);

  const structureInputs = useMemo(() => ({
    nodes,
    edges,
    globalTimer,
    templateId,
    currentQuizName,
  }), [nodes, edges, globalTimer, templateId, currentQuizName]);

  const structureSignature = useMemo(
    () => stringifyPreviewStructure(structureInputs),
    [structureInputs],
  );

  const postPreviewMessage = useCallback(<TPayload,>(type: PreviewParentMessageType, payload?: TPayload) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(createParentPreviewMessage(type, payload), window.location.origin);
  }, []);

  useEffect(() => {
    latestDesignRef.current = designSettings;
    if (bridgeReady) {
      postPreviewMessage('DESIGN_PATCH', { designSettings });
    }
  }, [bridgeReady, designSettings, postPreviewMessage]);

  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    latestNodeIdRef.current = selectedNodeId ?? previewStartNodeId ?? null;
    if (bridgeReady && latestNodeIdRef.current) {
      postPreviewMessage('NAVIGATE_TO_NODE', { nodeId: latestNodeIdRef.current });
    }
  }, [bridgeReady, postPreviewMessage, previewStartNodeId, selectedNodeId]);

  useEffect(() => {
    latestDeviceModeRef.current = deviceMode;
    if (bridgeReady) {
      postPreviewMessage('SET_PREVIEW_MODE', { mode: deviceMode, interactionMode: latestInteractionModeRef.current });
    }
  }, [bridgeReady, deviceMode, postPreviewMessage]);

  useEffect(() => {
    latestInteractionModeRef.current = designInteractionMode;
    if (bridgeReady) {
      postPreviewMessage('SET_PREVIEW_MODE', { mode: latestDeviceModeRef.current, interactionMode: designInteractionMode });
    }
  }, [bridgeReady, designInteractionMode, postPreviewMessage]);

  const handleDeviceModeChange = useCallback((mode: PreviewDeviceMode) => {
    if (!controlledDeviceMode) {
      setUncontrolledDeviceMode(mode);
    }
    onDeviceModeChange?.(mode);
  }, [controlledDeviceMode, onDeviceModeChange]);

  useEffect(() => {
    const onLayoutMeasurementRequest = () => {
      if (!bridgeReady) return;
      postPreviewMessage('MEASURE_LAYOUT_ELEMENTS');
    };
    window.addEventListener(REQUEST_LAYOUT_MEASUREMENT_EVENT, onLayoutMeasurementRequest);
    return () => window.removeEventListener(REQUEST_LAYOUT_MEASUREMENT_EVENT, onLayoutMeasurementRequest);
  }, [bridgeReady, postPreviewMessage]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      if (!isAllowedPreviewOrigin(event.origin, window.location.origin)) return;
      if (!isPreviewPlayerMessage(event.data)) return;

      if (event.data.type === 'PREVIEW_READY') {
        setBridgeReady(true);
        postPreviewMessage('PREVIEW_INIT', {
          designSettings: latestDesignRef.current,
          nodeId: latestNodeIdRef.current,
          mode: latestDeviceModeRef.current,
          interactionMode: latestInteractionModeRef.current,
        });
      } else if (event.data.type === 'PREVIEW_ERROR') {
        console.warn('[LivePreview] Player bridge error', event.data.payload);
      } else if (event.data.type === 'PREVIEW_NODE_CHANGED') {
        const currentNodeId = toDesignElementSelectedNodeId(event.data.payload);
        if (currentNodeId) latestPreviewNodeIdRef.current = currentNodeId;
      } else if (event.data.type === 'DESIGN_ELEMENT_SELECTED') {
        const selection = toDesignElementSelectedPayload(event.data.payload);
        if (!selection) return;
        if (!isSelectionForCurrentScreen(selection.nodeId, latestPreviewNodeIdRef.current, latestNodeIdRef.current)) return;
        setSelectedDesignElement(selection);
      } else if (event.data.type === 'DESIGN_ELEMENT_SELECTION_CLEARED') {
        setSelectedDesignElement(null);
      } else if (event.data.type === 'LAYOUT_ELEMENTS_MEASURED') {
        const measurement = toLayoutMeasurementPayload(event.data.payload);
        if (!measurement) return;
        window.dispatchEvent(new CustomEvent(LAYOUT_MEASURED_EVENT, { detail: measurement }));
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postPreviewMessage, setSelectedDesignElement]);

  const getCurrentNodeContext = useCallback(() => {
    const nodeId = latestPreviewNodeIdRef.current ?? latestNodeIdRef.current;
    const node = nodeId ? latestNodesRef.current.find((item) => item.id === nodeId) : null;
    return {
      nodeId,
      nodeType: typeof node?.type === 'string' ? node.type : null,
    };
  }, []);

  const getLayoutContext = useCallback((settings: DesignSettings): LayoutScopeContext => {
    const current = getCurrentNodeContext();
    const state = normalizeLayoutDocumentState((settings as { layoutDocuments?: unknown }).layoutDocuments);
    if (current.nodeId && state?.nodes?.[current.nodeId]) return { scope: 'node', nodeId: current.nodeId, nodeType: current.nodeType };
    if (current.nodeType && state?.nodeTypes?.[current.nodeType]) return { scope: 'nodeType', nodeType: current.nodeType };
    return { scope: 'global' };
  }, [getCurrentNodeContext]);

  const getActiveLayoutDocument = useCallback(() => {
    const current = getCurrentNodeContext();
    return resolveLayoutDocument(latestDesignRef.current as DesignSettings, current);
  }, [getCurrentNodeContext]);

  const commitLayoutFrame = useCallback((commit: {
    elementId: string;
    role: DesignElementRole;
    nodeId: string | null;
    frame: LayoutFrame;
    action: 'move' | 'resize' | 'keyboard';
  }) => {
    const settings = latestDesignRef.current as DesignSettings;
    const current = getCurrentNodeContext();
    const existing = resolveLayoutDocument(settings, current);
    if (!existing || existing.mode !== 'free') return;
    const nextDocument = updateLayoutDocumentElementFrame(existing, commit.elementId, commit.frame);
    const patch = createLayoutDocumentPatch(settings, getLayoutContext(settings), nextDocument);
    updateDesignSettings(patch as never, {
      label: commit.action === 'resize'
        ? 'Resize layout element'
        : commit.action === 'keyboard'
          ? 'Move layout element with keyboard'
          : 'Move layout element',
      ...(commit.action === 'keyboard' ? { coalesceKey: `layout-keyboard-${commit.elementId}` } : {}),
    });
  }, [getCurrentNodeContext, getLayoutContext, updateDesignSettings]);

  useEffect(() => {
    if (editorMode !== 'design') return undefined;
    if (!VISUAL_SELECTION_TEMPLATE_IDS.has(templateId)) return undefined;
    if (iframeLoadCount === 0) return undefined;
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame?.contentWindow || !doc?.body) return undefined;
    if (doc.documentElement.dataset.qfDesignSelectionNative === 'true') return undefined;

    return setupFallbackElementSelection({
      doc,
      getNodeId: () => latestPreviewNodeIdRef.current ?? latestNodeIdRef.current,
      getMode: () => latestInteractionModeRef.current,
      getSelection: () => selectedDesignElement,
      getLayoutDocument: getActiveLayoutDocument,
      onSelect: (selection) => {
        if (!isSelectionForCurrentScreen(selection.nodeId, latestPreviewNodeIdRef.current, latestNodeIdRef.current)) return;
        setSelectedDesignElement(selection);
      },
      onClear: () => setSelectedDesignElement(null),
      onLayoutFrameCommit: commitLayoutFrame,
    });
  }, [commitLayoutFrame, editorMode, getActiveLayoutDocument, iframeLoadCount, selectedDesignElement, setSelectedDesignElement, templateId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const html = generateQuizHtml(
        {
          nodes: structureInputs.nodes,
          edges: structureInputs.edges,
          globalTimer: structureInputs.globalTimer,
          designSettings: latestDesignRef.current as unknown as Record<string, unknown>,
          quizId: null,
          templateId: structureInputs.templateId,
          currentQuizName: structureInputs.currentQuizName,
          startNodeId: latestNodeIdRef.current ?? undefined,
          previewBridge: { enabled: true, version: 1 },
        },
        { preview: true },
      );
      setBridgeReady(false);
      setHtmlContent(html);
    }, STRUCTURE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [structureInputs, structureSignature]);

  const viewport = DEVICE_VIEWPORTS[deviceMode];
  const viewportStyle = deviceMode === 'fullscreen'
    ? undefined
    : {
        width: `min(100%, ${viewport.width}px)`,
        height: `min(100%, ${viewport.height}px)`,
      };

  return (
    <div className={`flex h-full w-full flex-col bg-slate-100 ${className}`}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Live Preview</h2>
            <p className="text-xs text-slate-500">Design updates apply without restarting the player.</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Preview device size">
            {modes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={[
                  'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
                  deviceMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white',
                ].join(' ')}
                aria-pressed={deviceMode === mode}
                onClick={() => handleDeviceModeChange(mode)}
              >
                {DEVICE_VIEWPORTS[mode].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        }}
      >
        <div
          className={[
            'overflow-hidden bg-slate-900 shadow-2xl transition-[width,height] duration-200',
            deviceMode === 'fullscreen' ? 'h-full w-full rounded-xl' : 'rounded-[28px] border-[10px] border-slate-900',
          ].join(' ')}
          style={viewportStyle}
          data-device-mode={deviceMode}
        >
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Live Quiz Preview"
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            onLoad={() => setIframeLoadCount((count) => count + 1)}
          />
        </div>
      </div>
    </div>
  );
};

export default LivePreview;

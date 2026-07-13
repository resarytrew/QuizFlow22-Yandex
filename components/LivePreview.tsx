import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { generateQuizHtml } from '../services/quizGenerator';
import {
  createParentPreviewMessage,
  isAllowedPreviewOrigin,
  isPreviewPlayerMessage,
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

const STRUCTURE_DEBOUNCE_MS = 400;
const VISUAL_SELECTION_TEMPLATE_IDS = new Set(['default', 'newyear', 'screenQuiz']);

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
  readonly onSelect: (selection: PreviewDesignElementSelectedPayload) => void;
  readonly onClear: () => void;
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
  const style = doc.createElement('style');
  let hoveredElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  annotateFallbackElements(doc, options.getNodeId());

  style.textContent = `
    .qf-fallback-design-hover,
    .qf-fallback-design-selected {
      position: fixed;
      z-index: 2147483000;
      pointer-events: none;
      box-sizing: border-box;
      border-radius: 10px;
      opacity: 0;
      transform: translate3d(0,0,0);
    }
    .qf-fallback-design-hover {
      border: 2px solid rgba(99, 102, 241, 0.85);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
    }
    .qf-fallback-design-selected {
      border: 2px solid rgba(14, 165, 233, 0.98);
      box-shadow: 0 0 0 5px rgba(14, 165, 233, 0.18);
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
  `;
  overlay.className = 'qf-fallback-design-hover';
  selected.className = 'qf-fallback-design-selected';
  label.className = 'qf-fallback-design-label';
  overlay.setAttribute('aria-hidden', 'true');
  selected.setAttribute('aria-hidden', 'true');
  label.setAttribute('aria-hidden', 'true');
  doc.head.appendChild(style);
  doc.body.append(overlay, selected, label);

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

  const update = () => {
    position(overlay, hoveredElement && hoveredElement !== selectedElement ? hoveredElement : null);
    position(selected, selectedElement);
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

  const onPointerMove = (event: PointerEvent) => {
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
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (options.getMode() !== 'select' || event.key !== 'Escape' || !selectedElement) return;
    event.preventDefault();
    event.stopPropagation();
    selectedElement = null;
    observe(null);
    options.onClear();
    update();
  };

  doc.addEventListener('pointermove', onPointerMove, true);
  doc.addEventListener('click', onClick, true);
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('scroll', update, true);
  doc.defaultView?.addEventListener('resize', update);
  doc.fonts?.ready.then(update).catch(() => undefined);
  doc.querySelectorAll('img').forEach((image) => image.addEventListener('load', update));

  return () => {
    doc.removeEventListener('pointermove', onPointerMove, true);
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('keydown', onKeyDown, true);
    doc.removeEventListener('scroll', update, true);
    doc.defaultView?.removeEventListener('resize', update);
    doc.querySelectorAll('img').forEach((image) => image.removeEventListener('load', update));
    resizeObserver?.disconnect();
    style.remove();
    overlay.remove();
    selected.remove();
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
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postPreviewMessage, setSelectedDesignElement]);

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
      onSelect: (selection) => {
        if (!isSelectionForCurrentScreen(selection.nodeId, latestPreviewNodeIdRef.current, latestNodeIdRef.current)) return;
        setSelectedDesignElement(selection);
      },
      onClear: () => setSelectedDesignElement(null),
    });
  }, [editorMode, iframeLoadCount, selectedDesignElement, setSelectedDesignElement, templateId]);

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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { generateQuizHtml } from '../services/quizGenerator';
import {
  createParentPreviewMessage,
  isAllowedPreviewOrigin,
  isPreviewPlayerMessage,
  type PreviewDeviceMode,
  type PreviewParentMessageType,
} from '../src/previewBridge/protocol';

const STRUCTURE_DEBOUNCE_MS = 400;

const DEVICE_VIEWPORTS: Record<PreviewDeviceMode, { label: string; width?: number; height?: number }> = {
  desktop: { label: 'Desktop', width: 1280, height: 820 },
  tablet: { label: 'Tablet', width: 834, height: 1112 },
  mobile: { label: 'Mobile', width: 390, height: 844 },
  fullscreen: { label: 'Fullscreen' },
};

function stringifyPreviewStructure(value: unknown): string {
  return JSON.stringify(value);
}

const LivePreview: React.FC = () => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNodeId = useCanvasStore((state) => state.selectedNode?.id ?? null);
  const globalTimer = useQuizDataStore((state) => state.globalTimer);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const previewStartNodeId = useUIStore((state) => state.previewStartNodeId);
  const templateId = useQuizDataStore((state) => state.templateId);
  const currentQuizName = useQuizDataStore((state) => state.currentQuizName);
  const [htmlContent, setHtmlContent] = useState('');
  const [bridgeReady, setBridgeReady] = useState(false);
  const [deviceMode, setDeviceMode] = useState<PreviewDeviceMode>('desktop');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDesignRef = useRef(designSettings);
  const latestNodeIdRef = useRef<string | null>(selectedNodeId ?? previewStartNodeId ?? null);
  const latestDeviceModeRef = useRef<PreviewDeviceMode>(deviceMode);

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
      postPreviewMessage('SET_PREVIEW_MODE', { mode: deviceMode });
    }
  }, [bridgeReady, deviceMode, postPreviewMessage]);

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
        });
      } else if (event.data.type === 'PREVIEW_ERROR') {
        console.warn('[LivePreview] Player bridge error', event.data.payload);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postPreviewMessage]);

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
    <div className="flex h-full w-full flex-col bg-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Live Preview</h2>
          <p className="text-xs text-slate-500">Design updates apply without restarting the player.</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Preview device size">
          {(Object.keys(DEVICE_VIEWPORTS) as PreviewDeviceMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={[
                'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
                deviceMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white',
              ].join(' ')}
              aria-pressed={deviceMode === mode}
              onClick={() => setDeviceMode(mode)}
            >
              {DEVICE_VIEWPORTS[mode].label}
            </button>
          ))}
        </div>
      </div>

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
          />
        </div>
      </div>
    </div>
  );
};

export default LivePreview;

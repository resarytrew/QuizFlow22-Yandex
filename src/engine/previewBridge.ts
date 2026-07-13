import type { DesignSettings, QuizData } from "./types";
import { applyDesign } from "./design";
import { getDesignSettings, setDesignSettings } from "./designState";
import { getState, resetState } from "./state";
import {
  createPlayerPreviewMessage,
  isAllowedPreviewOrigin,
  isPlainRecord,
  isPreviewDeviceMode,
  isPreviewParentMessage,
  toDesignSettingsPayload,
  toSafeNodeId,
  type PreviewDeviceMode,
  type PreviewErrorPayload,
  type PreviewStatePayload,
} from "../previewBridge/protocol";

type NavigateTo = (nodeId: string) => void;

interface PreviewBridgeOptions {
  readonly quizData: QuizData;
  readonly navigateTo: NavigateTo;
  readonly initialNodeId: string;
}

interface PreviewBridgeConfig {
  readonly enabled?: boolean;
  readonly version?: number;
}

let activeWindow: Window | null = null;
let targetOrigin: string | null = null;

function isBridgeEnabled(quizData: QuizData): boolean {
  const config = (quizData as { previewBridge?: PreviewBridgeConfig }).previewBridge;
  return config?.enabled === true && config.version === 1;
}

function mergeDefined<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const next: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = next[key];
    if (isPlainRecord(current) && isPlainRecord(value)) {
      next[key] = mergeDefined(current, value);
    } else {
      next[key] = value;
    }
  }

  return next as T;
}

function postToParent<TPayload>(type: "PREVIEW_READY" | "PREVIEW_NODE_CHANGED" | "PREVIEW_STATE_CHANGED" | "PREVIEW_ERROR", payload?: TPayload): void {
  if (!activeWindow || !targetOrigin || activeWindow.parent === activeWindow) return;
  activeWindow.parent.postMessage(createPlayerPreviewMessage(type, payload), targetOrigin);
}

function postPreviewError(message: string): void {
  postToParent<PreviewErrorPayload>("PREVIEW_ERROR", { message });
}

function getPreviewStatePayload(): PreviewStatePayload {
  const state = getState();
  return {
    currentNodeId: state.currentNodeId,
    score: state.score,
    pathLength: state.path.length,
  };
}

function applyPreviewDesign(value: unknown, mode: "patch" | "replace"): void {
  if (!isPlainRecord(value)) return;
  const current = getDesignSettings() ?? {};
  const next = mode === "patch"
    ? mergeDefined(current as Record<string, unknown>, value)
    : value;
  const design = next as DesignSettings;
  setDesignSettings(design);
  applyDesign(design);
}

function readNodeId(payload: unknown): string | null {
  if (!isPlainRecord(payload)) return null;
  return toSafeNodeId(payload.nodeId);
}

function readMode(payload: unknown): PreviewDeviceMode | null {
  if (!isPlainRecord(payload)) return null;
  return isPreviewDeviceMode(payload.mode) ? payload.mode : null;
}

export function notifyPreviewNodeChanged(nodeId: string): void {
  postToParent("PREVIEW_NODE_CHANGED", { currentNodeId: nodeId });
  postToParent("PREVIEW_STATE_CHANGED", getPreviewStatePayload());
}

export function notifyPreviewStateChanged(): void {
  postToParent("PREVIEW_STATE_CHANGED", getPreviewStatePayload());
}

export function setupPreviewBridge(options: PreviewBridgeOptions): () => void {
  if (!isBridgeEnabled(options.quizData)) return () => undefined;
  if (window.parent === window) return () => undefined;

  activeWindow = window;
  targetOrigin = window.location.origin;

  const onMessage = (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent) return;
    if (!isAllowedPreviewOrigin(event.origin, window.location.origin)) return;
    if (!isPreviewParentMessage(event.data)) return;

    try {
      switch (event.data.type) {
        case "PREVIEW_INIT": {
          const design = toDesignSettingsPayload(event.data.payload);
          if (design !== undefined) applyPreviewDesign(design, "replace");
          const nodeId = readNodeId(event.data.payload);
          if (nodeId) options.navigateTo(nodeId);
          break;
        }
        case "DESIGN_PATCH": {
          const design = toDesignSettingsPayload(event.data.payload);
          if (design !== undefined) applyPreviewDesign(design, "patch");
          break;
        }
        case "DESIGN_REPLACE": {
          const design = toDesignSettingsPayload(event.data.payload);
          if (design !== undefined) applyPreviewDesign(design, "replace");
          break;
        }
        case "NAVIGATE_TO_NODE": {
          const nodeId = readNodeId(event.data.payload);
          if (nodeId) options.navigateTo(nodeId);
          break;
        }
        case "SET_PREVIEW_MODE": {
          const mode = readMode(event.data.payload);
          if (mode) document.documentElement.dataset.previewMode = mode;
          break;
        }
        case "RESET_PREVIEW_STATE": {
          resetState();
          options.navigateTo(readNodeId(event.data.payload) ?? options.initialNodeId);
          break;
        }
      }
    } catch (error) {
      console.error("[PreviewBridge] Failed to handle message", error);
      postPreviewError(error instanceof Error ? error.message : "Preview bridge error");
    }
  };

  window.addEventListener("message", onMessage);
  postToParent("PREVIEW_READY", getPreviewStatePayload());

  return () => {
    window.removeEventListener("message", onMessage);
    activeWindow = null;
    targetOrigin = null;
  };
}

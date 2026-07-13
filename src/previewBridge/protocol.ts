import {
  isDesignElementRole,
  sanitizeDesignElementId,
  type DesignElementRole,
} from "./designElements";

export const PREVIEW_BRIDGE_VERSION = 1;
export const PREVIEW_PARENT_SOURCE = "quizflow-editor-preview";
export const PREVIEW_PLAYER_SOURCE = "quizflow-player-preview";

export type PreviewParentMessageType =
  | "PREVIEW_INIT"
  | "DESIGN_PATCH"
  | "DESIGN_REPLACE"
  | "NAVIGATE_TO_NODE"
  | "SET_PREVIEW_MODE"
  | "RESET_PREVIEW_STATE"
  | "MEASURE_LAYOUT_ELEMENTS";

export type PreviewPlayerMessageType =
  | "PREVIEW_READY"
  | "PREVIEW_NODE_CHANGED"
  | "PREVIEW_STATE_CHANGED"
  | "PREVIEW_ERROR"
  | "DESIGN_ELEMENT_SELECTED"
  | "DESIGN_ELEMENT_SELECTION_CLEARED"
  | "LAYOUT_ELEMENTS_MEASURED";

export type PreviewDeviceMode = "desktop" | "tablet" | "mobile" | "fullscreen";

export interface PreviewBridgeMessage<TType extends string = string, TPayload = unknown> {
  readonly source: string;
  readonly version: typeof PREVIEW_BRIDGE_VERSION;
  readonly type: TType;
  readonly payload?: TPayload;
}

export interface PreviewInitPayload {
  readonly designSettings?: unknown;
  readonly nodeId?: string | null;
  readonly mode?: PreviewDeviceMode;
  readonly interactionMode?: PreviewDesignInteractionMode;
}

export interface PreviewDesignPayload {
  readonly designSettings?: unknown;
}

export interface PreviewNavigatePayload {
  readonly nodeId?: string | null;
}

export interface PreviewModePayload {
  readonly mode?: PreviewDeviceMode;
  readonly interactionMode?: PreviewDesignInteractionMode;
}

export interface PreviewStatePayload {
  readonly currentNodeId?: string | null;
  readonly score?: number;
  readonly pathLength?: number;
}

export interface PreviewErrorPayload {
  readonly message: string;
}

export type PreviewDesignInteractionMode = "select" | "test";

export interface PreviewDesignElementSelectedPayload {
  readonly elementId: string;
  readonly role: DesignElementRole;
  readonly nodeId: string | null;
}

export interface PreviewLayoutElementMeasurement {
  readonly id: string;
  readonly role: DesignElementRole;
  readonly nodeId: string | null;
  readonly rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly order?: number;
}

export interface PreviewLayoutMeasurementPayload {
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly scrollX?: number;
    readonly scrollY?: number;
    readonly devicePixelRatio?: number;
    readonly safeArea?: {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };
  };
  readonly elements: PreviewLayoutElementMeasurement[];
}

const PARENT_TYPES = new Set<PreviewParentMessageType>([
  "PREVIEW_INIT",
  "DESIGN_PATCH",
  "DESIGN_REPLACE",
  "NAVIGATE_TO_NODE",
  "SET_PREVIEW_MODE",
  "RESET_PREVIEW_STATE",
  "MEASURE_LAYOUT_ELEMENTS",
]);

const PLAYER_TYPES = new Set<PreviewPlayerMessageType>([
  "PREVIEW_READY",
  "PREVIEW_NODE_CHANGED",
  "PREVIEW_STATE_CHANGED",
  "PREVIEW_ERROR",
  "DESIGN_ELEMENT_SELECTED",
  "DESIGN_ELEMENT_SELECTION_CLEARED",
  "LAYOUT_ELEMENTS_MEASURED",
]);

export function createParentPreviewMessage<TType extends PreviewParentMessageType, TPayload>(
  type: TType,
  payload?: TPayload,
): PreviewBridgeMessage<TType, TPayload> {
  return {
    source: PREVIEW_PARENT_SOURCE,
    version: PREVIEW_BRIDGE_VERSION,
    type,
    ...(payload === undefined ? {} : { payload }),
  };
}

export function createPlayerPreviewMessage<TType extends PreviewPlayerMessageType, TPayload>(
  type: TType,
  payload?: TPayload,
): PreviewBridgeMessage<TType, TPayload> {
  return {
    source: PREVIEW_PLAYER_SOURCE,
    version: PREVIEW_BRIDGE_VERSION,
    type,
    ...(payload === undefined ? {} : { payload }),
  };
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isMessageBase(value: unknown): value is PreviewBridgeMessage {
  return (
    isPlainRecord(value)
    && value.version === PREVIEW_BRIDGE_VERSION
    && typeof value.source === "string"
    && typeof value.type === "string"
  );
}

export function isPreviewParentMessage(value: unknown): value is PreviewBridgeMessage<PreviewParentMessageType> {
  return isMessageBase(value)
    && value.source === PREVIEW_PARENT_SOURCE
    && PARENT_TYPES.has(value.type as PreviewParentMessageType);
}

export function isPreviewPlayerMessage(value: unknown): value is PreviewBridgeMessage<PreviewPlayerMessageType> {
  return isMessageBase(value)
    && value.source === PREVIEW_PLAYER_SOURCE
    && PLAYER_TYPES.has(value.type as PreviewPlayerMessageType);
}

export function isAllowedPreviewOrigin(origin: string, expectedOrigin: string): boolean {
  return origin === expectedOrigin;
}

export function isPreviewDeviceMode(value: unknown): value is PreviewDeviceMode {
  return value === "desktop" || value === "tablet" || value === "mobile" || value === "fullscreen";
}

export function isPreviewDesignInteractionMode(value: unknown): value is PreviewDesignInteractionMode {
  return value === "select" || value === "test";
}

export function toSafeNodeId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 160) return null;
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed) ? trimmed : null;
}

export function toDesignSettingsPayload(value: unknown): unknown | undefined {
  if (!isPlainRecord(value)) return undefined;
  if ("html" in value || "script" in value || "javascript" in value) return undefined;
  return value.designSettings;
}

export function toDesignElementSelectedPayload(value: unknown): PreviewDesignElementSelectedPayload | null {
  if (!isPlainRecord(value)) return null;
  const elementId = sanitizeDesignElementId(value.elementId);
  if (!elementId) return null;
  if (!isDesignElementRole(value.role)) return null;
  const nodeId = toSafeNodeId(value.nodeId);
  return {
    elementId,
    role: value.role,
    nodeId,
  };
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toLayoutMeasurementPayload(value: unknown): PreviewLayoutMeasurementPayload | null {
  if (!isPlainRecord(value)) return null;
  if (!isPlainRecord(value.viewport) || !Array.isArray(value.elements)) return null;
  const width = finiteNumber(value.viewport.width);
  const height = finiteNumber(value.viewport.height);
  if (width <= 0 || height <= 0) return null;
  const elements: PreviewLayoutElementMeasurement[] = [];
  for (const raw of value.elements.slice(0, 80)) {
    if (!isPlainRecord(raw) || !isPlainRecord(raw.rect)) continue;
    const id = sanitizeDesignElementId(raw.id);
    if (!id || !isDesignElementRole(raw.role)) continue;
    elements.push({
      id,
      role: raw.role,
      nodeId: toSafeNodeId(raw.nodeId),
      rect: {
        x: finiteNumber(raw.rect.x),
        y: finiteNumber(raw.rect.y),
        width: Math.max(0, finiteNumber(raw.rect.width)),
        height: Math.max(0, finiteNumber(raw.rect.height)),
      },
      ...(typeof raw.order === "number" && Number.isFinite(raw.order) ? { order: raw.order } : {}),
    });
  }
  return {
    viewport: {
      width,
      height,
      scrollX: finiteNumber(value.viewport.scrollX),
      scrollY: finiteNumber(value.viewport.scrollY),
      devicePixelRatio: finiteNumber(value.viewport.devicePixelRatio, 1),
      safeArea: isPlainRecord(value.viewport.safeArea)
        ? {
            top: finiteNumber(value.viewport.safeArea.top),
            right: finiteNumber(value.viewport.safeArea.right),
            bottom: finiteNumber(value.viewport.safeArea.bottom),
            left: finiteNumber(value.viewport.safeArea.left),
          }
        : { top: 0, right: 0, bottom: 0, left: 0 },
    },
    elements,
  };
}

import type { DesignSettings } from '../../types';
import {
  DESIGN_ELEMENT_ROLES,
  getDesignElementEntry,
  isDesignElementRole,
  sanitizeDesignElementId,
  type DesignElementRole,
} from '../previewBridge/designElements';

export const LAYOUT_DOCUMENT_SCHEMA_VERSION = 1;
export const MAX_LAYOUT_ELEMENTS = 80;

export type LayoutMode = 'auto' | 'free';
export type LayoutScope = 'global' | 'nodeType' | 'node';
export type LayoutConstraintHorizontal = 'left' | 'center' | 'right' | 'stretch';
export type LayoutConstraintVertical = 'top' | 'center' | 'bottom';
export type LayoutElementPositionMode = 'flow' | 'free';

export interface LayoutFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConstraints {
  horizontal: LayoutConstraintHorizontal;
  vertical: LayoutConstraintVertical;
}

export interface LayoutElement {
  id: string;
  role: DesignElementRole;
  frame: LayoutFrame;
  constraints: LayoutConstraints;
  positionMode: LayoutElementPositionMode;
  order?: number;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface LayoutElementOverride {
  frame?: Partial<LayoutFrame>;
  constraints?: Partial<LayoutConstraints>;
  positionMode?: LayoutElementPositionMode;
  order?: number;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface LayoutOverrides {
  elements?: Record<string, LayoutElementOverride>;
}

export interface LayoutDocument {
  schemaVersion: number;
  mode: LayoutMode;
  baseViewport: {
    width: number;
    height: number;
  };
  elements: Record<string, LayoutElement>;
  breakpoints?: {
    tablet?: LayoutOverrides;
    mobile?: LayoutOverrides;
  };
}

export interface ScopedLayoutDocuments {
  global?: LayoutDocument;
  nodeTypes?: Record<string, LayoutDocument>;
  nodes?: Record<string, LayoutDocument>;
}

export interface LayoutDocumentState extends ScopedLayoutDocuments {
  drafts?: ScopedLayoutDocuments;
}

export type DesignSettingsWithLayoutDocuments = DesignSettings & {
  layoutDocuments?: LayoutDocumentState;
};

export interface ElementMeasurement {
  id: string;
  role: DesignElementRole;
  nodeId: string | null;
  rect: LayoutFrame;
  order?: number;
}

export interface LayoutMeasurementPayload {
  viewport: {
    width: number;
    height: number;
    scrollX?: number;
    scrollY?: number;
    devicePixelRatio?: number;
    safeArea?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  elements: ElementMeasurement[];
}

export interface LayoutScopeContext {
  scope: LayoutScope;
  nodeType?: string | null;
  nodeId?: string | null;
}

export interface LayoutRoleRule {
  role: DesignElementRole;
  required: boolean;
  canDelete: boolean;
  canHide: boolean;
  canMove: boolean;
  canResize: boolean;
  canRotate: boolean;
  mustStayInViewport: boolean;
  groupMovesChildren: boolean;
  notes: string;
}

const HORIZONTAL_VALUES = new Set<LayoutConstraintHorizontal>(['left', 'center', 'right', 'stretch']);
const VERTICAL_VALUES = new Set<LayoutConstraintVertical>(['top', 'center', 'bottom']);
const POSITION_MODE_VALUES = new Set<LayoutElementPositionMode>(['flow', 'free']);
const SAFE_KEY_RE = /^[a-zA-Z0-9_.:-]+$/;

export const LAYOUT_ROLE_RULES: Record<DesignElementRole, LayoutRoleRule> = Object.fromEntries(
  DESIGN_ELEMENT_ROLES.map((role) => {
    const entry = getDesignElementEntry(role);
    const isBackground = role === 'canvas-background';
    const isFunctional = role === 'primary-action'
      || role === 'result-action'
      || role === 'variables'
      || role === 'answer-card'
      || role === 'answers-container';
    const isRequired = entry.required || role === 'primary-action' || role === 'question-card';
    return [role, {
      role,
      required: isRequired,
      canDelete: !isRequired,
      canHide: !isRequired,
      canMove: !isBackground,
      canResize: !isBackground,
      canRotate: false,
      mustStayInViewport: isRequired || isFunctional,
      groupMovesChildren: role === 'answers-container',
      notes: isBackground
        ? 'Background occupies the full scene.'
        : isFunctional
          ? 'Functional DOM element stays interactive and cannot be rotated.'
          : 'Decorative or structural DOM element can be positioned within constraints.',
    }];
  }),
) as Record<DesignElementRole, LayoutRoleRule>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function optionalFiniteNumber(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeSafeRecordKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 160 || !SAFE_KEY_RE.test(trimmed)) return null;
  return trimmed;
}

function normalizeFrame(value: unknown, fallback: LayoutFrame, viewport: { width: number; height: number }): LayoutFrame {
  const source = isPlainRecord(value) ? value : {};
  const width = finiteNumber(source.width, fallback.width, 1, viewport.width);
  const height = finiteNumber(source.height, fallback.height, 1, viewport.height);
  const x = finiteNumber(source.x, fallback.x, 0, Math.max(0, viewport.width - Math.min(width, viewport.width)));
  const y = finiteNumber(source.y, fallback.y, 0, Math.max(0, viewport.height - Math.min(height, viewport.height)));
  return { x, y, width, height };
}

function normalizeConstraints(value: unknown): LayoutConstraints {
  const source = isPlainRecord(value) ? value : {};
  return {
    horizontal: typeof source.horizontal === 'string' && HORIZONTAL_VALUES.has(source.horizontal as LayoutConstraintHorizontal)
      ? source.horizontal as LayoutConstraintHorizontal
      : 'left',
    vertical: typeof source.vertical === 'string' && VERTICAL_VALUES.has(source.vertical as LayoutConstraintVertical)
      ? source.vertical as LayoutConstraintVertical
      : 'top',
  };
}

function normalizeLayoutElement(value: unknown, fallbackId: string, viewport: { width: number; height: number }): LayoutElement | null {
  if (!isPlainRecord(value)) return null;
  if ('id' in value && sanitizeDesignElementId(value.id) === null) return null;
  const id = sanitizeDesignElementId(value.id) ?? sanitizeDesignElementId(fallbackId);
  if (!id) return null;
  if (!isDesignElementRole(value.role)) return null;
  const rule = LAYOUT_ROLE_RULES[value.role];
  const fallbackFrame = value.role === 'canvas-background'
    ? { x: 0, y: 0, width: viewport.width, height: viewport.height }
    : { x: 0, y: 0, width: 120, height: 80 };
  const frame = value.role === 'canvas-background'
    ? fallbackFrame
    : normalizeFrame(value.frame, fallbackFrame, viewport);
  const hidden = rule.required ? false : booleanValue(value.hidden);

  return {
    id,
    role: value.role,
    frame,
    constraints: normalizeConstraints(value.constraints),
    positionMode: typeof value.positionMode === 'string' && POSITION_MODE_VALUES.has(value.positionMode as LayoutElementPositionMode)
      ? value.positionMode as LayoutElementPositionMode
      : 'flow',
    ...(optionalFiniteNumber(value.order, -10000, 10000) !== undefined ? { order: optionalFiniteNumber(value.order, -10000, 10000) } : {}),
    ...(optionalFiniteNumber(value.zIndex, -1000, 1000) !== undefined ? { zIndex: optionalFiniteNumber(value.zIndex, -1000, 1000) } : {}),
    ...(booleanValue(value.locked) !== undefined ? { locked: booleanValue(value.locked) } : {}),
    ...(hidden !== undefined ? { hidden } : {}),
  };
}

function normalizeElementOverride(value: unknown): LayoutElementOverride | undefined {
  if (!isPlainRecord(value)) return undefined;
  const override: LayoutElementOverride = {};
  if (isPlainRecord(value.frame)) {
    const frame: Partial<LayoutFrame> = {};
    const x = optionalFiniteNumber(value.frame.x, 0, 10000);
    const y = optionalFiniteNumber(value.frame.y, 0, 10000);
    const width = optionalFiniteNumber(value.frame.width, 1, 10000);
    const height = optionalFiniteNumber(value.frame.height, 1, 10000);
    if (x !== undefined) frame.x = x;
    if (y !== undefined) frame.y = y;
    if (width !== undefined) frame.width = width;
    if (height !== undefined) frame.height = height;
    if (Object.keys(frame).length > 0) override.frame = frame;
  }
  if (isPlainRecord(value.constraints)) {
    const constraints: Partial<LayoutConstraints> = {};
    if (typeof value.constraints.horizontal === 'string' && HORIZONTAL_VALUES.has(value.constraints.horizontal as LayoutConstraintHorizontal)) {
      constraints.horizontal = value.constraints.horizontal as LayoutConstraintHorizontal;
    }
    if (typeof value.constraints.vertical === 'string' && VERTICAL_VALUES.has(value.constraints.vertical as LayoutConstraintVertical)) {
      constraints.vertical = value.constraints.vertical as LayoutConstraintVertical;
    }
    if (Object.keys(constraints).length > 0) override.constraints = constraints;
  }
  if (typeof value.positionMode === 'string' && POSITION_MODE_VALUES.has(value.positionMode as LayoutElementPositionMode)) {
    override.positionMode = value.positionMode as LayoutElementPositionMode;
  }
  const order = optionalFiniteNumber(value.order, -10000, 10000);
  const zIndex = optionalFiniteNumber(value.zIndex, -1000, 1000);
  if (order !== undefined) override.order = order;
  if (zIndex !== undefined) override.zIndex = zIndex;
  const locked = booleanValue(value.locked);
  const hidden = booleanValue(value.hidden);
  if (locked !== undefined) override.locked = locked;
  if (hidden !== undefined) override.hidden = hidden;
  return Object.keys(override).length > 0 ? override : undefined;
}

function normalizeLayoutOverrides(value: unknown): LayoutOverrides | undefined {
  if (!isPlainRecord(value) || !isPlainRecord(value.elements)) return undefined;
  const elements: Record<string, LayoutElementOverride> = {};
  for (const [key, raw] of Object.entries(value.elements).slice(0, MAX_LAYOUT_ELEMENTS)) {
    const id = sanitizeDesignElementId(key);
    const override = normalizeElementOverride(raw);
    if (id && override) elements[id] = override;
  }
  return Object.keys(elements).length > 0 ? { elements } : undefined;
}

export function normalizeLayoutDocument(value: unknown): LayoutDocument | undefined {
  if (!isPlainRecord(value)) return undefined;
  const migrated = migrateLayoutDocument(value);
  if (!isPlainRecord(migrated)) return undefined;
  const baseViewportSource = isPlainRecord(migrated.baseViewport) ? migrated.baseViewport : {};
  const baseViewport = {
    width: finiteNumber(baseViewportSource.width, 1280, 320, 3840),
    height: finiteNumber(baseViewportSource.height, 720, 320, 3840),
  };
  const mode: LayoutMode = migrated.mode === 'free' ? 'free' : 'auto';
  const elements: Record<string, LayoutElement> = {};

  if (isPlainRecord(migrated.elements)) {
    for (const [key, rawElement] of Object.entries(migrated.elements).slice(0, MAX_LAYOUT_ELEMENTS)) {
      const element = normalizeLayoutElement(rawElement, key, baseViewport);
      if (element) elements[element.id] = element;
    }
  }

  const breakpoints = isPlainRecord(migrated.breakpoints)
    ? {
        tablet: normalizeLayoutOverrides(migrated.breakpoints.tablet),
        mobile: normalizeLayoutOverrides(migrated.breakpoints.mobile),
      }
    : undefined;
  const cleanBreakpoints = breakpoints && (breakpoints.tablet || breakpoints.mobile)
    ? {
        ...(breakpoints.tablet ? { tablet: breakpoints.tablet } : {}),
        ...(breakpoints.mobile ? { mobile: breakpoints.mobile } : {}),
      }
    : undefined;

  return {
    schemaVersion: LAYOUT_DOCUMENT_SCHEMA_VERSION,
    mode,
    baseViewport,
    elements,
    ...(cleanBreakpoints ? { breakpoints: cleanBreakpoints } : {}),
  };
}

export function migrateLayoutDocument(value: unknown): unknown {
  if (!isPlainRecord(value)) return value;
  if (value.schemaVersion === LAYOUT_DOCUMENT_SCHEMA_VERSION) return value;
  if (!('schemaVersion' in value)) {
    return {
      ...value,
      schemaVersion: LAYOUT_DOCUMENT_SCHEMA_VERSION,
      mode: value.mode === 'free' ? 'free' : 'auto',
    };
  }
  return undefined;
}

function normalizeDocumentRecord(value: unknown): Record<string, LayoutDocument> | undefined {
  if (!isPlainRecord(value)) return undefined;
  const record: Record<string, LayoutDocument> = {};
  for (const [key, rawDocument] of Object.entries(value)) {
    const safeKey = normalizeSafeRecordKey(key);
    const document = normalizeLayoutDocument(rawDocument);
    if (safeKey && document) record[safeKey] = document;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function normalizeScopedDocuments(value: unknown): ScopedLayoutDocuments | undefined {
  if (!isPlainRecord(value)) return undefined;
  const global = normalizeLayoutDocument(value.global);
  const nodeTypes = normalizeDocumentRecord(value.nodeTypes);
  const nodes = normalizeDocumentRecord(value.nodes);
  const result: ScopedLayoutDocuments = {};
  if (global) result.global = global;
  if (nodeTypes) result.nodeTypes = nodeTypes;
  if (nodes) result.nodes = nodes;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeLayoutDocumentState(value: unknown): LayoutDocumentState | undefined {
  const scoped = normalizeScopedDocuments(value);
  const drafts = isPlainRecord(value) ? normalizeScopedDocuments(value.drafts) : undefined;
  const result: LayoutDocumentState = { ...(scoped ?? {}) };
  if (drafts) result.drafts = drafts;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function serializeLayoutDocument(document: LayoutDocument): string {
  return JSON.stringify(normalizeLayoutDocument(document), null, 2);
}

function inferConstraints(rect: LayoutFrame, viewport: { width: number; height: number }): LayoutConstraints {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    horizontal: rect.width >= viewport.width * 0.92
      ? 'stretch'
      : centerX > viewport.width * 0.38 && centerX < viewport.width * 0.62
        ? 'center'
        : centerX >= viewport.width * 0.62
          ? 'right'
          : 'left',
    vertical: centerY > viewport.height * 0.38 && centerY < viewport.height * 0.62
      ? 'center'
      : centerY >= viewport.height * 0.62
        ? 'bottom'
        : 'top',
  };
}

function toLogicalFrame(rect: LayoutFrame, viewport: { width: number; height: number }, baseViewport: { width: number; height: number }): LayoutFrame {
  const scaleX = baseViewport.width / Math.max(1, viewport.width);
  const scaleY = baseViewport.height / Math.max(1, viewport.height);
  return normalizeFrame({
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }, { x: 0, y: 0, width: 120, height: 80 }, baseViewport);
}

export function createFreeLayoutDocumentFromMeasurements(
  payload: LayoutMeasurementPayload,
  options: {
    baseViewport?: { width: number; height: number };
    mode?: LayoutMode;
  } = {},
): LayoutDocument {
  const measuredViewport = {
    width: finiteNumber(payload.viewport.width, 1280, 320, 3840),
    height: finiteNumber(payload.viewport.height, 720, 320, 3840),
  };
  const baseViewport = options.baseViewport ?? measuredViewport;
  const normalizedBaseViewport = {
    width: finiteNumber(baseViewport.width, measuredViewport.width, 320, 3840),
    height: finiteNumber(baseViewport.height, measuredViewport.height, 320, 3840),
  };
  const elements: Record<string, LayoutElement> = {};

  for (const measurement of payload.elements.slice(0, MAX_LAYOUT_ELEMENTS)) {
    const id = sanitizeDesignElementId(measurement.id);
    if (!id || !isDesignElementRole(measurement.role)) continue;
    const rule = LAYOUT_ROLE_RULES[measurement.role];
    const frame = measurement.role === 'canvas-background'
      ? { x: 0, y: 0, width: normalizedBaseViewport.width, height: normalizedBaseViewport.height }
      : toLogicalFrame(measurement.rect, measuredViewport, normalizedBaseViewport);
    elements[id] = {
      id,
      role: measurement.role,
      frame,
      constraints: inferConstraints(frame, normalizedBaseViewport),
      positionMode: rule.canMove ? 'free' : 'flow',
      ...(measurement.order !== undefined ? { order: finiteNumber(measurement.order, 0, -10000, 10000) } : {}),
      ...(rule.required ? { locked: true } : {}),
      ...(rule.mustStayInViewport ? { zIndex: 1 } : {}),
    };
  }

  if (!elements['canvas-background']) {
    elements['canvas-background'] = {
      id: 'canvas-background',
      role: 'canvas-background',
      frame: { x: 0, y: 0, width: normalizedBaseViewport.width, height: normalizedBaseViewport.height },
      constraints: { horizontal: 'stretch', vertical: 'top' },
      positionMode: 'flow',
      locked: true,
      zIndex: 0,
    };
  }

  return {
    schemaVersion: LAYOUT_DOCUMENT_SCHEMA_VERSION,
    mode: options.mode ?? 'free',
    baseViewport: normalizedBaseViewport,
    elements,
  };
}

function getScopedBucket(state: LayoutDocumentState | undefined, context: LayoutScopeContext): LayoutDocument | undefined {
  if (!state) return undefined;
  if (context.scope === 'node' && context.nodeId) return state.nodes?.[context.nodeId];
  if (context.scope === 'nodeType' && context.nodeType) return state.nodeTypes?.[context.nodeType];
  return state.global;
}

export function resolveLayoutDocument(
  settings: DesignSettings,
  context: { nodeType?: string | null; nodeId?: string | null } = {},
): LayoutDocument | undefined {
  const state = normalizeLayoutDocumentState((settings as DesignSettingsWithLayoutDocuments).layoutDocuments);
  return (
    (context.nodeId ? state?.nodes?.[context.nodeId] : undefined)
    ?? (context.nodeType ? state?.nodeTypes?.[context.nodeType] : undefined)
    ?? state?.global
  );
}

export function createLayoutDocumentPatch(
  settings: DesignSettings,
  context: LayoutScopeContext,
  document: LayoutDocument,
  options: { draft?: boolean } = {},
): { layoutDocuments: LayoutDocumentState } {
  const current = normalizeLayoutDocumentState((settings as DesignSettingsWithLayoutDocuments).layoutDocuments) ?? {};
  const root: LayoutDocumentState = structuredClone(current);
  const target: LayoutDocumentState = options.draft
    ? { ...(root.drafts ?? {}) }
    : root;
  const normalized = normalizeLayoutDocument(document);
  if (!normalized) return { layoutDocuments: root };

  if (context.scope === 'node' && context.nodeId) {
    target.nodes = { ...(target.nodes ?? {}), [context.nodeId]: normalized };
  } else if (context.scope === 'nodeType' && context.nodeType) {
    target.nodeTypes = { ...(target.nodeTypes ?? {}), [context.nodeType]: normalized };
  } else {
    target.global = normalized;
  }

  if (options.draft) root.drafts = target;
  return { layoutDocuments: root };
}

export function createLayoutModePatch(
  settings: DesignSettings,
  context: LayoutScopeContext,
  mode: LayoutMode,
  document?: LayoutDocument,
): { layoutDocuments: LayoutDocumentState; layout?: { elementOrder?: DesignElementRole[] } } {
  const existing = resolveLayoutDocument(settings, {
    nodeId: context.nodeId,
    nodeType: context.nodeType,
  });
  const nextDocument = normalizeLayoutDocument(document ?? existing ?? {
    schemaVersion: LAYOUT_DOCUMENT_SCHEMA_VERSION,
    mode,
    baseViewport: { width: 1280, height: 720 },
    elements: {},
  }) ?? {
    schemaVersion: LAYOUT_DOCUMENT_SCHEMA_VERSION,
    mode,
    baseViewport: { width: 1280, height: 720 },
    elements: {},
  };
  const patch = createLayoutDocumentPatch(settings, context, { ...nextDocument, mode });
  return mode === 'auto'
    ? { ...patch, layout: { elementOrder: ['question-title', 'media', 'question-description', 'answers-container', 'primary-action'] } }
    : patch;
}

export function getLayoutMode(settings: DesignSettings, context: { nodeType?: string | null; nodeId?: string | null } = {}): LayoutMode {
  return resolveLayoutDocument(settings, context)?.mode ?? 'auto';
}

export function getLayoutRoleRule(role: DesignElementRole): LayoutRoleRule {
  return LAYOUT_ROLE_RULES[role];
}

export function getScopedLayoutDocument(
  settings: DesignSettings,
  context: LayoutScopeContext,
): LayoutDocument | undefined {
  const state = normalizeLayoutDocumentState((settings as DesignSettingsWithLayoutDocuments).layoutDocuments);
  return getScopedBucket(state, context);
}

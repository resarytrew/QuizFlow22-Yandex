import type { DeepPartial } from '../design/designResolver';
import {
  getDesignElementEntry,
  isDesignElementRole,
  type DesignElementRole,
} from './elementRegistry';
import {
  DEFAULT_ELEMENT_ORDER,
  type DesignSettingsWithElementOverrides,
} from './designElementOverrides';
import {
  createLayoutDocumentPatch,
  getLayoutMode,
  getLayoutRoleRule,
  normalizeLayoutDocument,
  normalizeLayoutDocumentState,
  resolveLayoutDocument,
  type LayoutDocument,
  type LayoutElement,
  type LayoutFrame,
  type LayoutGroup,
  type LayoutScopeContext,
} from './layoutDocument';
import type { DesignSettings } from '../../types';

export type LayerScopeLabel = 'global' | 'nodeType' | 'node';
export type LayerOperation =
  | 'move-up'
  | 'move-down'
  | 'bring-front'
  | 'send-back'
  | 'rename'
  | 'lock'
  | 'unlock'
  | 'hide'
  | 'show'
  | 'delete'
  | 'duplicate'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'group'
  | 'ungroup'
  | 'z-index';

export interface DesignLayerItem {
  id: string;
  role: DesignElementRole;
  label: string;
  name: string;
  icon: string;
  selected: boolean;
  hidden: boolean;
  locked: boolean;
  order: number;
  zIndex: number;
  scope: LayerScopeLabel;
  required: boolean;
  children: DesignLayerItem[];
}

export interface DesignLayerTree {
  screenLabel: string;
  layers: DesignLayerItem[];
  layoutMode: 'auto' | 'free';
}

export interface LayerContext {
  nodeId: string | null;
  nodeType: string | null;
  selectedElementId?: string | null;
}

export interface LayerClipboardItem {
  id: string;
  role: DesignElementRole;
  name?: string;
  frame?: LayoutFrame;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface LayerClipboard {
  schemaVersion: 1;
  sourceNodeId: string | null;
  items: LayerClipboardItem[];
}

export interface LayerOperationResult {
  patch: DeepPartial<DesignSettings>;
  select?: { elementId: string; role: DesignElementRole; nodeId: string | null };
  clipboard?: LayerClipboard;
  warning?: string;
}

const MAX_Z_INDEX = 1000;
const MIN_Z_INDEX = -1000;
const CHILDREN_BY_PARENT: Partial<Record<DesignElementRole, DesignElementRole[]>> = {
  'question-card': ['question-title', 'media', 'question-description', 'answers-container', 'primary-action'],
  'answers-container': ['answer-card'],
  'result-card': ['result-title', 'result-score', 'result-action'],
};

const TOP_LEVEL_ROLES: DesignElementRole[] = [
  'canvas-background',
  'quiz-shell',
  'topbar',
  'question-card',
  'result-card',
  'progress',
  'timer',
  'achievements',
  'variables',
  'stats',
];

const DEFAULT_FRAME: LayoutFrame = { x: 80, y: 80, width: 240, height: 140 };

function clampZIndex(value: number): number {
  return Math.max(MIN_Z_INDEX, Math.min(MAX_Z_INDEX, Number.isFinite(value) ? Math.round(value) : 0));
}

function roleId(role: DesignElementRole): string {
  return role;
}

function safeName(value: string): string {
  return value.trim().slice(0, 80);
}

function scopeFor(settings: DesignSettings, context: LayerContext): LayerScopeLabel {
  const state = normalizeLayoutDocumentState((settings as { layoutDocuments?: unknown }).layoutDocuments);
  if (context.nodeId && state?.nodes?.[context.nodeId]) return 'node';
  if (context.nodeType && state?.nodeTypes?.[context.nodeType]) return 'nodeType';
  return 'global';
}

function layoutContext(settings: DesignSettings, context: LayerContext): LayoutScopeContext {
  const scope = scopeFor(settings, context);
  if (scope === 'node') return { scope, nodeId: context.nodeId, nodeType: context.nodeType };
  if (scope === 'nodeType') return { scope, nodeType: context.nodeType };
  return { scope: 'global' };
}

function baseElement(role: DesignElementRole, order: number): LayoutElement {
  const entry = getDesignElementEntry(role);
  const rule = getLayoutRoleRule(role);
  return {
    id: roleId(role),
    role,
    frame: role === 'canvas-background' ? { x: 0, y: 0, width: 1280, height: 720 } : DEFAULT_FRAME,
    constraints: role === 'canvas-background'
      ? { horizontal: 'stretch', vertical: 'top' }
      : { horizontal: 'left', vertical: 'top' },
    positionMode: rule.canMove ? 'free' : 'flow',
    order,
    zIndex: order,
    ...(entry.required || rule.required ? { locked: true } : {}),
  };
}

function documentWithRoleDefaults(settings: DesignSettings, context: LayerContext): LayoutDocument {
  const existing = resolveLayoutDocument(settings, context);
  const mode = existing?.mode ?? getLayoutMode(settings, context);
  const elements: Record<string, LayoutElement> = { ...(existing?.elements ?? {}) };
  TOP_LEVEL_ROLES.concat(DEFAULT_ELEMENT_ORDER).forEach((role, index) => {
    if (!elements[roleId(role)]) elements[roleId(role)] = baseElement(role, index);
  });
  const normalized = normalizeLayoutDocument({
    schemaVersion: 1,
    mode,
    baseViewport: existing?.baseViewport ?? { width: 1280, height: 720 },
    elements,
    ...(existing?.groups ? { groups: existing.groups } : {}),
    ...(existing?.breakpoints ? { breakpoints: existing.breakpoints } : {}),
  });
  return normalized ?? {
    schemaVersion: 1,
    mode,
    baseViewport: { width: 1280, height: 720 },
    elements,
  };
}

function patchDocument(settings: DesignSettings, context: LayerContext, document: LayoutDocument): DeepPartial<DesignSettings> {
  return createLayoutDocumentPatch(settings, layoutContext(settings, context), document) as DeepPartial<DesignSettings>;
}

function currentAutoOrder(settings: DesignSettings): DesignElementRole[] {
  const order = (settings as DesignSettingsWithElementOverrides).layout?.elementOrder;
  const clean = Array.isArray(order) ? order.filter((role): role is DesignElementRole => isDesignElementRole(role)) : [];
  return clean.length > 0 ? clean : DEFAULT_ELEMENT_ORDER;
}

function setAutoOrder(settings: DesignSettings, order: DesignElementRole[]): DeepPartial<DesignSettings> {
  return {
    layout: {
      ...settings.layout,
      elementOrder: order,
    },
  } as DeepPartial<DesignSettings>;
}

function uniqueRoles(roles: DesignElementRole[]): DesignElementRole[] {
  return Array.from(new Set(roles));
}

function findElement(document: LayoutDocument, id: string): LayoutElement | undefined {
  return document.elements[id] ?? Object.values(document.elements).find((item) => item.role === id);
}

function layerForRole(
  role: DesignElementRole,
  settings: DesignSettings,
  context: LayerContext,
  document: LayoutDocument,
  order: number,
): DesignLayerItem {
  const entry = getDesignElementEntry(role);
  const rule = getLayoutRoleRule(role);
  const element = findElement(document, roleId(role));
  const children = (CHILDREN_BY_PARENT[role] ?? []).map((childRole, childIndex) => (
    layerForRole(childRole, settings, context, document, childIndex)
  ));
  return {
    id: element?.id ?? roleId(role),
    role,
    label: entry.label,
    name: element?.name ?? entry.label,
    icon: entry.icon,
    selected: context.selectedElementId === (element?.id ?? roleId(role)),
    hidden: Boolean(element?.hidden),
    locked: Boolean(element?.locked),
    order: element?.order ?? order,
    zIndex: element?.zIndex ?? order,
    scope: scopeFor(settings, context),
    required: entry.required || rule.required,
    children,
  };
}

export function buildDesignLayerTree(settings: DesignSettings, context: LayerContext): DesignLayerTree {
  const document = documentWithRoleDefaults(settings, context);
  const autoOrder = currentAutoOrder(settings);
  const orderedTop = TOP_LEVEL_ROLES.map((role) => {
    if (role !== 'question-card') return role;
    return 'question-card';
  });
  const layers = uniqueRoles(orderedTop)
    .filter((role) => role !== 'result-card' || context.nodeType === 'resultNode')
    .map((role, index) => {
      if (role === 'question-card') {
        const item = layerForRole(role, settings, context, document, index);
        return {
          ...item,
          children: autoOrder.map((childRole, childIndex) => layerForRole(childRole, settings, context, document, childIndex)),
        };
      }
      return layerForRole(role, settings, context, document, index);
    });
  return {
    screenLabel: context.nodeType === 'resultNode' ? 'Result screen' : 'Question screen',
    layers,
    layoutMode: document.mode,
  };
}

export function createLayerRenamePatch(settings: DesignSettings, context: LayerContext, elementId: string, name: string): DeepPartial<DesignSettings> {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return {};
  return patchDocument(settings, context, {
    ...document,
    elements: {
      ...document.elements,
      [element.id]: { ...element, name: safeName(name) },
    },
  });
}

export function createLayerLockPatch(settings: DesignSettings, context: LayerContext, elementId: string, locked: boolean): DeepPartial<DesignSettings> {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return {};
  return patchDocument(settings, context, {
    ...document,
    elements: {
      ...document.elements,
      [element.id]: { ...element, locked },
    },
  });
}

export function createLayerVisibilityPatch(settings: DesignSettings, context: LayerContext, elementId: string, hidden: boolean): LayerOperationResult {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return { patch: {} };
  const entry = getDesignElementEntry(element.role);
  const rule = getLayoutRoleRule(element.role);
  if (hidden && (entry.required || rule.required || !entry.hideable || !rule.canHide)) {
    return { patch: {}, warning: 'Required functional element cannot be hidden.' };
  }
  return {
    patch: patchDocument(settings, context, {
      ...document,
      elements: {
        ...document.elements,
        [element.id]: { ...element, hidden },
      },
    }),
  };
}

export function createLayerDeletePatch(settings: DesignSettings, context: LayerContext, elementId: string): LayerOperationResult {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return { patch: {} };
  const rule = getLayoutRoleRule(element.role);
  const entry = getDesignElementEntry(element.role);
  if (entry.required || rule.required || !rule.canDelete) {
    return { patch: {}, warning: 'Required functional element cannot be deleted.' };
  }
  const elements = { ...document.elements };
  delete elements[element.id];
  return {
    patch: patchDocument(settings, context, { ...document, elements }),
  };
}

export function createLayerDuplicatePatch(settings: DesignSettings, context: LayerContext, elementId: string): LayerOperationResult {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return { patch: {} };
  const duplicateId = `${element.id}-copy-${Date.now().toString(36)}`;
  const duplicate: LayoutElement = {
    ...element,
    id: duplicateId,
    name: `${element.name ?? getDesignElementEntry(element.role).label} copy`,
    frame: { ...element.frame, x: element.frame.x + 24, y: element.frame.y + 24 },
    locked: false,
    zIndex: clampZIndex((element.zIndex ?? 0) + 1),
  };
  return {
    patch: patchDocument(settings, context, {
      ...document,
      elements: { ...document.elements, [duplicateId]: duplicate },
    }),
    select: { elementId: duplicateId, role: duplicate.role, nodeId: context.nodeId },
  };
}

export function createLayerOrderPatch(
  settings: DesignSettings,
  context: LayerContext,
  elementId: string,
  operation: Extract<LayerOperation, 'move-up' | 'move-down' | 'bring-front' | 'send-back'>,
): DeepPartial<DesignSettings> {
  if (getLayoutMode(settings, context) === 'auto') {
    const element = findElement(documentWithRoleDefaults(settings, context), elementId);
    if (!element) return {};
    const order = currentAutoOrder(settings);
    const index = order.indexOf(element.role);
    if (index < 0) return {};
    const next = [...order];
    const [role] = next.splice(index, 1);
    const target = operation === 'bring-front'
      ? next.length
      : operation === 'send-back'
        ? 0
        : operation === 'move-up'
          ? Math.min(next.length, index + 1)
          : Math.max(0, index - 1);
    next.splice(target, 0, role);
    return setAutoOrder(settings, next);
  }

  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return {};
  const zIndexes = Object.values(document.elements).map((item) => item.zIndex ?? 0);
  const current = element.zIndex ?? 0;
  const zIndex = operation === 'bring-front'
    ? Math.max(...zIndexes, current) + 1
    : operation === 'send-back'
      ? Math.min(...zIndexes, current) - 1
      : operation === 'move-up'
        ? current + 1
        : current - 1;
  return patchDocument(settings, context, {
    ...document,
    elements: {
      ...document.elements,
      [element.id]: { ...element, zIndex: clampZIndex(zIndex) },
    },
  });
}

export function createLayerZIndexPatch(settings: DesignSettings, context: LayerContext, elementId: string, zIndex: number): DeepPartial<DesignSettings> {
  const document = documentWithRoleDefaults(settings, context);
  const element = findElement(document, elementId);
  if (!element) return {};
  return patchDocument(settings, context, {
    ...document,
    elements: {
      ...document.elements,
      [element.id]: { ...element, zIndex: clampZIndex(zIndex) },
    },
  });
}

export function createLayerClipboard(settings: DesignSettings, context: LayerContext, elementIds: string[]): LayerClipboard {
  const document = documentWithRoleDefaults(settings, context);
  const items = elementIds
    .map((id) => findElement(document, id))
    .filter((element): element is LayoutElement => Boolean(element))
    .map((element) => ({
      id: element.id,
      role: element.role,
      ...(element.name ? { name: element.name } : {}),
      frame: element.frame,
      ...(element.zIndex !== undefined ? { zIndex: element.zIndex } : {}),
      ...(element.locked !== undefined ? { locked: element.locked } : {}),
      ...(element.hidden !== undefined ? { hidden: element.hidden } : {}),
    }));
  return { schemaVersion: 1, sourceNodeId: context.nodeId, items };
}

export function createLayerPastePatch(settings: DesignSettings, context: LayerContext, clipboard: LayerClipboard): LayerOperationResult {
  if (clipboard.schemaVersion !== 1 || clipboard.items.length === 0) return { patch: {} };
  const document = documentWithRoleDefaults(settings, context);
  const elements = { ...document.elements };
  let lastSelection: LayerOperationResult['select'];
  clipboard.items.slice(0, 20).forEach((item, index) => {
    const id = `${item.role}-paste-${Date.now().toString(36)}-${index}`;
    elements[id] = {
      id,
      role: item.role,
      name: item.name ? `${item.name} copy` : undefined,
      frame: {
        x: (item.frame?.x ?? DEFAULT_FRAME.x) + 32,
        y: (item.frame?.y ?? DEFAULT_FRAME.y) + 32,
        width: item.frame?.width ?? DEFAULT_FRAME.width,
        height: item.frame?.height ?? DEFAULT_FRAME.height,
      },
      constraints: { horizontal: 'left', vertical: 'top' },
      positionMode: document.mode === 'free' ? 'free' : 'flow',
      zIndex: clampZIndex((item.zIndex ?? 0) + 1),
      locked: false,
      hidden: Boolean(item.hidden),
    };
    lastSelection = { elementId: id, role: item.role, nodeId: context.nodeId };
  });
  return {
    patch: patchDocument(settings, context, { ...document, elements }),
    select: lastSelection,
  };
}

export function createGroupLayersPatch(settings: DesignSettings, context: LayerContext, elementIds: string[]): LayerOperationResult {
  const document = documentWithRoleDefaults(settings, context);
  const children = elementIds
    .map((id) => findElement(document, id)?.id)
    .filter((id): id is string => Boolean(id));
  if (children.length < 2) return { patch: {}, warning: 'Select at least two layers to group.' };
  const childFrames = children.map((id) => document.elements[id].frame);
  const minX = Math.min(...childFrames.map((frame) => frame.x));
  const minY = Math.min(...childFrames.map((frame) => frame.y));
  const maxX = Math.max(...childFrames.map((frame) => frame.x + frame.width));
  const maxY = Math.max(...childFrames.map((frame) => frame.y + frame.height));
  const groupId = `group-${Date.now().toString(36)}`;
  const group: LayoutGroup = {
    id: groupId,
    name: 'Group',
    children,
    frame: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    constraints: { horizontal: 'left', vertical: 'top' },
    locked: false,
    zIndex: Math.max(...children.map((id) => document.elements[id].zIndex ?? 0)),
  };
  return {
    patch: patchDocument(settings, context, {
      ...document,
      groups: { ...(document.groups ?? {}), [groupId]: group },
    }),
  };
}

export function createUngroupLayerPatch(settings: DesignSettings, context: LayerContext, groupId: string): DeepPartial<DesignSettings> {
  const document = documentWithRoleDefaults(settings, context);
  if (!document.groups?.[groupId]) return {};
  const groups = { ...document.groups };
  delete groups[groupId];
  return patchDocument(settings, context, {
    ...document,
    groups: Object.keys(groups).length > 0 ? groups : undefined,
  });
}

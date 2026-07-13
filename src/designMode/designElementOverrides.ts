import type { Node } from 'reactflow';
import type { DeepPartial } from '../design/designResolver';
import { DEFAULT_DESIGN_SETTINGS } from '../design/designResolver';
import type { DesignElementRole } from './elementRegistry';
import type { DesignSettings, NodeData } from '../../types';

export type DesignInspectorScope = 'global' | 'nodeType' | 'node';
export type DesignPropertySourceKind = 'template' | 'style' | 'global' | 'nodeType' | 'node';
export type DesignControlStorage = 'design' | 'element';

export const DEFAULT_ELEMENT_ORDER: DesignElementRole[] = [
  'question-title',
  'media',
  'question-description',
  'answers-container',
  'primary-action',
];

export interface DesignElementOverrideState {
  global?: DesignElementOverrideBucket;
  nodeTypes?: Record<string, DesignElementOverrideBucket>;
  nodes?: Record<string, DesignElementOverrideBucket>;
}

export type DesignElementOverrideBucket = Partial<Record<DesignElementRole, Record<string, unknown>>>;

export type DesignSettingsWithElementOverrides = DesignSettings & {
  elementOverrides?: DesignElementOverrideState;
  layout?: DesignSettings['layout'] & {
    elementOrder?: DesignElementRole[];
  };
};

export interface DesignOverrideContext {
  role: DesignElementRole;
  nodeId: string | null;
  nodeType: string | null;
}

export interface ResolvedDesignProperty {
  value: unknown;
  source: DesignPropertySourceKind;
  isOverridden: boolean;
}

export function readObjectPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
  ), source);
}

export function writeObjectPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...tail] = path.split('.');
  if (!head) return target;
  if (tail.length === 0) return { ...target, [head]: value };
  const current = target[head];
  return {
    ...target,
    [head]: writeObjectPath(
      current && typeof current === 'object' && !Array.isArray(current)
        ? current as Record<string, unknown>
        : {},
      tail.join('.'),
      value,
    ),
  };
}

function deleteObjectPath(target: Record<string, unknown>, path: string): Record<string, unknown> | undefined {
  const [head, ...tail] = path.split('.');
  if (!head || !(head in target)) return target;
  if (tail.length === 0) {
    const { [head]: _removed, ...rest } = target;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }

  const current = target[head];
  if (!current || typeof current !== 'object' || Array.isArray(current)) return target;
  const nextChild = deleteObjectPath(current as Record<string, unknown>, tail.join('.'));
  const next = { ...target };
  if (nextChild) {
    next[head] = nextChild;
  } else {
    delete next[head];
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function cloneOverrides(settings: DesignSettings): DesignElementOverrideState {
  const source = (settings as DesignSettingsWithElementOverrides).elementOverrides;
  return source ? structuredClone(source) : {};
}

function getBucket(
  overrides: DesignElementOverrideState | undefined,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
): DesignElementOverrideBucket | undefined {
  if (scope === 'global') return overrides?.global;
  if (scope === 'nodeType' && context.nodeType) return overrides?.nodeTypes?.[context.nodeType];
  if (scope === 'node' && context.nodeId) return overrides?.nodes?.[context.nodeId];
  return undefined;
}

function setBucket(
  overrides: DesignElementOverrideState,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  bucket: DesignElementOverrideBucket | undefined,
): DesignElementOverrideState {
  const next = structuredClone(overrides);
  if (scope === 'global') {
    if (bucket && Object.keys(bucket).length > 0) next.global = bucket;
    else delete next.global;
  } else if (scope === 'nodeType' && context.nodeType) {
    next.nodeTypes = { ...(next.nodeTypes ?? {}) };
    if (bucket && Object.keys(bucket).length > 0) next.nodeTypes[context.nodeType] = bucket;
    else delete next.nodeTypes[context.nodeType];
    if (Object.keys(next.nodeTypes).length === 0) delete next.nodeTypes;
  } else if (scope === 'node' && context.nodeId) {
    next.nodes = { ...(next.nodes ?? {}) };
    if (bucket && Object.keys(bucket).length > 0) next.nodes[context.nodeId] = bucket;
    else delete next.nodes[context.nodeId];
    if (Object.keys(next.nodes).length === 0) delete next.nodes;
  }
  return next;
}

function updateRolePatch(
  bucket: DesignElementOverrideBucket | undefined,
  role: DesignElementRole,
  path: string,
  value: unknown,
): DesignElementOverrideBucket {
  const nextBucket: DesignElementOverrideBucket = { ...(bucket ?? {}) };
  const rolePatch = nextBucket[role] ? structuredClone(nextBucket[role]) : {};
  nextBucket[role] = writeObjectPath(rolePatch, path, value);
  return nextBucket;
}

function resetRolePatch(
  bucket: DesignElementOverrideBucket | undefined,
  role: DesignElementRole,
  path: string,
): DesignElementOverrideBucket | undefined {
  if (!bucket?.[role]) return bucket;
  const nextBucket: DesignElementOverrideBucket = { ...bucket };
  const nextRolePatch = deleteObjectPath(structuredClone(bucket[role] ?? {}), path);
  if (nextRolePatch) {
    nextBucket[role] = nextRolePatch;
  } else {
    delete nextBucket[role];
  }
  return Object.keys(nextBucket).length > 0 ? nextBucket : undefined;
}

function readRolePatchValue(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  path: string,
): unknown {
  const overrides = (settings as DesignSettingsWithElementOverrides).elementOverrides;
  const bucket = getBucket(overrides, scope, context);
  return readObjectPath(bucket?.[context.role], path);
}

function hasRolePatchValue(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  path: string,
): boolean {
  return readRolePatchValue(settings, scope, context, path) !== undefined;
}

export function getNodeTypeForSelection(nodes: Node<NodeData>[], nodeId: string | null): string | null {
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId)?.type ?? null;
}

export function buildDesignOverrideContext(
  role: DesignElementRole,
  nodeId: string | null,
  nodes: Node<NodeData>[],
): DesignOverrideContext {
  return {
    role,
    nodeId,
    nodeType: getNodeTypeForSelection(nodes, nodeId),
  };
}

export function createScopedDesignPatch(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  path: string,
  value: unknown,
  storage: DesignControlStorage,
): DeepPartial<DesignSettings> {
  if (scope === 'global' && storage === 'design') {
    return writeObjectPath({}, path, value) as DeepPartial<DesignSettings>;
  }

  const overrides = cloneOverrides(settings);
  const bucket = getBucket(overrides, scope, context);
  const nextBucket = updateRolePatch(bucket, context.role, path, value);
  const nextOverrides = setBucket(overrides, scope, context, nextBucket);
  return { elementOverrides: nextOverrides } as DeepPartial<DesignSettings>;
}

export function createScopedResetPatch(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  path: string,
): DeepPartial<DesignSettings> {
  const overrides = cloneOverrides(settings);
  const bucket = getBucket(overrides, scope, context);
  const nextBucket = resetRolePatch(bucket, context.role, path);
  const nextOverrides = setBucket(overrides, scope, context, nextBucket);
  return { elementOverrides: nextOverrides } as DeepPartial<DesignSettings>;
}

export function createResetElementOverridePatch(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
): DeepPartial<DesignSettings> {
  const overrides = cloneOverrides(settings);
  const bucket = getBucket(overrides, scope, context);
  if (!bucket?.[context.role]) return { elementOverrides: overrides } as DeepPartial<DesignSettings>;
  const nextBucket = { ...bucket };
  delete nextBucket[context.role];
  const nextOverrides = setBucket(
    overrides,
    scope,
    context,
    Object.keys(nextBucket).length > 0 ? nextBucket : undefined,
  );
  return { elementOverrides: nextOverrides } as DeepPartial<DesignSettings>;
}

export function createResetNodeOverridePatch(
  settings: DesignSettings,
  nodeId: string | null,
): DeepPartial<DesignSettings> {
  const overrides = cloneOverrides(settings);
  if (!nodeId || !overrides.nodes?.[nodeId]) return { elementOverrides: overrides } as DeepPartial<DesignSettings>;
  const nodes = { ...overrides.nodes };
  delete nodes[nodeId];
  const nextOverrides: DesignElementOverrideState = {
    ...overrides,
    nodes: Object.keys(nodes).length > 0 ? nodes : undefined,
  };
  if (!nextOverrides.nodes) delete nextOverrides.nodes;
  return { elementOverrides: nextOverrides } as DeepPartial<DesignSettings>;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveDesignProperty(
  settings: DesignSettings,
  context: DesignOverrideContext,
  path: string,
  storage: DesignControlStorage,
  fallback: unknown,
  activeStyleId: string | null,
): ResolvedDesignProperty {
  const nodeValue = readRolePatchValue(settings, 'node', context, path);
  if (nodeValue !== undefined) return { value: nodeValue, source: 'node', isOverridden: true };

  const nodeTypeValue = readRolePatchValue(settings, 'nodeType', context, path);
  if (nodeTypeValue !== undefined) return { value: nodeTypeValue, source: 'nodeType', isOverridden: true };

  const globalElementValue = readRolePatchValue(settings, 'global', context, path);
  if (globalElementValue !== undefined) return { value: globalElementValue, source: 'global', isOverridden: true };

  if (storage === 'design') {
    const globalValue = readObjectPath(settings, path);
    const defaultValue = readObjectPath(DEFAULT_DESIGN_SETTINGS, path) ?? fallback;
    if (globalValue !== undefined) {
      return {
        value: globalValue,
        source: valuesEqual(globalValue, defaultValue) ? (activeStyleId ? 'style' : 'template') : 'global',
        isOverridden: !valuesEqual(globalValue, defaultValue),
      };
    }
    return {
      value: defaultValue,
      source: activeStyleId ? 'style' : 'template',
      isOverridden: false,
    };
  }

  return {
    value: fallback,
    source: activeStyleId ? 'style' : 'template',
    isOverridden: false,
  };
}

export function hasScopedOverride(
  settings: DesignSettings,
  scope: DesignInspectorScope,
  context: DesignOverrideContext,
  path: string,
  storage: DesignControlStorage,
): boolean {
  if (scope === 'global' && storage === 'design') {
    const value = readObjectPath(settings, path);
    const defaultValue = readObjectPath(DEFAULT_DESIGN_SETTINGS, path);
    return !valuesEqual(value, defaultValue);
  }
  return hasRolePatchValue(settings, scope, context, path);
}

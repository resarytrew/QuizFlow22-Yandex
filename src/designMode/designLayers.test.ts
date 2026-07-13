import { describe, expect, it } from 'vitest';
import type { DesignSettings } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../design/designResolver';
import type { DesignSettingsWithElementOverrides } from './designElementOverrides';
import {
  createFreeLayoutDocumentFromMeasurements,
  createLayoutDocumentPatch,
  normalizeLayoutDocumentState,
  resolveLayoutDocument,
  type DesignSettingsWithLayoutDocuments,
} from './layoutDocument';
import {
  buildDesignLayerTree,
  createGroupLayersPatch,
  createLayerClipboard,
  createLayerDeletePatch,
  createLayerDuplicatePatch,
  createLayerLockPatch,
  createLayerOrderPatch,
  createLayerPastePatch,
  createLayerVisibilityPatch,
  createLayerZIndexPatch,
  createUngroupLayerPatch,
} from './designLayers';

function mergeSettings(patch: Record<string, unknown>): DesignSettings {
  const layoutPatch = (patch.layout ?? {}) as Record<string, unknown>;
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    ...patch,
    layout: {
      ...DEFAULT_DESIGN_SETTINGS.layout,
      ...layoutPatch,
    },
  } as DesignSettings;
}

function freeSettings(): DesignSettings {
  const document = createFreeLayoutDocumentFromMeasurements({
    viewport: { width: 1000, height: 600 },
    elements: [
      { id: 'media', role: 'media', nodeId: 'q1', rect: { x: 100, y: 80, width: 240, height: 160 } },
      { id: 'primary-action', role: 'primary-action', nodeId: 'q1', rect: { x: 120, y: 300, width: 180, height: 48 } },
    ],
  });
  return mergeSettings(createLayoutDocumentPatch(DEFAULT_DESIGN_SETTINGS, { scope: 'global' }, document));
}

describe('design layers model', () => {
  it('builds a hierarchy with the selected preview element', () => {
    const tree = buildDesignLayerTree(DEFAULT_DESIGN_SETTINGS, {
      nodeId: 'q1',
      nodeType: 'questionNode',
      selectedElementId: 'media',
    });

    const questionCard = tree.layers.find((layer) => layer.role === 'question-card');
    expect(questionCard?.children.map((child) => child.role)).toContain('media');
    expect(questionCard?.children.find((child) => child.role === 'media')?.selected).toBe(true);
  });

  it('changes auto layout order through semantic elementOrder', () => {
    const patch = createLayerOrderPatch(DEFAULT_DESIGN_SETTINGS, { nodeId: 'q1', nodeType: 'questionNode' }, 'media', 'send-back');

    expect((patch as DesignSettingsWithElementOverrides).layout?.elementOrder?.[0]).toBe('media');
  });

  it('changes z-index for free layout elements', () => {
    const settings = freeSettings();
    const patch = createLayerZIndexPatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'media', 42);
    const next = mergeSettings({ ...(settings as DesignSettingsWithLayoutDocuments), ...(patch as Record<string, unknown>) });

    expect(resolveLayoutDocument(next)?.elements.media.zIndex).toBe(42);
  });

  it('locks and hides non-required elements but protects required ones', () => {
    const settings = freeSettings();
    const lockPatch = createLayerLockPatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'media', true);
    const locked = mergeSettings({ ...(settings as DesignSettingsWithLayoutDocuments), ...(lockPatch as Record<string, unknown>) });
    expect(resolveLayoutDocument(locked)?.elements.media.locked).toBe(true);

    const hidden = createLayerVisibilityPatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'media', true);
    const hiddenSettings = mergeSettings({ ...(settings as DesignSettingsWithLayoutDocuments), ...(hidden.patch as Record<string, unknown>) });
    expect(resolveLayoutDocument(hiddenSettings)?.elements.media.hidden).toBe(true);

    const required = createLayerVisibilityPatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'primary-action', true);
    expect(required.warning).toContain('cannot be hidden');
    expect(required.patch).toEqual({});
  });

  it('does not delete required functional elements', () => {
    const settings = freeSettings();
    const result = createLayerDeletePatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'primary-action');

    expect(result.warning).toContain('cannot be deleted');
    expect(result.patch).toEqual({});
  });

  it('duplicates and pastes with fresh ids', () => {
    const settings = freeSettings();
    const duplicate = createLayerDuplicatePatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'media');
    expect(duplicate.select?.elementId).toContain('media-copy-');

    const clipboard = createLayerClipboard(settings, { nodeId: 'q1', nodeType: 'questionNode' }, ['media']);
    const paste = createLayerPastePatch(settings, { nodeId: 'q2', nodeType: 'questionNode' }, clipboard);
    expect(paste.select?.nodeId).toBe('q2');
    expect(paste.select?.elementId).toContain('media-paste-');
    expect(paste.select?.elementId).not.toBe('media');
  });

  it('groups and ungroups without changing child element ids', () => {
    const settings = freeSettings();
    const grouped = createGroupLayersPatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, ['media', 'primary-action']);
    const groupedSettings = mergeSettings({ ...(settings as DesignSettingsWithLayoutDocuments), ...(grouped.patch as Record<string, unknown>) });
    const groupId = Object.keys(resolveLayoutDocument(groupedSettings)?.groups ?? {})[0];

    expect(resolveLayoutDocument(groupedSettings)?.groups?.[groupId].children).toEqual(['media', 'primary-action']);

    const ungroupPatch = createUngroupLayerPatch(groupedSettings, { nodeId: 'q1', nodeType: 'questionNode' }, groupId);
    const ungrouped = mergeSettings({ ...(groupedSettings as DesignSettingsWithLayoutDocuments), ...(ungroupPatch as Record<string, unknown>) });
    expect(resolveLayoutDocument(ungrouped)?.groups).toBeUndefined();
  });

  it('normalizes serialized layer names and groups', () => {
    const settings = freeSettings();
    const duplicate = createLayerDuplicatePatch(settings, { nodeId: 'q1', nodeType: 'questionNode' }, 'media');
    const next = mergeSettings({ ...(settings as DesignSettingsWithLayoutDocuments), ...(duplicate.patch as Record<string, unknown>) });

    expect(normalizeLayoutDocumentState((next as DesignSettingsWithLayoutDocuments).layoutDocuments)?.global).toBeDefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { DesignSettings } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../design/designResolver';
import {
  createFreeLayoutDocumentFromMeasurements,
  createLayoutDocumentPatch,
  createLayoutModePatch,
  getLayoutMode,
  getLayoutRoleRule,
  normalizeLayoutDocument,
  normalizeLayoutDocumentState,
  resolveLayoutDocument,
  serializeLayoutDocument,
  type DesignSettingsWithLayoutDocuments,
} from './layoutDocument';

function settingsWithLayout(extra: Partial<DesignSettingsWithLayoutDocuments>): DesignSettings {
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    ...extra,
  } as DesignSettings;
}

describe('LayoutDocument model', () => {
  it('creates free layout from measured DOM rectangles', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500, devicePixelRatio: 2 },
      elements: [
        {
          id: 'question-card',
          role: 'question-card',
          nodeId: 'q1',
          rect: { x: 100, y: 50, width: 500, height: 200 },
          order: 1,
        },
      ],
    }, { baseViewport: { width: 2000, height: 1000 } });

    expect(doc.mode).toBe('free');
    expect(doc.elements['question-card'].frame).toEqual({ x: 200, y: 100, width: 1000, height: 400 });
    expect(doc.elements['question-card'].locked).toBe(true);
  });

  it('keeps saved coordinates independent from preview zoom scale', () => {
    const first = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 640 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 100, y: 64, width: 300, height: 160 } }],
    }, { baseViewport: { width: 1000, height: 640 } });
    const zoomed = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 500, height: 320 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 50, y: 32, width: 150, height: 80 } }],
    }, { baseViewport: { width: 1000, height: 640 } });

    expect(zoomed.elements.media.frame).toEqual(first.elements.media.frame);
  });

  it('normalizes and migrates damaged documents safely', () => {
    const normalized = normalizeLayoutDocument({
      mode: 'free',
      baseViewport: { width: Number.POSITIVE_INFINITY, height: -1 },
      elements: {
        unsafe: { id: '<script>', role: 'media', frame: { x: 1, y: 1, width: 10, height: 10 } },
        ok: { id: 'ok', role: 'media', frame: { x: Number.NaN, y: 20, width: 30000, height: 0 } },
        badRole: { id: 'bad', role: 'script', frame: {} },
      },
    });

    expect(normalized?.schemaVersion).toBe(1);
    expect(normalized?.baseViewport).toEqual({ width: 1280, height: 320 });
    expect(Object.keys(normalized?.elements ?? {})).toEqual(['ok']);
    expect(normalized?.elements.ok.frame.width).toBe(1280);
    expect(normalized?.elements.ok.frame.height).toBe(1);
  });

  it('loads old quizzes without a LayoutDocument', () => {
    expect(normalizeLayoutDocumentState(undefined)).toBeUndefined();
    expect(resolveLayoutDocument(DEFAULT_DESIGN_SETTINGS)).toBeUndefined();
    expect(getLayoutMode(DEFAULT_DESIGN_SETTINGS)).toBe('auto');
  });

  it('supports global, node type and node scoped inheritance', () => {
    const global = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 0, y: 0, width: 100, height: 100 } }],
    });
    const nodeType = { ...global, baseViewport: { width: 900, height: 600 } };
    const node = { ...global, baseViewport: { width: 390, height: 844 } };
    const settings = settingsWithLayout({
      layoutDocuments: {
        global,
        nodeTypes: { questionNode: nodeType },
        nodes: { q1: node },
      },
    });

    expect(resolveLayoutDocument(settings)?.baseViewport.width).toBe(1000);
    expect(resolveLayoutDocument(settings, { nodeType: 'questionNode' })?.baseViewport.width).toBe(900);
    expect(resolveLayoutDocument(settings, { nodeType: 'questionNode', nodeId: 'q1' })?.baseViewport.width).toBe(390);
  });

  it('creates patches for auto to free and free to auto with semantic order restoration', () => {
    const free = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500 },
      elements: [{ id: 'primary-action', role: 'primary-action', nodeId: null, rect: { x: 10, y: 10, width: 120, height: 44 } }],
    });
    const freePatch = createLayoutModePatch(DEFAULT_DESIGN_SETTINGS, { scope: 'global' }, 'free', free);
    const freeSettings = settingsWithLayout(freePatch as Partial<DesignSettingsWithLayoutDocuments>);

    expect(getLayoutMode(freeSettings)).toBe('free');

    const autoPatch = createLayoutModePatch(freeSettings, { scope: 'global' }, 'auto');
    expect(autoPatch.layoutDocuments.global?.mode).toBe('auto');
    expect(autoPatch.layout?.elementOrder).toEqual([
      'question-title',
      'media',
      'question-description',
      'answers-container',
      'primary-action',
    ]);
  });

  it('can save a free layout as a draft when returning to auto', () => {
    const free = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 10, y: 10, width: 120, height: 80 } }],
    });
    const patch = createLayoutDocumentPatch(DEFAULT_DESIGN_SETTINGS, { scope: 'global' }, free, { draft: true });

    expect(patch.layoutDocuments.drafts?.global?.mode).toBe('free');
  });

  it('keeps required and functional elements constrained', () => {
    expect(getLayoutRoleRule('question-card').canDelete).toBe(false);
    expect(getLayoutRoleRule('question-card').mustStayInViewport).toBe(true);
    expect(getLayoutRoleRule('primary-action').canRotate).toBe(false);
    expect(getLayoutRoleRule('answers-container').groupMovesChildren).toBe(true);
    expect(getLayoutRoleRule('canvas-background').canMove).toBe(false);
  });

  it('serializes only normalized layout data', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 10, y: 10, width: 120, height: 80 } }],
    });

    expect(JSON.parse(serializeLayoutDocument(doc)).schemaVersion).toBe(1);
  });
});

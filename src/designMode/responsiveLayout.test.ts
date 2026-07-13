import { describe, expect, it } from 'vitest';
import type { DesignSettings } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../design/designResolver';
import { createFreeLayoutDocumentFromMeasurements, type DesignSettingsWithLayoutDocuments } from './layoutDocument';
import {
  createAutoAdaptLayoutPatch,
  createAutoLayoutResponsivePatch,
  createBreakpointElementOverridePatch,
  createCopyDesktopLayoutPatch,
  getPreviewOrientation,
  getPreviewViewport,
  SAFE_AREA_PRESETS,
} from './responsiveLayout';

function settingsWithLayout(extra: Partial<DesignSettingsWithLayoutDocuments>): DesignSettings {
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    ...extra,
  } as DesignSettings;
}

describe('responsive layout helpers', () => {
  it('creates tablet override without changing desktop layout', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [{ id: 'media', role: 'media', nodeId: null, rect: { x: 20, y: 20, width: 300, height: 180 } }],
    });
    const settings = settingsWithLayout({ layoutDocuments: { global: doc } });
    const patch = createBreakpointElementOverridePatch(settings, { scope: 'global' }, 'tablet', 'media', {
      frame: { x: 40 },
    });

    expect(patch?.layoutDocuments.global?.elements.media.frame.x).toBe(20);
    expect(patch?.layoutDocuments.global?.breakpoints?.tablet?.elements?.media.frame?.x).toBe(40);
  });

  it('copies desktop layout into a breakpoint override', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [{ id: 'primary-action', role: 'primary-action', nodeId: null, rect: { x: 10, y: 10, width: 180, height: 56 } }],
    });
    const patch = createCopyDesktopLayoutPatch(settingsWithLayout({ layoutDocuments: { global: doc } }), { scope: 'global' }, 'mobile');

    expect(patch?.layoutDocuments.global?.breakpoints?.mobile?.elements?.['primary-action'].frame).toEqual({
      x: 10,
      y: 10,
      width: 180,
      height: 56,
    });
  });

  it('builds an automatic mobile adaptation patch for free layout', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [{ id: 'primary-action', role: 'primary-action', nodeId: null, rect: { x: 1100, y: 680, width: 180, height: 56 } }],
    });
    const patch = createAutoAdaptLayoutPatch(settingsWithLayout({ layoutDocuments: { global: doc } }), { scope: 'global' }, 'mobile');

    expect(patch?.layoutDocuments.global?.breakpoints?.mobile?.elements?.['primary-action'].frame?.width).toBeGreaterThanOrEqual(44);
  });

  it('stacks auto layout on mobile and keeps safe area presets available', () => {
    const patch = createAutoLayoutResponsivePatch('mobile') as {
      answerCards?: { columns?: number };
      buttons?: { width?: string };
    };

    expect(patch.answerCards?.columns).toBe(1);
    expect(patch.buttons?.width).toBe('full');
    expect(SAFE_AREA_PRESETS.telegram.top).toBeGreaterThan(0);
    expect(getPreviewViewport('custom', { width: 280, height: 9000 })).toEqual({ width: 320, height: 3840 });
    expect(getPreviewOrientation({ width: 390, height: 844 })).toBe('portrait');
  });
});

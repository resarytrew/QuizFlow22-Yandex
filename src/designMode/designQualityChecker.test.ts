import { describe, expect, it } from 'vitest';
import type { DesignSettings } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../design/designResolver';
import { createFreeLayoutDocumentFromMeasurements, type DesignSettingsWithLayoutDocuments } from './layoutDocument';
import {
  checkDesignQuality,
  createDesignQualityFixPatch,
  getContrastRatio,
} from './designQualityChecker';

function settingsWithLayout(extra: Partial<DesignSettingsWithLayoutDocuments>): DesignSettings {
  return {
    ...DEFAULT_DESIGN_SETTINGS,
    ...extra,
  } as DesignSettings;
}

describe('DesignQualityChecker', () => {
  it('detects small touch targets, hidden CTA and missing mobile free-layout adaptation', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [
        { id: 'primary-action', role: 'primary-action', nodeId: null, rect: { x: 20, y: 20, width: 24, height: 20 } },
        { id: 'answer-card-1', role: 'answer-card', nodeId: null, rect: { x: 20, y: 60, width: 120, height: 28 } },
      ],
    });
    doc.elements['primary-action'].hidden = true;
    const summary = checkDesignQuality(settingsWithLayout({ layoutDocuments: { global: doc } }), {
      breakpoint: 'mobile',
      templateId: 'default',
    });

    expect(summary.issues.map((item) => item.code)).toContain('cta-hidden');
    expect(summary.issues.map((item) => item.code)).toContain('touch-target-small');
    expect(summary.issues.map((item) => item.code)).toContain('free-layout-mobile-missing');
    expect(summary.errors).toBeGreaterThan(0);
  });

  it('detects contrast and mobile answer column problems', () => {
    const summary = checkDesignQuality({
      ...DEFAULT_DESIGN_SETTINGS,
      questionCard: {
        ...DEFAULT_DESIGN_SETTINGS.questionCard,
        backgroundColor: '#ffffff',
        textColor: '#ffffff',
      },
      answerCards: {
        ...DEFAULT_DESIGN_SETTINGS.answerCards,
        columns: 3,
      },
    }, { breakpoint: 'mobile' });

    expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(summary.issues.map((item) => item.code)).toContain('low-contrast');
    expect(summary.issues.map((item) => item.code)).toContain('columns-too-many');
  });

  it('creates undoable auto-fix patches for safe problems', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [{ id: 'primary-action', role: 'primary-action', nodeId: null, rect: { x: 20, y: 20, width: 20, height: 20 } }],
    });
    const settings = settingsWithLayout({ layoutDocuments: { global: doc } });
    const issue = checkDesignQuality(settings, { breakpoint: 'desktop' }).issues.find((item) => item.code === 'touch-target-small');
    const patch = createDesignQualityFixPatch(settings, { scope: 'global', breakpoint: 'desktop' }, issue!);

    const layoutPatch = patch as { layoutDocuments?: { global?: { elements: Record<string, { frame: { width: number; height: number } }> } } };
    expect(layoutPatch.layoutDocuments?.global?.elements['primary-action'].frame.width).toBeGreaterThanOrEqual(44);
    expect(layoutPatch.layoutDocuments?.global?.elements['primary-action'].frame.height).toBeGreaterThanOrEqual(44);
  });
});

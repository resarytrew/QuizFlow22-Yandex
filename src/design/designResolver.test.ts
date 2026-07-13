import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DESIGN_SETTINGS,
  normalizeDesignSettings,
  resolveDesign,
} from './designResolver';

describe('resolveDesign', () => {
  it('is deterministic and does not depend on previous click history', () => {
    const input = {
      defaults: DEFAULT_DESIGN_SETTINGS,
      template: { layout: { cardRadius: 8 }, buttons: { borderRadius: 4 } },
      stylePreset: { layout: { cardRadius: 0 }, buttons: { borderRadius: 0 } },
      overrides: { background: { color: '#123456' } },
    };

    const first = resolveDesign(input);
    const second = resolveDesign(input);

    expect(second).toEqual(first);
    expect(first.layout?.cardRadius).toBe(0);
    expect(first.buttons.borderRadius).toBe(0);
    expect(first.background.color).toBe('#123456');
  });

  it('resolves layers in defaults, template, style, brand kit, overrides order', () => {
    const resolved = resolveDesign({
      defaults: DEFAULT_DESIGN_SETTINGS,
      template: {
        brand: { primaryColor: '#111111' },
        typography: { fontFamily: 'Template font' },
        buttons: { backgroundColor: '#222222' },
      },
      stylePreset: {
        brand: { primaryColor: '#333333' },
        typography: { fontFamily: 'Style font' },
        buttons: { backgroundColor: '#444444' },
      },
      brandKit: {
        primaryColor: '#555555',
        fontFamily: 'Brand font',
      },
      overrides: {
        buttons: { backgroundColor: '#666666' },
      },
    });

    expect(resolved.brand?.primaryColor).toBe('#555555');
    expect(resolved.typography.fontFamily).toBe('Brand font');
    expect(resolved.buttons.backgroundColor).toBe('#666666');
  });

  it('normalizes legacy partial settings and invalid enum values', () => {
    const resolved = normalizeDesignSettings({
      background: { color: '#abcdef' },
      layout: { preset: 'unknown' as never },
      buttons: { borderRadius: 0 },
      sound: { volume: null },
    });

    expect(resolved.background.color).toBe('#abcdef');
    expect(resolved.background.overlayOpacity).toBe(0);
    expect(resolved.layout?.preset).toBe('classic');
    expect(resolved.buttons.borderRadius).toBe(0);
    expect(resolved.sound.volume).toBe(0.5);
  });

  it('keeps zero border radius as a valid design value', () => {
    const resolved = resolveDesign({
      overrides: {
        layout: { cardRadius: 0 },
        questionCard: { radius: 0 },
        answerCards: { borderRadius: 0 },
        buttons: { borderRadius: 0 },
      },
    });

    expect(resolved.layout?.cardRadius).toBe(0);
    expect(resolved.questionCard?.radius).toBe(0);
    expect(resolved.answerCards.borderRadius).toBe(0);
    expect(resolved.buttons.borderRadius).toBe(0);
  });
});

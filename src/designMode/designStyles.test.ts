import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN_SETTINGS, resolveDesign } from '../design/designResolver';
import {
  BUILT_IN_DESIGN_STYLES,
  normalizeStyleSettings,
  validateCustomDesignStyleJson,
} from './designStyles';
import { createDesignThumbnailModel } from './thumbnailRenderer';

describe('integrated design styles', () => {
  it('renders thumbnails from DesignResolver output', () => {
    const style = BUILT_IN_DESIGN_STYLES.find((item) => item.id === 'lead-form');
    expect(style).toBeTruthy();

    const model = createDesignThumbnailModel({
      templateId: 'default',
      stylePreset: style?.settings,
    });

    const resolved = resolveDesign({
      defaults: DEFAULT_DESIGN_SETTINGS,
      stylePreset: style?.settings,
    });
    expect(model.cardBackground).toBe(resolved.questionCard?.backgroundColor);
    expect(model.buttonBackground).toBe(resolved.buttons.backgroundColor);
    expect(model.progressColor).toBe(resolved.progress?.color);
  });

  it('normalizes styles deterministically', () => {
    const first = normalizeStyleSettings(BUILT_IN_DESIGN_STYLES[2].settings);
    const second = normalizeStyleSettings(BUILT_IN_DESIGN_STYLES[2].settings);

    expect(second).toEqual(first);
    expect(first.buttons.backgroundColor).toBeDefined();
    expect(first.layout?.contentWidth).toBeGreaterThan(0);
  });

  it('rejects invalid custom style JSON', () => {
    expect(() => validateCustomDesignStyleJson('{bad')).toThrow(/Invalid design style JSON/);
    expect(() => validateCustomDesignStyleJson(JSON.stringify({
      name: 'Bad',
      settings: {
        apiKey: 'secret',
      },
    }))).toThrow(/Unsafe key/);
    expect(() => validateCustomDesignStyleJson(JSON.stringify({
      name: 'Bad',
      settings: {
        background: { imageUrl: 'javascript:alert(1)' },
      },
    }))).toThrow(/Unsafe script/);
  });

  it('imports Custom CSS separately from normalized design settings', () => {
    const imported = validateCustomDesignStyleJson(JSON.stringify({
      name: 'Imported premium',
      description: 'With custom CSS',
      settings: {
        advanced: { customCss: '.quiz { color: red; }' },
        buttons: { borderRadius: 0 },
      },
    }));

    expect(imported.customCss).toBe('.quiz { color: red; }');
    expect(imported.settings.advanced?.customCss).toBe('');
    expect(imported.settings.buttons?.borderRadius).toBe(0);
  });
});

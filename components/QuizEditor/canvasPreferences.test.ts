import { describe, expect, it } from 'vitest';
import { BackgroundVariant } from 'reactflow';
import { getCanvasBackgroundConfig } from './canvasPreferences';

const baseSettings = {
  backgroundColor: '#ffffff',
  pattern: 'small' as const,
  lineColor: '#123456',
  lineWidth: 2,
};

describe('getCanvasBackgroundConfig', () => {
  it('uses the selected line color and width', () => {
    expect(getCanvasBackgroundConfig(true, baseSettings)).toEqual({
      visible: true,
      variant: BackgroundVariant.Dots,
      gap: 20,
      size: 2,
      color: '#123456',
    });
  });

  it('maps medium and large patterns to distinct React Flow backgrounds', () => {
    expect(
      getCanvasBackgroundConfig(true, { ...baseSettings, pattern: 'medium' }).variant,
    ).toBe(BackgroundVariant.Cross);
    expect(
      getCanvasBackgroundConfig(true, { ...baseSettings, pattern: 'large' }).variant,
    ).toBe(BackgroundVariant.Lines);
  });

  it('hides the background when the grid is disabled or pattern is none', () => {
    expect(getCanvasBackgroundConfig(false, baseSettings).visible).toBe(false);
    expect(
      getCanvasBackgroundConfig(true, { ...baseSettings, pattern: 'none' }).visible,
    ).toBe(false);
  });
});

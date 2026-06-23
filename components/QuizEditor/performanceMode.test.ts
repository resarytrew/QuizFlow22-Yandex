import { describe, expect, it } from 'vitest';
import { getMotionDuration, isLowMotionMode, shouldAnimateEdges } from './performanceMode';

describe('editor performance mode', () => {
  it('uses normal motion when performance modes are disabled', () => {
    expect(isLowMotionMode({ reduceMotion: false, simplified: false })).toBe(false);
    expect(getMotionDuration(400, { reduceMotion: false, simplified: false })).toBe(400);
    expect(
      shouldAnimateEdges({
        edgeAnimations: true,
        reduceMotion: false,
        simplified: false,
      }),
    ).toBe(true);
  });

  it.each([
    { reduceMotion: true, simplified: false },
    { reduceMotion: false, simplified: true },
  ])('disables editor motion in low-power mode', (preferences) => {
    expect(isLowMotionMode(preferences)).toBe(true);
    expect(getMotionDuration(400, preferences)).toBe(0);
    expect(shouldAnimateEdges({ edgeAnimations: true, ...preferences })).toBe(false);
  });
});

import type { UserPreferences } from '../../store/usePreferencesStore';

type PerformancePreferences = Pick<
  UserPreferences,
  'edgeAnimations' | 'reduceMotion' | 'simplified'
>;

export function isLowMotionMode(
  preferences: Pick<UserPreferences, 'reduceMotion' | 'simplified'>,
): boolean {
  return preferences.reduceMotion || preferences.simplified;
}

export function shouldAnimateEdges(preferences: PerformancePreferences): boolean {
  return preferences.edgeAnimations && !isLowMotionMode(preferences);
}

export function getMotionDuration(
  duration: number,
  preferences: Pick<UserPreferences, 'reduceMotion' | 'simplified'>,
): number {
  return isLowMotionMode(preferences) ? 0 : duration;
}

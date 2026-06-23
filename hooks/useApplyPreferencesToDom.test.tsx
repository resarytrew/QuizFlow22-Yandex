import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, usePreferencesStore } from '../store/usePreferencesStore';
import { useApplyPreferencesToDom } from './useApplyPreferencesToDom';

describe('useApplyPreferencesToDom', () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      preferences: { ...DEFAULT_PREFERENCES },
      presets: [],
      activePresetId: null,
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies node sizing and visual classes to the document', () => {
    renderHook(() => useApplyPreferencesToDom());

    act(() => {
      usePreferencesStore.getState().replacePreferences({
        nodeSize: 'lg',
        compactMode: true,
        showNodeIcons: false,
        nodeShadows: false,
      });
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--node-width')).toBe('16rem');
    expect(root.style.getPropertyValue('--node-padding')).toBe('0.5rem');
    expect(root.classList.contains('pref-no-icons')).toBe(true);
    expect(root.classList.contains('pref-no-shadow')).toBe(true);
  });

  it('enables real performance mode classes', () => {
    renderHook(() => useApplyPreferencesToDom());

    act(() => {
      usePreferencesStore.getState().replacePreferences({
        reduceMotion: true,
        minimizeEffects: true,
        simplified: true,
      });
    });

    const root = document.documentElement;
    expect(root.classList.contains('pref-reduce-motion')).toBe(true);
    expect(root.classList.contains('pref-minimal')).toBe(true);
    expect(root.classList.contains('pref-simplified')).toBe(true);
    expect(root.classList.contains('pref-no-anim')).toBe(true);
    expect(root.classList.contains('pref-no-shadow')).toBe(true);
    expect(root.style.getPropertyValue('--editor-shadow')).toBe('none');
  });

  it.each([
    { preference: 'reduceMotion' as const, className: 'pref-reduce-motion' },
    { preference: 'simplified' as const, className: 'pref-simplified' },
  ])('makes $preference a complete low-power mode', ({ preference, className }) => {
    renderHook(() => useApplyPreferencesToDom());

    act(() => {
      usePreferencesStore.getState().setPreference(preference, true);
    });

    const root = document.documentElement;
    expect(root.classList.contains(className)).toBe(true);
    expect(root.classList.contains('pref-reduce-motion')).toBe(true);
    expect(root.classList.contains('pref-minimal')).toBe(true);
    expect(root.classList.contains('pref-no-anim')).toBe(true);
    expect(root.classList.contains('pref-no-shadow')).toBe(true);
    expect(root.style.getPropertyValue('--editor-shadow')).toBe('none');
  });
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from '../store/useCanvasStore';
import { DEFAULT_PREFERENCES, usePreferencesStore } from '../store/usePreferencesStore';
import { useSyncBoardSettings } from './useSyncBoardSettings';

describe('useSyncBoardSettings', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    usePreferencesStore.setState({
      preferences: { ...DEFAULT_PREFERENCES },
      presets: [],
      activePresetId: null,
    });
  });

  it('synchronizes all board appearance fields with the canvas store', () => {
    renderHook(() => useSyncBoardSettings());

    act(() => {
      usePreferencesStore.getState().setBoardSettings({
        boardBackgroundColor: '#101010',
        boardPattern: 'large',
        boardLineColor: '#ff0000',
        boardLineWidth: 2.5,
      });
    });

    expect(useCanvasStore.getState().boardSettings).toEqual({
      backgroundColor: '#101010',
      pattern: 'large',
      lineColor: '#ff0000',
      lineWidth: 2.5,
    });
  });
});

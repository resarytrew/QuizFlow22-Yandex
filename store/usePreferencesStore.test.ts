import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  usePreferencesStore,
} from './usePreferencesStore';

describe('usePreferencesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferencesStore.setState({
      preferences: { ...DEFAULT_PREFERENCES },
      presets: [],
      activePresetId: null,
    });
  });

  it('updates editor preferences and clears the active preset', () => {
    const preset = usePreferencesStore.getState().savePreset('Рабочий');
    expect(usePreferencesStore.getState().activePresetId).toBe(preset.id);

    usePreferencesStore.getState().setPreference('showGrid', false);

    expect(usePreferencesStore.getState().preferences.showGrid).toBe(false);
    expect(usePreferencesStore.getState().activePresetId).toBeNull();
  });

  it('saves an independent snapshot and restores it', () => {
    usePreferencesStore.getState().setPreference('nodeSize', 'lg');
    const preset = usePreferencesStore.getState().savePreset('Крупные ноды');

    usePreferencesStore.getState().setPreference('nodeSize', 'sm');
    usePreferencesStore.getState().loadPreset(preset.id);

    expect(usePreferencesStore.getState().preferences.nodeSize).toBe('lg');
    expect(usePreferencesStore.getState().activePresetId).toBe(preset.id);
  });

  it('merges partial replacements with defaults', () => {
    usePreferencesStore.getState().replacePreferences({
      accentColor: '#0ea5e9',
    });

    const preferences = usePreferencesStore.getState().preferences;
    expect(preferences.accentColor).toBe('#0ea5e9');
    expect(preferences.showGrid).toBe(DEFAULT_PREFERENCES.showGrid);
    expect(preferences.boardPattern).toBe(DEFAULT_PREFERENCES.boardPattern);
  });

  it('resets preferences without deleting saved presets', () => {
    usePreferencesStore.getState().savePreset('Сохранённый');
    usePreferencesStore.getState().setPreference('snapToGrid', true);
    usePreferencesStore.getState().resetToDefaults();

    expect(usePreferencesStore.getState().preferences).toEqual(DEFAULT_PREFERENCES);
    expect(usePreferencesStore.getState().presets).toHaveLength(1);
  });
});

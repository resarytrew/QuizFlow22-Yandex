import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignAssetsStore } from './useDesignAssetsStore';
import { usePreferencesStore } from './usePreferencesStore';

describe('useDesignAssetsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDesignAssetsStore.getState().reset();
    usePreferencesStore.getState().resetToDefaults();
  });

  it('saves, renames, duplicates and deletes custom styles', () => {
    const style = useDesignAssetsStore.getState().saveCustomStyle({
      name: 'Quiet style',
      description: 'For tests',
      settings: { buttons: { borderRadius: 0 } },
    });

    useDesignAssetsStore.getState().updateCustomStyle(style.id, { name: 'Updated style' });
    expect(useDesignAssetsStore.getState().customStyles[0].name).toBe('Updated style');

    const duplicated = useDesignAssetsStore.getState().duplicateCustomStyle(style.id);
    expect(duplicated?.name).toContain('копия');
    expect(useDesignAssetsStore.getState().customStyles).toHaveLength(2);

    useDesignAssetsStore.getState().deleteCustomStyle(style.id);
    expect(useDesignAssetsStore.getState().customStyles).toHaveLength(1);
  });

  it('imports and exports custom style JSON', () => {
    const saved = useDesignAssetsStore.getState().importCustomStyleJson(JSON.stringify({
      name: 'Imported',
      description: 'JSON style',
      settings: { background: { color: '#111111' } },
    }));

    const exported = useDesignAssetsStore.getState().exportCustomStyleJson(saved.id);

    expect(exported).toContain('"name": "Imported"');
    expect(exported).toContain('#111111');
  });

  it('keeps design assets separate from workspace presets', () => {
    usePreferencesStore.getState().savePreset('Workspace preset');
    useDesignAssetsStore.getState().saveCustomStyle({
      name: 'Quiz style',
      settings: { background: { color: '#222222' } },
    });

    expect(usePreferencesStore.getState().presets).toHaveLength(1);
    expect(useDesignAssetsStore.getState().customStyles).toHaveLength(1);
    expect(localStorage.getItem('potok-preferences')).toBeTruthy();
    expect(localStorage.getItem('potok-design-assets')).toBeTruthy();
  });

  it('stores and marks Brand Kit separately from preferences', () => {
    const kit = useDesignAssetsStore.getState().saveBrandKit({
      name: 'Acme',
      primaryColor: '#123456',
      accentColor: '#abcdef',
      neutralColor: '#111111',
      fontFamily: 'Inter',
      displayFontFamily: 'Lora',
    });

    useDesignAssetsStore.getState().markBrandKitApplied(kit.id);

    expect(useDesignAssetsStore.getState().activeBrandKitName).toBe('Acme');
    expect(usePreferencesStore.getState().activePresetId).toBeNull();
  });
});

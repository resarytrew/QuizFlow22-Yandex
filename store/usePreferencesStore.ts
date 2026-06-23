import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NodeSize = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type BorderRadius = 'sharp' | 'soft' | 'rounded';
export type FontFamily = 'inter' | 'system' | 'mono';
export type ShadowIntensity = 0 | 1 | 2 | 3;
export type BoardPattern = 'none' | 'small' | 'medium' | 'large';

export interface UserPreferences {
  // Editor / canvas
  nodeAnimations: boolean;
  nodeShadows: boolean;
  compactMode: boolean;
  nodeSize: NodeSize;
  showNodeIcons: boolean;
  showNodeDescriptions: boolean;
  showNodeBadges: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  edgeAnimations: boolean;

  // Board (migrated from useCanvasStore.boardSettings)
  boardBackgroundColor: string;
  boardPattern: BoardPattern;
  boardLineColor: string;
  boardLineWidth: number;

  // Sidebar filters
  onlyFree: boolean;
  freeFirst: boolean;
  hideUnavailable: boolean;

  // Appearance
  theme: ThemeMode;
  accentColor: string;
  shadowIntensity: ShadowIntensity;
  borderRadius: BorderRadius;
  fontFamily: FontFamily;

  // Performance
  reduceMotion: boolean;
  minimizeEffects: boolean;
  simplified: boolean;
}

export interface Preset {
  id: string;
  name: string;
  preferences: UserPreferences;
  createdAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  nodeAnimations: true,
  nodeShadows: true,
  compactMode: false,
  nodeSize: 'md',
  showNodeIcons: true,
  showNodeDescriptions: true,
  showNodeBadges: true,
  showGrid: true,
  snapToGrid: false,
  edgeAnimations: true,

  boardBackgroundColor: '#f8fafc',
  boardPattern: 'small',
  boardLineColor: '#e2e8f0',
  boardLineWidth: 1,

  onlyFree: false,
  freeFirst: true,
  hideUnavailable: false,

  theme: 'light',
  accentColor: '#6366f1',
  shadowIntensity: 2,
  borderRadius: 'soft',
  fontFamily: 'inter',

  reduceMotion: false,
  minimizeEffects: false,
  simplified: false,
};

interface PreferencesState {
  preferences: UserPreferences;
  presets: Preset[];
  activePresetId: string | null;

  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  setBoardSettings: (
    board: Partial<
      Pick<
        UserPreferences,
        'boardBackgroundColor' | 'boardPattern' | 'boardLineColor' | 'boardLineWidth'
      >
    >,
  ) => void;

  resetToDefaults: () => void;

  savePreset: (name: string) => Preset;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;

  replacePreferences: (prefs: Partial<UserPreferences>) => void;
}

const STORAGE_KEY = 'potok-preferences';
const STORAGE_VERSION = 2;

function cloneDefaults(): UserPreferences {
  return { ...DEFAULT_PREFERENCES };
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: cloneDefaults(),
      presets: [],
      activePresetId: null,

      setPreference: (key, value) => {
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
          activePresetId: null,
        }));
      },

      setBoardSettings: (board) => {
        set((state) => ({
          preferences: { ...state.preferences, ...board },
          activePresetId: null,
        }));
      },

      resetToDefaults: () => {
        set({
          preferences: cloneDefaults(),
          activePresetId: null,
        });
      },

      savePreset: (name) => {
        const preset: Preset = {
          id: genId(),
          name,
          preferences: structuredClone(get().preferences),
          createdAt: Date.now(),
        };
        set((state) => ({
          presets: [...state.presets, preset],
          activePresetId: preset.id,
        }));
        return preset;
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (!preset) return;
        set({
          preferences: structuredClone(preset.preferences),
          activePresetId: preset.id,
        });
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }));
      },

      renamePreset: (id, name) => {
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        }));
      },

      replacePreferences: (prefs) => {
        set((state) => ({
          preferences: { ...cloneDefaults(), ...state.preferences, ...prefs },
          activePresetId: null,
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const persisted = (persistedState ?? {}) as Partial<PreferencesState>;
        return {
          ...persisted,
          preferences: {
            ...cloneDefaults(),
            ...(persisted.preferences ?? {}),
          },
          presets: (persisted.presets ?? []).map((preset) => ({
            ...preset,
            preferences: {
              ...cloneDefaults(),
              ...preset.preferences,
            },
          })),
          activePresetId: persisted.activePresetId ?? null,
        } as PreferencesState;
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<PreferencesState>;
        return {
          ...currentState,
          ...persisted,
          preferences: {
            ...cloneDefaults(),
            ...(persisted.preferences ?? {}),
          },
          presets: persisted.presets ?? currentState.presets,
        };
      },
      partialize: (state) => ({
        preferences: state.preferences,
        presets: state.presets,
        activePresetId: state.activePresetId,
      }),
    },
  ),
);

export const useBoardPreferences = () =>
  usePreferencesStore((s) => ({
    backgroundColor: s.preferences.boardBackgroundColor,
    pattern: s.preferences.boardPattern,
    lineColor: s.preferences.boardLineColor,
    lineWidth: s.preferences.boardLineWidth,
  }));

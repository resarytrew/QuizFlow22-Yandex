import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DesignSettings } from '../types';
import type { DesignBrandKit, DeepPartial } from '../src/design/designResolver';
import {
  type CustomDesignStyle,
  type ImportedDesignStyle,
  serializeCustomDesignStyle,
  validateCustomDesignStyleJson,
} from '../src/designMode/designStyles';

export interface SavedBrandKit extends DesignBrandKit {
  id: string;
  name: string;
  brandName?: string;
  createdAt: number;
  updatedAt: number;
}

interface DesignAssetsState {
  brandKits: SavedBrandKit[];
  customStyles: CustomDesignStyle[];
  activeBrandKitId: string | null;
  activeBrandKitName: string | null;
  saveBrandKit: (kit: Omit<SavedBrandKit, 'id' | 'createdAt' | 'updatedAt'>) => SavedBrandKit;
  renameBrandKit: (id: string, name: string) => void;
  updateBrandKit: (id: string, kit: Partial<Omit<SavedBrandKit, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteBrandKit: (id: string) => void;
  markBrandKitApplied: (id: string | null) => void;
  saveCustomStyle: (style: {
    name: string;
    description?: string;
    settings: DeepPartial<DesignSettings>;
    thumbnail?: string;
    customCss?: string;
  }) => CustomDesignStyle;
  updateCustomStyle: (id: string, patch: Partial<Omit<CustomDesignStyle, 'id' | 'createdAt'>>) => void;
  duplicateCustomStyle: (id: string) => CustomDesignStyle | null;
  deleteCustomStyle: (id: string) => void;
  importCustomStyleJson: (rawJson: string) => CustomDesignStyle;
  exportCustomStyleJson: (id: string) => string | null;
  reset: () => void;
}

const STORAGE_KEY = 'potok-design-assets';
const STORAGE_VERSION = 1;

function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return Date.now();
}

function normalizeName(name: string, fallback: string): string {
  const value = name.trim();
  return value.length > 0 ? value : fallback;
}

function createCustomStyle(input: ImportedDesignStyle | {
  name: string;
  description?: string;
  settings: DeepPartial<DesignSettings>;
  thumbnail?: string;
  customCss?: string;
}): CustomDesignStyle {
  const createdAt = now();
  return {
    id: genId('style'),
    name: normalizeName(input.name, 'Пользовательский стиль'),
    description: input.description ?? '',
    settings: structuredClone(input.settings),
    thumbnail: input.thumbnail,
    customCss: input.customCss,
    createdAt,
    updatedAt: createdAt,
  };
}

function initialState() {
  return {
    brandKits: [] as SavedBrandKit[],
    customStyles: [] as CustomDesignStyle[],
    activeBrandKitId: null as string | null,
    activeBrandKitName: null as string | null,
  };
}

export const useDesignAssetsStore = create<DesignAssetsState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      saveBrandKit: (kit) => {
        const createdAt = now();
        const saved: SavedBrandKit = {
          ...kit,
          id: genId('brand'),
          name: normalizeName(kit.name, 'Brand Kit'),
          createdAt,
          updatedAt: createdAt,
        };
        set((state) => ({ brandKits: [...state.brandKits, saved] }));
        return saved;
      },

      renameBrandKit: (id, name) => {
        set((state) => ({
          brandKits: state.brandKits.map((kit) => (
            kit.id === id ? { ...kit, name: normalizeName(name, kit.name), updatedAt: now() } : kit
          )),
          activeBrandKitName: state.activeBrandKitId === id ? normalizeName(name, state.activeBrandKitName ?? 'Brand Kit') : state.activeBrandKitName,
        }));
      },

      updateBrandKit: (id, kitPatch) => {
        set((state) => ({
          brandKits: state.brandKits.map((kit) => (
            kit.id === id ? { ...kit, ...kitPatch, updatedAt: now() } : kit
          )),
        }));
      },

      deleteBrandKit: (id) => {
        set((state) => ({
          brandKits: state.brandKits.filter((kit) => kit.id !== id),
          activeBrandKitId: state.activeBrandKitId === id ? null : state.activeBrandKitId,
          activeBrandKitName: state.activeBrandKitId === id ? null : state.activeBrandKitName,
        }));
      },

      markBrandKitApplied: (id) => {
        const kit = id ? get().brandKits.find((item) => item.id === id) : null;
        set({
          activeBrandKitId: kit?.id ?? null,
          activeBrandKitName: kit?.name ?? null,
        });
      },

      saveCustomStyle: (style) => {
        const saved = createCustomStyle(style);
        set((state) => ({ customStyles: [...state.customStyles, saved] }));
        return saved;
      },

      updateCustomStyle: (id, patch) => {
        set((state) => ({
          customStyles: state.customStyles.map((style) => (
            style.id === id
              ? {
                  ...style,
                  ...patch,
                  name: patch.name ? normalizeName(patch.name, style.name) : style.name,
                  updatedAt: now(),
                }
              : style
          )),
        }));
      },

      duplicateCustomStyle: (id) => {
        const source = get().customStyles.find((style) => style.id === id);
        if (!source) return null;
        const duplicated = createCustomStyle({
          name: `${source.name} копия`,
          description: source.description,
          settings: source.settings,
          thumbnail: source.thumbnail,
          customCss: source.customCss,
        });
        set((state) => ({ customStyles: [...state.customStyles, duplicated] }));
        return duplicated;
      },

      deleteCustomStyle: (id) => {
        set((state) => ({ customStyles: state.customStyles.filter((style) => style.id !== id) }));
      },

      importCustomStyleJson: (rawJson) => {
        const imported = validateCustomDesignStyleJson(rawJson);
        const saved = createCustomStyle(imported);
        set((state) => ({ customStyles: [...state.customStyles, saved] }));
        return saved;
      },

      exportCustomStyleJson: (id) => {
        const style = get().customStyles.find((item) => item.id === id);
        return style ? serializeCustomDesignStyle(style) : null;
      },

      reset: () => set(initialState()),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        brandKits: state.brandKits,
        customStyles: state.customStyles,
        activeBrandKitId: state.activeBrandKitId,
        activeBrandKitName: state.activeBrandKitName,
      }),
      migrate: (persistedState) => ({
        ...initialState(),
        ...((persistedState ?? {}) as Partial<DesignAssetsState>),
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState ?? {}) as Partial<DesignAssetsState>),
      }),
    },
  ),
);

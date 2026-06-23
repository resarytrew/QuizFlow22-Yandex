import { create } from 'zustand';
import toast from 'react-hot-toast';
import { useCanvasStore } from './useCanvasStore';
import { useQuizDataStore } from './useQuizDataStore';
import type { AutosavePayload } from '../types';

interface AutosaveStoreState {
  autosavedData: AutosavePayload | null;
  lastAutosave: Date | null;
  autosaveCurrentQuiz: () => void;
  checkForAutosave: () => void;
  restoreAutosave: () => void;
  clearAutosave: () => void;
  reset: () => void;
}

const AUTOSAVE_KEY = 'potok_autosave';
const AUTOSAVE_MAX_HOURS = 24;

const initialState = {
  autosavedData: null as AutosavePayload | null,
  lastAutosave: null as Date | null,
};

export const useAutosaveStore = create<AutosaveStoreState>((set, get) => ({
  ...initialState,

  autosaveCurrentQuiz: () => {
    try {
      // Read ACTUAL state at save time — no stale snapshots
      const canvasState = useCanvasStore.getState();
      const quizState = useQuizDataStore.getState();

      const dataToSave: AutosavePayload & { timestamp: string; version: number } = {
        currentQuizId: quizState.currentQuizId,
        nodes: canvasState.nodes,
        edges: canvasState.edges,
        globalTimer: quizState.globalTimer,
        designSettings: quizState.designSettings,
        templateId: quizState.templateId,
        currentQuizName: quizState.currentQuizName,
        timestamp: new Date().toISOString(),
        version: 1,
      };

      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataToSave));
      set({ lastAutosave: new Date() });
    } catch (e) {
      // QuotaExceededError or other localStorage failure — don't block the app
      console.warn('Autosave failed (storage full?):', e);
    }
  },

  checkForAutosave: () => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      // Version check — skip incompatible autosaves
      if (parsed.version && parsed.version !== 1) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }

      // Ignore autosaves older than 24 hours
      const savedAt = new Date(parsed.timestamp);
      const hoursSince = (Date.now() - savedAt.getTime()) / 1000 / 3600;
      if (hoursSince > AUTOSAVE_MAX_HOURS) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }

      set({ autosavedData: parsed });
    } catch {
      // Corrupted JSON — clean up
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  },

  restoreAutosave: () => {
    const { autosavedData } = get();
    if (!autosavedData) return;

    try {
      // Use public API method instead of setState bypass
      useQuizDataStore.getState().restoreFromAutosave(autosavedData);
      set({ autosavedData: null });
      toast.success('Автосохранение восстановлено');
    } catch (e) {
      console.error('Failed to restore autosave:', e);
    }
  },

  clearAutosave: () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
    set({ autosavedData: null });
  },

  reset: () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
    set(initialState);
  },
}));

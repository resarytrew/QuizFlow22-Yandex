import { create } from "zustand";
import { buildCurrentQuizData, useQuizDataStore } from "./useQuizDataStore";
import { useAuthStore } from "./useAuthStore";
import type { AutosavePayload } from "../types";
export type Backup = AutosavePayload & {
  timestamp: string;
  id: string;
  revision?: number;
};
const prefix = () =>
  `potok_backups_v2:${useAuthStore.getState().session?.user.id || "guest"}:`;
const key = () =>
  prefix() + (useQuizDataStore.getState().currentQuizId || "new");
interface AutosaveState {
  autosavedData: Backup | null;
  versions: Backup[];
  lastAutosave: Date | null;
  storageError: string | null;
  autosaveCurrentQuiz: () => void;
  checkForAutosave: () => void;
  restoreAutosave: (id?: string) => void;
  clearAutosave: () => void;
  reset: () => void;
}
function read(): Backup[] {
  try {
    const value = JSON.parse(localStorage.getItem(key()) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (v) =>
            Array.isArray(v.nodes) &&
            Array.isArray(v.edges) &&
            typeof v.timestamp === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export const useAutosaveStore = create<AutosaveState>((set, get) => ({
  autosavedData: null,
  versions: [],
  lastAutosave: null,
  storageError: null,
  autosaveCurrentQuiz: () => {
    const state = useQuizDataStore.getState();
    const doc = buildCurrentQuizData();
    const backup: Backup = {
      ...doc,
      templateId: state.templateId,
      currentQuizName: state.currentQuizName,
      currentQuizId: state.currentQuizId,
      currentQuizVisibility: state.currentQuizVisibility,
      quizDataBase: doc,
      revision: state.revision,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    };
    try {
      const previous = read();
      // Keep the latest draft plus spaced checkpoints, rather than every keystroke.
      const checkpoints =
        previous[0] && Date.now() - Date.parse(previous[0].timestamp) < 30000
          ? previous.slice(1)
          : previous;
      const versions = [backup, ...checkpoints].slice(0, 5);
      localStorage.setItem(key(), JSON.stringify(versions));
      set({ versions, lastAutosave: new Date(), storageError: null });
    } catch {
      set({
        storageError:
          "Резервная копия не записана: недостаточно места. Скачайте квиз в файл.",
      });
    }
  },
  checkForAutosave: () => {
    const versions = read();
    const state = useQuizDataStore.getState();
    const latest = versions[0];
    set({
      versions,
      autosavedData:
        latest &&
        (!state.lastServerSave ||
          Date.parse(latest.timestamp) > Date.parse(state.lastServerSave))
          ? latest
          : null,
    });
  },
  restoreAutosave: (id) => {
    const backup = id
      ? get().versions.find((v) => v.id === id)
      : get().autosavedData;
    if (!backup) return;
    useQuizDataStore.getState().restoreFromAutosave(backup);
    useQuizDataStore.setState({ revision: backup.revision });
    set({ autosavedData: null });
  },
  // Dismissal never deletes the user's backups.
  clearAutosave: () => set({ autosavedData: null }),
  reset: () =>
    set({
      autosavedData: null,
      versions: [],
      lastAutosave: null,
      storageError: null,
    }),
}));

import { create } from 'zustand';
import { createElement } from 'react';
import {
  GlobalTimer,
  DesignSettings,
  Quiz,
  QuizTemplateId,
  PublicQuiz,
  QuizPassport,
  QuizTemplate,
  AutosavePayload,
  QuizVisibility,
} from '../types';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';
import { useCanvasStore } from './useCanvasStore';
import { useAuthStore } from './useAuthStore';
import { storeEvents } from './storeEvents';
import { normalizeQuizKeywords } from '../utils/quizKeywords';
import {
  cloneDesignSettings,
  DEFAULT_DESIGN_SETTINGS,
  DeepPartial,
  getTemplateDesignBase,
  mergeDefined,
  normalizeDesignSettings,
  resolveDesign,
  DesignBrandKit,
} from '../src/design/designResolver';

const TEMPLATE_IDS = new Set<QuizTemplateId>([
  'default',
  'ww2',
  'economic',
  'yandex',
  'army',
  'science',
  'math',
  'history',
  'newyear',
  'screenQuiz',
]);

function normalizeTemplateId(value: unknown): QuizTemplateId {
  return typeof value === 'string' && TEMPLATE_IDS.has(value as QuizTemplateId)
    ? (value as QuizTemplateId)
    : 'default';
}

export type DesignStatus = 'applied' | 'modified' | 'custom';

interface DesignMeta {
  activeStyleId: string | null;
  activeStylePreset: DeepPartial<DesignSettings> | null;
  status: DesignStatus;
}

interface DesignHistoryEntry {
  before: DesignSettings;
  after: DesignSettings;
  beforeMeta: DesignMeta;
  afterMeta: DesignMeta;
  label: string;
  coalesceKey?: string;
}

interface DesignHistoryState {
  past: DesignHistoryEntry[];
  future: DesignHistoryEntry[];
}

interface DesignUpdateOptions {
  label?: string;
  coalesceKey?: string;
  preserveStyleStatus?: boolean;
}

const DESIGN_HISTORY_LIMIT = 50;

interface QuizDataStoreState {
  currentQuizId: string | null;
  setCurrentQuizId: (id: string | null) => void;
  currentQuizName: string;
  setCurrentQuizName: (name: string) => void;
  currentQuizVisibility: QuizVisibility | null;
  setCurrentQuizVisibility: (v: QuizVisibility | null) => void;
  templateId: QuizTemplateId;
  setTemplateId: (id: QuizTemplateId) => void;

  globalTimer: GlobalTimer;
  setGlobalTimer: (timer: Partial<GlobalTimer>) => void;
  designSettings: DesignSettings;
  designStatus: DesignStatus;
  activeDesignStyleId: string | null;
  activeDesignStylePreset: DeepPartial<DesignSettings> | null;
  designHistory: DesignHistoryState;
  canUndoDesign: boolean;
  canRedoDesign: boolean;
  updateDesignSettings: (settings: DeepPartial<DesignSettings>, options?: DesignUpdateOptions) => void;
  applyDesignStylePreset: (id: string, stylePreset: DeepPartial<DesignSettings>) => void;
  applyDesignPalette: (palette: DeepPartial<DesignSettings>) => void;
  applyBrandKit: (brandKit: DesignBrandKit, options?: { id?: string; name?: string; preserveLayout?: boolean; preserveOverrides?: boolean }) => void;
  undoDesignChange: () => void;
  redoDesignChange: () => void;
  resetDesignProperty: (path: string) => void;
  resetDesignSection: (section: keyof DesignSettings) => void;
  resetDesignScreen: () => void;
  resetAllDesign: () => void;

  userQuizzes: Quiz[];
  setUserQuizzes: (quizzes: Quiz[]) => void;
  fetchUserQuizzes: (forceRefresh?: boolean) => Promise<void>;
  ensureQuizLoaded: (id: string) => Promise<Quiz | null>;
  isQuizzesLoading: boolean;
  analyticsQuizId: string | null;
  setAnalyticsQuizId: (id: string | null) => void;

  saveQuiz: (opts?: { visibility?: QuizVisibility }) => Promise<string | null>;
  loadQuiz: (quiz: Quiz) => void;
  deleteQuiz: (id: string) => Promise<void>;
  duplicateQuiz: (id: string) => Promise<string | null>;
  createNewQuiz: () => void;
  toggleQuizFavorite: (id: string) => Promise<void>;
  updateQuizPublication: (
    id: string,
    data: { is_published: boolean; description?: string; cover_image_url?: string; keywords?: string[] }
  ) => Promise<void>;
  updateQuizVisibility: (
    id: string,
    data: { visibility: QuizVisibility; description?: string; cover_image_url?: string; keywords?: string[] }
  ) => Promise<void>;
  updateQuizPassport: (id: string, passport: QuizPassport) => Promise<void>;
  cloneAndEditPublicQuiz: (publicQuiz: PublicQuiz) => Promise<string | null>;
  autosaveQuiz: (opts?: { visibility?: QuizVisibility }) => Promise<string | null>;

  pendingTemplate: QuizTemplate | null;
  setPendingTemplate: (data: QuizTemplate | null) => void;

  restoreFromAutosave: (data: AutosavePayload) => void;

  reset: () => void;
}

const createInitialState = () => ({
  currentQuizId: null as string | null,
  currentQuizName: '',
  currentQuizVisibility: null as QuizVisibility | null,
  templateId: 'default' as QuizTemplateId,
  globalTimer: {
    enabled: false,
    duration: 0,
    onTimeoutNodeId: null,
  } as GlobalTimer,
  designSettings: cloneDesignSettings(DEFAULT_DESIGN_SETTINGS),
  designStatus: 'custom' as DesignStatus,
  activeDesignStyleId: null as string | null,
  activeDesignStylePreset: null as DeepPartial<DesignSettings> | null,
  designHistory: { past: [], future: [] } as DesignHistoryState,
  canUndoDesign: false,
  canRedoDesign: false,
  userQuizzes: [] as Quiz[],
  isQuizzesLoading: false,
  analyticsQuizId: null as string | null,
  pendingTemplate: null as QuizTemplate | null,
});

const QUIZ_DATA_BATCH_SIZE = 8;
let quizHydrationGeneration = 0;

type QuizSummaryRow = Pick<Quiz, 'id' | 'name' | 'created_at' | 'updated_at'> &
  Partial<Pick<Quiz, 'user_id' | 'published_at' | 'is_favorite'>> & {
    visibility?: QuizVisibility | string;
  };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeQuizVisibility(value: unknown): QuizVisibility {
  return value === 'private' || value === 'unlisted' || value === 'public'
    ? value
    : 'public';
}

function designsEqual(left: DesignSettings, right: DesignSettings): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function currentDesignMeta(state: Pick<QuizDataStoreState, 'activeDesignStyleId' | 'activeDesignStylePreset' | 'designStatus'>): DesignMeta {
  return {
    activeStyleId: state.activeDesignStyleId,
    activeStylePreset: state.activeDesignStylePreset ?? null,
    status: state.designStatus,
  };
}

function baselineForDesign(state: QuizDataStoreState): DesignSettings {
  return resolveDesign({
    defaults: DEFAULT_DESIGN_SETTINGS,
    template: getTemplateDesignBase(state.templateId),
    stylePreset: state.activeDesignStylePreset ?? undefined,
  });
}

function withHistoryFlags(history: DesignHistoryState) {
  return {
    designHistory: history,
    canUndoDesign: history.past.length > 0,
    canRedoDesign: history.future.length > 0,
  };
}

function pushDesignHistory(
  history: DesignHistoryState,
  entry: DesignHistoryEntry,
): DesignHistoryState {
  const last = history.past.at(-1);
  const shouldCoalesce = Boolean(last && entry.coalesceKey && last.coalesceKey === entry.coalesceKey);
  const past = shouldCoalesce
    ? [...history.past.slice(0, -1), { ...entry, before: last!.before, beforeMeta: last!.beforeMeta }]
    : [...history.past, entry].slice(-DESIGN_HISTORY_LIMIT);
  return { past, future: [] };
}

function commitDesignChange(
  state: QuizDataStoreState,
  nextDesign: DesignSettings,
  nextMeta: DesignMeta,
  options: DesignUpdateOptions = {},
) {
  if (designsEqual(state.designSettings, nextDesign)) return {};

  const entry: DesignHistoryEntry = {
    before: cloneDesignSettings(state.designSettings),
    after: cloneDesignSettings(nextDesign),
    beforeMeta: currentDesignMeta(state),
    afterMeta: nextMeta,
    label: options.label ?? 'Design change',
    coalesceKey: options.coalesceKey,
  };
  const history = pushDesignHistory(state.designHistory, entry);

  return {
    designSettings: nextDesign,
    activeDesignStyleId: nextMeta.activeStyleId,
    activeDesignStylePreset: nextMeta.activeStylePreset,
    designStatus: nextMeta.status,
    ...withHistoryFlags(history),
  };
}

function readDesignPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (
    value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
  ), source);
}

function writeDesignPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...tail] = path.split('.');
  if (!head) return target;
  if (tail.length === 0) {
    return { ...target, [head]: value };
  }
  const current = target[head];
  return {
    ...target,
    [head]: writeDesignPath(
      current && typeof current === 'object' && !Array.isArray(current)
        ? current as Record<string, unknown>
        : {},
      tail.join('.'),
      value,
    ),
  };
}

function restoreDesignMeta(meta: DesignMeta) {
  return {
    activeDesignStyleId: meta.activeStyleId,
    activeDesignStylePreset: meta.activeStylePreset,
    designStatus: meta.status,
  };
}

function undoPresetToast(get: () => QuizDataStoreState): void {
  toast((toastItem) =>
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          get().undoDesignChange();
          toast.dismiss(toastItem.id);
        },
        style: {
          fontWeight: 700,
          color: '#1c1917',
        },
      },
      'Отменить применение пресета',
    ),
  );
}

export function createQuizSummary(row: QuizSummaryRow): Quiz {
  const defaults = createInitialState();
  return {
    id: row.id,
    user_id: row.user_id || row.id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_published: row.visibility === 'public',
    published_at: row.published_at,
    is_favorite: row.is_favorite || false,
    visibility: normalizeQuizVisibility(row.visibility),
    quiz_data_loaded: false,
    quiz_data: {
      nodes: [],
      edges: [],
      globalTimer: defaults.globalTimer,
      designSettings: defaults.designSettings,
      templateId: 'default',
      currentQuizName: row.name,
    },
  };
}

export function mergeQuizDetails(
  quizzes: Quiz[],
  details: Array<Pick<Quiz, 'id' | 'quiz_data'>>
): Quiz[] {
  const detailsById = new Map(details.map((quiz) => [quiz.id, quiz.quiz_data]));
  return quizzes.map((quiz) => {
    const quizData = detailsById.get(quiz.id);
    return quizData
      ? { ...quiz, quiz_data: quizData, quiz_data_loaded: true }
      : quiz;
  });
}

export const useQuizDataStore = create<QuizDataStoreState>((set, get) => ({
  ...createInitialState(),

  setCurrentQuizId: (id) => set({ currentQuizId: id }),
  setCurrentQuizName: (name) => set({ currentQuizName: name }),
  setCurrentQuizVisibility: (v) => set({ currentQuizVisibility: v }),
  setTemplateId: (id) => set({ templateId: id }),
  setGlobalTimer: (timer) =>
    set((state) => ({ globalTimer: { ...state.globalTimer, ...timer } })),

  updateDesignSettings: (settings, options) =>
    set((state) => {
      const merged = mergeDefined(state.designSettings, settings);
      const nextDesign = normalizeDesignSettings(merged, DEFAULT_DESIGN_SETTINGS);
      const status: DesignStatus = options?.preserveStyleStatus
        ? state.designStatus
        : state.activeDesignStyleId
          ? 'modified'
          : 'custom';
      return commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: state.activeDesignStyleId,
          activeStylePreset: state.activeDesignStylePreset,
          status,
        },
        options,
      );
    }),

  applyDesignStylePreset: (id, stylePreset) =>
    set((state) => {
      const nextDesign = resolveDesign({
        defaults: DEFAULT_DESIGN_SETTINGS,
        template: getTemplateDesignBase(state.templateId),
        stylePreset,
      });
      const result = commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: id,
          activeStylePreset: structuredClone(stylePreset),
          status: 'applied',
        },
        { label: 'Apply design style' },
      );
      if (Object.keys(result).length > 0) {
        toast.success('Стиль применён');
        undoPresetToast(get);
      }
      return result;
    }),

  applyDesignPalette: (palette) =>
    set((state) => {
      const merged = mergeDefined(state.designSettings, palette);
      const nextDesign = normalizeDesignSettings(merged, DEFAULT_DESIGN_SETTINGS);
      return commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: state.activeDesignStyleId,
          activeStylePreset: state.activeDesignStylePreset,
          status: state.activeDesignStyleId ? 'modified' : 'custom',
        },
        { label: 'Apply design palette' },
      );
    }),

  applyBrandKit: (brandKit, options) =>
    set((state) => {
      const patch: DeepPartial<DesignSettings> = {
        brand: {
          logoUrl: brandKit.logoUrl ?? undefined,
          primaryColor: brandKit.primaryColor ?? undefined,
          accentColor: brandKit.accentColor ?? undefined,
          neutralColor: brandKit.neutralColor ?? undefined,
        },
        typography: {
          fontFamily: brandKit.fontFamily ?? undefined,
          displayFontFamily: brandKit.displayFontFamily ?? undefined,
        },
      };
      const merged = mergeDefined(state.designSettings, patch);
      const nextDesign = normalizeDesignSettings(merged, DEFAULT_DESIGN_SETTINGS);
      return commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: state.activeDesignStyleId,
          activeStylePreset: state.activeDesignStylePreset,
          status: state.activeDesignStyleId ? 'modified' : 'custom',
        },
        { label: `Apply Brand Kit${options?.name ? `: ${options.name}` : ''}` },
      );
    }),

  undoDesignChange: () =>
    set((state) => {
      const entry = state.designHistory.past.at(-1);
      if (!entry) return {};
      const history = {
        past: state.designHistory.past.slice(0, -1),
        future: [entry, ...state.designHistory.future].slice(0, DESIGN_HISTORY_LIMIT),
      };
      return {
        designSettings: cloneDesignSettings(entry.before),
        ...restoreDesignMeta(entry.beforeMeta),
        ...withHistoryFlags(history),
      };
    }),

  redoDesignChange: () =>
    set((state) => {
      const [entry, ...future] = state.designHistory.future;
      if (!entry) return {};
      const history = {
        past: [...state.designHistory.past, entry].slice(-DESIGN_HISTORY_LIMIT),
        future,
      };
      return {
        designSettings: cloneDesignSettings(entry.after),
        ...restoreDesignMeta(entry.afterMeta),
        ...withHistoryFlags(history),
      };
    }),

  resetDesignProperty: (path) =>
    set((state) => {
      const baseline = baselineForDesign(state);
      const value = readDesignPath(baseline, path);
      const patch = writeDesignPath({}, path, value) as DeepPartial<DesignSettings>;
      const nextDesign = normalizeDesignSettings(
        mergeDefined(state.designSettings, patch),
        DEFAULT_DESIGN_SETTINGS,
      );
      return commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: state.activeDesignStyleId,
          activeStylePreset: state.activeDesignStylePreset,
          status: state.activeDesignStyleId ? 'modified' : 'custom',
        },
        { label: `Reset ${path}` },
      );
    }),

  resetDesignSection: (section) =>
    set((state) => {
      const baseline = baselineForDesign(state);
      const nextDesign = normalizeDesignSettings(
        mergeDefined(state.designSettings, { [section]: baseline[section] } as DeepPartial<DesignSettings>),
        DEFAULT_DESIGN_SETTINGS,
      );
      return commitDesignChange(
        state,
        nextDesign,
        {
          activeStyleId: state.activeDesignStyleId,
          activeStylePreset: state.activeDesignStylePreset,
          status: state.activeDesignStyleId ? 'modified' : 'custom',
        },
        { label: `Reset ${String(section)}` },
      );
    }),

  resetDesignScreen: () =>
    get().resetDesignSection('screenQuiz'),

  resetAllDesign: () =>
    set((state) => commitDesignChange(
      state,
      cloneDesignSettings(DEFAULT_DESIGN_SETTINGS),
      {
        activeStyleId: null,
        activeStylePreset: null,
        status: 'custom',
      },
      { label: 'Reset all design' },
    )),

  setUserQuizzes: (quizzes) => set({ userQuizzes: quizzes }),
  setAnalyticsQuizId: (id) => set({ analyticsQuizId: id }),
  setPendingTemplate: (data) => set({ pendingTemplate: data }),

  fetchUserQuizzes: async (forceRefresh = false) => {
    const session = useAuthStore.getState().session;
    const { userQuizzes } = get();
    if (!session) return;
    if (!forceRefresh && userQuizzes.length > 0) return;

    set({ isQuizzesLoading: true });
    try {
      const data = await api.listQuizzes();
      const previousById = new Map(
        get().userQuizzes.map((quiz) => [quiz.id, quiz])
      );
      const summaries: Quiz[] = (data ?? []).map((row) => {
        const previous = previousById.get(row.id);
        return previous &&
          previous.quiz_data_loaded !== false &&
          previous.updated_at === row.updated_at
          ? { ...previous, ...row, visibility: normalizeQuizVisibility(row.visibility ?? previous.visibility) }
          : createQuizSummary(row);
      });

      set({ userQuizzes: summaries, isQuizzesLoading: false });
      const userId = session.user.id;
      const generation = ++quizHydrationGeneration;

      void (async () => {
        for (
          let index = 0;
          index < summaries.length;
          index += QUIZ_DATA_BATCH_SIZE
        ) {
          if (
            generation !== quizHydrationGeneration ||
            useAuthStore.getState().session?.user.id !== userId
          ) {
            return;
          }

          const batch = summaries
            .slice(index, index + QUIZ_DATA_BATCH_SIZE)
            .filter((quiz: Quiz) => quiz.quiz_data_loaded === false);
          if (batch.length === 0) continue;

          const loaded: Array<Pick<Quiz, 'id' | 'quiz_data'>> = [];
          for (const quiz of batch) {
            try {
              const full = await api.getQuiz(quiz.id);
              loaded.push({ id: full.id, quiz_data: full.quiz_data });
            } catch (err) {
              console.warn('Failed to load quiz data:', quiz.id, err);
            }
          }

          if (generation !== quizHydrationGeneration) return;

          set((state) => ({
            userQuizzes: mergeQuizDetails(state.userQuizzes, loaded),
          }));
        }
      })();
    } catch (e: unknown) {
      toast.error('Ошибка загрузки квизов: ' + getErrorMessage(e));
    } finally {
      set({ isQuizzesLoading: false });
    }
  },

  ensureQuizLoaded: async (id) => {
    const cached = get().userQuizzes.find((quiz) => quiz.id === id);
    if (cached && cached.quiz_data_loaded !== false) return cached;

    try {
      const data = await api.getQuiz(id);
      const loadedQuiz = { ...(data as Quiz), quiz_data_loaded: true };
      set((state) => ({
        userQuizzes: state.userQuizzes.map((quiz) =>
          quiz.id === id ? loadedQuiz : quiz
        ),
      }));
      return loadedQuiz;
    } catch {
      toast.error('Ошибка загрузки квиза');
      return null;
    }
  },

  saveQuiz: async (opts): Promise<string | null> => {
    const state = get();
    const session = useAuthStore.getState().session;
    if (!session) {
      toast.error('Войдите, чтобы сохранить квиз');
      return null;
    }

    const { nodes, edges, isCanvasLoading, setCanvasLoading } = useCanvasStore.getState();
    if (isCanvasLoading) return null;

    setCanvasLoading(true);
    const toastId = toast.loading('Сохранение...');

    const quizData = {
      nodes,
      edges,
      globalTimer: state.globalTimer,
      designSettings: state.designSettings,
      templateId: state.templateId,
      currentQuizName: state.currentQuizName,
    };

    const resolvedVisibility: QuizVisibility =
      opts?.visibility ??
      state.currentQuizVisibility ??
      'public';

    try {
      if (state.currentQuizId) {
        await api.updateQuiz(state.currentQuizId, {
          name: state.currentQuizName.trim() || 'Без названия',
          quiz_data: quizData,
        });

        set((s) => ({
          userQuizzes: s.userQuizzes.map((q) =>
            q.id === s.currentQuizId
              ? { ...q, name: state.currentQuizName.trim() || 'Без названия', quiz_data: quizData }
              : q
          ),
        }));
        toast.success('Квиз сохранён', { id: toastId });
        return state.currentQuizId;
      } else {
        const quizName = state.currentQuizName.trim() || 'Без названия';
        const data = await api.createQuiz({
          name: quizName,
          quiz_data: quizData,
          visibility: resolvedVisibility,
        });

        const createdQuiz: Quiz = {
          ...(data as Quiz),
          name: quizName,
          quiz_data: quizData,
          quiz_data_loaded: true,
          visibility: ((data as Quiz).visibility as QuizVisibility) ?? resolvedVisibility,
        };

        set((s) => ({
          currentQuizId: createdQuiz.id,
          currentQuizName: createdQuiz.name,
          currentQuizVisibility: createdQuiz.visibility ?? 'public',
          userQuizzes: [
            createdQuiz,
            ...s.userQuizzes.filter((quiz) => quiz.id !== createdQuiz.id),
          ],
        }));
        toast.success('Квиз создан', { id: toastId });
        return createdQuiz.id;
      }
    } catch (e: unknown) {
      toast.error('Ошибка сохранения: ' + getErrorMessage(e), { id: toastId });
      return null;
    } finally {
      setCanvasLoading(false);
    }
  },

  autosaveQuiz: async (opts): Promise<string | null> => {
    const state = get();
    const session = useAuthStore.getState().session;
    if (!session) return null;

    const { nodes, edges, isCanvasLoading } = useCanvasStore.getState();
    if (isCanvasLoading) return null;

    const quizData = {
      nodes,
      edges,
      globalTimer: state.globalTimer,
      designSettings: state.designSettings,
      templateId: state.templateId,
      currentQuizName: state.currentQuizName,
    };

    const quizName = state.currentQuizName.trim() || 'Без названия';
    const resolvedVisibility: QuizVisibility =
      opts?.visibility ??
      state.currentQuizVisibility ??
      'public';

    try {
      if (state.currentQuizId) {
        const updated = await api.updateQuiz(state.currentQuizId, {
          name: quizName,
          quiz_data: quizData,
        });

        set((s) => ({
          userQuizzes: s.userQuizzes.map((q) =>
            q.id === s.currentQuizId
              ? {
                  ...q,
                  ...(updated as Partial<Quiz>),
                  name: quizName,
                  quiz_data: quizData,
                  quiz_data_loaded: true,
                }
              : q
          ),
        }));
        return state.currentQuizId;
      }

      const created = await api.createQuiz({
        name: quizName,
        quiz_data: quizData,
        visibility: resolvedVisibility,
      });

      const createdQuiz: Quiz = {
        ...(created as Quiz),
        name: quizName,
        quiz_data: quizData,
        quiz_data_loaded: true,
        visibility: ((created as Quiz).visibility as QuizVisibility) ?? resolvedVisibility,
      };

      set((s) => ({
        currentQuizId: createdQuiz.id,
        currentQuizName: createdQuiz.name,
        currentQuizVisibility: createdQuiz.visibility ?? 'public',
        userQuizzes: [
          createdQuiz,
          ...s.userQuizzes.filter((quiz) => quiz.id !== createdQuiz.id),
        ],
      }));

      return createdQuiz.id;
    } catch (error) {
      console.warn('Autosave failed:', error);
      return null;
    }
  },

  loadQuiz: (quiz) => {
    const defaults = createInitialState();
    const templateId = normalizeTemplateId(quiz.quiz_data.templateId);
    storeEvents.emit('QUIZ_LOADED', {
      nodes: quiz.quiz_data.nodes || [],
      edges: quiz.quiz_data.edges || [],
    });

    set({
      currentQuizId: quiz.id,
      currentQuizName: quiz.name,
      currentQuizVisibility: (quiz.visibility as QuizVisibility) ?? (quiz.is_published ? 'public' : 'private'),
      globalTimer: {
        ...defaults.globalTimer,
        ...(quiz.quiz_data.globalTimer ?? {}),
      },
      designSettings: resolveDesign({
        defaults: DEFAULT_DESIGN_SETTINGS,
        template: getTemplateDesignBase(templateId),
        overrides: quiz.quiz_data.designSettings ?? {},
      }),
      templateId,
      activeDesignStyleId: null,
      activeDesignStylePreset: null,
      designStatus: 'custom',
      designHistory: { past: [], future: [] },
      canUndoDesign: false,
      canRedoDesign: false,
    });
  },

  deleteQuiz: async (id) => {
    const session = useAuthStore.getState().session;
    const { currentQuizId } = get();
    if (!session) return;

    const prevQuizzes = get().userQuizzes;
    set((s) => ({
      userQuizzes: s.userQuizzes.filter((q) => q.id !== id),
    }));

    try {
      await api.deleteQuiz(id);
      toast.success('Квиз удалён');
      if (currentQuizId === id) {
        set({ currentQuizId: null });
      }
    } catch (e: unknown) {
      set({ userQuizzes: prevQuizzes });
      toast.error('Ошибка удаления: ' + getErrorMessage(e));
    }
  },

  duplicateQuiz: async (id): Promise<string | null> => {
    const session = useAuthStore.getState().session;
    const quiz = await get().ensureQuizLoaded(id);
    if (!quiz || !session) return null;

    const newName = `${quiz.name} (Копия)`;
    const sourceVisibility: QuizVisibility = (quiz.visibility as QuizVisibility)
      ?? (quiz.is_published ? 'public' : 'private');

    try {
      const data = await api.createQuiz({
        name: newName,
        quiz_data: quiz.quiz_data,
        visibility: sourceVisibility,
      });

      set((s) => ({
        userQuizzes: [data as Quiz, ...s.userQuizzes],
      }));
      toast.success('Квиз дублирован');
      return data.id;
    } catch (e: unknown) {
      if (/visibility_requires_pro/i.test(getErrorMessage(e))) {
        toast.error('Дублирование с этим уровнем доступа требует PRO');
      } else {
        toast.error('Ошибка дублирования');
      }
      return null;
    }
  },

  createNewQuiz: () => {
    const { userQuizzes } = get();
    storeEvents.emit('CANVAS_CLEAR');
    set({
      ...createInitialState(),
      userQuizzes,
    });
  },

  toggleQuizFavorite: async (id) => {
    const quiz = get().userQuizzes.find((q) => q.id === id);
    if (!quiz) return;
    const session = useAuthStore.getState().session;
    if (!session) return;
    const newVal = !quiz.is_favorite;

    set({
      userQuizzes: get().userQuizzes.map((q) =>
        q.id === id ? { ...q, is_favorite: newVal } : q
      ),
    });

    try {
      await api.updateQuiz(id, { is_favorite: newVal });
    } catch {
      set({
        userQuizzes: get().userQuizzes.map((q) =>
          q.id === id ? { ...q, is_favorite: !newVal } : q
        ),
      });
      console.warn('Network error syncing favorite');
    }
  },

  updateQuizPublication: async (id, data) => {
    return get().updateQuizVisibility(id, {
      visibility: data.is_published ? 'public' as const : 'private' as const,
      description: data.description,
      cover_image_url: data.cover_image_url,
      keywords: data.keywords,
    });
  },

  updateQuizVisibility: async (id, data) => {
    const session = useAuthStore.getState().session;
    if (!session) return;

    const quiz = await get().ensureQuizLoaded(id);
    if (!quiz) return;

    const updatedQuizData = {
      ...quiz.quiz_data,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.cover_image_url !== undefined && { cover_image_url: data.cover_image_url }),
      ...(data.keywords !== undefined && { keywords: normalizeQuizKeywords(data.keywords) }),
    };

    try {
      await api.updateQuiz(id, {
        visibility: data.visibility,
        quiz_data: updatedQuizData,
      });

      set((s) => ({
        userQuizzes: s.userQuizzes.map((q): Quiz =>
          q.id === id
            ? {
                ...q,
                visibility: data.visibility,
                is_published: data.visibility === 'public',
                published_at: data.visibility === 'public' ? (q.published_at ?? new Date().toISOString()) : undefined,
                quiz_data: updatedQuizData,
              }
            : q
        ),
        currentQuizVisibility: s.currentQuizId === id ? data.visibility : s.currentQuizVisibility,
      }));
      toast.success('Настройки доступа обновлены');
    } catch (e: unknown) {
      if (/visibility_requires_pro/i.test(getErrorMessage(e))) {
        toast.error('Этот уровень доступа доступен только с подпиской PRO');
      } else {
        toast.error('Ошибка обновления доступа: ' + getErrorMessage(e));
      }
    }
  },

  updateQuizPassport: async (id, passportData) => {
    const quiz = await get().ensureQuizLoaded(id);
    if (!quiz) return;

    const updatedQuizData = {
      ...quiz.quiz_data,
      passport: passportData,
    };

    try {
      await api.updateQuiz(id, { quiz_data: updatedQuizData });
      toast.success('Паспорт квиза сохранен');
      get().fetchUserQuizzes(true);
    } catch {
      toast.error('Ошибка сохранения паспорта');
    }
  },

  cloneAndEditPublicQuiz: async (publicQuiz): Promise<string | null> => {
    const session = useAuthStore.getState().session;
    if (!session) return null;

    const newName = `${publicQuiz.name} (Копия)`;

    try {
      const data = await api.createQuiz({
        name: newName,
        quiz_data: publicQuiz.quiz_data,
        visibility: 'public',
      });

      toast.success('Квиз скопирован в вашу коллекцию');
      set((s) => ({
        userQuizzes: [data as Quiz, ...s.userQuizzes],
      }));
      get().loadQuiz(data as Quiz);
      return data.id;
    } catch {
      toast.error('Ошибка копирования квиза');
      return null;
    }
  },

  restoreFromAutosave: (data) => {
    const defaults = createInitialState();
    const templateId = normalizeTemplateId(data.templateId);
    storeEvents.emit('AUTOSAVE_RESTORE', data);
    set({
      currentQuizId: data.currentQuizId ?? null,
      globalTimer: {
        ...defaults.globalTimer,
        ...(data.globalTimer ?? {}),
      },
      designSettings: resolveDesign({
        defaults: DEFAULT_DESIGN_SETTINGS,
        template: getTemplateDesignBase(templateId),
        overrides: data.designSettings ?? {},
      }),
      templateId,
      currentQuizName: data.currentQuizName,
      activeDesignStyleId: null,
      activeDesignStylePreset: null,
      designStatus: 'custom',
      designHistory: { past: [], future: [] },
      canUndoDesign: false,
      canRedoDesign: false,
    });
  },

  reset: () => set(createInitialState()),
}));

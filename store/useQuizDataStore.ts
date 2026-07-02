import { create } from 'zustand';
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

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (
      val !== null &&
      val !== undefined &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key] as object, val as object) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

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
  updateDesignSettings: (settings: Partial<DesignSettings>) => void;

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
  designSettings: {
    brand: { logoUrl: '', brandName: '', primaryColor: '#2f5d50', accentColor: '#b9852b', neutralColor: '#1d1a16', experiencePreset: 'conversational' },
    background: { color: '#f6f3ee', imageUrl: '', overlayColor: '#f6f3ee', overlayOpacity: 0, mode: 'solid', gradientFrom: '#f6f3ee', gradientTo: '#ebe5db', imageFit: 'cover', texture: 'grain' },
    typography: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", displayFontFamily: "'Newsreader', Georgia, serif", headingColor: '#1d1a16', bodyTextColor: '#615d54', headingWeight: 650, bodyWeight: 450, headingScale: 1, bodyScale: 1, lineHeight: 1.55, letterSpacing: 0, headingLineHeight: 1.04, paragraphWidth: 680 },
    layout: { preset: 'classic', interfacePreset: 'studio', contentWidth: 920, cardRadius: 28, cardPadding: 32, cardOpacity: 0.94, mediaPosition: 'top', surfaceStyle: 'paper', questionAlign: 'left', verticalAlign: 'center', density: 'balanced', chrome: 'full', blocks: { topbar: true, brand: true, logo: true, title: true, progress: true, timer: true, description: true, media: true, achievements: true, variables: true, stats: true, resultStats: true, backgroundDecor: true } },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#dfd8cc', textColor: '#24211c', radius: 28, padding: 32, shadow: 'none', mediaPosition: 'top', mediaWidth: 42, mediaRadius: 22, mediaFit: 'cover' },
    buttons: { backgroundColor: '#2f5d50', textColor: '#ffffff', hoverBackgroundColor: '#25493f', hoverTextColor: '#ffffff', borderRadius: 18, style: 'solid', height: 52, shadow: 'soft', fontWeight: 800, width: 'auto', textTransform: 'none' },
    answerCards: { backgroundColor: '#fffefa', textColor: '#24211c', hoverBackgroundColor: '#f7f4ed', hoverTextColor: '#171512', selectedBackgroundColor: '#e5f0ea', selectedTextColor: '#183b32', borderRadius: 18, style: 'card', borderColor: '#dfd8cc', selectedBorderColor: '#2f5d50', spacing: 12, markerStyle: 'letters', columns: 1, minHeight: 58, mediaAspectRatio: 'auto' },
    progress: { style: 'bar', position: 'top', color: '#2f5d50', trackColor: '#e4ded2', showPercent: true, showStepLabel: true, height: 8 },
    result: { preset: 'card', backgroundColor: '#fffefa', textColor: '#1d1a16', accentColor: '#2f5d50', showScore: true, showShare: true, scoreStyle: 'badge' },
    advanced: { customCss: '', reducedMotion: false, highContrast: false },
    screenQuiz: { backgroundPreset: 'pop', backgroundImageUrl: '', backgroundColor: '#9a4bdb', accentColor: '#ffc928', secondaryColor: '#7c5ce7', panelColor: '#f1eef6', answerColor: '#eeeeec', inkColor: '#050305', correctColor: '#18c900', borderWidth: 10, radius: 54, decorIntensity: 1, motion: 'premium', layout: 'auto', timerSeconds: 30, showTimer: true, showStoryTimer: true, introEnabled: true, introTiming: 'auto', introQuestionMs: 2800, introAnswerMs: 1800, introMediaMs: 900, introGapMs: 280 },
    sound: { volume: 0.5 },
  } as DesignSettings,
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

  updateDesignSettings: (settings) =>
    set((state) => ({
      designSettings: deepMerge(state.designSettings, settings),
    })),

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
      designSettings: deepMerge(
        defaults.designSettings,
        quiz.quiz_data.designSettings ?? {},
      ),
      templateId: normalizeTemplateId(quiz.quiz_data.templateId),
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
    storeEvents.emit('AUTOSAVE_RESTORE', data);
    set({
      currentQuizId: data.currentQuizId ?? null,
      globalTimer: {
        ...defaults.globalTimer,
        ...(data.globalTimer ?? {}),
      },
      designSettings: deepMerge(defaults.designSettings, data.designSettings ?? {}),
      templateId: normalizeTemplateId(data.templateId),
      currentQuizName: data.currentQuizName,
    });
  },

  reset: () => set(createInitialState()),
}));

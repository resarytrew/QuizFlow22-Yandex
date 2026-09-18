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
  QuizData,
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
  'importantTalks',
]);

function normalizeTemplateId(value: unknown): QuizTemplateId {
  return typeof value === 'string' && TEMPLATE_IDS.has(value as QuizTemplateId)
    ? (value as QuizTemplateId)
    : 'default';
}

interface QuizDataStoreState {
  editorKey: string;
  quizDataBase: Partial<QuizData>;
  revision?: number;
  saveStatus: "idle" | "dirty" | "saving" | "saved" | "local" | "error" | "conflict";
  saveError: string | null;
  lastServerSave: string | null;
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
  editorKey: crypto.randomUUID(),
  quizDataBase: {} as Partial<QuizData>,
  revision: undefined as number | undefined,
  saveStatus: "idle" as QuizDataStoreState["saveStatus"],
  saveError: null as string | null,
  lastServerSave: null as string | null,
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
    brand: { logoUrl: '', avatarUrl: '', brandName: '', scoreLabel: 'Очки', primaryColor: '#2f5d50', accentColor: '#b9852b', neutralColor: '#1d1a16', experiencePreset: 'conversational' },
    background: { color: '#f6f3ee', imageUrl: '', overlayColor: '#f6f3ee', overlayOpacity: 0, mode: 'solid', gradientFrom: '#f6f3ee', gradientTo: '#ebe5db', imageFit: 'cover', texture: 'grain' },
    typography: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", displayFontFamily: "'Newsreader', Georgia, serif", headingColor: '#1d1a16', bodyTextColor: '#615d54', headingWeight: 650, bodyWeight: 450, headingScale: 1, bodyScale: 1, lineHeight: 1.55, letterSpacing: 0, headingLineHeight: 1.04, paragraphWidth: 680 },
    layout: { preset: 'classic', interfacePreset: 'studio', contentWidth: 920, cardRadius: 28, cardPadding: 32, cardOpacity: 0.94, mediaPosition: 'top', surfaceStyle: 'paper', questionAlign: 'left', verticalAlign: 'center', density: 'balanced', chrome: 'full', blocks: { topbar: true, brand: true, logo: true, title: true, progress: true, timer: true, description: true, media: true, achievements: true, variables: true, stats: true, resultStats: true, backgroundDecor: true } },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#dfd8cc', textColor: '#24211c', radius: 28, padding: 32, shadow: 'none', mediaPosition: 'top', mediaWidth: 42, mediaRadius: 22, mediaFit: 'cover' },
    buttons: { backgroundColor: '#2f5d50', textColor: '#ffffff', hoverBackgroundColor: '#25493f', hoverTextColor: '#ffffff', borderRadius: 18, style: 'solid', height: 52, shadow: 'soft', fontWeight: 800, width: 'auto', textTransform: 'none' },
    answerCards: { backgroundColor: '#fffefa', textColor: '#24211c', hoverBackgroundColor: '#f7f4ed', hoverTextColor: '#171512', selectedBackgroundColor: '#e5f0ea', selectedTextColor: '#183b32', borderRadius: 18, style: 'card', borderColor: '#dfd8cc', selectedBorderColor: '#2f5d50', spacing: 12, markerStyle: 'letters', columns: 1, minHeight: 58, mediaAspectRatio: 'auto' },
    progress: { style: 'bar', position: 'top', color: '#2f5d50', trackColor: '#e4ded2', showPercent: true, showStepLabel: true, height: 8 },
    result: { preset: 'card', backgroundColor: '#fffefa', textColor: '#1d1a16', accentColor: '#2f5d50', showScore: true, showShare: true, scoreStyle: 'badge' },
    advanced: { customCss: '', reducedMotion: false, highContrast: false },
    screenQuiz: { backgroundPreset: 'pop', backgroundImageUrl: '', backgroundColor: '#9a4bdb', accentColor: '#ffc928', secondaryColor: '#7c5ce7', panelColor: '#f1eef6', answerColor: '#eeeeec', inkColor: '#050305', correctColor: '#18c900', borderWidth: 10, radius: 54, decorIntensity: 1, motion: 'premium', layout: 'auto', timerSeconds: 30, showTimer: true, showStoryTimer: true, timelineMode: 'auto', holdSeconds: 1.2, revealSeconds: 1.4, transitionMs: 340, introEnabled: true, introTiming: 'auto', introQuestionMs: 2800, introAnswerMs: 1800, introMediaMs: 900, introGapMs: 280 },
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
  Partial<Pick<Quiz, 'user_id' | 'published_at' | 'is_favorite' | 'moderation_status' | 'revision' | 'has_published_version'>> & {
    visibility?: QuizVisibility | string;
  };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeQuizVisibility(value: unknown): QuizVisibility {
  return value === 'private' || value === 'unlisted' || value === 'public'
    ? value
    : 'private';
}

export function createQuizSummary(row: QuizSummaryRow): Quiz {
  const defaults = createInitialState();
  return {
    id: row.id,
    user_id: row.user_id || row.id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_published: row.visibility === 'public' && (row.has_published_version === true || row.moderation_status === 'approved'),
    moderation_status: row.moderation_status,
    revision: row.revision,
    has_published_version: row.has_published_version,
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

  saveQuiz: (opts) => persistEditor(opts, true),
  autosaveQuiz: (opts) => persistEditor(opts, false),

  loadQuiz: (quiz) => {
    const defaults = createInitialState();
    storeEvents.emit('QUIZ_LOADED', {
      nodes: quiz.quiz_data.nodes || [],
      edges: quiz.quiz_data.edges || [],
    });

    set({
      editorKey: crypto.randomUUID(),
      quizDataBase: quiz.quiz_data,
      revision: quiz.revision,
      saveStatus: "saved",
      saveError: null,
      lastServerSave: quiz.updated_at,
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
    const sourceVisibility: QuizVisibility = 'private';

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
      const saved=await api.updateQuiz(id, { is_favorite: newVal });
      set(s=>({revision:s.currentQuizId===id?saved.revision:s.revision,userQuizzes:s.userQuizzes.map(q=>q.id===id?{...q,revision:saved.revision}:q)}));
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
      const saved = await api.updateQuiz(id, {
        visibility: data.visibility,
        expected_revision: quiz.revision,
        quiz_data: updatedQuizData,
      });

      set((s) => ({
        userQuizzes: s.userQuizzes.map((q): Quiz =>
          q.id === id
            ? {
                ...q,
                revision: saved.revision,
                has_published_version: saved.has_published_version,
                visibility: saved.visibility as QuizVisibility,
                moderation_status: saved.moderation_status,
                is_published: saved.visibility === 'public' && (saved.has_published_version === true || saved.moderation_status === 'approved'),
                published_at: saved.published_at,
                quiz_data: updatedQuizData,
              }
            : q
        ),
        quizDataBase: s.currentQuizId === id ? saved.quiz_data : s.quizDataBase,
        revision: s.currentQuizId === id ? saved.revision : s.revision,
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
      const saved = await api.updateQuiz(id, { quiz_data: updatedQuizData, expected_revision: quiz.revision });
      if (get().currentQuizId === id) set({ quizDataBase: saved.quiz_data, revision: saved.revision });
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
      const source = publicQuiz.is_summary ? await api.getQuiz(publicQuiz.id) : publicQuiz;
      const data = await api.createQuiz({
        name: newName,
        quiz_data: source.quiz_data,
        visibility: 'private',
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
      editorKey: crypto.randomUUID(),
      quizDataBase: data.quizDataBase || {},
      currentQuizVisibility: data.currentQuizVisibility ?? "private",
      saveStatus: "dirty",
      saveError: null,
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


/** Preserve document extensions; transient selection/drag state is never content. */
export function buildCurrentQuizData(): QuizData {
  const state = useQuizDataStore.getState();
  const canvas = useCanvasStore.getState();
  return {
    ...state.quizDataBase,
    nodes: canvas.nodes.map(n => {
      const copy = { ...n }; delete copy.selected; delete copy.dragging; delete copy.width; delete copy.height; delete copy.positionAbsolute; return copy;
    }),
    edges: canvas.edges.map(e => { const copy = { ...e }; delete copy.selected; return copy; }),
    globalTimer: state.globalTimer, designSettings: state.designSettings,
    templateId: state.templateId, currentQuizName: state.currentQuizName,
  };
}

let saveQueue: Promise<unknown> = Promise.resolve();
function persistEditor(opts: { visibility?: QuizVisibility } | undefined, manual: boolean): Promise<string | null> {
  const captured = useQuizDataStore.getState();
  const account = useAuthStore.getState().session?.user.id;
  if (!account) {
    useQuizDataStore.setState({ saveStatus: 'local' });
    if (manual) toast.error('Войдите, чтобы сохранить квиз на сервере');
    return Promise.resolve(null);
  }
  const payload = { name: captured.currentQuizName.trim() || 'Без названия', quiz_data: buildCurrentQuizData() };
  const task = async () => {
    const current = useQuizDataStore.getState();
    if (useAuthStore.getState().session?.user.id !== account) return null;
    // A delayed save must never capture another document after navigation.
    if (current.editorKey !== captured.editorKey && !captured.currentQuizId) return null;
    const sameEditor = current.editorKey === captured.editorKey;
    const id = captured.currentQuizId || (sameEditor ? current.currentQuizId : null);
    if (sameEditor && current.saveStatus === 'conflict') return null;
    if (sameEditor) useQuizDataStore.setState({ saveStatus: 'saving', saveError: null });
    try {
      const saved = id
        ? await api.updateQuiz(id, { ...payload, ...(opts?.visibility ? { visibility: opts.visibility } : {}), expected_revision: sameEditor ? current.revision : captured.revision })
        : await api.createQuiz({ ...payload, visibility: opts?.visibility || captured.currentQuizVisibility || 'private' });
      if (useAuthStore.getState().session?.user.id !== account) return null;
      useQuizDataStore.setState(s => ({
        userQuizzes: [{ ...saved, quiz_data_loaded: true } as Quiz, ...s.userQuizzes.filter(q => q.id !== saved.id)],
        ...(s.editorKey === captured.editorKey ? {
          currentQuizId: saved.id, revision: saved.revision,
          currentQuizVisibility: saved.visibility as QuizVisibility,
          lastServerSave: saved.updated_at, saveStatus: JSON.stringify(buildCurrentQuizData()) === JSON.stringify(payload.quiz_data) ? 'saved' as const : 'dirty' as const, saveError: null,
        } : {}),
      }));
      if (manual) toast.success('Сохранено на сервере');
      return saved.id;
    } catch (error) {
      const conflict = /revision_conflict/.test(getErrorMessage(error));
      const message = conflict ? 'Квиз изменён в другой вкладке. Сохраните копию в файл и загрузите актуальную версию.' : 'Не удалось сохранить на сервере. Изменения остаются на устройстве.';
      if (useQuizDataStore.getState().editorKey === captured.editorKey)
        useQuizDataStore.setState({ saveStatus: conflict ? 'conflict' : 'error', saveError: message });
      if (manual) toast.error(message);
      return null;
    }
  };
  const result = saveQueue.then(task, task);
  saveQueue = result;
  return result;
}

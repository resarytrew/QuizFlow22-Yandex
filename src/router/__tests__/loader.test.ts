import { beforeEach, describe, expect, it, vi } from 'vitest';

const getQuiz = vi.fn();
const loadQuiz = vi.fn();
const createNewQuiz = vi.fn();
const setPendingTemplate = vi.fn();
const setGlobalTimer = vi.fn();
const updateDesignSettings = vi.fn();
const setTemplateId = vi.fn();
const setCurrentQuizName = vi.fn();
const setCurrentQuizId = vi.fn();
const setNodes = vi.fn();
const setEdges = vi.fn();

let pendingTemplate: any = null;

vi.mock('../../../services/apiClient', () => ({
  api: {
    getQuiz,
  },
}));

vi.mock('../../../store/useQuizDataStore', () => ({
  useQuizDataStore: {
    getState: () => ({
      pendingTemplate,
      loadQuiz,
      createNewQuiz,
      setPendingTemplate,
      setGlobalTimer,
      updateDesignSettings,
      setTemplateId,
      setCurrentQuizName,
      setCurrentQuizId,
    }),
  },
}));

vi.mock('../../../store/useCanvasStore', () => ({
  useCanvasStore: {
    getState: () => ({ setNodes, setEdges }),
  },
}));

vi.mock('../../../components/QuizEditor', () => ({ default: () => null }));
vi.mock('../../../components/QuizPlayer', () => ({ default: () => null }));

describe('router loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuiz.mockReset();
    pendingTemplate = null;
  });

  it('loads an owned quiz for the editor', async () => {
    const quiz = { id: 'quiz-1', user_id: 'user-1', quiz_data: {} };
    getQuiz.mockResolvedValueOnce(quiz);
    const { Route } = await import('../routes/editorQuiz');

    await (Route.options.loader as Function)({
      params: { quizId: 'quiz-1' },
      context: {
        auth: { initialized: true, isAuthenticated: true, userId: 'user-1' },
      },
    });

    expect(getQuiz).toHaveBeenCalledWith('quiz-1');
    expect(loadQuiz).toHaveBeenCalledWith(quiz);
  });

  it('initializes a blank editor without a template', async () => {
    const { Route } = await import('../routes/editorNew');

    await (Route.options.loader as Function)({});

    expect(createNewQuiz).toHaveBeenCalledOnce();
    expect(setNodes).not.toHaveBeenCalled();
  });

  it('applies a pending template after resetting the editor', async () => {
    pendingTemplate = {
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-1' }],
      globalTimer: { enabled: true, duration: 30 },
      designSettings: { background: { color: '#fff' } },
      templateId: 'science',
      currentQuizName: 'Template quiz',
    };
    const { Route } = await import('../routes/editorNew');

    await (Route.options.loader as Function)({});

    expect(createNewQuiz).toHaveBeenCalledOnce();
    expect(setNodes).toHaveBeenCalledWith(pendingTemplate.nodes);
    expect(setEdges).toHaveBeenCalledWith(pendingTemplate.edges);
    expect(setGlobalTimer).toHaveBeenCalledWith(pendingTemplate.globalTimer);
    expect(updateDesignSettings).toHaveBeenCalledWith(
      pendingTemplate.designSettings
    );
    expect(setTemplateId).toHaveBeenCalledWith('science');
    expect(setCurrentQuizName).toHaveBeenCalledWith('Template quiz');
    expect(setCurrentQuizId).toHaveBeenCalledWith(null);
    expect(setPendingTemplate).toHaveBeenCalledWith(null);
  });

  it('rejects a malformed public quiz id before querying the API', async () => {
    const { loadQuizForPlayer } = await import('../routes/playQuiz');

    await expect(loadQuizForPlayer('not-a-uuid')).rejects.toBeDefined();
    expect(getQuiz).not.toHaveBeenCalled();
  });

  it('loads only a published quiz for the player', async () => {
    const quiz = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      visibility: 'public',
    };
    getQuiz.mockResolvedValueOnce(quiz);
    const { loadQuizForPlayer } = await import('../routes/playQuiz');

    await expect(loadQuizForPlayer(quiz.id)).resolves.toEqual(quiz);

    expect(getQuiz).toHaveBeenCalledWith(quiz.id);
  });
});

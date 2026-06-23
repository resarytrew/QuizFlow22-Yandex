import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
const setPendingTemplate = vi.fn();
const cloneAndEditPublicQuiz = vi.fn();
const duplicateQuiz = vi.fn();

const state: Record<string, any> = {
  currentQuizId: null,
  userQuizzes: [],
  setPendingTemplate,
  cloneAndEditPublicQuiz,
  duplicateQuiz,
};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('../../../store/useQuizDataStore', () => ({
  useQuizDataStore: {
    getState: () => state,
  },
}));

describe('useAppNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.currentQuizId = null;
    state.userQuizzes = [];
    navigate.mockResolvedValue(undefined);
  });

  it('opens an existing quiz in the editor', async () => {
    const { useAppNavigation } = await import('../useAppNavigation');
    const { result } = renderHook(() => useAppNavigation());
    const quiz = { id: 'quiz-1' } as any;

    await act(() => result.current.openQuizInEditor(quiz));

    expect(navigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'quiz-1' },
    });
  });

  it('defers template application to the new-editor loader', async () => {
    const { useAppNavigation } = await import('../useAppNavigation');
    const { result } = renderHook(() => useAppNavigation());
    const template = { currentQuizName: 'Template' } as any;

    await act(() => result.current.createAndOpenEditor(template));

    expect(setPendingTemplate).toHaveBeenCalledWith(template);
    expect(navigate).toHaveBeenCalledWith({ to: '/editor' });
  });

  it('navigates to a newly cloned public quiz', async () => {
    cloneAndEditPublicQuiz.mockResolvedValueOnce('clone-1');
    const { useAppNavigation } = await import('../useAppNavigation');
    const { result } = renderHook(() => useAppNavigation());

    await act(() =>
      result.current.clonePublicQuizAndEdit({ id: 'public-1' } as any)
    );

    expect(navigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'clone-1' },
    });
  });

  it('navigates to the duplicated quiz returned by the store list', async () => {
    duplicateQuiz.mockResolvedValueOnce('copy-1');
    const { useAppNavigation } = await import('../useAppNavigation');
    const { result } = renderHook(() => useAppNavigation());

    await act(() => result.current.duplicateAndOpen('quiz-1'));

    expect(navigate).toHaveBeenCalledWith({
      to: '/editor/$quizId',
      params: { quizId: 'copy-1' },
    });
  });
});

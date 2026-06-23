import { beforeEach, describe, expect, it } from 'vitest';
import type { Quiz } from '../types';
import { useQuizDataStore } from './useQuizDataStore';

describe('useQuizDataStore quiz settings compatibility', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
  });

  it('merges partial legacy design settings with current defaults', () => {
    const quiz = {
      id: 'quiz-1',
      user_id: 'user-1',
      name: 'Legacy quiz',
      created_at: '',
      updated_at: '',
      visibility: 'private',
      quiz_data: {
        nodes: [],
        edges: [],
        designSettings: {
          background: { color: '#abcdef' },
        },
        globalTimer: { enabled: true },
        templateId: 'science',
      },
    } as unknown as Quiz;

    useQuizDataStore.getState().loadQuiz(quiz);

    const state = useQuizDataStore.getState();
    expect(state.designSettings.background.color).toBe('#abcdef');
    expect(state.designSettings.background.overlayOpacity).toBe(0);
    expect(state.designSettings.buttons.backgroundColor).toBe('#2f5d50');
    expect(state.designSettings.answerCards.borderRadius).toBe(18);
    expect(state.designSettings.sound.volume).toBe(0.5);
    expect(state.globalTimer).toEqual({
      enabled: true,
      duration: 0,
      onTimeoutNodeId: null,
    });
  });

  it('falls back to the default template for invalid database values', () => {
    const quiz = {
      id: 'quiz-2',
      user_id: 'user-1',
      name: 'Invalid template',
      created_at: '',
      updated_at: '',
      quiz_data: {
        nodes: [],
        edges: [],
        templateId: 'unknown-template',
      },
    } as unknown as Quiz;

    useQuizDataStore.getState().loadQuiz(quiz);
    expect(useQuizDataStore.getState().templateId).toBe('default');
  });
});

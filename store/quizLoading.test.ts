import { describe, expect, it } from 'vitest';
import type { Quiz } from '../types';
import { createQuizSummary, mergeQuizDetails } from './useQuizDataStore';

describe('quiz list progressive loading', () => {
  it('creates a lightweight placeholder without pretending data is loaded', () => {
    const summary = createQuizSummary({
      id: 'quiz-1',
      user_id: 'user-1',
      name: 'Fast list item',
      created_at: '2026-06-09T00:00:00.000Z',
      updated_at: '2026-06-09T00:00:00.000Z',
    });

    expect(summary.quiz_data_loaded).toBe(false);
    expect(summary.quiz_data.nodes).toEqual([]);
    expect(summary.quiz_data.currentQuizName).toBe('Fast list item');
  });

  it('hydrates only matching quizzes and marks them as loaded', () => {
    const first = createQuizSummary({
      id: 'quiz-1',
      user_id: 'user-1',
      name: 'First',
      created_at: '',
      updated_at: '',
    });
    const second = createQuizSummary({
      id: 'quiz-2',
      user_id: 'user-1',
      name: 'Second',
      created_at: '',
      updated_at: '',
    });
    const quizData = {
      ...first.quiz_data,
      nodes: [{ id: 'node-1' }],
    };

    const result = mergeQuizDetails(
      [first, second],
      [{ id: 'quiz-1', quiz_data: quizData }] as Array<
        Pick<Quiz, 'id' | 'quiz_data'>
      >
    );

    expect(result[0].quiz_data_loaded).toBe(true);
    expect(result[0].quiz_data.nodes).toHaveLength(1);
    expect(result[1]).toBe(second);
  });
});

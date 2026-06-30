import { describe, expect, it, vi } from 'vitest';
import { generateQuizHtmlProgrammatically } from '../../services/quizGenerator';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { buildScreenQuizMp4Html } from './useHeaderController';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
  },
}));

vi.mock('../../src/router/useAppNavigation', () => ({
  useAppNavigation: () => ({
    goToBilling: vi.fn(),
    goToEditor: vi.fn(),
  }),
}));

vi.mock('../../services/quizGenerator', () => ({
  generateQuizHtmlProgrammatically: vi.fn(() => '<html>preview</html>'),
}));

vi.mock('../../services/screenQuizVideoExport', () => ({
  estimateScreenQuizVideoDurationMs: vi.fn(() => 1000),
  exportScreenQuizToMp4: vi.fn(),
}));

vi.mock('../../store/useCanvasStore', () => ({
  useCanvasStore: {
    getState: vi.fn(() => ({
      nodes: [{ id: 'q1', type: 'questionNode', data: { question: 'Q' } }],
      edges: [],
    })),
  },
}));

vi.mock('../../store/useQuizDataStore', () => ({
  useQuizDataStore: {
    getState: vi.fn(() => ({
      globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
      designSettings: { screenQuiz: { timerSeconds: 5 } },
      currentQuizId: 'quiz-1',
      templateId: 'screenQuiz',
      currentQuizName: 'Screen quiz',
    })),
  },
}));

describe('buildScreenQuizMp4Html', () => {
  it('uses preview HTML so the captured blob can run through the external template runner', () => {
    const html = buildScreenQuizMp4Html();

    expect(html).toBe('<html>preview</html>');
    expect(useCanvasStore.getState).toHaveBeenCalledOnce();
    expect(useQuizDataStore.getState).toHaveBeenCalledOnce();
    expect(generateQuizHtmlProgrammatically).toHaveBeenCalledWith(
      [{ id: 'q1', type: 'questionNode', data: { question: 'Q' } }],
      [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { timerSeconds: 5 } },
      'quiz-1',
      'screenQuiz',
      'Screen quiz',
      { preview: true },
    );
  });
});

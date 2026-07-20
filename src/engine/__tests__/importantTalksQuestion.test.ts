import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderNode } from '../render';
import type { QuizNode } from '../types';

const questionNode: QuizNode = {
  id: 'question',
  type: 'questionNode',
  data: {
    question: 'Какое качество помогает людям понимать друг друга?',
    importantTalks: {
      instruction: 'Выберите самый точный ответ',
    },
    answers: [
      { id: 'respect', text: 'Уважение', isCorrect: true },
      { id: 'indifference', text: 'Равнодушие' },
      { id: 'egoism', text: 'Эгоизм' },
      { id: 'irresponsibility', text: 'Безответственность' },
    ],
  },
};

describe('Important Talks single-choice scene', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<main id="quiz-view"></main>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds an editable hero and radio answer grid only for Important Talks', () => {
    document.body.classList.add('important-talks-theme');

    renderNode(questionNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    expect(document.querySelector('.node-frame')?.classList.contains('talks-question-scene')).toBe(true);
    expect(document.querySelector('.talks-question-media-fallback')).not.toBeNull();
    expect(document.querySelector('.talks-question-prompt')?.textContent).toBe(
      'Какое качество помогает людям понимать друг друга?',
    );
    expect(document.querySelector('.talks-question-instruction')?.textContent).toBe(
      'Выберите самый точный ответ',
    );
    expect(document.querySelector('.talks-question-options')?.getAttribute('aria-label')).toBe(
      'Варианты ответа',
    );
    expect(document.querySelectorAll('.talks-question-options .option')).toHaveLength(4);
    expect(document.querySelectorAll('.talks-question-options .option-marker')).toHaveLength(4);
  });

  it('keeps the existing answer transition contract', () => {
    vi.useFakeTimers();
    document.body.classList.add('important-talks-theme');
    const processNode = vi.fn();

    renderNode(questionNode, {
      resolveNextNode: (_nodeId, handle) => handle === 'respect' ? 'next' : null,
      processNode,
    });

    const answers = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.talks-question-options .option'),
    );
    answers[0]?.click();

    expect(answers[0]?.classList.contains('selected')).toBe(true);
    expect(answers[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(answers.every((answer) => answer.disabled)).toBe(true);
    expect(processNode).not.toHaveBeenCalled();

    vi.advanceTimersByTime(260);
    expect(processNode).toHaveBeenCalledWith('next');
  });

  it('keeps the shared renderer unchanged for other templates', () => {
    renderNode(questionNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    expect(document.querySelector('.talks-question-scene')).toBeNull();
    expect(document.querySelector('.node-frame > .node-desc')?.textContent).toContain('Какое качество');
    expect(document.querySelectorAll('.node-frame > .node-controls .option')).toHaveLength(4);
  });
});

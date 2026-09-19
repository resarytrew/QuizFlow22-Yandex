import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderNode } from '../render';
import { pushPath, resetState, updateScore } from '../state';
import type { QuizNode } from '../types';

const resultNode: QuizNode = {
  id: 'result',
  type: 'resultNode',
  data: {
    title: 'Вы отлично справились!',
    description: 'Каждый добрый поступок помогает нам лучше понимать друг друга.',
    buttonText: 'Обсудить ещё раз',
    importantTalks: {
      kicker: 'Наш разговор завершён',
      insightTitle: 'Сила взаимопонимания',
    },
  },
};

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

describe('Important Talks result enhancements', () => {
  beforeEach(() => {
    resetState();
    updateScore('set', 5);
    pushPath('question-1');
    pushPath('result');
    document.body.className = '';
    document.body.innerHTML = `
      <span id="hud-score-label">Искры добра</span>
      <main id="quiz-view"></main>
    `;
  });

  it('adds an educator summary (time + achievements) and a share/print tools row', () => {
    document.body.classList.add('important-talks-theme');

    renderNode(resultNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    const meta = document.querySelector('.talks-result-meta');
    expect(meta).not.toBeNull();

    const chips = Array.from(document.querySelectorAll('.talks-result-chip'));
    expect(chips.length).toBe(2);
    expect(chips.some((chip) => chip.textContent?.includes('Время в разговоре'))).toBe(true);
    expect(chips.some((chip) => chip.textContent?.includes('Достижений открыто'))).toBe(true);

    const tools = document.querySelector('.talks-result-tools');
    expect(tools).not.toBeNull();
    expect(document.querySelector('.talks-result-copy')?.textContent).toBe('Скопировать результат');
    expect(document.querySelector('.talks-result-print')?.textContent).toBe('Версия для печати');

    // Реальные значения статистики не должны пострадать.
    expect(document.querySelector('.talks-result-primary-stat .result-stat-value')?.textContent).toBe('5');
    expect(document.querySelector('.talks-result-secondary-stat .result-stat-value')?.textContent).toBe('2');
  });

  it('copies a human-readable summary without throwing', async () => {
    document.body.classList.add('important-talks-theme');
    renderNode(resultNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    const copyButton = document.querySelector<HTMLButtonElement>('.talks-result-copy');
    expect(copyButton).not.toBeNull();

    copyButton?.click();
    // Даём микротаску завершиться (copyTextToClipboard async).
    await Promise.resolve();
    await Promise.resolve();

    const text = copyButton?.textContent ?? '';
    expect(text === 'Скопировано ✓' || text === 'Не удалось скопировать').toBe(true);
  });
});

describe('Important Talks feedback modal behaviour', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<main id="quiz-view"></main>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes an accessible dialog and continues on Escape', () => {
    vi.useFakeTimers();
    document.body.classList.add('important-talks-theme');
    const processNode = vi.fn();

    renderNode(questionNode, {
      resolveNextNode: (_nodeId, handle) => (handle === 'respect' ? 'next' : null),
      processNode,
    });

    const answers = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.talks-question-options .option'),
    );
    answers[0]?.click();

    const feedback = document.querySelector<HTMLElement>('.talks-inline-feedback');
    expect(feedback).not.toBeNull();
    expect(feedback?.getAttribute('role')).toBe('dialog');
    expect(feedback?.getAttribute('aria-modal')).toBe('true');

    feedback?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(processNode).toHaveBeenCalledWith('next');
  });

  it('continues when the dimmed backdrop (container) is clicked', () => {
    vi.useFakeTimers();
    document.body.classList.add('important-talks-theme');
    const processNode = vi.fn();

    renderNode(questionNode, {
      resolveNextNode: (_nodeId, handle) => (handle === 'respect' ? 'next' : null),
      processNode,
    });

    const answers = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.talks-question-options .option'),
    );
    answers[0]?.click();

    const feedback = document.querySelector<HTMLElement>('.talks-inline-feedback');
    const container = feedback?.parentElement;
    expect(container).not.toBeNull();

    container?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(processNode).toHaveBeenCalledWith('next');
  });
});

describe('Important Talks keyboard option navigation', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<main id="quiz-view"></main>';
  });

  it('moves focus between answer options with arrow keys', () => {
    document.body.classList.add('important-talks-theme');

    renderNode(questionNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    const options = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.talks-question-options .option'),
    );
    expect(options.length).toBe(4);

    options[0]?.focus();
    expect(document.activeElement).toBe(options[0]);

    options[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(options[1]);

    options[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(options[0]);

    options[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(options[3]);

    options[3]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(options[0]);
  });
});

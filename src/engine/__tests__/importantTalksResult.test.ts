import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Important Talks result scene', () => {
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

  it('builds the editable final scene while preserving the real result values', () => {
    document.body.classList.add('important-talks-theme');

    renderNode(resultNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    expect(document.querySelector('.node-frame')?.classList.contains('talks-result-scene')).toBe(true);
    expect(document.querySelector('.talks-result-media-fallback')).not.toBeNull();
    expect(document.querySelector('.talks-result-kicker')?.textContent).toBe('Наш разговор завершён');
    expect(document.querySelector('.talks-result-title')?.textContent).toBe('Вы отлично справились!');
    expect(document.querySelector('.talks-result-insight-title')?.textContent).toBe('Сила взаимопонимания');
    expect(document.querySelector('.talks-result-insight .node-desc')?.textContent).toContain('добрый поступок');
    expect(document.querySelector('.talks-result-primary-stat .result-stat-label')?.textContent).toBe('Искры добра');
    expect(document.querySelector('.talks-result-primary-stat .result-stat-value')?.textContent).toBe('5');
    expect(document.querySelector('.talks-result-secondary-stat .result-stat-value')?.textContent).toBe('2');
    expect(document.querySelector<HTMLButtonElement>('.talks-result-cta')?.textContent).toBe('Обсудить ещё раз');
  });

  it('keeps the shared result renderer unchanged for other templates', () => {
    renderNode({ ...resultNode, data: { title: 'Готово' } }, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    expect(document.querySelector('.talks-result-scene')).toBeNull();
    expect(document.querySelector('.result-stat-label')?.textContent).toBe('Очки');
    expect(document.querySelector<HTMLButtonElement>('.btn.action-btn')?.textContent).toBe('Начать заново');
  });
});

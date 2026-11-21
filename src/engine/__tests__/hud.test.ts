import { beforeEach, describe, expect, it } from 'vitest';
import { updateHUD } from '../hud';
import { buildIndexes } from '../indexing';
import { pushPath, resetState, setCurrentNode } from '../state';
import type { QuizData } from '../types';

describe('HUD presentation metadata', () => {
  beforeEach(() => {
    resetState();
    buildIndexes({ nodes: [], edges: [] });
    document.body.innerHTML = '';
    delete document.body.dataset.quizNodeType;
  });

  it('updates step and segmented progress metadata', () => {
    const quizData: QuizData = {
      nodes: [
        { id: 'info', type: 'infoNode', data: {} },
        { id: 'question', type: 'questionNode', data: {} },
        { id: 'matching', type: 'matchingNode', data: {} },
      ],
      edges: [],
    };
    buildIndexes(quizData);
    setCurrentNode('question');
    pushPath('info');
    pushPath('question');
    document.body.innerHTML = `
      <strong id="quiz-step-current"></strong>
      <strong id="quiz-step-total"></strong>
      <div class="quiz-step"></div>
      <div class="top-progress"><div class="top-progress-track"></div></div>
      <span id="progress-text"></span>
      <div id="top-progress-fill"></div>
    `;

    updateHUD();

    expect(document.querySelector('#quiz-step-current')?.textContent).toBe('2');
    expect(document.querySelector('#quiz-step-total')?.textContent).toBe('3');
    expect(document.querySelector('.quiz-step')?.getAttribute('aria-label')).toBe('Шаг 2 из 3');
    expect(document.querySelector('.top-progress')?.getAttribute('aria-label')).toContain('шаг 2 из 3');
    expect(document.body.dataset.quizNodeType).toBe('questionNode');
    const track = document.querySelector<HTMLElement>('.top-progress-track');
    expect(track?.style.getPropertyValue('--progress-step')).toBe('33.333333333333336%');
  });
});

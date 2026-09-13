import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderNode } from '../render';
import type { QuizNode } from '../types';

const infoNode: QuizNode = {
  id: 'info',
  type: 'infoNode',
  data: {
    title: 'Ценности, которые нас объединяют',
    description: 'Короткий вводный текст.',
    imageUrl: 'https://example.com/family.png',
    buttonText: 'Начать',
    importantTalks: {
      agendaTitle: 'На этом этапе',
      agendaItems: ['Три задания', 'Обсуждение', 'Выводы'],
    },
  },
};

describe('Important Talks information scene', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<main id="quiz-view"></main>';
  });

  it('builds the editable split scene only for the Important Talks theme', () => {
    document.body.classList.add('important-talks-theme');
    const processNode = vi.fn();

    renderNode(infoNode, {
      resolveNextNode: () => 'next',
      processNode,
    });

    expect(document.querySelector('.node-frame')?.classList.contains('talks-info-scene')).toBe(true);
    expect(document.querySelector('.talks-info-visual .media-frame')).not.toBeNull();
    expect(document.querySelector('.talks-info-intro .node-desc')?.textContent).toBe('Короткий вводный текст.');
    expect(document.querySelector('.talks-info-agenda-title')?.textContent).toBe('На этом этапе');
    expect(
      Array.from(document.querySelectorAll('.talks-info-agenda-item')).map((item) => item.textContent),
    ).toEqual(['Три задания', 'Обсуждение', 'Выводы']);
    expect(document.querySelectorAll('.talks-title-accent')).toHaveLength(2);

    const button = document.querySelector<HTMLButtonElement>('.talks-info-cta');
    button?.click();
    expect(processNode).toHaveBeenCalledWith('next');
  });

  it('keeps the shared information renderer unchanged for other templates', () => {
    renderNode(infoNode, {
      resolveNextNode: () => null,
      processNode: vi.fn(),
    });

    expect(document.querySelector('.talks-info-scene')).toBeNull();
    expect(document.querySelector('.node-frame > .media-frame')).not.toBeNull();
    expect(document.querySelector('.node-frame > .node-title')?.textContent).toContain('Ценности');
    expect(document.querySelector('.btn.action-btn')?.textContent).toBe('Начать');
  });
});

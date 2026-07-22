import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderNode } from '../render';
import type { QuizNode } from '../types';

const textNode: QuizNode = {
  id: 'text',
  type: 'textInputNode',
  data: {
    title: 'Вопрос для размышления',
    question: 'Какие ценности важны для вашей семьи или класса?',
    keyword: 'уважение',
    placeholder: 'Напишите ваш ответ...',
    buttonText: 'Завершить',
    importantTalks: {
      insightTitle: 'Ваше мнение важно',
      hint: 'Поделитесь тем, что действительно имеет значение.',
      maxLength: 300,
    },
  },
};

const multipleNode: QuizNode = {
  id: 'multiple',
  type: 'multipleChoiceNode',
  data: {
    title: 'Выберите поступки',
    question: 'Какие поступки показывают уважение к другим людям?',
    minSelections: 2,
    maxSelections: 3,
    correctOptions: ['listen', 'help'],
    buttonText: 'Далее',
    importantTalks: { hint: 'Можно выбрать несколько вариантов' },
    answers: [
      { id: 'listen', text: 'слушать собеседника' },
      { id: 'help', text: 'помогать младшим' },
      { id: 'interrupt', text: 'перебивать и спорить' },
    ],
  },
};

const timelineNode: QuizNode = {
  id: 'timeline',
  type: 'timelineNode',
  data: {
    title: 'Доброе дело',
    question: 'Расположите этапы доброго дела по порядку',
    buttonText: 'Далее',
    importantTalks: { hint: 'Переместите карточки в правильном порядке' },
    events: [
      { id: 'idea', text: 'обсудить идею' },
      { id: 'roles', text: 'распределить обязанности' },
      { id: 'action', text: 'выполнить общее дело' },
      { id: 'summary', text: 'подвести итоги' },
    ],
  },
};

describe('Important Talks activity scenes', () => {
  beforeEach(() => {
    document.body.className = 'important-talks-theme';
    document.body.innerHTML = '<main id="quiz-view"></main>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an editable textarea scene with a live character counter', () => {
    renderNode(textNode, { resolveNextNode: () => null, processNode: vi.fn() });

    const textarea = document.querySelector<HTMLTextAreaElement>('.talks-text-entry textarea');
    expect(document.querySelector('.talks-text-scene')).not.toBeNull();
    expect(document.querySelector('.talks-text-media-fallback')).not.toBeNull();
    expect(textarea?.placeholder).toBe('Напишите ваш ответ...');
    expect(textarea?.maxLength).toBe(300);
    expect(document.querySelector('.talks-text-count')?.textContent).toBe('0 / 300');
    expect(document.querySelector('.talks-text-insight h2')?.textContent).toBe('Ваше мнение важно');

    if (!textarea) throw new Error('Expected Important Talks textarea');
    textarea.value = 'Уважение';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.talks-text-count')?.textContent).toBe('8 / 300');
  });

  it('keeps text answer routing intact', () => {
    const processNode = vi.fn();
    renderNode(textNode, {
      resolveNextNode: (_nodeId, handle) => handle === 'correct' ? 'next' : null,
      processNode,
    });

    const textarea = document.querySelector<HTMLTextAreaElement>('.talks-text-entry textarea');
    if (!textarea) throw new Error('Expected Important Talks textarea');
    textarea.value = 'уважение';
    document.querySelector<HTMLButtonElement>('.talks-text-cta')?.click();
    expect(processNode).toHaveBeenCalledWith('next');
  });

  it('renders checkbox options and preserves multi-selection confirmation', () => {
    const processNode = vi.fn();
    renderNode(multipleNode, {
      resolveNextNode: (_nodeId, handle) => handle === 'correct-2' ? 'next' : null,
      processNode,
    });

    const options = Array.from(document.querySelectorAll<HTMLButtonElement>('.talks-multiple-options .option'));
    const confirm = document.querySelector<HTMLButtonElement>('.talks-multiple-cta');
    expect(document.querySelector('.talks-multiple-scene')).not.toBeNull();
    expect(document.querySelector('.talks-multiple-media-fallback')).not.toBeNull();
    expect(options).toHaveLength(3);
    expect(confirm?.disabled).toBe(true);

    options[0]?.click();
    options[1]?.click();
    expect(options[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(options[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(confirm?.disabled).toBe(false);
    confirm?.click();
    expect(processNode).toHaveBeenCalledWith('next');
  });

  it('keeps timeline controls functional after applying the scene layout', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const processNode = vi.fn();
    renderNode(timelineNode, {
      resolveNextNode: (_nodeId, handle) => handle === 'incorrect' ? 'retry' : null,
      processNode,
    });

    expect(document.querySelector('.talks-timeline-scene')).not.toBeNull();
    expect(document.querySelector('.talks-timeline-media-fallback')).not.toBeNull();
    expect(document.querySelectorAll('.talks-timeline-card')).toHaveLength(4);
    expect(document.querySelectorAll('.talks-timeline-grip')).toHaveLength(4);

    const downButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label="Опустить"]'));
    downButtons[0]?.click();
    expect(
      Array.from(document.querySelectorAll('.talks-timeline-card .timeline-content')).map((item) => item.textContent),
    ).toEqual([
      'распределить обязанности',
      'обсудить идею',
      'выполнить общее дело',
      'подвести итоги',
    ]);

    document.querySelector<HTMLButtonElement>('.talks-timeline-cta')?.click();
    expect(processNode).toHaveBeenCalledWith('retry');
  });

  it('keeps the shared text input renderer unchanged outside the theme', () => {
    document.body.className = '';
    renderNode(textNode, { resolveNextNode: () => null, processNode: vi.fn() });

    expect(document.querySelector('.talks-text-scene')).toBeNull();
    expect(document.querySelector('.node-controls > input.text-field')).not.toBeNull();
    expect(document.querySelector('.node-controls > textarea')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { generateQuizHtml } from '../index';

const baseQuiz = {
  nodes: [
    { id: 'start', type: 'startNode', data: { label: 'Start' }, position: { x: 0, y: 0 } },
    {
      id: 'q1',
      type: 'questionNode',
      data: {
        label: 'Question',
        question: 'Pick one',
        answers: [{ id: 'a1', text: 'Answer' }],
      },
      position: { x: 0, y: 0 },
    },
  ],
  edges: [{ id: 'e1', source: 'start', target: 'q1' }],
  templateId: 'default' as const,
};

describe('design selection export boundaries', () => {
  it('does not include editor selection overlay in standalone HTML export', () => {
    const html = generateQuizHtml(baseQuiz);

    expect(html).not.toContain('qf-design-selected');
    expect(html).not.toContain('qf-fallback-design-selected');
    expect(html).not.toContain('data-design-role');
  });

  it('does not include editor selection overlay in preview srcdoc without bridge state', () => {
    const html = generateQuizHtml(baseQuiz, { preview: true });

    expect(html).not.toContain('qf-design-selected');
    expect(html).not.toContain('qf-fallback-design-selected');
    expect(html).not.toContain('data-design-role');
  });
});

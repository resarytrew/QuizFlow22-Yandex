import { describe, expect, it } from 'vitest';
import type { PublicQuiz } from '../types';
import {
  formatFeaturedQuizDate,
  getFeaturedQuizCover,
  getFeaturedQuizDescription,
  getFeaturedPlayablePreview,
  getFeaturedPreviewNodes,
  LANDING_NAV_ITEMS,
  requiresAuthForFullQuiz,
} from './LandingPage';

function makeQuiz(quizData: Record<string, unknown>): PublicQuiz {
  return {
    id: 'quiz-1',
    name: 'Quiz',
    created_at: '',
    published_at: '',
    quiz_data: {
      nodes: [],
      edges: [],
      globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
      designSettings: {} as any,
      ...quizData,
    },
  };
}

describe('getFeaturedQuizDescription', () => {
  it('uses the description entered during publication', () => {
    expect(
      getFeaturedQuizDescription(makeQuiz({ description: 'Описание публикации' }))
    ).toBe('Описание публикации');
  });

  it('falls back to the project passport description', () => {
    expect(
      getFeaturedQuizDescription(
        makeQuiz({
          passport: { scenarioDescription: 'Описание сценария' },
        })
      )
    ).toBe('Описание сценария');
  });

  it('falls back to meaningful node content without generic copy', () => {
    expect(
      getFeaturedQuizDescription(
        makeQuiz({
          nodes: [{ data: { question: 'О чём этот квиз?' } }],
        })
      )
    ).toBe('О чём этот квиз?');
  });
});

describe('featured quiz card presentation', () => {
  it('prefers the publication cover over node images', () => {
    const quiz = makeQuiz({
      cover_image_url: 'https://example.com/cover.jpg',
      nodes: [{ data: { imageUrl: 'https://example.com/node.jpg' } }],
    });

    expect(getFeaturedQuizCover(quiz)).toBe('https://example.com/cover.jpg');
  });

  it('uses a node image when no publication cover exists', () => {
    const quiz = makeQuiz({
      nodes: [{ data: { imageUrl: 'https://example.com/node.jpg' } }],
    });

    expect(getFeaturedQuizCover(quiz)).toBe('https://example.com/node.jpg');
  });

  it('formats the publication date like the reference cards', () => {
    expect(formatFeaturedQuizDate('2026-09-01T10:00:00.000Z')).toBe('1 сентября');
  });

  it('prepares no more than ten readable nodes for the landing preview', () => {
    const quiz = makeQuiz({
      nodes: Array.from({ length: 12 }, (_, index) => ({
        id: `node-${index}`,
        type: index === 0 ? 'startNode' : 'questionNode',
        data: {
          label: index === 0 ? 'Старт' : `Вопрос ${index}`,
          question: index === 0 ? '' : `Текст вопроса ${index}`,
        },
      })),
    });

    const nodes = getFeaturedPreviewNodes(quiz);
    expect(nodes).toHaveLength(10);
    expect(nodes[0].typeLabel).toBe('Старт');
    expect(nodes[1]).toMatchObject({
      title: 'Вопрос 1',
      excerpt: 'Текст вопроса 1',
    });
  });

  it('builds a playable ten-node subgraph from the start node', () => {
    const nodes = Array.from({ length: 12 }, (_, index) => ({
      id: `node-${index}`,
      type: index === 0 ? 'startNode' : 'questionNode',
      data: { label: `Node ${index}` },
    }));
    const edges = Array.from({ length: 11 }, (_, index) => ({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
    }));
    const quiz = makeQuiz({ nodes, edges });

    const preview = getFeaturedPlayablePreview(quiz);
    expect(preview.nodes).toHaveLength(10);
    expect(preview.nodes[0]).toMatchObject({ id: 'node-0' });
    expect(preview.nodes[9]).toMatchObject({ id: 'node-9' });
    expect(preview.edges).toHaveLength(9);
  });
});

describe('featured quiz full-version access', () => {
  it('requires authorization for a guest', () => {
    expect(requiresAuthForFullQuiz(false)).toBe(true);
  });

  it('allows an authenticated user to open the full quiz immediately', () => {
    expect(requiresAuthForFullQuiz(true)).toBe(false);
  });
});

describe('landing navigation', () => {
  it('follows the visible section order and includes pricing', () => {
    expect(LANDING_NAV_ITEMS).toEqual([
      { label: 'Лучшие квизы', target: 'templates' },
      { label: 'Возможности', target: 'features' },
      { label: 'Лаборатория', target: 'scenario-lab' },
      { label: 'Об авторе', target: 'author' },
      { label: 'Тарифы', target: 'pricing' },
    ]);
  });
});

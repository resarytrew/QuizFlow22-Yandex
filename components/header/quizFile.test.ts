import { describe, expect, it } from 'vitest';
import { parseQuizFile, serializeQuizFile } from './quizFile';

const node = {
  id: 'node-1',
  type: 'start',
  data: { label: 'Начало' },
  position: { x: 10, y: 20 },
};

const edge = {
  id: 'edge-1',
  source: 'node-1',
  target: 'node-2',
  sourceHandle: null,
  targetHandle: 'input',
};

describe('quiz file import and export', () => {
  it('round-trips the supported node and edge fields', () => {
    const content = serializeQuizFile({
      nodes: [node as never],
      edges: [edge],
    });

    expect(parseQuizFile(content)).toEqual({
      nodes: [node],
      edges: [edge],
    });
  });

  it('preserves complete template settings', () => {
    const globalTimer = {
      enabled: true,
      duration: 120,
      onTimeoutNodeId: 'node-1',
    };
    const designSettings = {
      background: { color: '#123456' },
    };
    const content = serializeQuizFile({
      nodes: [node as never],
      edges: [edge],
      globalTimer,
      designSettings: designSettings as never,
      templateId: 'science',
      currentQuizName: 'Custom science quiz',
    });

    expect(parseQuizFile(content)).toMatchObject({
      globalTimer,
      designSettings,
      templateId: 'science',
      currentQuizName: 'Custom science quiz',
    });
  });

  it.each(['data', 'quiz_data'])(
    'supports a template wrapped in %s',
    (wrapper) => {
      const content = JSON.stringify({
        [wrapper]: {
          nodes: [node],
          edges: [edge],
          currentQuizName: 'Wrapped template',
        },
      });

      expect(parseQuizFile(content)).toMatchObject({
        nodes: [node],
        edges: [edge],
        currentQuizName: 'Wrapped template',
      });
    },
  );

  it('uses the outer Supabase quiz name when quiz_data has no name', () => {
    const content = JSON.stringify({
      name: 'Database export name',
      quiz_data: { nodes: [node], edges: [edge] },
    });

    expect(parseQuizFile(content).currentQuizName).toBe(
      'Database export name',
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parseQuizFile('{')).toThrow(
      'Файл не содержит корректный JSON.',
    );
  });

  it('rejects arrays with invalid nodes', () => {
    expect(() =>
      parseQuizFile(JSON.stringify({ nodes: [{ id: 'x' }], edges: [] })),
    ).toThrow('Неверная структура JSON-файла квиза.');
  });

  it('rejects arrays with invalid edges', () => {
    expect(() =>
      parseQuizFile(
        JSON.stringify({
          nodes: [node],
          edges: [{ id: 'edge-1', source: 'node-1' }],
        }),
      ),
    ).toThrow('Неверная структура JSON-файла квиза.');
  });
});

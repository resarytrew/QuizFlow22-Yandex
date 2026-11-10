import { describe, expect, it } from 'vitest';
import { migrateLegacyTheme } from './migrateLegacyTheme';
import type { QuizData } from '../types';

const legacy = {
  templateId: 'importantTalks',
  nodes: [{ id: 'q', type: 'questionNode', position: { x: 1, y: 2 }, data: { question: 'Вопрос', answers: [{ id: 'a', text: 'Да' }], importantTalks: { correctText: 'Пояснение' } } }],
  edges: [{ id: 'edge', source: 'q', sourceHandle: 'a', target: 'result', data: { condition: 'x > 0' } }],
  globalTimer: { enabled: true, duration: 42, onTimeoutNodeId: null },
  designSettings: { advanced: { customCss: 'p { color: red }' } },
} as unknown as QuizData;

describe('legacy theme migration', () => {
  it('preserves the full original and graph while reporting unsupported specialized fields', () => {
    const result = migrateLegacyTheme(legacy);
    expect(result.templateId).toBe('default');
    expect(result.nodes[0].data).not.toHaveProperty('importantTalks');
    expect(result.edges).toEqual(legacy.edges);
    expect(result.globalTimer).toEqual(legacy.globalTimer);
    expect(result.legacyThemeMigration?.original).toEqual(legacy);
    expect(result.legacyThemeMigration?.unsupportedPaths).toEqual(['nodes.q.importantTalks.correctText']);
    expect(legacy.nodes[0].data).toHaveProperty('importantTalks');
  });
  it('is idempotent and does not alter other templates', () => {
    const once = migrateLegacyTheme(legacy);
    expect(migrateLegacyTheme(once)).toBe(once);
    const regular = { ...legacy, templateId: 'screenQuiz' } as QuizData;
    expect(migrateLegacyTheme(regular)).toBe(regular);
  });
});

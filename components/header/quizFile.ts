import type { Edge, Node } from 'reactflow';
import type {
  DesignSettings,
  GlobalTimer,
  NodeData,
  QuizTemplateId,
} from '../../types';

export interface QuizFile {
  nodes: Node<NodeData>[];
  edges: Edge[];
  globalTimer?: GlobalTimer;
  designSettings?: Partial<DesignSettings>;
  templateId?: QuizTemplateId;
  currentQuizName?: string;
}

const TEMPLATE_IDS = new Set<QuizTemplateId>([
  'default',
  'ww2',
  'economic',
  'yandex',
  'army',
  'science',
  'math',
  'history',
  'newyear',
  'screenQuiz',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPosition = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.x === 'number' &&
  Number.isFinite(value.x) &&
  typeof value.y === 'number' &&
  Number.isFinite(value.y);

const isNode = (value: unknown): value is Node<NodeData> =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  (value.type === undefined || typeof value.type === 'string') &&
  isRecord(value.data) &&
  isPosition(value.position);

const isEdge = (value: unknown): value is Edge =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.source === 'string' &&
  value.source.length > 0 &&
  typeof value.target === 'string' &&
  value.target.length > 0 &&
  (value.sourceHandle == null || typeof value.sourceHandle === 'string') &&
  (value.targetHandle == null || typeof value.targetHandle === 'string');

const unwrapQuizData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (isRecord(value.quiz_data)) {
    return {
      ...value.quiz_data,
      currentQuizName:
        value.quiz_data.currentQuizName ??
        (typeof value.name === 'string' ? value.name : undefined),
    };
  }
  if (isRecord(value.data)) {
    return {
      ...value.data,
      currentQuizName:
        value.data.currentQuizName ??
        (typeof value.name === 'string'
          ? value.name
          : typeof value.title === 'string'
            ? value.title
            : undefined),
    };
  }
  return value;
};

const readGlobalTimer = (value: unknown): GlobalTimer | undefined => {
  if (
    !isRecord(value) ||
    typeof value.enabled !== 'boolean' ||
    typeof value.duration !== 'number' ||
    !Number.isFinite(value.duration) ||
    (value.onTimeoutNodeId !== null &&
      typeof value.onTimeoutNodeId !== 'string')
  ) {
    return undefined;
  }

  return {
    enabled: value.enabled,
    duration: value.duration,
    onTimeoutNodeId: value.onTimeoutNodeId,
  };
};

export function parseQuizFile(content: string): QuizFile {
  let parsed: unknown;

  try {
    parsed = unwrapQuizData(JSON.parse(content));
  } catch {
    throw new Error('Файл не содержит корректный JSON.');
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.nodes) ||
    !Array.isArray(parsed.edges) ||
    !parsed.nodes.every(isNode) ||
    !parsed.edges.every(isEdge)
  ) {
    throw new Error('Неверная структура JSON-файла квиза.');
  }

  return {
    nodes: parsed.nodes,
    edges: parsed.edges,
    ...(readGlobalTimer(parsed.globalTimer)
      ? { globalTimer: readGlobalTimer(parsed.globalTimer) }
      : {}),
    ...(isRecord(parsed.designSettings)
      ? { designSettings: parsed.designSettings as Partial<DesignSettings> }
      : {}),
    ...(typeof parsed.templateId === 'string' &&
    TEMPLATE_IDS.has(parsed.templateId as QuizTemplateId)
      ? { templateId: parsed.templateId as QuizTemplateId }
      : {}),
    ...(typeof parsed.currentQuizName === 'string'
      ? { currentQuizName: parsed.currentQuizName }
      : {}),
  };
}

export function serializeQuizFile(quiz: QuizFile): string {
  const quizFile: QuizFile = {
    nodes: quiz.nodes.map(({ id, type, data, position }) => ({
      id,
      type,
      data,
      position,
    })),
    edges: quiz.edges.map(
      ({ id, source, sourceHandle, target, targetHandle }) => ({
        id,
        source,
        sourceHandle,
        target,
        targetHandle,
      }),
    ),
    ...(quiz.globalTimer ? { globalTimer: quiz.globalTimer } : {}),
    ...(quiz.designSettings ? { designSettings: quiz.designSettings } : {}),
    ...(quiz.templateId ? { templateId: quiz.templateId } : {}),
    ...(quiz.currentQuizName
      ? { currentQuizName: quiz.currentQuizName }
      : {}),
  };

  return JSON.stringify(quizFile, null, 2);
}

export function downloadQuizFile(content: string, quizName: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${quizName.trim() || 'quiz'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

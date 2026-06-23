
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  memo,
  FC,
  ChangeEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCanvasStore } from '../store/useCanvasStore';
import { useUIStore } from '../store/useUIStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import toast from 'react-hot-toast';

import {
  callOpenRouter,
  callOpenRouterStream,
  extractFirstJsonObject,
  parseJsonWithRepair,
} from '../services/openRouterClient';


// Модели определяем здесь
const AI_MODEL_TEXT = 'openai/gpt-4o-mini';
const AI_MODEL_JSON = 'google/gemini-3-flash-preview';


// ============================================================================
// Constants & Configuration
// ============================================================================

const MESSAGES = {
  ERRORS: {
    TOPIC_REQUIRED: 'Введите тему',
    IDEAS_GENERATION_FAILED: 'Ошибка генерации идей',
    CONTENT_GENERATION_FAILED: 'Ошибка генерации контента',
    FINAL_GENERATION_FAILED: 'Ошибка финальной сборки',
    ABORTED: 'Генерация остановлена',
  },
  SUCCESS: {
    QUIZ_CREATED: 'Квиз успешно создан!',
  },
  LOADING: {
    GENERATING_IDEAS: 'Генерирую идеи...',
    WRITING_TEXT: 'AI пишет...',
    BUILDING_QUIZ: 'Собираю квиз...',
  },
} as const;

const FLUSH_INTERVAL_MS = 33;
const MIN_NODE_X = 100;
const MAX_NODE_X = 1200;
const DEFAULT_NODE_Y_STEP = 150;
const START_NODE_Y_OFFSET = 150;

const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 800,
  maxDelay: 5000,
} as const;

// ============================================================================
// Prompt Templates
// ============================================================================

const NODE_TYPES_COMPACT = `
Node Schema Definitions:
- startNode: {}
- infoNode: { title, description, imageUrl }
- questionNode: { question, answers: [{id, text}], imageUrl } (Visual: single choice buttons)
- multipleChoiceNode: { question, answers: [{id, text}], correctOptions: [id_string], imageUrl } (Visual: checkboxes. Logic: strictly matches correctOptions)
- textInputNode: { question, keyword, imageUrl } (Logic: checks if answer contains keyword)
- conditionNode: { variable, operator, value } (Ops: eq, neq, gt, lt, gte, lte. NO 'contains')
- variableNode: { variableName, operation, value } (Ops: set, add, subtract)
- scoreNode: { operation, value } (Ops: add, subtract, set)
- formulaNode: { variableName, expression, decimalPlaces } (Mathjs expression, e.g. "a + b")
- allocatorNode: { question, maxTotal, items: [{id, label, variableName}] } (Sliders)
- collectInfoNode: { title, description, fields: [{id, label, type, variableName}] } (Forms. Use variableName='playerName' to enable {{playerName}} personalization later)
- achievementNode: { title, description, imageUrl } (Popup reward notification)
- feedbackNode: { title, message, imageUrl }
- resultNode: { title, description, showScore: boolean, imageUrl }
`.trim();

const PLATFORM_CONTEXT = `
Create valid JSON quiz graph: {"nodes":[],"edges":[]}

${NODE_TYPES_COMPACT}

CRITICAL EDGE LOGIC RULES:
1. questionNode: Each answer must have a corresponding edge. "sourceHandle" MUST BE the answer.id.
2. multipleChoiceNode: Has exactly 2 outputs. "sourceHandle" must be "correct" or "incorrect".
3. textInputNode: Has exactly 2 outputs. "sourceHandle" must be "correct" or "incorrect".
4. conditionNode: Has exactly 2 outputs. "sourceHandle" must be "true" or "false".
5. matchingNode / timelineNode: "sourceHandle" must be "correct" or "incorrect".
6. All other nodes (startNode, infoNode, scoreNode, variableNode, formulaNode, achievementNode, collectInfoNode, etc.): "sourceHandle" is null.

General Rules:
- First node: {"id":"start","type":"startNode","position":{"x":400,"y":50},"data":{"label":"Start"}}
- Every node needs: id, type, position:{x,y}, data:{...}
- Edges: {"id":"e1","source":"nodeId","target":"nodeId","sourceHandle":...}
- Must have at least 2 resultNodes at the end (e.g. Success/Failure).
- All nodes must be reachable from start.
- If you use collectInfoNode, set variableName to "playerName". Then use {{playerName}} in subsequent nodes (text, questions, results) to address the user by name.
`.trim();

const START_NODE = {
  id: 'start',
  type: 'startNode',
  position: { x: 400, y: 50 },
  data: { label: 'Start' },
};

// ============================================================================
// Quiz Options Configuration
// ============================================================================

interface GenerationOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  promptAddition: string;
  incompatibleWith?: string[];
  tier?: 'basic' | 'advanced' | 'premium';
}

const STRUCTURE_OPTIONS: GenerationOption[] = [
  {
    id: 'secret_branch',
    label: 'Секретная ветка',
    description: 'Скрытый путь при особых условиях',
    icon: '🔐',
    promptAddition: 'Add hidden branch accessible via conditionNode with special variable check.',
    tier: 'advanced',
  },
  {
    id: 'bonus_branch',
    label: 'Бонусная ветка',
    description: 'Дополнительный контент для продвинутых',
    icon: '⭐',
    promptAddition: 'Add bonus branch for users with score > 80%.',
    tier: 'basic',
  },
  {
    id: 'multiple_endings',
    label: 'Расширенные концовки',
    description: '4+ уникальных финалов',
    icon: '🎭',
    promptAddition: 'Create 4+ unique resultNodes with different outcomes based on score/variables.',
    tier: 'advanced',
  },
];

const MECHANICS_OPTIONS: GenerationOption[] = [
  {
    id: 'lives_system',
    label: 'Система жизней',
    description: '3 жизни, ошибки отнимают жизнь',
    icon: '❤️',
    promptAddition: 'Add variable "lives"=3. Use scoreNode/variableNode to decrease on wrong answer. Bad ending if lives=0.',
    incompatibleWith: ['relaxed_mode'],
    tier: 'basic',
  },
  {
    id: 'hint_system',
    label: 'Система подсказок',
    description: 'Ограниченные подсказки',
    icon: '💡',
    promptAddition: 'Add variable "hints"=3. Add feedbackNodes that serve as hints.',
    tier: 'basic',
  },
  {
    id: 'relaxed_mode',
    label: 'Расслабленный режим',
    description: 'Без штрафов, фокус на обучении',
    icon: '🧘',
    promptAddition: 'No penalties. Wrong answers show explanation via feedbackNode, then continue to next question.',
    incompatibleWith: ['lives_system'],
    tier: 'basic',
  },
];

const CONTENT_OPTIONS: GenerationOption[] = [
  {
    id: 'humor_mode',
    label: 'Юмористический тон',
    description: 'Шутки и лёгкая подача',
    icon: '😄',
    promptAddition: 'Use humorous, fun, casual tone. Add jokes in feedbackNodes.',
    incompatibleWith: ['academic_mode'],
    tier: 'basic',
  },
  {
    id: 'academic_mode',
    label: 'Академический стиль',
    description: 'Строгий научный подход',
    icon: '🎓',
    promptAddition: 'Use formal, academic, scientific tone.',
    incompatibleWith: ['humor_mode'],
    tier: 'basic',
  },
  {
    id: 'storytelling_mode',
    label: 'Сторителлинг',
    description: 'Обучение через историю',
    icon: '📖',
    promptAddition: 'Narrative style with a main character. User makes decisions for the character.',
    tier: 'advanced',
  },
];

const DIFFICULTY_OPTIONS: GenerationOption[] = [
  {
    id: 'adaptive_difficulty',
    label: 'Адаптивная сложность',
    description: 'Сложность подстраивается под ответы',
    icon: '📈',
    promptAddition: 'Track "streak" variable. After 3 correct answers, branch to harder questions.',
    tier: 'premium',
  },
  {
    id: 'difficulty_choice',
    label: 'Выбор сложности',
    description: 'Пользователь выбирает уровень',
    icon: '🎚️',
    promptAddition: 'After start, add questionNode to choose difficulty: Easy/Medium/Hard. Branch accordingly.',
    tier: 'basic',
  },
];

const OPTION_CATEGORIES = [
  { id: 'structure', title: 'Структура', icon: '🏗️', options: STRUCTURE_OPTIONS },
  { id: 'mechanics', title: 'Механики', icon: '⚙️', options: MECHANICS_OPTIONS },
  { id: 'content', title: 'Контент', icon: '📝', options: CONTENT_OPTIONS },
  { id: 'difficulty', title: 'Сложность', icon: '📊', options: DIFFICULTY_OPTIONS },
];

const ALL_OPTIONS: GenerationOption[] = OPTION_CATEGORIES.flatMap(cat => cat.options);

interface ComplexityPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  questionCount: number;
  selectedOptions: string[];
}

const COMPLEXITY_PRESETS: ComplexityPreset[] = [
  {
    id: 'minimal',
    label: 'Минимальный',
    description: '5 вопросов, линейный',
    icon: '🌱',
    questionCount: 5,
    selectedOptions: ['relaxed_mode'],
  },
  {
    id: 'standard',
    label: 'Стандартный',
    description: '10 вопросов, ветвление',
    icon: '🌿',
    questionCount: 10,
    selectedOptions: ['hint_system'],
  },
  {
    id: 'extended',
    label: 'Расширенный',
    description: '15 вопросов, механики',
    icon: '🌳',
    questionCount: 15,
    selectedOptions: ['bonus_branch', 'multiple_endings'],
  },
  {
    id: 'premium',
    label: 'Премиум',
    description: '20 вопросов, полный набор',
    icon: '🏔️',
    questionCount: 20,
    selectedOptions: ['secret_branch', 'lives_system', 'storytelling_mode', 'adaptive_difficulty'],
  },
  {
    id: 'custom',
    label: 'Свой вариант',
    description: 'Настройте вручную',
    icon: '⚙️',
    questionCount: 10,
    selectedOptions: [],
  },
];

// ============================================================================
// Quiz Formats
// ============================================================================

interface QuizFormat {
  id: string;
  label: string;
  desc: string;
}

const QUIZ_FORMATS: QuizFormat[] = [
  { id: 'scenario', label: '🎓 Образовательный сценарий', desc: 'История с выборами и последствиями' },
  { id: 'branching', label: '🌿 Ветвящийся сюжет', desc: 'Разные маршруты и концовки' },
  { id: 'test', label: '📝 Тест с баллами', desc: 'Вопросы + подсчёт score' },
  { id: 'quest', label: '🗺️ Квест', desc: 'Исследование и находки' },
  { id: 'simulation', label: '🔬 Симуляция', desc: 'Управление переменными' },
  { id: 'dialogue', label: '💬 Диалоговый тренажёр', desc: 'Выбор реплик' },
];

// ============================================================================
// Types & Interfaces
// ============================================================================

type WizardStage = 'topic' | 'settings' | 'ideas' | 'concept' | 'architecture' | 'mechanics';

interface GeneratedIdea {
  title: string;
  genre: string;
  description: string;
  hook: string;
}

interface QuizNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  _originalId?: string;
}

interface QuizEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

interface WizardState {
  stage: WizardStage;
  isLoading: boolean;
  inputs: {
    topic: string;
    goal: string;
    audience: string;
    format: string;
    additionalContext: string;
    complexity: string;
    questionCount: number;
    selectedOptions: string[];
  };
  generation: {
    ideas: GeneratedIdea[];
    selectedIdea: GeneratedIdea | null;
    conceptText: string;
    architectureText: string;
    mechanicsText: string;
  };
}

type WizardAction =
  | { type: 'SET_STAGE'; payload: WizardStage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_INPUT'; field: keyof WizardState['inputs']; value: any }
  | { type: 'SET_IDEAS'; payload: GeneratedIdea[] }
  | { type: 'SELECT_IDEA'; payload: GeneratedIdea }
  | { type: 'APPEND_TEXT'; field: 'conceptText' | 'architectureText' | 'mechanicsText'; value: string }
  | { type: 'SET_TEXT'; field: 'conceptText' | 'architectureText' | 'mechanicsText'; value: string }
  | { type: 'RESET' };

const STAGES: readonly WizardStage[] = ['topic', 'settings', 'ideas', 'concept', 'architecture', 'mechanics'];

const STAGE_LABELS: Record<WizardStage, string> = {
  topic: 'Вводные',
  settings: 'Настройки',
  ideas: 'Идеи',
  concept: 'Концепция',
  architecture: 'Структура',
  mechanics: 'Механики',
};

// ============================================================================
// Graph Utilities
// ============================================================================

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

const normalizeNodes = (rawNodes: unknown[]): QuizNode[] => {
  return rawNodes.map((node: unknown, index: number) => {
    const n = node as Partial<QuizNode>;
    const originalId = typeof n?.id === 'string' && n.id.trim() ? n.id : `node-${index}`;
    const normalizedId = originalId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const type = typeof n?.type === 'string' && n.type ? n.type : 'infoNode';
    const pos = n?.position ?? { x: 400, y: 100 + index * DEFAULT_NODE_Y_STEP };
    
    return {
      id: normalizedId,
      type,
      position: {
        x: clamp(typeof pos.x === 'number' ? pos.x : 400, MIN_NODE_X, MAX_NODE_X),
        y: typeof pos.y === 'number' ? pos.y : 100 + index * DEFAULT_NODE_Y_STEP
      },
      data: { label: type, ...(n?.data || {}) },
      _originalId: originalId,
    };
  });
};

const normalizeEdges = (rawEdges: unknown[], nodes: QuizNode[]): QuizEdge[] => {
  const nodeIds = new Set(nodes.map(n => n.id));
  const originalToNormalized = new Map<string, string>();
  
  nodes.forEach(n => {
    originalToNormalized.set(n.id, n.id);
    if (n._originalId) {
      originalToNormalized.set(n._originalId, n.id);
    }
  });

  const edges: QuizEdge[] = [];
  const seenEdges = new Set<string>();

  (rawEdges as any[]).forEach((e, index) => {
    if (!e?.source || !e?.target) return;
    
    const source = originalToNormalized.get(e.source) || e.source;
    const target = originalToNormalized.get(e.target) || e.target;
    
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    if (source === target) return;
    
    const edgeKey = `${source}->${target}:${e.sourceHandle || ''}`;
    if (seenEdges.has(edgeKey)) return;
    seenEdges.add(edgeKey);

    edges.push({
      id: e.id || `edge-${index}-${source}-${target}`,
      source,
      target,
      sourceHandle: e.sourceHandle ?? null
    });
  });

  return edges;
};

const ensureStartNode = (nodes: QuizNode[]): QuizNode[] => {
  const hasStart = nodes.some(n => n.id === 'start' || n.type === 'startNode');
  if (hasStart) return nodes;
  
  return [
    { ...START_NODE },
    ...nodes.map(n => ({
      ...n,
      position: { x: n.position.x, y: n.position.y + START_NODE_Y_OFFSET }
    }))
  ];
};

const ensureResultNodes = (nodes: QuizNode[], edges: QuizEdge[]): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  const hasResult = nodes.some(n => n.type === 'resultNode');
  if (hasResult) return { nodes, edges };
  
  const maxY = Math.max(...nodes.map(n => n.position.y), 500);
  
  // Добавляем 2 resultNode - хороший и плохой
  const goodResult: QuizNode = {
    id: 'result-good',
    type: 'resultNode',
    position: { x: 300, y: maxY + 200 },
    data: { 
      title: '🎉 Отлично!', 
      description: 'Вы успешно прошли квиз!', 
      showScore: true 
    }
  };
  
  const badResult: QuizNode = {
    id: 'result-bad',
    type: 'resultNode',
    position: { x: 500, y: maxY + 200 },
    data: { 
      title: '📚 Попробуйте ещё', 
      description: 'Стоит повторить материал.', 
      showScore: true 
    }
  };
  
  const updatedNodes = [...nodes, goodResult, badResult];
  
  // Находим узлы без исходящих связей и подключаем к результатам
  const nodesWithOutgoing = new Set(edges.map(e => e.source));
  const deadEnds = nodes.filter(n => 
    !nodesWithOutgoing.has(n.id) && 
    n.type !== 'resultNode' &&
    n.type !== 'startNode'
  );
  
  const newEdges = [...edges];
  deadEnds.forEach((n, i) => {
    newEdges.push({
      id: `edge-to-result-${n.id}`,
      source: n.id,
      target: i % 2 === 0 ? 'result-good' : 'result-bad',
      sourceHandle: null
    });
  });
  
  return { nodes: updatedNodes, edges: newEdges };
};

const ensureStartEdge = (nodes: QuizNode[], edges: QuizEdge[]): QuizEdge[] => {
  const startNode = nodes.find(n => n.id === 'start' || n.type === 'startNode');
  if (!startNode) return edges;
  
  const hasStartEdge = edges.some(e => e.source === startNode.id);
  if (hasStartEdge) return edges;
  
  const firstContent = nodes.find(n => n.id !== startNode.id && n.type !== 'resultNode');
  if (!firstContent) return edges;
  
  return [{
    id: 'edge-start-first',
    source: startNode.id,
    target: firstContent.id,
    sourceHandle: null
  }, ...edges];
};

const ensureGraphConnectivity = (nodes: QuizNode[], edges: QuizEdge[]): QuizEdge[] => {
  if (nodes.length <= 1) return edges;

  const outgoing = new Map<string, Set<string>>();
  nodes.forEach(n => outgoing.set(n.id, new Set()));
  edges.forEach(e => outgoing.get(e.source)?.add(e.target));

  const startNode = nodes.find(n => n.type === 'startNode' || n.id === 'start');
  const startId = startNode?.id || nodes[0].id;
  
  const reachable = new Set<string>([startId]);
  const queue = [startId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    outgoing.get(current)?.forEach(neighbor => {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const newEdges = [...edges];
  
  sortedNodes.forEach((node, index) => {
    if (node.id === startId || reachable.has(node.id)) return;

    for (let i = index - 1; i >= 0; i--) {
      const prevNode = sortedNodes[i];
      if (reachable.has(prevNode.id)) {
        newEdges.push({
          id: `auto-edge-${prevNode.id}-${node.id}`,
          source: prevNode.id,
          target: node.id,
          sourceHandle: null
        });
        reachable.add(node.id);
        break;
      }
    }
  });

  return newEdges;
};

const addMissingAnswerEdges = (nodes: QuizNode[], edges: QuizEdge[]): QuizEdge[] => {
  const existingEdges = new Set(edges.map(e => `${e.source}:${e.sourceHandle || 'default'}`));
  const newEdges = [...edges];
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  
  nodes.forEach((node) => {
    // UPDATED: Only questionNode needs specific ID handle links logic. 
    // multipleChoiceNode now uses "correct"/"incorrect" handles, so we don't auto-link answers for it here.
    if (node.type !== 'questionNode') return;
    
    const answers = node.data?.answers as Array<{ id: string }> | undefined;
    if (!Array.isArray(answers) || answers.length === 0) return;

    const currentY = node.position.y;
    const nextNodes = sortedNodes.filter(n => n.position.y > currentY && n.id !== node.id);

    answers.forEach((answer, idx) => {
      const edgeKey = `${node.id}:${answer.id}`;
      if (existingEdges.has(edgeKey)) return;

      const targetNode = nextNodes[idx] || nextNodes[0];
      if (!targetNode) return;

      newEdges.push({
        id: `ans-edge-${node.id}-${answer.id}`,
        source: node.id,
        target: targetNode.id,
        sourceHandle: answer.id
      });
      existingEdges.add(edgeKey);
    });
  });

  return newEdges;
};

const validateGraph = (nodes: QuizNode[], edges: QuizEdge[]): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  const startNode = nodes.find(n => n.id === 'start' || n.type === 'startNode');
  if (!startNode) issues.push('Нет стартового узла');
  
  const resultNodes = nodes.filter(n => n.type === 'resultNode');
  if (resultNodes.length === 0) issues.push('Нет узлов результата');
  if (resultNodes.length < 2) issues.push('Рекомендуется минимум 2 концовки');

  if (startNode) {
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });

    const reachable = new Set<string>();
    const queue = [startNode.id];
    reachable.add(startNode.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (!reachable.has(n)) {
          reachable.add(n);
          queue.push(n);
        }
      }
    }

    const unreachable = nodes.length - reachable.size;
    if (unreachable > 0) issues.push(`${unreachable} недостижимых узлов`);
  }

  return { isValid: issues.length <= 1, issues };
};

const cleanNodes = (nodes: QuizNode[]): QuizNode[] => {
  return nodes.map(n => {
    const { _originalId, ...rest } = n;
    return rest;
  });
};

// ============================================================================
// Retry Utility
// ============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    baseDelay?: number;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const { retries = RETRY_CONFIG.maxRetries, baseDelay = RETRY_CONFIG.baseDelay, signal } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === 'AbortError') throw lastError;
      if (attempt === retries) throw lastError;

      const delay = Math.min(baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay);
      await new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => { 
          clearTimeout(id); 
          reject(new DOMException('Aborted', 'AbortError')); 
        }, { once: true });
      });
    }
  }
  
  throw lastError;
}

// ============================================================================
// State Management
// ============================================================================

const initialState: WizardState = {
  stage: 'topic',
  isLoading: false,
  inputs: {
    topic: '',
    goal: '',
    audience: '',
    format: QUIZ_FORMATS[0].id,
    additionalContext: '',
    complexity: 'standard',
    questionCount: 10,
    selectedOptions: ['hint_system'],
  },
  generation: {
    ideas: [],
    selectedIdea: null,
    conceptText: '',
    architectureText: '',
    mechanicsText: '',
  },
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STAGE': return { ...state, stage: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'UPDATE_INPUT': return { ...state, inputs: { ...state.inputs, [action.field]: action.value } };
    case 'SET_IDEAS': return { ...state, generation: { ...state.generation, ideas: action.payload } };
    case 'SELECT_IDEA': return { ...state, generation: { ...state.generation, selectedIdea: action.payload } };
    case 'APPEND_TEXT': return { ...state, generation: { ...state.generation, [action.field]: state.generation[action.field] + action.value } };
    case 'SET_TEXT': return { ...state, generation: { ...state.generation, [action.field]: action.value } };
    case 'RESET': return initialState;
    default: return state;
  }
};

// ============================================================================
// Hooks
// ============================================================================

interface TokenBufferResult {
  push: (token: string) => void;
  reset: () => void;
  flush: () => void;
}

const useTokenBuffer = (apply: (text: string) => void): TokenBufferResult => {
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<number | null>(null);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const flush = useCallback(() => {
    if (!bufferRef.current) return;
    const chunk = bufferRef.current;
    bufferRef.current = '';
    applyRef.current(chunk);
  }, []);

  const push = useCallback((token: string) => {
    bufferRef.current += token;
    if (timeoutRef.current === null) {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        flush();
      }, FLUSH_INTERVAL_MS);
    }
  }, [flush]);

  const reset = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => { 
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current); 
  }, []);
  
  return { push, reset, flush };
};

const useAbortController = () => {
  const abortRef = useRef<AbortController | null>(null);
  
  const cancel = useCallback(() => { 
    abortRef.current?.abort(); 
    abortRef.current = null; 
  }, []);
  
  const createNew = useCallback(() => { 
    cancel(); 
    const c = new AbortController(); 
    abortRef.current = c; 
    return c; 
  }, [cancel]);
  
  useEffect(() => () => cancel(), [cancel]);
  
  return { cancel, createNew };
};


// ============================================================================
// Premium Light Theme Sub-Components
// ============================================================================

const Spinner: FC<{ className?: string }> = memo(({ className = 'w-5 h-5' }) => (
  <div 
    className={`${className} border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin`} 
    role="status" 
  />
));

const ProgressBar: FC<{ stages: readonly WizardStage[]; currentIndex: number }> = memo(({ stages, currentIndex }) => (
  <div className="flex gap-1.5 flex-1">
    {stages.map((stage, i) => (
      <div 
        key={stage}
        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
          i < currentIndex 
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500' 
            : i === currentIndex
              ? 'bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse'
              : 'bg-slate-200'
        }`}
        title={STAGE_LABELS[stage]}
      />
    ))}
  </div>
));
const WizardHeader: FC<{
  isLoading: boolean;
  currentStageIndex: number;
  stageName: string;
  onCancel: () => void;
  onClose: () => void;
}> = memo(({ isLoading, currentStageIndex, stageName, onCancel, onClose }) => (
  <div
    className="
      px-7 py-5 shrink-0
      border-b border-slate-100/80
      bg-white/75 backdrop-blur-xl
      antialiased
    "
  >
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        <div
          className="
            w-12 h-12 rounded-2xl
            bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50
            ring-1 ring-slate-200/70
            shadow-sm shadow-slate-200/60
            flex items-center justify-center
          "
        >
          <span className="text-2xl">✨</span>
        </div>

        <div className="leading-tight">
          <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 font-display">
            AI Методолог
          </h2>
          <p className="text-sm text-slate-600 font-medium">{stageName}</p>
        </div>

        {isLoading && (
          <div
            className="
              flex items-center gap-2 ml-2 px-3 py-1.5
              bg-white/70
              border border-slate-200/70
              rounded-full
              shadow-sm shadow-slate-200/60
            "
          >
            <Spinner className="w-4 h-4" />
            <span className="text-xs font-semibold text-slate-700">Работаю...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isLoading && (
          <button
            onClick={onCancel}
            className="
              px-4 py-2 text-sm font-semibold rounded-2xl
              bg-slate-50/80 border border-slate-200/70
              text-slate-700
              hover:bg-white hover:border-slate-200
              shadow-sm shadow-slate-200/60
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
            "
          >
            Остановить
          </button>
        )}

        <button
          onClick={onClose}
          className="
            w-10 h-10 rounded-2xl
            flex items-center justify-center
            bg-white/60 border border-slate-200/70
            text-slate-600
            hover:bg-white hover:shadow-sm hover:shadow-slate-200/60
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div className="flex items-center gap-4">
      <ProgressBar stages={STAGES} currentIndex={currentStageIndex} />
      <div
        className="
          flex items-center gap-1.5 px-3 py-1
          bg-white/70 border border-slate-200/70
          rounded-full shadow-sm shadow-slate-200/60
        "
      >
        <span className="text-sm font-bold text-slate-900">{currentStageIndex + 1}</span>
        <span className="text-sm text-slate-400">/</span>
        <span className="text-sm text-slate-600">{STAGES.length}</span>
      </div>
    </div>
  </div>
));

const TopicStage: FC<{
  inputs: WizardState['inputs'];
  onUpdate: (field: keyof WizardState['inputs'], value: string) => void;
  onSubmit: () => void;
}> = memo(({ inputs, onUpdate, onSubmit }) => (
  <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="max-w-2xl mx-auto space-y-9 antialiased">
    <div className="text-center mb-10">
      <div
        className="
          inline-flex items-center justify-center w-16 h-16 rounded-3xl
          bg-gradient-to-br from-indigo-50 to-violet-50
          ring-1 ring-slate-200/70
          shadow-sm shadow-slate-200/60
          mb-4
        "
      >
        <span className="text-3xl">📝</span>
      </div>

      <h3 className="text-3xl font-semibold tracking-tight text-slate-900 font-display mb-3">
        Опишите вашу задачу
      </h3>
      <p className="text-slate-600 text-[17px] leading-relaxed">
        Чем подробнее описание — тем точнее результат
      </p>
    </div>

    <div className="space-y-5">
      <div className="group">
        <label className="block text-xs font-semibold tracking-wide uppercase text-slate-700 mb-2">
          Тема квиза <span className="text-slate-900">*</span>
        </label>
        <input
          className="
            w-full
            bg-white/70 border border-slate-200/80
            rounded-2xl px-5 py-4
            text-slate-900 placeholder:text-slate-400
            shadow-sm shadow-slate-200/50
            focus-visible:outline-none
            focus-visible:ring-4 focus-visible:ring-indigo-100
            focus-visible:border-indigo-200
            transition-all duration-200
            text-[16px]
          "
          value={inputs.topic}
          onChange={e => onUpdate('topic', e.target.value)}
          placeholder="Например: Основы Python для начинающих"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide uppercase text-slate-700 mb-2">
          Цель обучения
        </label>
        <input
          className="
            w-full
            bg-white/70 border border-slate-200/80
            rounded-2xl px-5 py-4
            text-slate-900 placeholder:text-slate-400
            shadow-sm shadow-slate-200/50
            focus-visible:outline-none
            focus-visible:ring-4 focus-visible:ring-indigo-100
            focus-visible:border-indigo-200
            transition-all duration-200
          "
          value={inputs.goal}
          onChange={e => onUpdate('goal', e.target.value)}
          placeholder="Что должен понимать пользователь после прохождения?"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide uppercase text-slate-700 mb-2">
          Целевая аудитория
        </label>
        <input
          className="
            w-full
            bg-white/70 border border-slate-200/80
            rounded-2xl px-5 py-4
            text-slate-900 placeholder:text-slate-400
            shadow-sm shadow-slate-200/50
            focus-visible:outline-none
            focus-visible:ring-4 focus-visible:ring-indigo-100
            focus-visible:border-indigo-200
            transition-all duration-200
          "
          value={inputs.audience}
          onChange={e => onUpdate('audience', e.target.value)}
          placeholder="Кто будет проходить? Возраст, уровень подготовки"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide uppercase text-slate-700 mb-3">
          Формат квиза
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUIZ_FORMATS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => onUpdate('format', f.id)}
              className={`
                p-4 rounded-2xl text-left
                border transition-all duration-200
                shadow-sm
                ${inputs.format === f.id
                  ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200 shadow-indigo-100/50'
                  : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-200 shadow-slate-200/40'
                }
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
              `}
            >
              <div className={`font-semibold ${inputs.format === f.id ? 'text-slate-900' : 'text-slate-800'}`}>
                {f.label}
              </div>
              <div className="text-xs mt-1 text-slate-600 leading-snug">
                {f.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide uppercase text-slate-700 mb-2">
          Дополнительный контекст
        </label>
        <textarea
          className="
            w-full
            bg-white/70 border border-slate-200/80
            rounded-2xl px-5 py-4
            text-slate-900 placeholder:text-slate-400
            shadow-sm shadow-slate-200/50
            focus-visible:outline-none
            focus-visible:ring-4 focus-visible:ring-indigo-100
            focus-visible:border-indigo-200
            transition-all duration-200
            resize-none
          "
          value={inputs.additionalContext}
          onChange={e => onUpdate('additionalContext', e.target.value)}
          placeholder="Особые пожелания, ограничения, примеры вопросов..."
          rows={3}
        />
      </div>
    </div>

    <button
      type="submit"
      disabled={!inputs.topic.trim()}
      className="
        w-full py-4 rounded-2xl
        bg-gradient-to-r from-indigo-50 to-violet-50
        border border-indigo-200/70
        text-slate-900 text-[16px] font-semibold tracking-tight
        shadow-lg shadow-indigo-100/50
        hover:shadow-xl hover:shadow-indigo-100/60
        hover:bg-white
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
        transition-all duration-300
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
      "
    >
      Продолжить →
    </button>
  </form>
));

const SettingsStage: FC<{
  inputs: WizardState['inputs'];
  onUpdate: (field: keyof WizardState['inputs'], value: any) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}> = memo(({ inputs, onUpdate, onSubmit, onBack, isLoading }) => {
  const toggleOption = (id: string) => {
    const option = ALL_OPTIONS.find(o => o.id === id);
    const current = inputs.selectedOptions;

    if (current.includes(id)) {
      onUpdate('selectedOptions', current.filter(x => x !== id));
    } else {
      let newOptions = current.filter(x => {
        const existing = ALL_OPTIONS.find(o => o.id === x);
        return !existing?.incompatibleWith?.includes(id) && !option?.incompatibleWith?.includes(x);
      });
      onUpdate('selectedOptions', [...newOptions, id]);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = COMPLEXITY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onUpdate('complexity', presetId);
      onUpdate('questionCount', preset.questionCount);
      if (presetId !== 'custom') {
        onUpdate('selectedOptions', preset.selectedOptions);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 antialiased">
      <div className="text-center">
        <div
          className="
            inline-flex items-center justify-center w-16 h-16 rounded-3xl
            bg-gradient-to-br from-violet-50 to-fuchsia-50
            ring-1 ring-slate-200/70
            shadow-sm shadow-slate-200/60
            mb-4
          "
        >
          <span className="text-3xl">⚡</span>
        </div>
        <h3 className="text-3xl font-semibold tracking-tight text-slate-900 font-display mb-3">
          Настройки генерации
        </h3>
        <p className="text-slate-600 text-[17px] leading-relaxed">
          Выберите уровень сложности и механики
        </p>
      </div>

      {/* Presets */}
      <div
        className="
          bg-white/70
          border border-slate-200/70
          p-6 rounded-3xl
          shadow-sm shadow-slate-200/60
        "
      >
        <h4 className="text-slate-900 font-semibold tracking-tight text-lg mb-4 flex items-center gap-3 font-display">
          <span className="w-8 h-8 bg-indigo-50 ring-1 ring-slate-200/70 rounded-xl flex items-center justify-center">
            📊
          </span>
          Уровень сложности
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {COMPLEXITY_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`
                p-4 rounded-2xl border text-left
                bg-white/70
                shadow-sm transition-all duration-250
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
                ${inputs.complexity === preset.id
                  ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 shadow-indigo-100/50'
                  : 'border-slate-200/80 hover:bg-white hover:border-slate-200 shadow-slate-200/40'
                }
              `}
            >
              <div className="text-3xl mb-2">{preset.icon}</div>
              <div className="font-semibold text-sm text-slate-900">
                {preset.label}
              </div>
              <div className="text-[11px] text-slate-600 leading-snug mt-1">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Question Count Slider */}
      <div
        className="
          bg-white/70 p-6 rounded-3xl
          border border-slate-200/70
          shadow-sm shadow-slate-200/60
        "
      >
        <div className="flex justify-between items-center mb-4">
          <label className="text-lg font-semibold tracking-tight text-slate-900 font-display">
            Количество вопросов
          </label>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 font-display">
              {inputs.questionCount}
            </span>
            <span className="text-slate-600 text-sm">вопросов</span>
          </div>
        </div>

        <div className="relative">
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={inputs.questionCount}
            onChange={(e) => {
              onUpdate('questionCount', parseInt(e.target.value));
              if (inputs.complexity !== 'custom') {
                onUpdate('complexity', 'custom');
              }
            }}
            className="
              w-full h-3 rounded-full appearance-none cursor-pointer
              bg-slate-100
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-gradient-to-r
              [&::-webkit-slider-thumb]:from-indigo-100
              [&::-webkit-slider-thumb]:to-violet-100
              [&::-webkit-slider-thumb]:ring-1
              [&::-webkit-slider-thumb]:ring-slate-200/70
              [&::-webkit-slider-thumb]:shadow-sm
              [&::-webkit-slider-thumb]:shadow-slate-200/60
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              focus-visible:outline-none
            "
          />
          <div
            className="
              absolute top-0 left-0 h-3 rounded-full pointer-events-none
              bg-gradient-to-r from-indigo-100 to-violet-100
              ring-1 ring-slate-200/40
            "
            style={{ width: `${((inputs.questionCount - 3) / 27) * 100}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-600 mt-3 font-medium">
          <span>3 — быстрый тест</span>
          <span>30 — глубокая проверка</span>
        </div>
      </div>

      {/* Options Grid */}
      <div>
        <h4 className="text-slate-900 font-semibold tracking-tight text-lg mb-4 flex items-center gap-3 font-display">
          <span className="w-8 h-8 bg-violet-50 ring-1 ring-slate-200/70 rounded-xl flex items-center justify-center">
            ⚙️
          </span>
          Дополнительные механики
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_OPTIONS.map(opt => {
            const isSelected = inputs.selectedOptions.includes(opt.id);
            const isDisabled = opt.incompatibleWith?.some(id => inputs.selectedOptions.includes(id));

            return (
              <button
                key={opt.id}
                onClick={() => !isDisabled && toggleOption(opt.id)}
                disabled={isDisabled}
                className={`
                  flex items-start gap-4 p-5 rounded-2xl text-left
                  border transition-all duration-250
                  shadow-sm
                  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
                  ${isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-50/60 border-slate-200/40'
                    : isSelected
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-emerald-100/50'
                      : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-200 shadow-slate-200/40'
                  }
                `}
              >
                <div
                  className={`
                    text-2xl p-2 rounded-xl
                    ring-1 ring-slate-200/70
                    ${isSelected ? 'bg-emerald-50' : 'bg-slate-50'}
                  `}
                >
                  {opt.icon}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-slate-900">
                    {opt.label}
                    {opt.tier === 'premium' && (
                      <span
                        className="
                          ml-2 text-[10px] font-semibold
                          bg-amber-50 border border-amber-200
                          text-slate-900
                          px-2 py-0.5 rounded-full
                        "
                      >
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed mt-1">
                    {opt.description}
                  </div>
                </div>

                <div
                  className={`
                    w-6 h-6 rounded-full border
                    flex items-center justify-center transition-all
                    ${isSelected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white/60 border-slate-200 text-slate-700'
                    }
                  `}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 pt-6 border-t border-slate-100/80">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="
            px-8 py-4 rounded-2xl
            bg-white/70 border border-slate-200/70
            text-slate-700 font-semibold
            shadow-sm shadow-slate-200/60
            hover:bg-white
            disabled:opacity-50
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
          "
        >
          ← Назад
        </button>

        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="
            flex-1 py-4 rounded-2xl
            bg-gradient-to-r from-indigo-50 to-violet-50
            border border-indigo-200/70
            text-slate-900 text-[16px] font-semibold tracking-tight
            shadow-lg shadow-indigo-100/50
            hover:bg-white hover:shadow-xl hover:shadow-indigo-100/60
            disabled:opacity-50
            flex items-center justify-center gap-3
            transition-all duration-300
            focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
          "
        >
          {isLoading ? (
            <>
              <Spinner className="w-5 h-5" />
              <span>Генерирую идеи...</span>
            </>
          ) : (
            <>
              <span>Сгенерировать идеи</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

const IdeasStage: FC<{
  ideas: GeneratedIdea[];
  isLoading: boolean;
  onSelectIdea: (idea: GeneratedIdea) => void;
  onBack: () => void;
}> = memo(({ ideas, isLoading, onSelectIdea, onBack }) => (
  <div className="max-w-4xl mx-auto space-y-8 antialiased">
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900 font-display">
          Выберите концепцию
        </h3>
        <p className="text-slate-600 mt-1">Нажмите на карточку, которая вам нравится</p>
      </div>

      <button
        onClick={onBack}
        className="
          px-4 py-2 rounded-xl
          bg-white/60 border border-slate-200/70
          text-slate-700 font-medium
          hover:bg-white
          shadow-sm shadow-slate-200/60
          transition-all
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100
        "
      >
        ← Назад
      </button>
    </div>

    <div className="grid md:grid-cols-2 gap-5">
      {ideas.map((idea, i) => (
        <div
          key={i}
          onClick={() => !isLoading && onSelectIdea(idea)}
          className={`
            group p-6 rounded-3xl cursor-pointer
            bg-white/70 border border-slate-200/70
            shadow-sm shadow-slate-200/60
            hover:bg-white hover:shadow-lg hover:shadow-slate-200/70
            hover:-translate-y-1
            transition-all duration-300
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="
                text-xs font-semibold px-3 py-1 rounded-full
                bg-indigo-50 border border-indigo-200/60
                text-slate-900
              "
            >
              {idea.genre}
            </span>
          </div>

          <h4 className="text-xl font-semibold tracking-tight text-slate-900 font-display mb-2">
            {idea.title}
          </h4>

          <p className="text-slate-600 leading-relaxed">{idea.description}</p>

          {idea.hook && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
              <span className="text-lg">💡</span>
              <p className="text-sm text-slate-700 italic leading-relaxed">{idea.hook}</p>
            </div>
          )}

          <div className="mt-4 text-slate-700 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Выбрать эту концепцию</span>
            <span className="ml-2">→</span>
          </div>
        </div>
      ))}
    </div>
  </div>
));

const EditorStage: FC<{
  stage: 'concept' | 'architecture' | 'mechanics';
  text: string;
  isLoading: boolean;
  onTextChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
}> = memo(({ stage, text, isLoading, onTextChange, onNext, onBack }) => {
  const [mode, setMode] = React.useState<'edit' | 'preview'>('preview');
  
  const config = {
    concept: { 
      title: 'Концепция', 
      icon: '📋',
      buttonText: 'Далее: Структура',
      description: 'Общее видение и подход'
    },
    architecture: { 
      title: 'Архитектура', 
      icon: '🏗️',
      buttonText: 'Далее: Механики',
      description: 'Структура и организация'
    },
    mechanics: { 
      title: 'Механики', 
      icon: '⚙️',
      buttonText: 'Создать квиз',
      description: 'Правила и взаимодействия'
    },
  }[stage];

  useEffect(() => {
    if (!isLoading && text.trim()) setMode('preview');
  }, [isLoading, text]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-50 to-amber-50 
            flex items-center justify-center text-2xl border border-stone-100">
            {config.icon}
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-stone-800 tracking-tight">{config.title}</h3>
            <p className="text-stone-500 font-light tracking-wide">
              {isLoading ? 'AI генерирует контент...' : config.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium 
                transition-all duration-200 tracking-wide ${
                mode === 'edit' 
                  ? 'bg-white text-stone-800 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <span>✏️</span>
              <span>Редактор</span>
            </button>
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium 
                transition-all duration-200 tracking-wide ${
                mode === 'preview' 
                  ? 'bg-white text-stone-800 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <span>👁️</span>
              <span>Превью</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-white rounded-3xl border border-stone-200 overflow-hidden min-h-[400px]">
        {mode === 'edit' ? (
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full h-full bg-transparent text-stone-700 p-8 resize-none focus:outline-none 
              font-mono text-sm leading-relaxed"
            placeholder="Здесь появится сгенерированный контент..."
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full overflow-y-auto p-8">
            <div className="prose prose-stone prose-sm max-w-none 
              prose-headings:text-stone-800 prose-headings:font-semibold prose-headings:tracking-tight
              prose-p:text-stone-600 prose-p:leading-relaxed prose-p:font-light
              prose-strong:text-stone-700 prose-strong:font-semibold
              prose-code:bg-stone-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg 
              prose-code:text-stone-700 prose-code:font-normal
              prose-pre:bg-stone-50 prose-pre:border prose-pre:border-stone-100">
              {text.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text}
                </ReactMarkdown>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 py-20">
                  <div className="text-5xl mb-5">📄</div>
                  <p className="italic font-light tracking-wide">
                    {isLoading ? 'Генерация контента...' : 'Контент ещё не сгенерирован'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute bottom-5 right-5 flex items-center gap-3 bg-white/95 backdrop-blur-sm 
            px-5 py-3 rounded-full shadow-lg border border-stone-100">
            <Spinner className="w-4 h-4 text-stone-600" />
            <span className="text-sm font-medium text-stone-600 tracking-wide">AI пишет...</span>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8 shrink-0">
        <button 
          onClick={onBack}
          disabled={isLoading}
          className="px-7 py-3.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl 
            font-medium disabled:opacity-50 transition-all tracking-wide"
        >
          ← Назад
        </button>
        <button
          onClick={onNext}
          disabled={isLoading || !text.trim()}
          className="px-10 py-3.5 bg-stone-800 text-white font-semibold 
            rounded-xl shadow-lg shadow-stone-300/30 hover:bg-stone-700 hover:shadow-xl 
            disabled:opacity-50 disabled:shadow-none flex items-center gap-3 transition-all 
            duration-300 tracking-wide"
        >
          {stage === 'mechanics' && <span>🚀</span>}
          <span>{config.buttonText}</span>
          {stage !== 'mechanics' && <span>→</span>}
        </button>
      </div>
    </div>
  );
});


// ============================================================================
// Main Component
// ============================================================================

const AIQuizWizardBase: FC = () => {
  const isWizardOpen = useUIStore(s => s.isWizardOpen);
  const closeWizard = useUIStore(s => s.resetWizard);
  const setNodes = useCanvasStore(s => s.setNodes);
  const setEdges = useCanvasStore(s => s.setEdges);
  const setNeedsLayout = useCanvasStore(s => s.setNeedsLayout);
  const setGlobalTimer = useQuizDataStore(s => s.setGlobalTimer);
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const { stage, isLoading, inputs, generation } = state;
  const { cancel, createNew } = useAbortController();
  const scrollRef = useRef<HTMLDivElement>(null);

  const conceptBuffer = useTokenBuffer(useCallback((chunk) => 
    dispatch({ type: 'APPEND_TEXT', field: 'conceptText', value: chunk }), []));
  const architectureBuffer = useTokenBuffer(useCallback((chunk) => 
    dispatch({ type: 'APPEND_TEXT', field: 'architectureText', value: chunk }), []));
  const mechanicsBuffer = useTokenBuffer(useCallback((chunk) => 
    dispatch({ type: 'APPEND_TEXT', field: 'mechanicsText', value: chunk }), []));

  const stageIndex = useMemo(() => STAGES.indexOf(stage), [stage]);

  const currentText = useMemo(() => {
    if (stage === 'concept') return generation.conceptText;
    if (stage === 'architecture') return generation.architectureText;
    if (stage === 'mechanics') return generation.mechanicsText;
    return '';
  }, [stage, generation]);

  const handleTextChange = useCallback((text: string) => {
    const field = `${stage}Text` as 'conceptText' | 'architectureText' | 'mechanicsText';
    dispatch({ type: 'SET_TEXT', field, value: text });
  }, [stage]);

  const getSelectedOptionsPrompt = useCallback((): string => {
    return ALL_OPTIONS
      .filter(o => inputs.selectedOptions.includes(o.id))
      .map(o => `- ${o.label}: ${o.promptAddition}`)
      .join('\n');
  }, [inputs.selectedOptions]);

  const buildContext = useCallback((): string => {
    const parts = [
      `Topic: ${inputs.topic}`,
      inputs.goal && `Goal: ${inputs.goal}`,
      inputs.audience && `Audience: ${inputs.audience}`,
      `Format: ${inputs.format}`,
      `Questions: ${inputs.questionCount}`,
    ].filter(Boolean);
    
    if (generation.selectedIdea) {
      parts.push(`Concept: ${generation.selectedIdea.title} - ${generation.selectedIdea.description}`);
    }
    
    return parts.join('\n');
  }, [inputs, generation.selectedIdea]);

  // Scroll to top on stage change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage]);

  // ========== Generation Functions ==========

  const generateIdeas = useCallback(async () => {
    if (!inputs.topic.trim()) {
      toast.error(MESSAGES.ERRORS.TOPIC_REQUIRED);
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    const controller = createNew();

    try {
      const prompt = `Generate 4 distinct quiz concepts in Russian based on the input below.
Return ONLY a valid JSON object with this exact structure:
{
  "ideas": [
    {
      "title": "Short catchy title",
      "genre": "Genre (e.g. History, Tech, Fun)",
      "description": "One sentence description",
      "hook": "An intriguing question to start"
    }
  ]
}

Input Data:
Topic: ${inputs.topic}
Format: ${inputs.format}
${inputs.goal ? `Goal: ${inputs.goal}` : ''}
${inputs.audience ? `Audience: ${inputs.audience}` : ''}`;

      // Use AI_MODEL_JSON for better structured output reliability
      const response = await withRetry(
        () => callOpenRouter(AI_MODEL_JSON, prompt, true, controller.signal),
        { retries: 2, signal: controller.signal }
      );

      const jsonStr = extractFirstJsonObject(response) ?? response;
      let parsed;
      
      try {
          parsed = JSON.parse(jsonStr);
      } catch (e) {
          console.error("JSON Parse Error", e);
          throw new Error("Invalid JSON received from AI");
      }
      
      const rawIdeas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      
      const ideas: GeneratedIdea[] = rawIdeas.slice(0, 6).map((idea: any) => ({
        title: idea.title || 'Без названия',
        genre: idea.genre || 'Общий',
        description: idea.description || '',
        hook: idea.hook || '',
      }));
      
      if (!ideas.length) throw new Error('No ideas generated');

      dispatch({ type: 'SET_IDEAS', payload: ideas });
      dispatch({ type: 'SET_STAGE', payload: 'ideas' });
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error("Generation Error:", error);
        toast.error(MESSAGES.ERRORS.IDEAS_GENERATION_FAILED);
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [inputs, createNew]);

  const generateContentStream = useCallback(async (
    stageName: 'concept' | 'architecture' | 'mechanics', 
    prompt: string, 
    buffer: TokenBufferResult,
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const controller = createNew();
    dispatch({ type: 'SET_TEXT', field: `${stageName}Text` as any, value: '' });
    buffer.reset();

    try {
      await withRetry(
        async () => {
          await callOpenRouterStream(
            AI_MODEL_TEXT,
            prompt,
            { onToken: (t) => buffer.push(t) },
            { signal: controller.signal, temperature: 0.6 }
          );
        },
        { retries: 1, signal: controller.signal }
      );
      buffer.flush();
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        toast.error(MESSAGES.ERRORS.CONTENT_GENERATION_FAILED);
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [createNew]);

  const generateConcept = useCallback((idea: GeneratedIdea) => {
    dispatch({ type: 'SELECT_IDEA', payload: idea });
    dispatch({ type: 'SET_STAGE', payload: 'concept' });
    
    const prompt = `Напиши концепцию образовательного квиза на русском (Markdown, 150-200 слов):

Тема: ${inputs.topic}
Идея: ${idea.title} — ${idea.description}
Формат: ${inputs.format}
${inputs.goal ? `Цель: ${inputs.goal}` : ''}

Опиши:
## Образовательный результат
Что конкретно выучит/поймёт пользователь

## Роль пользователя  
Кем себя ощущает проходящий

## Ключевой конфликт
Что движет сюжетом и мотивирует проходить`;

    generateContentStream('concept', prompt, conceptBuffer);
  }, [inputs, generateContentStream, conceptBuffer]);

  const generateArchitecture = useCallback(() => {
    dispatch({ type: 'SET_STAGE', payload: 'architecture' });
    
    const prompt = `Опиши структуру квиза на русском (Markdown):

${buildContext()}

Количество вопросов: ${inputs.questionCount}
${getSelectedOptionsPrompt() ? `\nМеханики:\n${getSelectedOptionsPrompt()}` : ''}

Опиши:
## Начало
Как встречаем пользователя, какие переменные инициализируем

## Основной путь (${inputs.questionCount} вопросов)
Перечисли ключевые сцены/вопросы и их типы

## Ветвления
Где и как сюжет разветвляется

## Концовки (минимум 2)
Условия для каждой концовки`;

    generateContentStream('architecture', prompt, architectureBuffer);
  }, [inputs, buildContext, getSelectedOptionsPrompt, generateContentStream, architectureBuffer]);

  const generateMechanics = useCallback(() => {
    dispatch({ type: 'SET_STAGE', payload: 'mechanics' });
    
    const prompt = `Опиши игровые механики квиза на русском (Markdown):

${buildContext()}

Опиши:
## Переменные
| Название | Тип | Начальное значение | Назначение |
|----------|-----|-------------------|------------|

## Система подсчёта
Как меняется score, какие действия дают/отнимают баллы

## Условия ветвлений
Какие проверки переменных определяют путь

## Обратная связь
Как реагируем на правильные/неправильные ответы`;

    generateContentStream('mechanics', prompt, mechanicsBuffer);
  }, [buildContext, generateContentStream, mechanicsBuffer]);

  const generateFinalQuiz = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const toastId = toast.loading(MESSAGES.LOADING.BUILDING_QUIZ);
    const controller = createNew();

    try {
      const optionsPrompt = getSelectedOptionsPrompt();
      
      const prompt = `${PLATFORM_CONTEXT}

Specification:
${buildContext()}

${optionsPrompt ? `Additional mechanics:\n${optionsPrompt}` : ''}

Requirements:
- Exactly ${inputs.questionCount} question nodes (questionNode or multipleChoiceNode)
- Minimum 2 resultNodes (good/bad ending)
- All nodes connected via edges
- For questionNode: each answer.id must match an edge's sourceHandle
- For multipleChoiceNode: edges must use sourceHandle "correct" or "incorrect"
- Use Russian language for all content

Generate ONLY valid JSON: {"nodes":[...],"edges":[...]}`;

      let response: string;
      try {
        response = await callOpenRouter(AI_MODEL_JSON, prompt, true, controller.signal);
      } catch (e) {
        console.warn('Retrying with simpler prompt...');
        const simplePrompt = `Create quiz JSON. Topic: ${inputs.topic}. ${inputs.questionCount} questions. 
Format: {"nodes":[{"id":"start","type":"startNode","position":{"x":400,"y":50},"data":{"label":"Start"}}...],"edges":[...]}
Use Russian. Include resultNode at end.`;
        response = await callOpenRouter(AI_MODEL_JSON, simplePrompt, true, controller.signal);
      }

      const { data } = await parseJsonWithRepair<{ nodes: any[]; edges: any[] }>(response, controller.signal);
      
      let rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
      let rawEdges = Array.isArray(data?.edges) ? data.edges : [];

      if (!rawNodes.length) throw new Error('AI не вернул узлы');

      // ========== Graph Normalization Pipeline ==========
      let nodes = normalizeNodes(rawNodes);
      nodes = ensureStartNode(nodes);
      
      let edges = normalizeEdges(rawEdges, nodes);
      edges = addMissingAnswerEdges(nodes, edges);
      edges = ensureStartEdge(nodes, edges);
      edges = ensureGraphConnectivity(nodes, edges);
      
      const withResults = ensureResultNodes(nodes, edges);
      nodes = withResults.nodes;
      edges = withResults.edges;
      
      // Clean internal properties
      nodes = cleanNodes(nodes);

      // Validate
      const validation = validateGraph(nodes, edges);
      if (!validation.isValid) {
        console.warn('Graph issues:', validation.issues);
      }

      // Apply to store
      setNodes(nodes);
      setEdges(edges);
      setGlobalTimer({ enabled: false, duration: 0, onTimeoutNodeId: null });
      setNeedsLayout(true);

      toast.success(MESSAGES.SUCCESS.QUIZ_CREATED);
      dispatch({ type: 'RESET' });
      closeWizard();

    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Quiz generation error:', error);
        toast.error(MESSAGES.ERRORS.FINAL_GENERATION_FAILED);
      }
    } finally {
      toast.dismiss(toastId);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [inputs, buildContext, getSelectedOptionsPrompt, createNew, setNodes, setEdges, setGlobalTimer, setNeedsLayout, closeWizard]);

  // ========== Navigation ==========

  const goBack = useCallback(() => {
    cancel();
    const transitions: Record<WizardStage, WizardStage | null> = {
      settings: 'topic',
      ideas: 'settings',
      concept: 'ideas',
      architecture: 'concept',
      mechanics: 'architecture',
      topic: null,
    };
    const next = transitions[stage];
    if (next) dispatch({ type: 'SET_STAGE', payload: next });
  }, [stage, cancel]);

  const goNext = useCallback(() => {
    if (stage === 'concept') generateArchitecture();
    else if (stage === 'architecture') generateMechanics();
    else if (stage === 'mechanics') generateFinalQuiz();
  }, [stage, generateArchitecture, generateMechanics, generateFinalQuiz]);

  const handleClose = useCallback(() => {
    cancel();
    dispatch({ type: 'RESET' });
    closeWizard();
  }, [cancel, closeWizard]);

  const handleUpdate = useCallback((field: keyof WizardState['inputs'], value: any) => {
    dispatch({ type: 'UPDATE_INPUT', field, value });
  }, []);

  // ========== Render ==========

  if (!isWizardOpen) return null;

  const isEditorStage = stage === 'concept' || stage === 'architecture' || stage === 'mechanics';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[90vh] bg-[#f8fafc] rounded-3xl shadow-2xl border border-slate-200/60 flex flex-col overflow-hidden">
        <WizardHeader 
          isLoading={isLoading}
          currentStageIndex={stageIndex}
          stageName={STAGE_LABELS[stage]}
          onCancel={cancel}
          onClose={handleClose}
        />
        
        <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          {stage === 'topic' && (
            <TopicStage 
              inputs={inputs}
              onUpdate={handleUpdate}
              onSubmit={() => dispatch({ type: 'SET_STAGE', payload: 'settings' })}
            />
          )}
          
          {stage === 'settings' && (
            <SettingsStage 
              inputs={inputs}
              onUpdate={handleUpdate}
              onSubmit={generateIdeas}
              onBack={goBack}
              isLoading={isLoading}
            />
          )}
          
          {stage === 'ideas' && (
            <IdeasStage 
              ideas={generation.ideas}
              isLoading={isLoading}
              onSelectIdea={generateConcept}
              onBack={goBack}
            />
          )}
          
          {isEditorStage && (
            <EditorStage 
              stage={stage as 'concept' | 'architecture' | 'mechanics'}
              text={currentText}
              isLoading={isLoading}
              onTextChange={handleTextChange}
              onNext={goNext}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const AIQuizWizard = memo(AIQuizWizardBase);

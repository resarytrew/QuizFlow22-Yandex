
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
- infoNode: { label, title, description, imageUrl, buttonText }
- dialogueNode: { label, characterName, characterRole, dialogueText, mood, buttonText }
- questionNode: { label, question, answers: [{id, text, isCorrect?}], imageUrl } (Visual: single choice buttons)
- multipleChoiceNode: { label, question, answers: [{id, text}], correctOptions: [id_string], minSelections, maxSelections, imageUrl } (Visual: checkboxes. Logic: strictly matches correctOptions)
- textInputNode: { label, question, keyword, acceptedAnswers?: [string], imageUrl } (Logic: checks exact accepted answer / keyword)
- matchingNode: { label, question, leftColumn: [{id,text}], rightColumn: [{id,text}], correctPairs: [{leftId,rightId}], imageUrl }
- timelineNode: { label, question, events: [{id,text}], imageUrl } (events must be listed in correct order)
- conditionNode: { label, variable, operator, value } (Ops: eq, neq, gt, lt, gte, lte)
- variableNode: { variableName, operation, value } (Ops: set, add, subtract)
- scoreNode: { operation, value } (Ops: add, subtract, set)
- formulaNode: { variableName, expression, decimalPlaces } (Mathjs expression, e.g. "a + b")
- allocatorNode: { label, question, maxTotal, requireExactTotal, items: [{id, label, variableName, defaultValue?}] } (Sliders)
- collectInfoNode: { label, title, description, fields: [{id, label, type, variableName}] } (Forms. Use variableName='playerName' to enable {{playerName}} personalization later)
- achievementNode: { title, description, imageUrl } (Popup reward notification)
- feedbackNode: { title, message, explanation, imageUrl }
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
6. progressionNode may use "levelUp" plus default null.
7. All other nodes (startNode, infoNode, dialogueNode, scoreNode, variableNode, formulaNode, achievementNode, collectInfoNode, allocatorNode, etc.): "sourceHandle" is null.

General Rules:
- First node: {"id":"start","type":"startNode","position":{"x":400,"y":50},"data":{"label":"Start"}}
- Every node needs: id, type, position:{x,y}, data:{...}
- Edges: {"id":"e1","source":"nodeId","target":"nodeId","sourceHandle":...}
- Never create answer choices as separate nodes. Put answer options inside questionNode.data.answers or multipleChoiceNode.data.answers.
- Must have at least 2 resultNodes at the end (e.g. Success/Failure).
- All nodes must be reachable from start.
- If you use collectInfoNode, set variableName to "playerName". Then use {{playerName}} in subsequent nodes (text, questions, results) to address the user by name.
`.trim();

const PREMIUM_QUALITY_CONTRACT = `
Premium quality bar:
- Build a finished educational product, not a draft. No placeholders, generic "Question 1", vague facts, or repeated answer patterns.
- Use the platform broadly. Prefer a mix of questionNode, multipleChoiceNode, matchingNode, timelineNode, textInputNode, dialogueNode, feedbackNode, achievementNode, variableNode, scoreNode, conditionNode, formulaNode/allocatorNode when relevant.
- Every selected option is mandatory. If an option says "secret branch", the graph must contain a real secret branch with conditionNode, hidden trigger, unique content, and a distinct reward/result.
- Wrong answers should teach: send them through feedbackNode or explanation before continuing when possible.
- Endings must feel authored: each resultNode has a different title, tone, diagnosis, and recommendation.
- Branches must be meaningful: choices should change score, variables, feedback, difficulty, or ending.
- Content must be specific to the topic and audience, with concrete examples, not generic motivational copy.
`.trim();

const OPTION_IMPLEMENTATION_CONTRACT: Record<string, string> = {
  secret_branch: [
    'MUST implement secret_branch as a real hidden path.',
    'Required graph evidence: conditionNode checking variable "secretKey"; a hidden answer/choice or hard-to-spot trigger that sets secretKey="found"; secret dialogue/info; achievementNode; distinct secret resultNode or return path.',
  ].join(' '),
  bonus_branch: 'MUST implement bonus_branch with a score/variable condition, extra challenge or explanation, achievementNode, and branch back or special result.',
  multiple_endings: 'MUST create at least 4 distinct resultNode endings and route to them via score/variable conditions.',
  lives_system: 'MUST initialize variable "lives"=3 and subtract lives on incorrect paths using edge effects or variableNode. Include failure route for lives <= 0.',
  hint_system: 'MUST initialize variable "hints"=3 and include at least one hint/feedback path that consumes or references hints.',
  relaxed_mode: 'MUST avoid punitive dead ends. Incorrect answers explain and continue learning.',
  storytelling_mode: 'MUST include recurring character/dialogueNode scenes and a coherent narrative role for the learner.',
  adaptive_difficulty: 'MUST track "streak" or skill variables and route strong users to harder questions.',
  difficulty_choice: 'MUST include an early difficulty choice with Easy/Medium/Hard branches.',
  humor_mode: 'MUST use light humor in feedback and result copy without reducing factual precision.',
  academic_mode: 'MUST use precise academic wording, definitions, and evidence-based explanations.',
};

const FINAL_JSON_SIZE_RULES = `
Output budget rules:
- Keep JSON compact. No Markdown. No comments. No duplicate prose.
- Keep title/question/answer fields concise: 6-16 words where possible.
- Keep descriptions/messages under 180 characters unless the node is a final result.
- Prefer graph mechanics over long text. The frontend will enrich mandatory mechanics after parsing.
`.trim();

const getDomainExpertiseContract = (topic: string, format: string, audience?: string): string => {
  const source = `${topic} ${format} ${audience ?? ''}`.toLowerCase();
  const includesAny = (needles: string[]) => needles.some(needle => source.includes(needle));

  let domainRole = 'a senior subject-matter expert in the quiz topic';
  let domainStandards = [
    'Use accurate terminology, causal models, and concrete examples from the discipline.',
    'Questions must test understanding, transfer, and decision quality, not memorization only.',
  ];

  if (includesAny(['финанс', 'деньг', 'бюджет', 'эконом', 'инвест', 'кредит', 'налог', 'банк', 'доход', 'расход'])) {
    domainRole = 'a professional economist, financial literacy educator, behavioral economist, and personal finance advisor';
    domainStandards = [
      'Use real financial concepts: budget constraint, income vs expenses, cash flow, liquidity, inflation, compound interest, risk-return tradeoff, debt burden, opportunity cost, diversification, emergency fund, taxes, financial goals.',
      'Each wrong answer should represent a realistic financial misconception: confusing revenue with profit, ignoring recurring costs, overusing credit, underestimating inflation, chasing high returns without risk, treating all debt as equal.',
      'Scenarios should force decisions under constraints: limited budget, uncertainty, time horizon, needs vs wants, short-term temptation vs long-term stability.',
      'Avoid shallow textbook questions like "what is money" unless they are embedded in a practical decision.',
    ];
  } else if (includesAny(['истор', 'войн', 'революц', 'импер', 'ссср', 'древн', 'средневек'])) {
    domainRole = 'a professional historian, source critic, and history teacher';
    domainStandards = [
      'Use chronology, causality, historical context, actors, motives, consequences, and source reliability.',
      'Wrong answers should be plausible historical misconceptions, anachronisms, or oversimplified causal claims.',
      'Scenarios should ask the learner to interpret evidence, compare motives, and evaluate consequences.',
    ];
  } else if (includesAny(['матем', 'алгебр', 'геометр', 'физик', 'хим', 'биолог', 'наук'])) {
    domainRole = 'a professional STEM teacher and assessment designer';
    domainStandards = [
      'Use conceptual models, formulas only when meaningful, units, assumptions, and error analysis.',
      'Wrong answers should reveal common misconceptions or calculation traps.',
      'Scenarios should require applying concepts to unfamiliar examples, not repeating definitions.',
    ];
  } else if (includesAny(['язык', 'литерат', 'текст', 'русск', 'англ', 'эссе'])) {
    domainRole = 'a language/literature teacher, editor, and reading-comprehension assessment designer';
    domainStandards = [
      'Use interpretation, argument, evidence from text, style, tone, genre, and author intent.',
      'Wrong answers should be plausible misreadings or unsupported interpretations.',
      'Scenarios should ask the learner to justify meaning and notice nuance.',
    ];
  }

  return `
Expert panel requirement:
- Write as ${domainRole}.
- Also act as an instructional designer, assessment designer, game designer, and sharp Russian-language editor.
- Use professional domain depth. Do not make generic school-test content.
- Every quiz must include: realistic scenario, expert vocabulary explained through context, common misconceptions, meaningful feedback, and decisions with consequences.
- Domain standards:
${domainStandards.map(item => `  - ${item}`).join('\n')}
- Gamification must serve learning: mechanics should reveal mastery, risk, strategy, misconception, or progression.
- Final results must diagnose learner profile and recommend a next learning action.
`.trim();
};

const MINIMAL_GRAPH_CONTEXT = `
Return ONLY valid compact JSON: {"nodes":[],"edges":[]}
Allowed node types:
startNode, infoNode, dialogueNode, questionNode, multipleChoiceNode, textInputNode, matchingNode, timelineNode, collectInfoNode, feedbackNode, resultNode, scoreNode, variableNode, conditionNode, achievementNode.
Rules:
- First node id must be "start", type "startNode".
- Every node: id,type,position:{x,y},data.
- Every edge: id,source,target,sourceHandle.
- questionNode edges use answer ids as sourceHandle.
- multipleChoiceNode/textInputNode/matchingNode/timelineNode use "correct" and "incorrect".
- conditionNode uses "true" and "false".
- Other nodes use null sourceHandle.
- Never create separate nodes named choice1_A/choice1_B. Answer choices belong inside data.answers.
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
  data?: {
    effects?: Array<{
      variableName: string;
      op: 'set' | 'add' | 'subtract';
      value: string | number;
    }>;
  };
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

const indexedTextFromRecord = (record: Record<string, any>): string | null => {
  const numericKeys = Object.keys(record)
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));
  if (!numericKeys.length) return null;
  return numericKeys.map(key => String(record[key] ?? '')).join('').trim() || null;
};

const extractDataText = (data: unknown): string | null => {
  if (typeof data === 'string') return data.trim() || null;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return indexedTextFromRecord(data as Record<string, any>);
  }
  return null;
};

const parseInlineAnswers = (text: string): { question: string; answers: Array<{ id: string; text: string }> } | null => {
  const matches = [...text.matchAll(/(?:^|[\s;])([A-HА-З])\)\s*([^;]+)/g)];
  if (matches.length < 2) return null;

  const firstOptionIndex = matches[0].index ?? -1;
  const question = firstOptionIndex > 0
    ? text.slice(0, firstOptionIndex).replace(/[:;,\s-]+$/, '').trim()
    : text.trim();
  const answers = matches.map((match, index) => ({
    id: String(index + 1),
    text: String(match[2] ?? '').trim(),
  })).filter(answer => answer.text);

  return answers.length >= 2 ? { question: question || text, answers } : null;
};

const coerceNodeData = (type: string, rawData: unknown): Record<string, any> => {
  const rawObject = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? rawData as Record<string, any>
    : null;
  const text = extractDataText(rawData);

  if (!text) {
    return rawObject ? { ...rawObject } : {};
  }

  const withoutIndexedChars = rawObject
    ? Object.fromEntries(Object.entries(rawObject).filter(([key]) => !/^\d+$/.test(key)))
    : {};
  const parsedQuestion = parseInlineAnswers(text);

  if (type === 'startNode') {
    return { ...withoutIndexedChars, label: withoutIndexedChars.label ?? text };
  }

  if (type === 'resultNode') {
    return {
      ...withoutIndexedChars,
      label: withoutIndexedChars.label ?? 'Результат',
      title: withoutIndexedChars.title ?? text,
      description: withoutIndexedChars.description ?? text,
      showScore: withoutIndexedChars.showScore ?? true,
    };
  }

  if (type === 'infoNode' || type === 'dialogueNode' || type === 'feedbackNode' || type === 'achievementNode') {
    return {
      ...withoutIndexedChars,
      label: withoutIndexedChars.label ?? text,
      title: withoutIndexedChars.title ?? text.replace(/\?$/, ''),
      description: withoutIndexedChars.description ?? text,
      message: withoutIndexedChars.message ?? (type === 'feedbackNode' ? text : undefined),
    };
  }

  if ((type === 'questionNode' || type === 'multipleChoiceNode') && parsedQuestion) {
    return {
      ...withoutIndexedChars,
      label: withoutIndexedChars.label ?? parsedQuestion.question,
      question: withoutIndexedChars.question ?? parsedQuestion.question,
      answers: withoutIndexedChars.answers ?? parsedQuestion.answers,
      ...(type === 'multipleChoiceNode' && !withoutIndexedChars.correctOptions
        ? { correctOptions: [parsedQuestion.answers[0]?.id].filter(Boolean), minSelections: 1, maxSelections: 1 }
        : {}),
    };
  }

  if (type === 'textInputNode') {
    return {
      ...withoutIndexedChars,
      label: withoutIndexedChars.label ?? text,
      question: withoutIndexedChars.question ?? text,
      keyword: withoutIndexedChars.keyword ?? '',
    };
  }

  return {
    ...withoutIndexedChars,
    label: withoutIndexedChars.label ?? text,
    title: withoutIndexedChars.title ?? text,
  };
};

const normalizeNodes = (rawNodes: unknown[]): QuizNode[] => {
  return rawNodes.map((node: unknown, index: number) => {
    const n = node as Partial<QuizNode>;
    const originalId = typeof n?.id === 'string' && n.id.trim() ? n.id : `node-${index}`;
    const normalizedId = originalId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let type = typeof n?.type === 'string' && n.type ? n.type : 'infoNode';
    const rawText = extractDataText(n?.data);
    if (type === 'multipleChoiceNode' && rawText && /^[A-HА-З]\)/.test(rawText.trim()) && !parseInlineAnswers(rawText)) {
      type = 'infoNode';
    }
    const pos = n?.position ?? { x: 400, y: 100 + index * DEFAULT_NODE_Y_STEP };
    
    return {
      id: normalizedId,
      type,
      position: {
        x: clamp(typeof pos.x === 'number' ? pos.x : 400, MIN_NODE_X, MAX_NODE_X),
        y: typeof pos.y === 'number' ? pos.y : 100 + index * DEFAULT_NODE_Y_STEP
      },
      data: { label: type, ...coerceNodeData(type, n?.data) },
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
      sourceHandle: e.sourceHandle ?? null,
      data: e.data,
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
      if (reachable.has(prevNode.id) && prevNode.type !== 'resultNode') {
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

const addMissingOutcomeEdges = (nodes: QuizNode[], edges: QuizEdge[]): QuizEdge[] => {
  const outcomeTypes = new Set(['multipleChoiceNode', 'textInputNode', 'matchingNode', 'timelineNode']);
  const resultNodes = nodes.filter(n => n.type === 'resultNode');
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const existingEdges = new Set(edges.map(e => `${e.source}:${e.sourceHandle || 'default'}`));
  const newEdges = [...edges];

  nodes.forEach((node) => {
    if (!outcomeTypes.has(node.type)) return;

    const currentY = node.position.y;
    const nextNodes = sortedNodes.filter(n => n.position.y > currentY && n.id !== node.id);
    const successTarget = nextNodes.find(n => n.type !== 'resultNode') ?? resultNodes[0] ?? nextNodes[0];
    const failureTarget = nextNodes.find(n => n.type === 'feedbackNode') ?? resultNodes[1] ?? resultNodes[0] ?? successTarget;

    ([
      ['correct', successTarget],
      ['incorrect', failureTarget],
    ] as const).forEach(([handle, target]) => {
      const edgeKey = `${node.id}:${handle}`;
      if (existingEdges.has(edgeKey) || !target) return;

      newEdges.push({
        id: `outcome-edge-${node.id}-${handle}`,
        source: node.id,
        target: target.id,
        sourceHandle: handle,
      });
      existingEdges.add(edgeKey);
    });
  });

  return newEdges;
};

const normalizeNodeSemantics = (nodes: QuizNode[]): QuizNode[] => {
  return nodes.map((node) => {
    if (node.type === 'questionNode' && Array.isArray(node.data?.answers)) {
      const correctAnswers = node.data.answers.filter((answer: any) => answer?.isCorrect === true);
      if (correctAnswers.length > 1) {
        return {
          ...node,
          type: 'multipleChoiceNode',
          data: {
            ...node.data,
            correctOptions: correctAnswers.map((answer: any) => String(answer.id)),
            minSelections: correctAnswers.length,
            maxSelections: correctAnswers.length,
          },
        };
      }
    }

    if (node.type === 'matchingNode' && Array.isArray(node.data?.correctPairs)) {
      const normalizedPairs = node.data.correctPairs
        .map((pair: any) => {
          if (pair && typeof pair === 'object' && pair.leftId && pair.rightId) return pair;
          if (typeof pair === 'string') {
            const [leftId, rightId] = pair.split(/[-:|>]/).map(part => part.trim()).filter(Boolean);
            if (leftId && rightId) return { leftId, rightId };
          }
          return null;
        })
        .filter(Boolean);

      return {
        ...node,
        data: {
          ...node.data,
          correctPairs: normalizedPairs,
        },
      };
    }

    return node;
  });
};

const addAssessmentEdgeEffects = (nodes: QuizNode[], edges: QuizEdge[]): QuizEdge[] => {
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  return edges.map((edge) => {
    const source = nodeById.get(edge.source);
    if (!source) return edge;

    if (source.type === 'questionNode') {
      const answer = Array.isArray(source.data?.answers)
        ? source.data.answers.find((item: any) => String(item.id) === String(edge.sourceHandle))
        : null;
      if (!answer) return edge;
      if (answer.isCorrect === true) {
        return addEdgeEffect(
          addEdgeEffect(edge, { variableName: 'score', op: 'add', value: 10 }),
          { variableName: 'streak', op: 'add', value: 1 },
        );
      }
      return addEdgeEffect(edge, { variableName: 'streak', op: 'set', value: 0 });
    }

    if (['multipleChoiceNode', 'textInputNode', 'matchingNode', 'timelineNode'].includes(source.type)) {
      if (edge.sourceHandle === 'correct') {
        return addEdgeEffect(
          addEdgeEffect(edge, { variableName: 'score', op: 'add', value: 10 }),
          { variableName: 'streak', op: 'add', value: 1 },
        );
      }
      if (edge.sourceHandle === 'incorrect') {
        return addEdgeEffect(edge, { variableName: 'streak', op: 'set', value: 0 });
      }
    }

    return edge;
  });
};

const uniqueNodeId = (nodes: QuizNode[], base: string): string => {
  const ids = new Set(nodes.map(n => n.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
};

const maxNodeY = (nodes: QuizNode[]): number => Math.max(50, ...nodes.map(n => n.position.y));

const makeNode = (
  nodes: QuizNode[],
  baseId: string,
  type: string,
  position: { x: number; y: number },
  data: Record<string, any>,
): QuizNode => ({
  id: uniqueNodeId(nodes, baseId),
  type,
  position,
  data: { label: data.label ?? data.title ?? type, ...data },
});

const makeEdge = (
  id: string,
  source: string,
  target: string,
  sourceHandle: string | null = null,
  data?: QuizEdge['data'],
): QuizEdge => ({ id, source, target, sourceHandle, ...(data ? { data } : {}) });

const findStartNode = (nodes: QuizNode[]): QuizNode | undefined =>
  nodes.find(n => n.id === 'start' || n.type === 'startNode');

const insertChainAfterStart = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  chain: QuizNode[],
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (!chain.length) return { nodes, edges };

  const startNode = findStartNode(nodes);
  if (!startNode) return { nodes: [...nodes, ...chain], edges };

  const startEdgeIndex = edges.findIndex(e => e.source === startNode.id && (e.sourceHandle ?? null) === null);
  const originalStartEdge = startEdgeIndex >= 0 ? edges[startEdgeIndex] : null;
  const fallbackTarget = nodes.find(n => n.id !== startNode.id && n.type !== 'resultNode')?.id ?? null;
  const targetAfterChain = originalStartEdge?.target ?? fallbackTarget;
  const nextEdges = startEdgeIndex >= 0
    ? edges.filter((_, index) => index !== startEdgeIndex)
    : [...edges];

  nextEdges.push(makeEdge(`edge-${startNode.id}-${chain[0].id}`, startNode.id, chain[0].id));
  chain.slice(0, -1).forEach((node, index) => {
    nextEdges.push(makeEdge(`edge-${node.id}-${chain[index + 1].id}`, node.id, chain[index + 1].id));
  });
  if (targetAfterChain && targetAfterChain !== chain[chain.length - 1].id) {
    nextEdges.push(makeEdge(`edge-${chain[chain.length - 1].id}-${targetAfterChain}`, chain[chain.length - 1].id, targetAfterChain));
  }

  return { nodes: [...nodes, ...chain], edges: nextEdges };
};

const ensureVariableInit = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  variableName: string,
  value: string | number,
  label: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  const exists = nodes.some(n => n.type === 'variableNode' && n.data?.variableName === variableName);
  if (exists) return { nodes, edges };

  const node = makeNode(nodes, `init-${variableName}`, 'variableNode', { x: 220, y: 120 }, {
    label,
    variableName,
    operation: 'set',
    value,
  });

  return insertChainAfterStart(nodes, edges, [node]);
};

const addEdgeEffect = (
  edge: QuizEdge,
  effect: { variableName: string; op: 'set' | 'add' | 'subtract'; value: string | number },
): QuizEdge => {
  const effects = edge.data?.effects ?? [];
  const hasSame = effects.some(e =>
    e.variableName === effect.variableName && e.op === effect.op && e.value === effect.value,
  );
  if (hasSame) return edge;
  return {
    ...edge,
    data: {
      ...(edge.data ?? {}),
      effects: [...effects, effect],
    },
  };
};

const ensureStoryIntro = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (nodes.some(n => n.type === 'dialogueNode')) return { nodes, edges };

  const node = makeNode(nodes, 'ai-story-mentor', 'dialogueNode', { x: 420, y: 160 }, {
    label: 'Наставник',
    characterName: 'Наставник',
    characterRole: 'проводник по сценарию',
    mood: 'mysterious',
    dialogueText: `Перед тобой не тест, а маршрут по теме "${topic}". Решения будут менять траекторию, подсказки и финал.`,
    buttonText: 'Начать путь',
  });

  return insertChainAfterStart(nodes, edges, [node]);
};

const ensureHintSystem = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  let result = ensureVariableInit(nodes, edges, 'hints', 3, 'Подсказки');
  if (result.nodes.some(n => n.id.startsWith('ai-hint-'))) return result;

  const node = makeNode(result.nodes, 'ai-hint-card', 'feedbackNode', { x: 640, y: 190 }, {
    label: 'Система подсказок',
    title: 'Подсказка доступна',
    message: `Если застрянешь на теме "${topic}", ищи обучающие намеки в обратной связи. Подсказки ограничены, поэтому выбирай внимательно.`,
    explanation: 'Подсказка не дает готовый ответ, а показывает принцип рассуждения.',
    buttonText: 'Понятно',
  });

  result = insertChainAfterStart(result.nodes, result.edges, [node]);
  return {
    nodes: result.nodes,
    edges: result.edges.map(edge => {
      if (edge.sourceHandle !== 'incorrect') return edge;
      return addEdgeEffect(edge, { variableName: 'hints', op: 'subtract', value: 1 });
    }),
  };
};

const ensureLivesSystem = (
  nodes: QuizNode[],
  edges: QuizEdge[],
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  let result = ensureVariableInit(nodes, edges, 'lives', 3, 'Жизни');
  result = {
    nodes: result.nodes,
    edges: result.edges.map(edge => {
      if (edge.sourceHandle !== 'incorrect') return edge;
      return addEdgeEffect(edge, { variableName: 'lives', op: 'subtract', value: 1 });
    }),
  };

  if (!result.nodes.some(n => n.id.startsWith('ai-lives-empty'))) {
    const resultIds = new Set(result.nodes.filter(n => n.type === 'resultNode').map(n => n.id));
    const edgeIndex = result.edges.findIndex(e => resultIds.has(e.target) && !resultIds.has(e.source));
    const node = makeNode(result.nodes, 'ai-lives-empty-result', 'resultNode', { x: 1120, y: maxNodeY(result.nodes) + 180 }, {
      label: 'Жизни закончились',
      title: 'Ресурс исчерпан',
      description: 'Ошибки накопились быстрее, чем стратегия успела укрепиться. Повтори ключевые блоки и попробуй пройти маршрут заново.',
      showScore: true,
    });
    const condition = makeNode([...result.nodes, node], 'ai-lives-gate', 'conditionNode', { x: 1020, y: maxNodeY(result.nodes) + 40 }, {
      label: 'Проверка жизней',
      variable: 'lives',
      operator: 'lte',
      value: 0,
    });
    if (edgeIndex >= 0) {
      const original = result.edges[edgeIndex];
      const nextEdges = result.edges.filter((_, index) => index !== edgeIndex);
      nextEdges.push(
        makeEdge(original.id, original.source, condition.id, original.sourceHandle ?? null, original.data),
        makeEdge(`edge-${condition.id}-${node.id}`, condition.id, node.id, 'true'),
        makeEdge(`edge-${condition.id}-${original.target}`, condition.id, original.target, 'false'),
      );
      result = { nodes: [...result.nodes, condition, node], edges: nextEdges };
    } else {
      result = { nodes: [...result.nodes, condition, node], edges: result.edges };
    }
  }

  return result;
};

const ensureSecretBranch = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (nodes.some(n => n.id.startsWith('ai-secret-') || n.data?.variable === 'secretKey')) {
    return { nodes, edges };
  }

  let nextNodes = nodes;
  let nextEdges = edges;
  let source = nextNodes.find(n => n.type === 'questionNode' && Array.isArray(n.data?.answers)) as QuizNode | undefined;

  if (!source) {
    const question = makeNode(nextNodes, 'ai-secret-entry-question', 'questionNode', { x: 400, y: 220 }, {
      label: 'Скрытая развилка',
      question: `Какая деталь в теме "${topic}" может открыть дополнительный путь?`,
      answers: [
        { id: 'main_path', text: 'Идти по основному маршруту' },
        { id: 'secret_answer', text: 'Проверить скрытую закономерность' },
      ],
    });
    ({ nodes: nextNodes, edges: nextEdges } = insertChainAfterStart(nextNodes, nextEdges, [question]));
    source = question;
  }

  const secretAnswerId = 'secret_answer';
  const answers = Array.isArray(source.data.answers) ? source.data.answers : [];
  if (!answers.some((answer: any) => answer.id === secretAnswerId)) {
    source.data.answers = [
      ...answers,
      { id: secretAnswerId, text: 'Заметить скрытую закономерность' },
    ];
  }

  const normalTarget = nextEdges.find(e => e.source === source!.id && e.sourceHandle !== secretAnswerId)?.target
    ?? nextNodes.find(n => n.type !== 'resultNode' && n.id !== source!.id)?.id
    ?? nextNodes.find(n => n.type === 'resultNode')?.id;
  const y = maxNodeY(nextNodes) + 180;
  const gate = makeNode(nextNodes, 'ai-secret-gate', 'conditionNode', { x: 980, y }, {
    label: 'Проверка секретного ключа',
    variable: 'secretKey',
    operator: 'eq',
    value: 'found',
  });
  const dialogue = makeNode([...nextNodes, gate], 'ai-secret-dialogue', 'dialogueNode', { x: 980, y: y + 150 }, {
    label: 'Секретная сцена',
    characterName: 'Хранитель маршрута',
    characterRole: 'секретная ветка',
    mood: 'mysterious',
    dialogueText: `Ты заметил скрытую связь в теме "${topic}". Теперь доступен путь для тех, кто смотрит глубже обычного теста.`,
    buttonText: 'Войти в секретную ветку',
  });
  const info = makeNode([...nextNodes, gate, dialogue], 'ai-secret-insight', 'infoNode', { x: 980, y: y + 300 }, {
    label: 'Секретное объяснение',
    title: 'Скрытая закономерность',
    description: `Этот блок раскрывает дополнительный контекст по теме "${topic}" и связывает разрозненные факты в одну причинно-следственную цепочку.`,
  });
  const achievement = makeNode([...nextNodes, gate, dialogue, info], 'ai-secret-achievement', 'achievementNode', { x: 980, y: y + 450 }, {
    label: 'Достижение',
    title: 'Секретная ветка найдена',
    description: 'Игрок открыл дополнительный маршрут и получил расширенную интерпретацию материала.',
  });
  const result = makeNode([...nextNodes, gate, dialogue, info, achievement], 'ai-secret-result', 'resultNode', { x: 980, y: y + 620 }, {
    label: 'Секретный финал',
    title: 'Секретный финал',
    description: 'Ты прошел не только проверку знаний, но и нашел скрытую логику сценария. Это премиальный маршрут для внимательных.',
    showScore: true,
  });

  nextNodes = [...nextNodes, gate, dialogue, info, achievement, result];
  nextEdges = nextEdges.filter(e => !(e.source === source!.id && e.sourceHandle === secretAnswerId));
  nextEdges.push(
    makeEdge(`edge-${source.id}-${gate.id}`, source.id, gate.id, secretAnswerId, {
      effects: [{ variableName: 'secretKey', op: 'set', value: 'found' }],
    }),
    makeEdge(`edge-${gate.id}-${dialogue.id}`, gate.id, dialogue.id, 'true'),
    makeEdge(`edge-${gate.id}-${normalTarget ?? result.id}`, gate.id, normalTarget ?? result.id, 'false'),
    makeEdge(`edge-${dialogue.id}-${info.id}`, dialogue.id, info.id),
    makeEdge(`edge-${info.id}-${achievement.id}`, info.id, achievement.id),
    makeEdge(`edge-${achievement.id}-${result.id}`, achievement.id, result.id),
  );

  return { nodes: nextNodes, edges: nextEdges };
};

const ensureBonusBranch = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (nodes.some(n => n.id.startsWith('ai-bonus-'))) return { nodes, edges };

  const resultIds = new Set(nodes.filter(n => n.type === 'resultNode').map(n => n.id));
  const edgeIndex = edges.findIndex(e => resultIds.has(e.target) && !resultIds.has(e.source));
  if (edgeIndex < 0) return { nodes, edges };

  const original = edges[edgeIndex];
  const y = maxNodeY(nodes) + 180;
  const condition = makeNode(nodes, 'ai-bonus-score-gate', 'conditionNode', { x: 760, y }, {
    label: 'Бонусная проверка',
    variable: 'score',
    operator: 'gte',
    value: 80,
  });
  const info = makeNode([...nodes, condition], 'ai-bonus-insight', 'infoNode', { x: 760, y: y + 150 }, {
    label: 'Бонусный материал',
    title: 'Бонусная ветка',
    description: `Высокий результат открыл расширенный блок по теме "${topic}": здесь игрок получает более глубокое объяснение и дополнительный вывод.`,
  });
  const achievement = makeNode([...nodes, condition, info], 'ai-bonus-achievement', 'achievementNode', { x: 760, y: y + 300 }, {
    label: 'Бонус',
    title: 'Бонус открыт',
    description: 'Игрок набрал достаточно очков для продвинутого маршрута.',
  });
  const result = makeNode([...nodes, condition, info, achievement], 'ai-bonus-result', 'resultNode', { x: 760, y: y + 460 }, {
    label: 'Бонусный финал',
    title: 'Продвинутый результат',
    description: 'Ты прошел основной материал на высоком уровне и открыл расширенную траекторию.',
    showScore: true,
  });

  const nextEdges = edges.filter((_, index) => index !== edgeIndex);
  nextEdges.push(
    makeEdge(original.id, original.source, condition.id, original.sourceHandle ?? null, original.data),
    makeEdge(`edge-${condition.id}-${info.id}`, condition.id, info.id, 'true'),
    makeEdge(`edge-${condition.id}-${original.target}`, condition.id, original.target, 'false'),
    makeEdge(`edge-${info.id}-${achievement.id}`, info.id, achievement.id),
    makeEdge(`edge-${achievement.id}-${result.id}`, achievement.id, result.id),
  );

  return { nodes: [...nodes, condition, info, achievement, result], edges: nextEdges };
};

const ensureMultipleEndings = (
  nodes: QuizNode[],
  edges: QuizEdge[],
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (nodes.filter(n => n.type === 'resultNode').length >= 4 && nodes.some(n => n.id.startsWith('ai-ending-'))) {
    return { nodes, edges };
  }

  const resultIds = new Set(nodes.filter(n => n.type === 'resultNode').map(n => n.id));
  const edgeIndex = edges.findIndex(e => resultIds.has(e.target) && !resultIds.has(e.source));
  if (edgeIndex < 0) {
    const y = maxNodeY(nodes) + 180;
    const extra = [
      makeNode(nodes, 'ai-ending-expert', 'resultNode', { x: 260, y }, { title: 'Экспертный финал', description: 'Глубокое понимание и уверенная стратегия.', showScore: true }),
      makeNode(nodes, 'ai-ending-steady', 'resultNode', { x: 520, y }, { title: 'Уверенный финал', description: 'Материал освоен, но есть точки роста.', showScore: true }),
      makeNode(nodes, 'ai-ending-learner', 'resultNode', { x: 780, y }, { title: 'Учебный финал', description: 'База есть, нужно закрепить ключевые идеи.', showScore: true }),
      makeNode(nodes, 'ai-ending-retry', 'resultNode', { x: 1040, y }, { title: 'Повторный маршрут', description: 'Лучше вернуться к объяснениям и пройти еще раз.', showScore: true }),
    ];
    return { nodes: [...nodes, ...extra], edges };
  }

  const original = edges[edgeIndex];
  const y = maxNodeY(nodes) + 180;
  const expert = makeNode(nodes, 'ai-ending-expert', 'resultNode', { x: 220, y: y + 440 }, {
    title: 'Экспертный финал',
    description: 'Ты не просто ответил правильно, а собрал систему: факты, причинность и выводы работают вместе.',
    showScore: true,
  });
  const steady = makeNode([...nodes, expert], 'ai-ending-steady', 'resultNode', { x: 500, y: y + 440 }, {
    title: 'Уверенный финал',
    description: 'Основной маршрут пройден хорошо. Остались отдельные места, где стоит усилить аргументацию.',
    showScore: true,
  });
  const learner = makeNode([...nodes, expert, steady], 'ai-ending-learner', 'resultNode', { x: 780, y: y + 440 }, {
    title: 'Учебный финал',
    description: 'Понимание появилось, но материал еще требует тренировки и повторного применения.',
    showScore: true,
  });
  const retry = makeNode([...nodes, expert, steady, learner], 'ai-ending-retry', 'resultNode', { x: 1060, y: y + 440 }, {
    title: 'Маршрут повторения',
    description: 'Лучший ход сейчас - вернуться к объяснениям, восстановить базу и пройти сценарий заново.',
    showScore: true,
  });
  const high = makeNode([...nodes, expert, steady, learner, retry], 'ai-ending-high-gate', 'conditionNode', { x: 500, y }, {
    label: 'Финал: эксперт',
    variable: 'score',
    operator: 'gte',
    value: 90,
  });
  const mid = makeNode([...nodes, expert, steady, learner, retry, high], 'ai-ending-mid-gate', 'conditionNode', { x: 620, y: y + 140 }, {
    label: 'Финал: уверенно',
    variable: 'score',
    operator: 'gte',
    value: 65,
  });
  const low = makeNode([...nodes, expert, steady, learner, retry, high, mid], 'ai-ending-low-gate', 'conditionNode', { x: 740, y: y + 280 }, {
    label: 'Финал: база',
    variable: 'score',
    operator: 'gte',
    value: 35,
  });

  const nextEdges = edges.filter((_, index) => index !== edgeIndex);
  nextEdges.push(
    makeEdge(original.id, original.source, high.id, original.sourceHandle ?? null, original.data),
    makeEdge(`edge-${high.id}-${expert.id}`, high.id, expert.id, 'true'),
    makeEdge(`edge-${high.id}-${mid.id}`, high.id, mid.id, 'false'),
    makeEdge(`edge-${mid.id}-${steady.id}`, mid.id, steady.id, 'true'),
    makeEdge(`edge-${mid.id}-${low.id}`, mid.id, low.id, 'false'),
    makeEdge(`edge-${low.id}-${learner.id}`, low.id, learner.id, 'true'),
    makeEdge(`edge-${low.id}-${retry.id}`, low.id, retry.id, 'false'),
  );

  return {
    nodes: [...nodes, expert, steady, learner, retry, high, mid, low],
    edges: nextEdges,
  };
};

const ensureDifficultyChoice = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  if (nodes.some(n => n.id.startsWith('ai-difficulty-'))) return { nodes, edges };

  const startNode = findStartNode(nodes);
  if (!startNode) return { nodes, edges };
  const startEdge = edges.find(e => e.source === startNode.id && (e.sourceHandle ?? null) === null);
  const target = startEdge?.target ?? nodes.find(n => n.id !== startNode.id && n.type !== 'resultNode')?.id;
  if (!target) return { nodes, edges };

  const y = 170;
  const choice = makeNode(nodes, 'ai-difficulty-choice', 'questionNode', { x: 420, y }, {
    label: 'Выбор сложности',
    question: `Какой маршрут по теме "${topic}" выбрать?`,
    answers: [
      { id: 'easy', text: 'Базовый: спокойно разобраться' },
      { id: 'medium', text: 'Стандартный: проверить понимание' },
      { id: 'hard', text: 'Сложный: идти через вызовы' },
    ],
  });
  const easy = makeNode([...nodes, choice], 'ai-difficulty-easy', 'infoNode', { x: 120, y: y + 170 }, {
    title: 'Базовый маршрут',
    description: 'Больше объяснений, мягкая обратная связь и фокус на понимании.',
  });
  const medium = makeNode([...nodes, choice, easy], 'ai-difficulty-medium', 'infoNode', { x: 420, y: y + 170 }, {
    title: 'Стандартный маршрут',
    description: 'Баланс проверки, объяснений и самостоятельных решений.',
  });
  const hard = makeNode([...nodes, choice, easy, medium], 'ai-difficulty-hard', 'infoNode', { x: 720, y: y + 170 }, {
    title: 'Сложный маршрут',
    description: 'Меньше подсказок, выше ставки и больше требований к аргументации.',
  });

  const nextEdges = edges.filter(e => e !== startEdge);
  nextEdges.push(
    makeEdge(`edge-${startNode.id}-${choice.id}`, startNode.id, choice.id),
    makeEdge(`edge-${choice.id}-${easy.id}`, choice.id, easy.id, 'easy', { effects: [{ variableName: 'difficulty', op: 'set', value: 'easy' }] }),
    makeEdge(`edge-${choice.id}-${medium.id}`, choice.id, medium.id, 'medium', { effects: [{ variableName: 'difficulty', op: 'set', value: 'medium' }] }),
    makeEdge(`edge-${choice.id}-${hard.id}`, choice.id, hard.id, 'hard', { effects: [{ variableName: 'difficulty', op: 'set', value: 'hard' }] }),
    makeEdge(`edge-${easy.id}-${target}`, easy.id, target),
    makeEdge(`edge-${medium.id}-${target}`, medium.id, target),
    makeEdge(`edge-${hard.id}-${target}`, hard.id, target),
  );

  return { nodes: [...nodes, choice, easy, medium, hard], edges: nextEdges };
};

const ensureAdaptiveDifficulty = (
  nodes: QuizNode[],
  edges: QuizEdge[],
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  let result = ensureVariableInit(nodes, edges, 'streak', 0, 'Серия правильных ответов');
  result = {
    nodes: result.nodes,
    edges: result.edges.map(edge => {
      if (edge.sourceHandle === 'correct') {
        return addEdgeEffect(edge, { variableName: 'streak', op: 'add', value: 1 });
      }
      if (edge.sourceHandle === 'incorrect') {
        return addEdgeEffect(edge, { variableName: 'streak', op: 'set', value: 0 });
      }
      return edge;
    }),
  };

  if (result.nodes.some(n => n.type === 'progressionNode')) return result;

  const progression = makeNode(result.nodes, 'ai-adaptive-progression', 'progressionNode', { x: 880, y: maxNodeY(result.nodes) + 180 }, {
    label: 'Адаптивная сложность',
    levelVar: 'rankLevel',
    nameVar: 'rankName',
    lockDegrade: true,
    onLevelUpHandle: 'levelUp',
    rules: [
      { id: 'rank-base', level: 1, name: 'Исследователь', requireAll: true, requirements: [{ id: 'rank-base-req', type: 'minScore', value: 0 }] },
      { id: 'rank-strong', level: 2, name: 'Сильный маршрут', requireAll: true, requirements: [{ id: 'rank-strong-req', type: 'minVar', variable: 'streak', value: 3 }] },
    ],
  });

  return insertChainAfterStart(result.nodes, result.edges, [progression]);
};

const ensureSelectedOptionFeatures = (
  nodes: QuizNode[],
  edges: QuizEdge[],
  selectedOptions: string[],
  topic: string,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  let result = { nodes, edges };
  const selected = new Set(selectedOptions);

  if (selected.has('storytelling_mode')) result = ensureStoryIntro(result.nodes, result.edges, topic);
  if (selected.has('difficulty_choice')) result = ensureDifficultyChoice(result.nodes, result.edges, topic);
  if (selected.has('hint_system')) result = ensureHintSystem(result.nodes, result.edges, topic);
  if (selected.has('lives_system')) result = ensureLivesSystem(result.nodes, result.edges);
  if (selected.has('adaptive_difficulty')) result = ensureAdaptiveDifficulty(result.nodes, result.edges);
  if (selected.has('secret_branch')) result = ensureSecretBranch(result.nodes, result.edges, topic);
  if (selected.has('bonus_branch')) result = ensureBonusBranch(result.nodes, result.edges, topic);
  if (selected.has('multiple_endings')) result = ensureMultipleEndings(result.nodes, result.edges);

  return result;
};

const createFallbackQuizData = (
  topic: string,
  goal: string,
  audience: string,
  requestedQuestionCount: number,
): { nodes: QuizNode[]; edges: QuizEdge[] } => {
  const count = clamp(Math.round(requestedQuestionCount || 8), 5, 10);
  const safeTopic = topic.trim() || 'тема квиза';
  const nodes: QuizNode[] = [
    { ...START_NODE },
    {
      id: 'fallback-intro',
      type: 'infoNode',
      position: { x: 400, y: 180 },
      data: {
        label: 'Вступление',
        title: `Маршрут: ${safeTopic}`,
        description: goal
          ? `Цель: ${goal}. Отвечай внимательно: решения будут влиять на очки и финал.`
          : `Проверь понимание темы "${safeTopic}" через короткий интерактивный маршрут.`,
      },
    },
  ];
  const edges: QuizEdge[] = [
    makeEdge('fallback-edge-start-intro', 'start', 'fallback-intro'),
  ];

  let previousId = 'fallback-intro';
  for (let index = 1; index <= count; index += 1) {
    const nodeId = `fallback-q-${index}`;
    const feedbackId = `fallback-feedback-${index}`;
    const isMultiple = index % 4 === 0;
    const isText = index % 5 === 0;
    const type = isText ? 'textInputNode' : isMultiple ? 'multipleChoiceNode' : 'questionNode';

    const questionNode: QuizNode = {
      id: nodeId,
      type,
      position: { x: 400 + (index % 2) * 280, y: 180 + index * 160 },
      data: type === 'textInputNode'
        ? {
            label: `Проверка ${index}`,
            question: `Назови ключевое понятие или факт по теме "${safeTopic}".`,
            keyword: safeTopic.split(/\s+/)[0] || safeTopic,
            acceptedAnswers: [safeTopic.split(/\s+/)[0] || safeTopic],
          }
        : type === 'multipleChoiceNode'
          ? {
              label: `Множественный выбор ${index}`,
              question: `Какие признаки помогают уверенно разобраться в теме "${safeTopic}"?`,
              answers: [
                { id: 'a', text: 'Причины и последствия' },
                { id: 'b', text: 'Случайные детали без связи' },
                { id: 'c', text: 'Ключевые понятия' },
                { id: 'd', text: 'Только запоминание дат' },
              ],
              correctOptions: ['a', 'c'],
              minSelections: 2,
              maxSelections: 2,
            }
          : {
              label: `Вопрос ${index}`,
              question: `Какой вывод лучше всего раскрывает тему "${safeTopic}"?`,
              answers: [
                { id: 'correct', text: 'Связать факт с причиной и последствием', isCorrect: true },
                { id: 'partial', text: 'Запомнить отдельный термин' },
                { id: 'wrong', text: 'Выбрать первое похожее объяснение' },
              ],
            },
    };

    const feedbackNode: QuizNode = {
      id: feedbackId,
      type: 'feedbackNode',
      position: { x: 760, y: 180 + index * 160 },
      data: {
        label: `Разбор ${index}`,
        title: 'Разбор ответа',
        message: `Вернись к логике темы "${safeTopic}": сильный ответ объясняет связь, а не просто называет факт.`,
        explanation: audience ? `Для аудитории "${audience}" важно держать фокус на понимании, а не угадывании.` : undefined,
      },
    };

    nodes.push(questionNode, feedbackNode);
    edges.push(makeEdge(`fallback-edge-${previousId}-${nodeId}`, previousId, nodeId));
    if (type === 'questionNode') {
      edges.push(
        makeEdge(`fallback-edge-${nodeId}-correct`, nodeId, index === count ? 'fallback-result-good' : feedbackId, 'correct', {
          effects: [{ variableName: 'score', op: 'add', value: 10 }],
        }),
        makeEdge(`fallback-edge-${nodeId}-partial`, nodeId, feedbackId, 'partial', {
          effects: [{ variableName: 'score', op: 'add', value: 4 }],
        }),
        makeEdge(`fallback-edge-${nodeId}-wrong`, nodeId, feedbackId, 'wrong'),
      );
    } else {
      edges.push(
        makeEdge(`fallback-edge-${nodeId}-correct`, nodeId, index === count ? 'fallback-result-good' : feedbackId, 'correct', {
          effects: [{ variableName: 'score', op: 'add', value: 10 }],
        }),
        makeEdge(`fallback-edge-${nodeId}-incorrect`, nodeId, feedbackId, 'incorrect'),
      );
    }
    previousId = feedbackId;
  }

  nodes.push(
    {
      id: 'fallback-result-good',
      type: 'resultNode',
      position: { x: 320, y: 240 + count * 180 },
      data: {
        label: 'Сильный финал',
        title: 'Материал собран в систему',
        description: `Ты уверенно прошел маршрут по теме "${safeTopic}" и показал понимание связей.`,
        showScore: true,
      },
    },
    {
      id: 'fallback-result-review',
      type: 'resultNode',
      position: { x: 660, y: 240 + count * 180 },
      data: {
        label: 'Финал повторения',
        title: 'Нужно закрепить основу',
        description: `Тема "${safeTopic}" уже знакома, но стоит повторить ключевые связи и пройти маршрут снова.`,
        showScore: true,
      },
    },
  );
  edges.push(makeEdge(`fallback-edge-${previousId}-review`, previousId, 'fallback-result-review'));

  return { nodes, edges };
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
        <input name="components-aiquizwizard-1959-input"
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
        <input name="components-aiquizwizard-1983-input"
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
        <input name="components-aiquizwizard-2005-input"
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
        <textarea name="components-aiquizwizard-2059-textarea"
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
          <input name="components-aiquizwizard-2221-input"
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
          <textarea name="components-aiquizwizard-2569-textarea"
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
      .map(o => {
        const mandatoryContract = OPTION_IMPLEMENTATION_CONTRACT[o.id];
        return `- ${o.label}: ${o.promptAddition}${mandatoryContract ? ` Mandatory: ${mandatoryContract}` : ''}`;
      })
      .join('\n');
  }, [inputs.selectedOptions]);

  const buildContext = useCallback((): string => {
    const parts = [
      `Topic: ${inputs.topic}`,
      inputs.goal && `Goal: ${inputs.goal}`,
      inputs.audience && `Audience: ${inputs.audience}`,
      `Format: ${inputs.format}`,
      `Questions: ${inputs.questionCount}`,
      getDomainExpertiseContract(inputs.topic, inputs.format, inputs.audience),
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
      const prompt = `Generate 4 distinct premium quiz concepts in Russian based on the input below.
The ideas must be strong enough to become a finished interactive educational product.
Avoid generic "test about the topic" ideas. Each idea needs a clear role for the learner, conflict, branching potential, and memorable mechanic.

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
Question count target: ${inputs.questionCount}
${inputs.goal ? `Goal: ${inputs.goal}` : ''}
${inputs.audience ? `Audience: ${inputs.audience}` : ''}
${inputs.additionalContext ? `Additional context: ${inputs.additionalContext}` : ''}
${getDomainExpertiseContract(inputs.topic, inputs.format, inputs.audience)}

Selected mechanics:
${getSelectedOptionsPrompt() || '- none'}

Quality criteria:
- Every concept must imply meaningful choices, not just a linear quiz.
- Hooks should create curiosity or tension in the first 10 seconds.
- Descriptions must mention how the learner changes state: score, variables, paths, skill level, or ending.
- Descriptions must include the professional domain lens, not only a playful wrapper.
- If a selected mechanic is present above, at least two ideas must explicitly use it.`;

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
  }, [inputs, createNew, getSelectedOptionsPrompt]);

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

${PREMIUM_QUALITY_CONTRACT}
${FINAL_JSON_SIZE_RULES}

Specification:
${buildContext()}

${optionsPrompt ? `Additional mechanics:\n${optionsPrompt}` : ''}
${inputs.additionalContext ? `\nAuthor notes:\n${inputs.additionalContext}` : ''}

Requirements:
- Create ${inputs.questionCount} core assessment checkpoints. Use a rich mix: questionNode, multipleChoiceNode, textInputNode, matchingNode, timelineNode where relevant.
- Minimum 2 resultNodes (good/bad ending). If multiple_endings is selected, create 4+ resultNodes.
- Use at least 8 different node types when the selected mechanics allow it.
- Include feedbackNode explanations for important wrong answers.
- Include scoreNode/variableNode/conditionNode whenever branches or endings depend on learner state.
- All nodes connected via edges
- For questionNode: each answer.id must match an edge's sourceHandle
- For multipleChoiceNode: edges must use sourceHandle "correct" or "incorrect"
- For textInputNode/matchingNode/timelineNode: edges must use sourceHandle "correct" and "incorrect"
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

      let data: { nodes: any[]; edges: any[] };
      try {
        ({ data } = await parseJsonWithRepair<{ nodes: any[]; edges: any[] }>(response, controller.signal));
      } catch (parseError) {
        console.warn('Retrying final quiz generation after invalid JSON...', parseError);
        const compactQuestionCount = clamp(inputs.questionCount, 5, 12);
        const compactPrompt = `${MINIMAL_GRAPH_CONTEXT}

${FINAL_JSON_SIZE_RULES}

Create a complete quiz as COMPACT MINIFIED JSON only.
No Markdown. No comments. No explanation.
Top-level shape must be exactly {"nodes":[],"edges":[]}.

Topic: ${inputs.topic}
Format: ${inputs.format}
Core checkpoints: ${compactQuestionCount}
${inputs.goal ? `Goal: ${inputs.goal}` : ''}
${inputs.audience ? `Audience: ${inputs.audience}` : ''}
${inputs.additionalContext ? `Author notes: ${inputs.additionalContext}` : ''}
${getDomainExpertiseContract(inputs.topic, inputs.format, inputs.audience)}

${optionsPrompt ? `Mechanics:\n${optionsPrompt}` : ''}

Rules:
- Include one startNode.
- Include ${compactQuestionCount} core assessment checkpoints.
- Use varied checkpoint types: questionNode, multipleChoiceNode, textInputNode, matchingNode, timelineNode.
- Include at least 2 resultNode endings.
- If a selected mechanic is listed, it is mandatory and must be visible in the graph.
- Every node needs id, type, position, data.
- Every edge needs id, source, target.
- For questionNode, answer ids must be used as edge sourceHandle values.
- For correct/incorrect nodes, include both correct and incorrect edges.
- Use Russian content.`;

        try {
          response = await callOpenRouter(AI_MODEL_JSON, compactPrompt, true, controller.signal);
          ({ data } = await parseJsonWithRepair<{ nodes: any[]; edges: any[] }>(response, controller.signal));
        } catch (compactParseError) {
          console.warn('Using local fallback quiz after repeated invalid JSON...', compactParseError);
          data = createFallbackQuizData(inputs.topic, inputs.goal, inputs.audience, inputs.questionCount);
        }
      }
      
      let rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
      let rawEdges = Array.isArray(data?.edges) ? data.edges : [];

      if (!rawNodes.length) throw new Error('AI не вернул узлы');

      // ========== Graph Normalization Pipeline ==========
      let nodes = normalizeNodes(rawNodes);
      nodes = normalizeNodeSemantics(nodes);
      nodes = ensureStartNode(nodes);
      
      let edges = normalizeEdges(rawEdges, nodes);
      edges = addMissingAnswerEdges(nodes, edges);
      edges = addMissingOutcomeEdges(nodes, edges);
      edges = addAssessmentEdgeEffects(nodes, edges);
      edges = ensureStartEdge(nodes, edges);
      edges = ensureGraphConnectivity(nodes, edges);
      
      const withResults = ensureResultNodes(nodes, edges);
      nodes = withResults.nodes;
      edges = withResults.edges;

      const withSelectedFeatures = ensureSelectedOptionFeatures(nodes, edges, inputs.selectedOptions, inputs.topic);
      nodes = withSelectedFeatures.nodes;
      edges = withSelectedFeatures.edges;
      edges = addMissingAnswerEdges(nodes, edges);
      edges = addMissingOutcomeEdges(nodes, edges);
      edges = addAssessmentEdgeEffects(nodes, edges);
      edges = ensureStartEdge(nodes, edges);
      edges = ensureGraphConnectivity(nodes, edges);
      
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

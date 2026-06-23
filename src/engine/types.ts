// ===== ТИПЫ =====
// Единственный источник истины для структуры данных движка

export interface QuizData {
  nodes: QuizNode[];
  edges: QuizEdge[];
  startNodeId?: string;
  quizId?: string;
  designSettings?: DesignSettings;
  globalTimer?: {
    enabled?: boolean;
    duration?: number;
    onTimeoutNodeId?: string | null;
  };
  currentQuizName?: string;
  apiBaseUrl?: string;
}

export interface QuizNode {
  id: string;
  type: string;
  parentId?: string;
  parentNode?: string;
  data: NodeData;
}

export interface NodeData {
  label?: string;
  title?: string;
  description?: string;
  message?: string;
  question?: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  isRequiredWatch?: boolean;
  videoDuration?: number;
  explanation?: string;

  // Question
  answers?: Answer[];
  options?: Answer[];

  // Score
  operation?: 'add' | 'subtract' | 'set' | 'multiply';
  value?: string | number;

  // Variable
  variableName?: string;

  // Condition
  variable?: string;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
    | '==' | '!=' | '>' | '<' | '>=' | '<=';
  conditionValue?: string | number;

  // Formula
  formula?: string;
  resultVariable?: string;

  // GoTo
  targetNodeId?: string;

  // Sound
  soundSettings?: {
    onEntry?: string;
  };

  // Show score
  showScore?: boolean;
  showVariables?: string[];

  // Extended node settings are validated by their dedicated handlers.
  [key: string]: unknown;
}

export interface Answer {
  id: string;
  text: string;
  isCorrect?: boolean;
  points?: number;
}

export interface QuizEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  data?: {
    effects?: EdgeEffect[];
  };
}

export interface EdgeEffect {
  variableName: string;
  op: 'set' | 'add' | 'subtract';
  value: string | number;
}

export interface DesignSettings {
  background?: {
    color?: string;
    imageUrl?: string;
    overlayColor?: string;
    overlayOpacity?: number;
  };
  typography?: {
    fontFamily?: string;
    headingColor?: string;
    bodyTextColor?: string;
  };
  buttons?: {
    backgroundColor?: string;
    textColor?: string;
    hoverBackgroundColor?: string;
    hoverTextColor?: string;
    borderRadius?: number;
  };
  answerCards?: {
    backgroundColor?: string;
    textColor?: string;
    hoverBackgroundColor?: string;
    hoverTextColor?: string;
    selectedBackgroundColor?: string;
    selectedTextColor?: string;
    borderRadius?: number;
  };
  sound?: {
    volume?: number;
    backgroundMusic?: string;
    buttonClick?: string;
    correctAnswer?: string;
    incorrectAnswer?: string;
    achievementUnlock?: string;
  };
}

export interface QuizState {
  currentNodeId: string | null;
  score: number;
  variables: Record<string, string | number | boolean>;
  startTime: number;
  path: PathEntry[];
  visitedInteractiveNodes: Set<string>;
  isResultSaved: boolean;
  isSessionCompleted: boolean;
  achievements: string[];
  globalTimerInterval: ReturnType<typeof setInterval> | null;
  globalTimeRemaining: number;
}

export interface PathEntry {
  nodeId: string;
  timestamp: string;
}

export interface VideoLockState {
  controlsElement: HTMLElement | null;
  overlayElement: HTMLElement | null;
  unlockTimer: ReturnType<typeof setTimeout> | null;
  manualUnlockTimer: ReturnType<typeof setTimeout> | null;
  isLocked: boolean;
  iframeWindow: Window | null;
  iframeOrigin: string | null;
}

// ===== ТИПЫ =====
// Единственный источник истины для структуры данных движка

export interface QuizData {
  nodes: QuizNode[];
  edges: QuizEdge[];
  startNodeId?: string;
  quizId?: string;
  templateId?: string;
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
    onButtonPress?: string;
    voiceover?: string;
  };

  // Show score
  showScore?: boolean;
  showVariables?: string[];
  screenQuiz?: Partial<ScreenQuizSettings>;
  correctAnswer?: string;

  // Extended node settings are validated by their dedicated handlers.
  [key: string]: unknown;
}

export interface Answer {
  id: string;
  text: string;
  imageUrl?: string;
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
  brand?: {
    logoUrl?: string;
    brandName?: string;
    primaryColor?: string;
    accentColor?: string;
    neutralColor?: string;
    experiencePreset?: 'conversational' | 'leadForm' | 'calculator' | 'assessment' | 'editorial' | 'minimal';
  };
  background?: {
    color?: string;
    imageUrl?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    mode?: 'solid' | 'gradient' | 'image';
    gradientFrom?: string;
    gradientTo?: string;
    imageFit?: 'cover' | 'contain' | 'repeat';
    texture?: 'none' | 'grain' | 'grid' | 'paper';
  };
  typography?: {
    fontFamily?: string;
    displayFontFamily?: string;
    headingColor?: string;
    bodyTextColor?: string;
    headingWeight?: number;
    bodyWeight?: number;
    headingScale?: number;
    bodyScale?: number;
    lineHeight?: number;
    letterSpacing?: number;
    headingLineHeight?: number;
    paragraphWidth?: number;
  };
  layout?: {
    preset?: 'classic' | 'split' | 'focus' | 'editorial' | 'compact' | 'conversational' | 'calculator' | 'assessment';
    interfacePreset?: 'studio' | 'immersive' | 'form' | 'exam' | 'kiosk' | 'magazine' | 'product' | 'minimal' | 'workshop' | 'report';
    contentWidth?: number;
    cardRadius?: number;
    cardPadding?: number;
    cardOpacity?: number;
    mediaPosition?: 'top' | 'left' | 'right' | 'background';
    surfaceStyle?: 'solid' | 'paper' | 'outline' | 'glass' | 'minimal';
    questionAlign?: 'left' | 'center';
    verticalAlign?: 'top' | 'center';
    density?: 'compact' | 'balanced' | 'relaxed';
    chrome?: 'full' | 'compact' | 'none';
    blocks?: {
      topbar?: boolean;
      brand?: boolean;
      logo?: boolean;
      title?: boolean;
      progress?: boolean;
      timer?: boolean;
      description?: boolean;
      media?: boolean;
      achievements?: boolean;
      variables?: boolean;
      stats?: boolean;
      resultStats?: boolean;
      backgroundDecor?: boolean;
    };
  };
  questionCard?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    radius?: number;
    padding?: number;
    shadow?: 'none' | 'soft' | 'strong';
    mediaPosition?: 'top' | 'left' | 'right' | 'background';
    mediaWidth?: number;
    mediaRadius?: number;
    mediaFit?: 'cover' | 'contain';
  };
  buttons?: {
    backgroundColor?: string;
    textColor?: string;
    hoverBackgroundColor?: string;
    hoverTextColor?: string;
    borderRadius?: number;
    style?: 'solid' | 'outline' | 'ghost' | 'soft' | 'premium';
    height?: number;
    shadow?: 'none' | 'soft' | 'strong';
    fontWeight?: number;
    width?: 'auto' | 'full';
    textTransform?: 'none' | 'uppercase';
  };
  answerCards?: {
    backgroundColor?: string;
    textColor?: string;
    hoverBackgroundColor?: string;
    hoverTextColor?: string;
    selectedBackgroundColor?: string;
    selectedTextColor?: string;
    borderRadius?: number;
    style?: 'card' | 'list' | 'tiles' | 'minimal';
    borderColor?: string;
    selectedBorderColor?: string;
    spacing?: number;
    markerStyle?: 'none' | 'letters' | 'numbers';
    columns?: 1 | 2 | 3;
    minHeight?: number;
    mediaAspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
  };
  progress?: {
    style?: 'bar' | 'steps' | 'ring' | 'hidden';
    position?: 'top' | 'bottom' | 'inside';
    color?: string;
    trackColor?: string;
    showPercent?: boolean;
    showStepLabel?: boolean;
    height?: number;
  };
  result?: {
    preset?: 'card' | 'certificate' | 'report' | 'landing';
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    showScore?: boolean;
    showShare?: boolean;
    scoreStyle?: 'badge' | 'ring' | 'stat';
  };
  advanced?: {
    customCss?: string;
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
  screenQuiz?: ScreenQuizSettings;
  sound?: {
    volume?: number;
    backgroundMusic?: string;
    musicVolume?: number;
    voiceVolume?: number;
    sfxVolume?: number;
    tickVolume?: number;
    buttonClick?: string;
    correctAnswer?: string;
    incorrectAnswer?: string;
    achievementUnlock?: string;
    screenQuizIntro?: string;
    screenQuizTick?: string;
    screenQuizReveal?: string;
    screenQuizTransition?: string;
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

export type ScreenQuizLayout = 'auto' | 'media-right' | 'media-left' | 'media-top' | 'image-grid' | 'question-only' | 'hero-media';
export type ScreenQuizTransitionEffect = 'swipe-reveal' | 'pixel-dissolve' | 'zoom-in-reveal' | 'glitch-cut';
export type ScreenQuizIntroTiming = 'auto' | 'fast' | 'calm' | 'manual';
export type ScreenQuizTimelineMode = 'auto' | 'timeline';

export interface ScreenQuizSettings {
  backgroundPreset?: 'none' | 'pop' | 'candy' | 'aqua' | 'yellow' | 'travel';
  backgroundImageUrl?: string;
  backgroundColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  panelColor?: string;
  answerColor?: string;
  inkColor?: string;
  correctColor?: string;
  borderWidth?: number;
  radius?: number;
  decorIntensity?: number;
  motion?: 'premium' | 'calm' | 'off';
  transitionEffect?: ScreenQuizTransitionEffect;
  layout?: ScreenQuizLayout;
  timerSeconds?: number;
  showTimer?: boolean;
  showStoryTimer?: boolean;
  timelineMode?: ScreenQuizTimelineMode;
  holdSeconds?: number;
  revealSeconds?: number;
  transitionMs?: number;
  introEnabled?: boolean;
  introTiming?: ScreenQuizIntroTiming;
  introQuestionMs?: number;
  introAnswerMs?: number;
  introMediaMs?: number;
  introGapMs?: number;
}

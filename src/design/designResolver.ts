import type { DesignSettings, QuizTemplateId } from '../../types';
import type { DesignElementRole } from '../previewBridge/designElements';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K] | null;
};

export interface DesignBrandKit {
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  neutralColor?: string | null;
  fontFamily?: string | null;
  displayFontFamily?: string | null;
}

export interface ResolveDesignInput {
  defaults?: DesignSettings;
  template?: DeepPartial<DesignSettings>;
  stylePreset?: DeepPartial<DesignSettings>;
  brandKit?: DesignBrandKit;
  overrides?: DeepPartial<DesignSettings>;
}

type DesignElementOverrideBucket = Partial<Record<DesignElementRole, Record<string, unknown>>>;

interface DesignElementOverrideState {
  global?: DesignElementOverrideBucket;
  nodeTypes?: Record<string, DesignElementOverrideBucket>;
  nodes?: Record<string, DesignElementOverrideBucket>;
}

type DesignSettingsWithElementExtras = DesignSettings & {
  elementOverrides?: DesignElementOverrideState;
  layout?: DesignSettings['layout'] & {
    elementOrder?: DesignElementRole[];
  };
};

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  brand: {
    logoUrl: '',
    brandName: '',
    primaryColor: '#2f5d50',
    accentColor: '#b9852b',
    neutralColor: '#1d1a16',
    experiencePreset: 'conversational',
  },
  background: {
    color: '#f6f3ee',
    imageUrl: '',
    overlayColor: '#f6f3ee',
    overlayOpacity: 0,
    mode: 'solid',
    gradientFrom: '#f6f3ee',
    gradientTo: '#ebe5db',
    imageFit: 'cover',
    texture: 'grain',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    displayFontFamily: "'Newsreader', Georgia, serif",
    headingColor: '#1d1a16',
    bodyTextColor: '#615d54',
    headingWeight: 650,
    bodyWeight: 450,
    headingScale: 1,
    bodyScale: 1,
    lineHeight: 1.55,
    letterSpacing: 0,
    headingLineHeight: 1.04,
    paragraphWidth: 680,
  },
  layout: {
    preset: 'classic',
    interfacePreset: 'studio',
    contentWidth: 920,
    cardRadius: 28,
    cardPadding: 32,
    cardOpacity: 0.94,
    mediaPosition: 'top',
    surfaceStyle: 'paper',
    questionAlign: 'left',
    verticalAlign: 'center',
    density: 'balanced',
    chrome: 'full',
    blocks: {
      topbar: true,
      brand: true,
      logo: true,
      title: true,
      progress: true,
      timer: true,
      description: true,
      media: true,
      achievements: true,
      variables: true,
      stats: true,
      resultStats: true,
      backgroundDecor: true,
    },
  },
  questionCard: {
    backgroundColor: '#fffefa',
    borderColor: '#dfd8cc',
    textColor: '#24211c',
    radius: 28,
    padding: 32,
    shadow: 'none',
    mediaPosition: 'top',
    mediaWidth: 42,
    mediaRadius: 22,
    mediaFit: 'cover',
  },
  buttons: {
    backgroundColor: '#2f5d50',
    textColor: '#ffffff',
    hoverBackgroundColor: '#25493f',
    hoverTextColor: '#ffffff',
    borderRadius: 18,
    style: 'solid',
    height: 52,
    shadow: 'soft',
    fontWeight: 800,
    width: 'auto',
    textTransform: 'none',
  },
  answerCards: {
    backgroundColor: '#fffefa',
    textColor: '#24211c',
    hoverBackgroundColor: '#f7f4ed',
    hoverTextColor: '#171512',
    selectedBackgroundColor: '#e5f0ea',
    selectedTextColor: '#183b32',
    borderRadius: 18,
    style: 'card',
    borderColor: '#dfd8cc',
    selectedBorderColor: '#2f5d50',
    spacing: 12,
    markerStyle: 'letters',
    columns: 1,
    minHeight: 58,
    mediaAspectRatio: 'auto',
  },
  progress: {
    style: 'bar',
    position: 'top',
    color: '#2f5d50',
    trackColor: '#e4ded2',
    showPercent: true,
    showStepLabel: true,
    height: 8,
  },
  result: {
    preset: 'card',
    backgroundColor: '#fffefa',
    textColor: '#1d1a16',
    accentColor: '#2f5d50',
    showScore: true,
    showShare: true,
    scoreStyle: 'badge',
  },
  advanced: {
    customCss: '',
    reducedMotion: false,
    highContrast: false,
  },
  screenQuiz: {
    backgroundPreset: 'pop',
    backgroundImageUrl: '',
    backgroundColor: '#9a4bdb',
    accentColor: '#ffc928',
    secondaryColor: '#7c5ce7',
    panelColor: '#f1eef6',
    answerColor: '#eeeeec',
    inkColor: '#050305',
    correctColor: '#18c900',
    borderWidth: 10,
    radius: 54,
    decorIntensity: 1,
    motion: 'premium',
    layout: 'auto',
    timerSeconds: 30,
    showTimer: true,
    showStoryTimer: true,
    timelineMode: 'auto',
    holdSeconds: 1.2,
    revealSeconds: 1.4,
    transitionMs: 340,
    introEnabled: true,
    introTiming: 'auto',
    introQuestionMs: 2800,
    introAnswerMs: 1800,
    introMediaMs: 900,
    introGapMs: 280,
  },
  sound: {
    volume: 0.5,
  },
};

const TEMPLATE_DESIGN_BASES: Partial<Record<QuizTemplateId, DeepPartial<DesignSettings>>> = {
  screenQuiz: {
    layout: {
      blocks: {
        topbar: false,
        brand: false,
        logo: false,
        title: false,
        achievements: false,
        variables: false,
        stats: false,
      },
    },
  },
};

const enumValues = <T extends string>(values: readonly T[]) => new Set<string>(values);

const enumSets = {
  experiencePreset: enumValues(['conversational', 'leadForm', 'calculator', 'assessment', 'editorial', 'minimal'] as const),
  backgroundMode: enumValues(['solid', 'gradient', 'image'] as const),
  imageFit: enumValues(['cover', 'contain', 'repeat'] as const),
  texture: enumValues(['none', 'grain', 'grid', 'paper'] as const),
  layoutPreset: enumValues(['classic', 'split', 'focus', 'editorial', 'compact', 'conversational', 'calculator', 'assessment'] as const),
  interfacePreset: enumValues(['studio', 'immersive', 'form', 'exam', 'kiosk', 'magazine', 'product', 'minimal', 'workshop', 'report'] as const),
  mediaPosition: enumValues(['top', 'left', 'right', 'background'] as const),
  surfaceStyle: enumValues(['solid', 'paper', 'outline', 'glass', 'minimal'] as const),
  questionAlign: enumValues(['left', 'center'] as const),
  verticalAlign: enumValues(['top', 'center'] as const),
  density: enumValues(['compact', 'balanced', 'relaxed'] as const),
  chrome: enumValues(['full', 'compact', 'none'] as const),
  shadow: enumValues(['none', 'soft', 'strong'] as const),
  buttonStyle: enumValues(['solid', 'outline', 'ghost', 'soft', 'premium'] as const),
  buttonWidth: enumValues(['auto', 'full'] as const),
  textTransform: enumValues(['none', 'uppercase'] as const),
  answerStyle: enumValues(['card', 'list', 'tiles', 'minimal'] as const),
  markerStyle: enumValues(['none', 'letters', 'numbers'] as const),
  mediaAspectRatio: enumValues(['auto', '16/9', '4/3', '1/1'] as const),
  progressStyle: enumValues(['bar', 'steps', 'ring', 'hidden'] as const),
  progressPosition: enumValues(['top', 'bottom', 'inside'] as const),
  resultPreset: enumValues(['card', 'certificate', 'report', 'landing'] as const),
  scoreStyle: enumValues(['badge', 'ring', 'stat'] as const),
  screenQuizBackgroundPreset: enumValues(['none', 'pop', 'candy', 'aqua', 'yellow', 'travel', 'finance-express'] as const),
  screenQuizMotion: enumValues(['premium', 'calm', 'off'] as const),
  screenQuizTransitionEffect: enumValues(['swipe-reveal', 'pixel-dissolve', 'zoom-in-reveal', 'glitch-cut'] as const),
  screenQuizLayout: enumValues(['auto', 'media-right', 'media-left', 'media-top', 'image-grid', 'question-only', 'hero-media'] as const),
  screenQuizTimelineMode: enumValues(['auto', 'timeline'] as const),
  screenQuizIntroTiming: enumValues(['auto', 'fast', 'calm', 'manual'] as const),
};

const DESIGN_ELEMENT_ROLE_VALUES = new Set<DesignElementRole>([
  'canvas-background',
  'quiz-shell',
  'topbar',
  'brand',
  'logo',
  'quiz-title',
  'progress',
  'timer',
  'question-card',
  'question-title',
  'question-description',
  'media',
  'answers-container',
  'answer-card',
  'primary-action',
  'achievements',
  'variables',
  'stats',
  'result-card',
  'result-title',
  'result-score',
  'result-action',
]);

function normalizeElementOrder(value: unknown): DesignElementRole[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const order = value.filter((item): item is DesignElementRole => (
    typeof item === 'string' && DESIGN_ELEMENT_ROLE_VALUES.has(item as DesignElementRole)
  ));
  return order.length > 0 ? order : undefined;
}

function normalizeOverrideBucket(value: unknown): DesignElementOverrideBucket | undefined {
  if (!isPlainObject(value)) return undefined;
  const bucket: DesignElementOverrideBucket = {};
  for (const [role, patch] of Object.entries(value)) {
    if (!DESIGN_ELEMENT_ROLE_VALUES.has(role as DesignElementRole) || !isPlainObject(patch)) continue;
    bucket[role as DesignElementRole] = structuredClone(patch);
  }
  return Object.keys(bucket).length > 0 ? bucket : undefined;
}

function normalizeOverrideBucketRecord(value: unknown): Record<string, DesignElementOverrideBucket> | undefined {
  if (!isPlainObject(value)) return undefined;
  const record: Record<string, DesignElementOverrideBucket> = {};
  for (const [key, bucket] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_.:-]+$/.test(key)) continue;
    const normalized = normalizeOverrideBucket(bucket);
    if (normalized) record[key] = normalized;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function normalizeElementOverrides(value: unknown): DesignElementOverrideState | undefined {
  if (!isPlainObject(value)) return undefined;
  const global = normalizeOverrideBucket(value.global);
  const nodeTypes = normalizeOverrideBucketRecord(value.nodeTypes);
  const nodes = normalizeOverrideBucketRecord(value.nodes);
  const normalized: DesignElementOverrideState = {};
  if (global) normalized.global = global;
  if (nodeTypes) normalized.nodeTypes = nodeTypes;
  if (nodes) normalized.nodes = nodes;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function cloneDesignSettings(settings: DesignSettings): DesignSettings {
  return structuredClone(settings);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeDefined<T extends object>(target: T, source: DeepPartial<T> | undefined): T {
  if (!source) return cloneDesignSettings(target as DesignSettings) as T;
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    if (key === 'elementOverrides') {
      result[key] = structuredClone(value);
      continue;
    }
    const previous = result[key];
    if (isPlainObject(previous) && isPlainObject(value)) {
      result[key] = mergeDefined(previous, value as DeepPartial<typeof previous>);
    } else if (isPlainObject(value)) {
      result[key] = mergeDefined({}, value);
    } else if (Array.isArray(value)) {
      result[key] = structuredClone(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : fallback;
}

export function normalizeDesignSettings(
  settings: DeepPartial<DesignSettings> | undefined,
  defaults: DesignSettings = DEFAULT_DESIGN_SETTINGS,
): DesignSettings {
  const merged = mergeDefined(cloneDesignSettings(defaults), settings);
  const fallback = defaults;
  const mergedWithExtras = merged as DesignSettingsWithElementExtras;
  const elementOrder = normalizeElementOrder(mergedWithExtras.layout?.elementOrder);
  const elementOverrides = normalizeElementOverrides(mergedWithExtras.elementOverrides);

  const normalized = {
    brand: {
      logoUrl: stringValue(merged.brand?.logoUrl, fallback.brand?.logoUrl ?? ''),
      brandName: stringValue(merged.brand?.brandName, fallback.brand?.brandName ?? ''),
      primaryColor: stringValue(merged.brand?.primaryColor, fallback.brand?.primaryColor ?? '#2f5d50'),
      accentColor: stringValue(merged.brand?.accentColor, fallback.brand?.accentColor ?? '#b9852b'),
      neutralColor: stringValue(merged.brand?.neutralColor, fallback.brand?.neutralColor ?? '#1d1a16'),
      experiencePreset: enumValue(merged.brand?.experiencePreset, enumSets.experiencePreset, fallback.brand?.experiencePreset ?? 'conversational'),
    },
    background: {
      color: stringValue(merged.background?.color, fallback.background.color),
      imageUrl: stringValue(merged.background?.imageUrl, fallback.background.imageUrl),
      overlayColor: stringValue(merged.background?.overlayColor, fallback.background.overlayColor),
      overlayOpacity: numberValue(merged.background?.overlayOpacity, fallback.background.overlayOpacity, 0, 1),
      mode: enumValue(merged.background?.mode, enumSets.backgroundMode, fallback.background.mode ?? 'solid'),
      gradientFrom: stringValue(merged.background?.gradientFrom, fallback.background.gradientFrom ?? fallback.background.color),
      gradientTo: stringValue(merged.background?.gradientTo, fallback.background.gradientTo ?? fallback.background.color),
      imageFit: enumValue(merged.background?.imageFit, enumSets.imageFit, fallback.background.imageFit ?? 'cover'),
      texture: enumValue(merged.background?.texture, enumSets.texture, fallback.background.texture ?? 'none'),
    },
    typography: {
      fontFamily: stringValue(merged.typography?.fontFamily, fallback.typography.fontFamily),
      displayFontFamily: stringValue(merged.typography?.displayFontFamily, fallback.typography.displayFontFamily ?? fallback.typography.fontFamily),
      headingColor: stringValue(merged.typography?.headingColor, fallback.typography.headingColor),
      bodyTextColor: stringValue(merged.typography?.bodyTextColor, fallback.typography.bodyTextColor),
      headingWeight: numberValue(merged.typography?.headingWeight, fallback.typography.headingWeight ?? 650, 100, 1000),
      bodyWeight: numberValue(merged.typography?.bodyWeight, fallback.typography.bodyWeight ?? 450, 100, 1000),
      headingScale: numberValue(merged.typography?.headingScale, fallback.typography.headingScale ?? 1, 0.5, 2),
      bodyScale: numberValue(merged.typography?.bodyScale, fallback.typography.bodyScale ?? 1, 0.5, 2),
      lineHeight: numberValue(merged.typography?.lineHeight, fallback.typography.lineHeight ?? 1.55, 0.8, 3),
      letterSpacing: numberValue(merged.typography?.letterSpacing, fallback.typography.letterSpacing ?? 0, -1, 2),
      headingLineHeight: numberValue(merged.typography?.headingLineHeight, fallback.typography.headingLineHeight ?? 1.04, 0.8, 2),
      paragraphWidth: numberValue(merged.typography?.paragraphWidth, fallback.typography.paragraphWidth ?? 680, 260, 1400),
    },
    layout: {
      preset: enumValue(merged.layout?.preset, enumSets.layoutPreset, fallback.layout?.preset ?? 'classic'),
      interfacePreset: enumValue(merged.layout?.interfacePreset, enumSets.interfacePreset, fallback.layout?.interfacePreset ?? 'studio'),
      contentWidth: numberValue(merged.layout?.contentWidth, fallback.layout?.contentWidth ?? 920, 320, 1600),
      cardRadius: numberValue(merged.layout?.cardRadius, fallback.layout?.cardRadius ?? 28, 0, 120),
      cardPadding: numberValue(merged.layout?.cardPadding, fallback.layout?.cardPadding ?? 32, 0, 160),
      cardOpacity: numberValue(merged.layout?.cardOpacity, fallback.layout?.cardOpacity ?? 0.94, 0, 1),
      mediaPosition: enumValue(merged.layout?.mediaPosition, enumSets.mediaPosition, fallback.layout?.mediaPosition ?? 'top'),
      surfaceStyle: enumValue(merged.layout?.surfaceStyle, enumSets.surfaceStyle, fallback.layout?.surfaceStyle ?? 'paper'),
      questionAlign: enumValue(merged.layout?.questionAlign, enumSets.questionAlign, fallback.layout?.questionAlign ?? 'left'),
      verticalAlign: enumValue(merged.layout?.verticalAlign, enumSets.verticalAlign, fallback.layout?.verticalAlign ?? 'center'),
      density: enumValue(merged.layout?.density, enumSets.density, fallback.layout?.density ?? 'balanced'),
      chrome: enumValue(merged.layout?.chrome, enumSets.chrome, fallback.layout?.chrome ?? 'full'),
      blocks: {
        topbar: booleanValue(merged.layout?.blocks?.topbar, fallback.layout?.blocks?.topbar ?? true),
        brand: booleanValue(merged.layout?.blocks?.brand, fallback.layout?.blocks?.brand ?? true),
        logo: booleanValue(merged.layout?.blocks?.logo, fallback.layout?.blocks?.logo ?? true),
        title: booleanValue(merged.layout?.blocks?.title, fallback.layout?.blocks?.title ?? true),
        progress: booleanValue(merged.layout?.blocks?.progress, fallback.layout?.blocks?.progress ?? true),
        timer: booleanValue(merged.layout?.blocks?.timer, fallback.layout?.blocks?.timer ?? true),
        description: booleanValue(merged.layout?.blocks?.description, fallback.layout?.blocks?.description ?? true),
        media: booleanValue(merged.layout?.blocks?.media, fallback.layout?.blocks?.media ?? true),
        achievements: booleanValue(merged.layout?.blocks?.achievements, fallback.layout?.blocks?.achievements ?? true),
        variables: booleanValue(merged.layout?.blocks?.variables, fallback.layout?.blocks?.variables ?? true),
        stats: booleanValue(merged.layout?.blocks?.stats, fallback.layout?.blocks?.stats ?? true),
        resultStats: booleanValue(merged.layout?.blocks?.resultStats, fallback.layout?.blocks?.resultStats ?? true),
        backgroundDecor: booleanValue(merged.layout?.blocks?.backgroundDecor, fallback.layout?.blocks?.backgroundDecor ?? true),
      },
      ...(elementOrder ? { elementOrder } : {}),
    },
    questionCard: {
      backgroundColor: stringValue(merged.questionCard?.backgroundColor, fallback.questionCard?.backgroundColor ?? '#fffefa'),
      borderColor: stringValue(merged.questionCard?.borderColor, fallback.questionCard?.borderColor ?? '#dfd8cc'),
      textColor: stringValue(merged.questionCard?.textColor, fallback.questionCard?.textColor ?? '#24211c'),
      radius: numberValue(merged.questionCard?.radius, fallback.questionCard?.radius ?? 28, 0, 120),
      padding: numberValue(merged.questionCard?.padding, fallback.questionCard?.padding ?? 32, 0, 160),
      shadow: enumValue(merged.questionCard?.shadow, enumSets.shadow, fallback.questionCard?.shadow ?? 'none'),
      mediaPosition: enumValue(merged.questionCard?.mediaPosition, enumSets.mediaPosition, fallback.questionCard?.mediaPosition ?? 'top'),
      mediaWidth: numberValue(merged.questionCard?.mediaWidth, fallback.questionCard?.mediaWidth ?? 42, 0, 100),
      mediaRadius: numberValue(merged.questionCard?.mediaRadius, fallback.questionCard?.mediaRadius ?? 22, 0, 120),
      mediaFit: enumValue(merged.questionCard?.mediaFit, enumValues(['cover', 'contain'] as const), fallback.questionCard?.mediaFit ?? 'cover'),
    },
    buttons: {
      backgroundColor: stringValue(merged.buttons?.backgroundColor, fallback.buttons.backgroundColor),
      textColor: stringValue(merged.buttons?.textColor, fallback.buttons.textColor),
      hoverBackgroundColor: stringValue(merged.buttons?.hoverBackgroundColor, fallback.buttons.hoverBackgroundColor),
      hoverTextColor: stringValue(merged.buttons?.hoverTextColor, fallback.buttons.hoverTextColor),
      borderRadius: numberValue(merged.buttons?.borderRadius, fallback.buttons.borderRadius, 0, 120),
      style: enumValue(merged.buttons?.style, enumSets.buttonStyle, fallback.buttons.style ?? 'solid'),
      height: numberValue(merged.buttons?.height, fallback.buttons.height ?? 52, 0, 160),
      shadow: enumValue(merged.buttons?.shadow, enumSets.shadow, fallback.buttons.shadow ?? 'soft'),
      fontWeight: numberValue(merged.buttons?.fontWeight, fallback.buttons.fontWeight ?? 800, 100, 1000),
      width: enumValue(merged.buttons?.width, enumSets.buttonWidth, fallback.buttons.width ?? 'auto'),
      textTransform: enumValue(merged.buttons?.textTransform, enumSets.textTransform, fallback.buttons.textTransform ?? 'none'),
    },
    answerCards: {
      backgroundColor: stringValue(merged.answerCards?.backgroundColor, fallback.answerCards.backgroundColor),
      textColor: stringValue(merged.answerCards?.textColor, fallback.answerCards.textColor),
      hoverBackgroundColor: stringValue(merged.answerCards?.hoverBackgroundColor, fallback.answerCards.hoverBackgroundColor),
      hoverTextColor: stringValue(merged.answerCards?.hoverTextColor, fallback.answerCards.hoverTextColor),
      selectedBackgroundColor: stringValue(merged.answerCards?.selectedBackgroundColor, fallback.answerCards.selectedBackgroundColor),
      selectedTextColor: stringValue(merged.answerCards?.selectedTextColor, fallback.answerCards.selectedTextColor),
      borderRadius: numberValue(merged.answerCards?.borderRadius, fallback.answerCards.borderRadius, 0, 120),
      style: enumValue(merged.answerCards?.style, enumSets.answerStyle, fallback.answerCards.style ?? 'card'),
      borderColor: stringValue(merged.answerCards?.borderColor, fallback.answerCards.borderColor ?? '#dfd8cc'),
      selectedBorderColor: stringValue(merged.answerCards?.selectedBorderColor, fallback.answerCards.selectedBorderColor ?? fallback.buttons.backgroundColor),
      spacing: numberValue(merged.answerCards?.spacing, fallback.answerCards.spacing ?? 12, 0, 80),
      markerStyle: enumValue(merged.answerCards?.markerStyle, enumSets.markerStyle, fallback.answerCards.markerStyle ?? 'letters'),
      columns: numberValue(merged.answerCards?.columns, fallback.answerCards.columns ?? 1, 1, 3) as 1 | 2 | 3,
      minHeight: numberValue(merged.answerCards?.minHeight, fallback.answerCards.minHeight ?? 58, 0, 240),
      mediaAspectRatio: enumValue(merged.answerCards?.mediaAspectRatio, enumSets.mediaAspectRatio, fallback.answerCards.mediaAspectRatio ?? 'auto'),
    },
    progress: {
      style: enumValue(merged.progress?.style, enumSets.progressStyle, fallback.progress?.style ?? 'bar'),
      position: enumValue(merged.progress?.position, enumSets.progressPosition, fallback.progress?.position ?? 'top'),
      color: stringValue(merged.progress?.color, fallback.progress?.color ?? fallback.buttons.backgroundColor),
      trackColor: stringValue(merged.progress?.trackColor, fallback.progress?.trackColor ?? '#e4ded2'),
      showPercent: booleanValue(merged.progress?.showPercent, fallback.progress?.showPercent ?? true),
      showStepLabel: booleanValue(merged.progress?.showStepLabel, fallback.progress?.showStepLabel ?? true),
      height: numberValue(merged.progress?.height, fallback.progress?.height ?? 8, 0, 80),
    },
    result: {
      preset: enumValue(merged.result?.preset, enumSets.resultPreset, fallback.result?.preset ?? 'card'),
      backgroundColor: stringValue(merged.result?.backgroundColor, fallback.result?.backgroundColor ?? fallback.answerCards.backgroundColor),
      textColor: stringValue(merged.result?.textColor, fallback.result?.textColor ?? fallback.typography.headingColor),
      accentColor: stringValue(merged.result?.accentColor, fallback.result?.accentColor ?? fallback.buttons.backgroundColor),
      showScore: booleanValue(merged.result?.showScore, fallback.result?.showScore ?? true),
      showShare: booleanValue(merged.result?.showShare, fallback.result?.showShare ?? true),
      scoreStyle: enumValue(merged.result?.scoreStyle, enumSets.scoreStyle, fallback.result?.scoreStyle ?? 'badge'),
    },
    advanced: {
      customCss: stringValue(merged.advanced?.customCss, fallback.advanced?.customCss ?? ''),
      reducedMotion: booleanValue(merged.advanced?.reducedMotion, fallback.advanced?.reducedMotion ?? false),
      highContrast: booleanValue(merged.advanced?.highContrast, fallback.advanced?.highContrast ?? false),
    },
    screenQuiz: {
      backgroundPreset: enumValue(merged.screenQuiz?.backgroundPreset, enumSets.screenQuizBackgroundPreset, fallback.screenQuiz?.backgroundPreset ?? 'pop'),
      backgroundImageUrl: stringValue(merged.screenQuiz?.backgroundImageUrl, fallback.screenQuiz?.backgroundImageUrl ?? ''),
      backgroundColor: stringValue(merged.screenQuiz?.backgroundColor, fallback.screenQuiz?.backgroundColor ?? '#9a4bdb'),
      accentColor: stringValue(merged.screenQuiz?.accentColor, fallback.screenQuiz?.accentColor ?? '#ffc928'),
      secondaryColor: stringValue(merged.screenQuiz?.secondaryColor, fallback.screenQuiz?.secondaryColor ?? '#7c5ce7'),
      panelColor: stringValue(merged.screenQuiz?.panelColor, fallback.screenQuiz?.panelColor ?? '#f1eef6'),
      answerColor: stringValue(merged.screenQuiz?.answerColor, fallback.screenQuiz?.answerColor ?? '#eeeeec'),
      inkColor: stringValue(merged.screenQuiz?.inkColor, fallback.screenQuiz?.inkColor ?? '#050305'),
      correctColor: stringValue(merged.screenQuiz?.correctColor, fallback.screenQuiz?.correctColor ?? '#18c900'),
      borderWidth: numberValue(merged.screenQuiz?.borderWidth, fallback.screenQuiz?.borderWidth ?? 10, 0, 80),
      radius: numberValue(merged.screenQuiz?.radius, fallback.screenQuiz?.radius ?? 54, 0, 160),
      decorIntensity: numberValue(merged.screenQuiz?.decorIntensity, fallback.screenQuiz?.decorIntensity ?? 1, 0, 2),
      motion: enumValue(merged.screenQuiz?.motion, enumSets.screenQuizMotion, fallback.screenQuiz?.motion ?? 'premium'),
      transitionEffect: enumValue(merged.screenQuiz?.transitionEffect, enumSets.screenQuizTransitionEffect, fallback.screenQuiz?.transitionEffect ?? 'swipe-reveal'),
      layout: enumValue(merged.screenQuiz?.layout, enumSets.screenQuizLayout, fallback.screenQuiz?.layout ?? 'auto'),
      timerSeconds: numberValue(merged.screenQuiz?.timerSeconds, fallback.screenQuiz?.timerSeconds ?? 30, 0, 600),
      showTimer: booleanValue(merged.screenQuiz?.showTimer, fallback.screenQuiz?.showTimer ?? true),
      showStoryTimer: booleanValue(merged.screenQuiz?.showStoryTimer, fallback.screenQuiz?.showStoryTimer ?? true),
      timelineMode: enumValue(merged.screenQuiz?.timelineMode, enumSets.screenQuizTimelineMode, fallback.screenQuiz?.timelineMode ?? 'auto'),
      holdSeconds: numberValue(merged.screenQuiz?.holdSeconds, fallback.screenQuiz?.holdSeconds ?? 1.2, 0, 60),
      revealSeconds: numberValue(merged.screenQuiz?.revealSeconds, fallback.screenQuiz?.revealSeconds ?? 1.4, 0, 60),
      transitionMs: numberValue(merged.screenQuiz?.transitionMs, fallback.screenQuiz?.transitionMs ?? 340, 0, 10000),
      introEnabled: booleanValue(merged.screenQuiz?.introEnabled, fallback.screenQuiz?.introEnabled ?? true),
      introTiming: enumValue(merged.screenQuiz?.introTiming, enumSets.screenQuizIntroTiming, fallback.screenQuiz?.introTiming ?? 'auto'),
      introQuestionMs: numberValue(merged.screenQuiz?.introQuestionMs, fallback.screenQuiz?.introQuestionMs ?? 2800, 0, 60000),
      introAnswerMs: numberValue(merged.screenQuiz?.introAnswerMs, fallback.screenQuiz?.introAnswerMs ?? 1800, 0, 60000),
      introMediaMs: numberValue(merged.screenQuiz?.introMediaMs, fallback.screenQuiz?.introMediaMs ?? 900, 0, 60000),
      introGapMs: numberValue(merged.screenQuiz?.introGapMs, fallback.screenQuiz?.introGapMs ?? 280, 0, 60000),
    },
    sound: {
      volume: numberValue(merged.sound?.volume, fallback.sound.volume, 0, 1),
      backgroundMusic: stringValue(merged.sound?.backgroundMusic, fallback.sound.backgroundMusic ?? ''),
      musicVolume: numberValue(merged.sound?.musicVolume, fallback.sound.musicVolume ?? fallback.sound.volume, 0, 1),
      voiceVolume: numberValue(merged.sound?.voiceVolume, fallback.sound.voiceVolume ?? 0.8, 0, 1),
      sfxVolume: numberValue(merged.sound?.sfxVolume, fallback.sound.sfxVolume ?? 0.75, 0, 1),
      tickVolume: numberValue(merged.sound?.tickVolume, fallback.sound.tickVolume ?? 0.45, 0, 1),
      buttonClick: stringValue(merged.sound?.buttonClick, fallback.sound.buttonClick ?? ''),
      correctAnswer: stringValue(merged.sound?.correctAnswer, fallback.sound.correctAnswer ?? ''),
      incorrectAnswer: stringValue(merged.sound?.incorrectAnswer, fallback.sound.incorrectAnswer ?? ''),
      achievementUnlock: stringValue(merged.sound?.achievementUnlock, fallback.sound.achievementUnlock ?? ''),
      screenQuizIntro: stringValue(merged.sound?.screenQuizIntro, fallback.sound.screenQuizIntro ?? ''),
      screenQuizTick: stringValue(merged.sound?.screenQuizTick, fallback.sound.screenQuizTick ?? ''),
      screenQuizReveal: stringValue(merged.sound?.screenQuizReveal, fallback.sound.screenQuizReveal ?? ''),
      screenQuizTransition: stringValue(merged.sound?.screenQuizTransition, fallback.sound.screenQuizTransition ?? ''),
    },
  };

  return {
    ...normalized,
    ...(elementOverrides ? { elementOverrides } : {}),
  } as DesignSettings;
}

function brandKitPatch(brandKit: DesignBrandKit | undefined): DeepPartial<DesignSettings> | undefined {
  if (!brandKit) return undefined;
  return {
    brand: {
      logoUrl: brandKit.logoUrl ?? undefined,
      primaryColor: brandKit.primaryColor ?? undefined,
      accentColor: brandKit.accentColor ?? undefined,
      neutralColor: brandKit.neutralColor ?? undefined,
    },
    typography: {
      fontFamily: brandKit.fontFamily ?? undefined,
      displayFontFamily: brandKit.displayFontFamily ?? undefined,
    },
  };
}

export function getTemplateDesignBase(templateId: QuizTemplateId): DeepPartial<DesignSettings> | undefined {
  return TEMPLATE_DESIGN_BASES[templateId];
}

export function resolveDesign({
  defaults = DEFAULT_DESIGN_SETTINGS,
  template,
  stylePreset,
  brandKit,
  overrides,
}: ResolveDesignInput): DesignSettings {
  const normalizedDefaults = normalizeDesignSettings(defaults, DEFAULT_DESIGN_SETTINGS);
  const templateBase = normalizeDesignSettings(template, normalizedDefaults);
  const styledBase = stylePreset
    ? normalizeDesignSettings(stylePreset, normalizedDefaults)
    : templateBase;
  const withTemplate = stylePreset ? mergeDefined(templateBase, styledBase) : styledBase;
  const withBrand = mergeDefined(withTemplate, brandKitPatch(brandKit));
  return normalizeDesignSettings(overrides, withBrand);
}

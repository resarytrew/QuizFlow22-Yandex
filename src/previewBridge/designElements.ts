export type DesignElementRole =
  | 'canvas-background'
  | 'quiz-shell'
  | 'topbar'
  | 'brand'
  | 'logo'
  | 'quiz-title'
  | 'progress'
  | 'timer'
  | 'question-card'
  | 'question-title'
  | 'question-description'
  | 'media'
  | 'answers-container'
  | 'answer-card'
  | 'primary-action'
  | 'achievements'
  | 'variables'
  | 'stats'
  | 'result-card'
  | 'result-title'
  | 'result-score'
  | 'result-action';

export type DesignElementScope = 'screen' | 'global' | 'result';
export type DesignElementLayoutBehavior = 'auto' | 'free' | 'both';
export type DesignElementProperty =
  | 'background'
  | 'border'
  | 'radius'
  | 'padding'
  | 'shadow'
  | 'typography'
  | 'color'
  | 'size'
  | 'spacing'
  | 'visibility'
  | 'media-fit'
  | 'progress'
  | 'timer'
  | 'score';

export interface DesignElementRegistryEntry {
  readonly role: DesignElementRole;
  readonly label: string;
  readonly icon: string;
  readonly properties: readonly DesignElementProperty[];
  readonly movable: boolean;
  readonly resizable: boolean;
  readonly hideable: boolean;
  readonly minSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly required: boolean;
  readonly scopes: readonly DesignElementScope[];
  readonly layoutBehavior: DesignElementLayoutBehavior;
}

const commonTextProperties = ['typography', 'color', 'spacing'] as const;
const commonSurfaceProperties = ['background', 'border', 'radius', 'padding', 'shadow'] as const;

export const DESIGN_ELEMENT_REGISTRY: Record<DesignElementRole, DesignElementRegistryEntry> = {
  'canvas-background': {
    role: 'canvas-background',
    label: 'Фон экрана',
    icon: 'PanelTop',
    properties: ['background', 'media-fit'],
    movable: false,
    resizable: false,
    hideable: false,
    minSize: { width: 320, height: 480 },
    required: true,
    scopes: ['global', 'screen'],
    layoutBehavior: 'auto',
  },
  'quiz-shell': {
    role: 'quiz-shell',
    label: 'Оболочка квиза',
    icon: 'PanelTopOpen',
    properties: ['background', 'border', 'radius', 'padding', 'shadow', 'spacing'],
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 320, height: 320 },
    required: true,
    scopes: ['global', 'screen'],
    layoutBehavior: 'both',
  },
  topbar: {
    role: 'topbar',
    label: 'Верхняя панель',
    icon: 'PanelTop',
    properties: ['background', 'border', 'padding', 'visibility'],
    movable: false,
    resizable: false,
    hideable: true,
    minSize: { width: 280, height: 44 },
    required: false,
    scopes: ['global', 'screen'],
    layoutBehavior: 'auto',
  },
  brand: {
    role: 'brand',
    label: 'Бренд',
    icon: 'Badge',
    properties: ['typography', 'color', 'spacing', 'visibility'],
    movable: false,
    resizable: false,
    hideable: true,
    minSize: { width: 80, height: 32 },
    required: false,
    scopes: ['global'],
    layoutBehavior: 'auto',
  },
  logo: {
    role: 'logo',
    label: 'Логотип',
    icon: 'Image',
    properties: ['size', 'media-fit', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 24, height: 24 },
    required: false,
    scopes: ['global'],
    layoutBehavior: 'both',
  },
  'quiz-title': {
    role: 'quiz-title',
    label: 'Название квиза',
    icon: 'Heading',
    properties: commonTextProperties,
    movable: false,
    resizable: false,
    hideable: true,
    minSize: { width: 120, height: 32 },
    required: false,
    scopes: ['global'],
    layoutBehavior: 'auto',
  },
  progress: {
    role: 'progress',
    label: 'Прогресс',
    icon: 'ChartNoAxesColumn',
    properties: ['progress', 'color', 'size', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 120, height: 8 },
    required: false,
    scopes: ['global', 'screen'],
    layoutBehavior: 'auto',
  },
  timer: {
    role: 'timer',
    label: 'Таймер',
    icon: 'Timer',
    properties: ['timer', 'color', 'size', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 48, height: 24 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'auto',
  },
  'question-card': {
    role: 'question-card',
    label: 'Карточка вопроса',
    icon: 'PanelTop',
    properties: commonSurfaceProperties,
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 280, height: 180 },
    required: true,
    scopes: ['screen'],
    layoutBehavior: 'both',
  },
  'question-title': {
    role: 'question-title',
    label: 'Заголовок вопроса',
    icon: 'Heading1',
    properties: commonTextProperties,
    movable: false,
    resizable: false,
    hideable: false,
    minSize: { width: 160, height: 36 },
    required: true,
    scopes: ['screen'],
    layoutBehavior: 'auto',
  },
  'question-description': {
    role: 'question-description',
    label: 'Описание вопроса',
    icon: 'AlignLeft',
    properties: commonTextProperties,
    movable: false,
    resizable: false,
    hideable: true,
    minSize: { width: 160, height: 40 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'auto',
  },
  media: {
    role: 'media',
    label: 'Медиа',
    icon: 'Image',
    properties: ['size', 'radius', 'media-fit', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 160, height: 100 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'both',
  },
  'answers-container': {
    role: 'answers-container',
    label: 'Блок ответов',
    icon: 'ListChecks',
    properties: ['spacing', 'visibility'],
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 240, height: 80 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'both',
  },
  'answer-card': {
    role: 'answer-card',
    label: 'Карточка ответа',
    icon: 'SquareMousePointer',
    properties: ['background', 'border', 'radius', 'padding', 'typography', 'color', 'spacing'],
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 160, height: 44 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'both',
  },
  'primary-action': {
    role: 'primary-action',
    label: 'Основная кнопка',
    icon: 'MousePointerClick',
    properties: ['background', 'border', 'radius', 'padding', 'typography', 'color', 'size'],
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 120, height: 44 },
    required: false,
    scopes: ['screen'],
    layoutBehavior: 'both',
  },
  achievements: {
    role: 'achievements',
    label: 'Достижения',
    icon: 'Trophy',
    properties: ['background', 'border', 'radius', 'typography', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 160, height: 80 },
    required: false,
    scopes: ['screen', 'result'],
    layoutBehavior: 'auto',
  },
  variables: {
    role: 'variables',
    label: 'Переменные',
    icon: 'Braces',
    properties: ['typography', 'color', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 160, height: 40 },
    required: false,
    scopes: ['screen', 'result'],
    layoutBehavior: 'auto',
  },
  stats: {
    role: 'stats',
    label: 'Статистика',
    icon: 'ChartColumn',
    properties: ['background', 'border', 'radius', 'typography', 'color', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 160, height: 80 },
    required: false,
    scopes: ['result'],
    layoutBehavior: 'auto',
  },
  'result-card': {
    role: 'result-card',
    label: 'Карточка результата',
    icon: 'Award',
    properties: commonSurfaceProperties,
    movable: false,
    resizable: true,
    hideable: false,
    minSize: { width: 280, height: 220 },
    required: true,
    scopes: ['result'],
    layoutBehavior: 'both',
  },
  'result-title': {
    role: 'result-title',
    label: 'Заголовок результата',
    icon: 'Heading1',
    properties: commonTextProperties,
    movable: false,
    resizable: false,
    hideable: false,
    minSize: { width: 160, height: 36 },
    required: true,
    scopes: ['result'],
    layoutBehavior: 'auto',
  },
  'result-score': {
    role: 'result-score',
    label: 'Баллы результата',
    icon: 'Gauge',
    properties: ['score', 'typography', 'color', 'background', 'radius', 'visibility'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 80, height: 44 },
    required: false,
    scopes: ['result'],
    layoutBehavior: 'auto',
  },
  'result-action': {
    role: 'result-action',
    label: 'Кнопка результата',
    icon: 'RotateCcw',
    properties: ['background', 'border', 'radius', 'padding', 'typography', 'color', 'size'],
    movable: false,
    resizable: true,
    hideable: true,
    minSize: { width: 120, height: 44 },
    required: false,
    scopes: ['result'],
    layoutBehavior: 'both',
  },
};

export const DESIGN_ELEMENT_ROLES = Object.keys(DESIGN_ELEMENT_REGISTRY) as DesignElementRole[];

const ROLE_SET = new Set<string>(DESIGN_ELEMENT_ROLES);

export function isDesignElementRole(value: unknown): value is DesignElementRole {
  return typeof value === 'string' && ROLE_SET.has(value);
}

export function getDesignElementEntry(role: DesignElementRole): DesignElementRegistryEntry {
  return DESIGN_ELEMENT_REGISTRY[role];
}

export function sanitizeDesignElementId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180) return null;
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed) ? trimmed : null;
}

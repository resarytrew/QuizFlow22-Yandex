import type { DesignSettings } from '../../types';
import type { DesignElementRole } from './elementRegistry';
import {
  getLayoutRoleRule,
  createLayoutDocumentPatch,
  resolveLayoutDocument,
  resolveLayoutDocumentForBreakpoint,
  type LayoutBreakpoint,
  type LayoutDocument,
  type LayoutElement,
  type LayoutScopeContext,
} from './layoutDocument';
import {
  createAutoAdaptLayoutPatch,
  createAutoLayoutResponsivePatch,
  DEVICE_VIEWPORTS,
  type PreviewViewport,
} from './responsiveLayout';

export type DesignQualitySeverity = 'error' | 'warning' | 'recommendation';

export type DesignQualityCode =
  | 'element-out-of-scene'
  | 'required-hidden'
  | 'cta-hidden'
  | 'form-inaccessible'
  | 'text-overflow'
  | 'heading-clipped'
  | 'low-contrast'
  | 'touch-target-small'
  | 'horizontal-scroll'
  | 'columns-too-many'
  | 'z-index-conflict'
  | 'zero-size-image'
  | 'answers-overlap'
  | 'tab-order'
  | 'element-order-invalid'
  | 'unsupported-property'
  | 'free-layout-mobile-missing';

export interface DesignQualityIssue {
  id: string;
  code: DesignQualityCode;
  severity: DesignQualitySeverity;
  message: string;
  elementId?: string;
  role?: DesignElementRole;
  nodeId?: string | null;
  breakpoint: LayoutBreakpoint;
  propertyPath?: string;
  fixable?: boolean;
}

export interface DesignQualitySummary {
  errors: number;
  warnings: number;
  recommendations: number;
  issues: DesignQualityIssue[];
}

export interface DesignQualityContext {
  breakpoint?: LayoutBreakpoint;
  viewport?: PreviewViewport;
  nodeId?: string | null;
  nodeType?: string | null;
  templateId?: string;
}

const MIN_TOUCH_TARGET = 44;
const VISUAL_EDITING_TEMPLATES = new Set(['default', 'newyear', 'screenQuiz']);
const REQUIRED_ORDER: DesignElementRole[] = [
  'question-title',
  'media',
  'question-description',
  'answers-container',
  'primary-action',
];

function issue(
  code: DesignQualityCode,
  severity: DesignQualitySeverity,
  message: string,
  context: DesignQualityContext,
  extra: Partial<DesignQualityIssue> = {},
): DesignQualityIssue {
  const breakpoint = context.breakpoint ?? 'desktop';
  const elementPart = extra.elementId ? `-${extra.elementId}` : '';
  return {
    id: `${breakpoint}-${code}${elementPart}`,
    code,
    severity,
    message,
    breakpoint,
    ...extra,
  };
}

function rectsOverlap(a: LayoutElement, b: LayoutElement): boolean {
  return a.frame.x < b.frame.x + b.frame.width
    && a.frame.x + a.frame.width > b.frame.x
    && a.frame.y < b.frame.y + b.frame.height
    && a.frame.y + a.frame.height > b.frame.y;
}

function parseHexColor(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const int = Number.parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function getContrastRatio(foreground: unknown, background: unknown): number | null {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return null;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function checkLayoutDocument(
  document: LayoutDocument,
  settings: DesignSettings,
  context: DesignQualityContext,
): DesignQualityIssue[] {
  const breakpoint = context.breakpoint ?? 'desktop';
  const viewport = context.viewport ?? DEVICE_VIEWPORTS[breakpoint];
  const resolved = resolveLayoutDocumentForBreakpoint(document, breakpoint);
  const issues: DesignQualityIssue[] = [];
  const visibleElements = Object.values(resolved.elements).filter((element) => !element.hidden);

  for (const element of Object.values(resolved.elements)) {
    const rule = getLayoutRoleRule(element.role);
    const isOut = element.frame.x < 0
      || element.frame.y < 0
      || element.frame.x + element.frame.width > resolved.baseViewport.width
      || element.frame.y + element.frame.height > resolved.baseViewport.height;
    if (isOut) {
      issues.push(issue('element-out-of-scene', 'error', 'Элемент выходит за границы сцены.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.frame',
        fixable: true,
      }));
      issues.push(issue('horizontal-scroll', 'warning', 'Элемент может создать горизонтальный скролл.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.frame.x',
        fixable: true,
      }));
    }
    if (rule.required && element.hidden) {
      issues.push(issue('required-hidden', 'error', 'Обязательный элемент скрыт.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.hidden',
      }));
    }
    if ((element.role === 'primary-action' || element.role === 'result-action') && element.hidden) {
      issues.push(issue('cta-hidden', 'error', 'CTA-кнопка скрыта, прохождение может быть заблокировано.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.hidden',
      }));
    }
    if (element.role === 'media' && (element.frame.width <= 1 || element.frame.height <= 1)) {
      issues.push(issue('zero-size-image', 'warning', 'Изображение имеет нулевой или почти нулевой размер.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.frame',
        fixable: true,
      }));
    }
    if (
      (element.role === 'primary-action' || element.role === 'result-action' || element.role === 'answer-card')
      && (element.frame.width < MIN_TOUCH_TARGET || element.frame.height < MIN_TOUCH_TARGET)
    ) {
      issues.push(issue('touch-target-small', 'warning', 'Зона нажатия меньше 44 px.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'layout.frame',
        fixable: true,
      }));
    }
    if (element.role === 'question-title' && (element.frame.width < 180 || element.frame.height < 36)) {
      issues.push(issue('heading-clipped', 'warning', 'Заголовок может обрезаться.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'typography',
        fixable: true,
      }));
    }
    if ((element.role === 'question-description' || element.role === 'question-title') && element.frame.width < 140) {
      issues.push(issue('text-overflow', 'warning', 'Текстовый блок слишком узкий и может переполниться.', context, {
        elementId: element.id,
        role: element.role,
        propertyPath: 'typography.maxWidth',
        fixable: true,
      }));
    }
  }

  const action = visibleElements.find((element) => element.role === 'primary-action');
  const answers = visibleElements.find((element) => element.role === 'answers-container');
  if (action && answers && rectsOverlap(action, answers)) {
    issues.push(issue('answers-overlap', 'error', 'CTA перекрывает контейнер ответов.', context, {
      elementId: action.id,
      role: action.role,
      propertyPath: 'layout.frame',
      fixable: true,
    }));
  }

  for (let i = 0; i < visibleElements.length; i += 1) {
    for (let j = i + 1; j < visibleElements.length; j += 1) {
      const a = visibleElements[i];
      const b = visibleElements[j];
      if ((a.zIndex ?? 0) === (b.zIndex ?? 0) && a.role !== 'canvas-background' && b.role !== 'canvas-background' && rectsOverlap(a, b)) {
        issues.push(issue('z-index-conflict', 'recommendation', 'Элементы перекрываются с одинаковым z-index.', context, {
          elementId: b.id,
          role: b.role,
          propertyPath: 'layout.zIndex',
        }));
      }
    }
  }

  if (document.mode === 'free' && breakpoint === 'mobile' && !document.breakpoints?.mobile) {
    issues.push(issue('free-layout-mobile-missing', 'warning', 'Свободный макет не адаптирован под Mobile.', context, {
      propertyPath: 'layoutDocuments.breakpoints.mobile',
      fixable: true,
    }));
  }

  if (viewport.width < 430) {
    const unsafe = visibleElements.find((element) => element.role === 'primary-action' && element.frame.width < 160);
    if (unsafe) {
      issues.push(issue('form-inaccessible', 'warning', 'На мобильном экране ключевое действие может быть трудно нажать.', context, {
        elementId: unsafe.id,
        role: unsafe.role,
        propertyPath: 'layout.frame.width',
        fixable: true,
      }));
    }
  }

  return issues;
}

export function checkDesignQuality(
  settings: DesignSettings,
  context: DesignQualityContext = {},
): DesignQualitySummary {
  const breakpoint = context.breakpoint ?? 'desktop';
  const issues: DesignQualityIssue[] = [];
  const layoutContext = {
    nodeId: context.nodeId,
    nodeType: context.nodeType,
  };
  const document = resolveLayoutDocument(settings, layoutContext);

  if (document) {
    issues.push(...checkLayoutDocument(document, settings, { ...context, breakpoint }));
  }

  const order = (settings as { layout?: { elementOrder?: unknown } }).layout?.elementOrder;
  if (Array.isArray(order)) {
    const seen = new Set<unknown>();
    const invalid = order.some((item) => {
      if (seen.has(item)) return true;
      seen.add(item);
      return !REQUIRED_ORDER.includes(item as DesignElementRole);
    });
    if (invalid) {
      issues.push(issue('element-order-invalid', 'warning', 'Порядок элементов содержит дубли или неподдерживаемые роли.', { ...context, breakpoint }, {
        propertyPath: 'layout.elementOrder',
        fixable: true,
      }));
    }
    const actionIndex = order.indexOf('primary-action');
    const answersIndex = order.indexOf('answers-container');
    if (actionIndex >= 0 && answersIndex >= 0 && actionIndex < answersIndex) {
      issues.push(issue('tab-order', 'recommendation', 'CTA стоит перед ответами, tab order может быть нелогичным.', { ...context, breakpoint }, {
        propertyPath: 'layout.elementOrder',
        fixable: true,
      }));
    }
  }

  const contrast = getContrastRatio(
    (settings as { questionCard?: { textColor?: string } }).questionCard?.textColor
      ?? (settings as { typography?: { bodyTextColor?: string } }).typography?.bodyTextColor,
    (settings as { questionCard?: { backgroundColor?: string } }).questionCard?.backgroundColor,
  );
  if (contrast !== null && contrast < 4.5) {
    issues.push(issue('low-contrast', 'warning', 'Контраст текста ниже рекомендованного уровня.', { ...context, breakpoint }, {
      role: 'question-card',
      propertyPath: 'questionCard.textColor',
    }));
  }

  const answerColumns = (settings as { answerCards?: { columns?: number } }).answerCards?.columns;
  if (breakpoint === 'mobile' && typeof answerColumns === 'number' && answerColumns > 1) {
    issues.push(issue('columns-too-many', 'warning', 'На мобильном экране лучше использовать одну колонку ответов.', { ...context, breakpoint }, {
      role: 'answers-container',
      propertyPath: 'answerCards.columns',
      fixable: true,
    }));
  }

  if (context.templateId && !VISUAL_EDITING_TEMPLATES.has(context.templateId) && document) {
    issues.push(issue('unsupported-property', 'recommendation', 'Для этого шаблона визуальное редактирование поддерживается частично.', { ...context, breakpoint }, {
      propertyPath: 'layoutDocuments',
    }));
  }

  return {
    issues,
    errors: issues.filter((item) => item.severity === 'error').length,
    warnings: issues.filter((item) => item.severity === 'warning').length,
    recommendations: issues.filter((item) => item.severity === 'recommendation').length,
  };
}

export function createDesignQualityFixPatch(
  settings: DesignSettings,
  context: LayoutScopeContext & { breakpoint?: LayoutBreakpoint },
  issue: DesignQualityIssue,
): Partial<DesignSettings> | null {
  const breakpoint = issue.breakpoint;
  if (issue.code === 'columns-too-many') return createAutoLayoutResponsivePatch(breakpoint);
  if (issue.code === 'element-order-invalid' || issue.code === 'tab-order') {
    return { layout: { elementOrder: REQUIRED_ORDER } as never };
  }
  if (issue.code === 'free-layout-mobile-missing' && breakpoint === 'mobile') {
    return createAutoAdaptLayoutPatch(settings, context, 'mobile') as Partial<DesignSettings> | null;
  }

  const document = resolveLayoutDocument(settings, context);
  if (!document || !issue.elementId) return null;
  const element = resolveLayoutDocumentForBreakpoint(document, breakpoint).elements[issue.elementId];
  if (!element) return null;
  const nextFrame = { ...element.frame };

  if (issue.code === 'element-out-of-scene' || issue.code === 'horizontal-scroll') {
    nextFrame.x = Math.max(0, Math.min(nextFrame.x, document.baseViewport.width - nextFrame.width));
    nextFrame.y = Math.max(0, Math.min(nextFrame.y, document.baseViewport.height - nextFrame.height));
  }
  if (issue.code === 'touch-target-small' || issue.code === 'form-inaccessible') {
    nextFrame.width = Math.max(nextFrame.width, issue.code === 'form-inaccessible' ? 160 : MIN_TOUCH_TARGET);
    nextFrame.height = Math.max(nextFrame.height, MIN_TOUCH_TARGET);
  }
  if (issue.code === 'zero-size-image') {
    nextFrame.width = Math.max(nextFrame.width, 160);
    nextFrame.height = Math.max(nextFrame.height, 120);
  }
  if (issue.code === 'heading-clipped' || issue.code === 'text-overflow') {
    nextFrame.width = Math.max(nextFrame.width, 240);
    nextFrame.height = Math.max(nextFrame.height, 56);
  }
  if (issue.code === 'answers-overlap') {
    nextFrame.y = Math.min(document.baseViewport.height - nextFrame.height, element.frame.y + 72);
  }

  return createLayoutDocumentPatch(settings, context, {
    ...document,
    elements: {
      ...document.elements,
      [issue.elementId]: {
        ...document.elements[issue.elementId],
        frame: nextFrame,
      },
    },
  }) as Partial<DesignSettings>;
}

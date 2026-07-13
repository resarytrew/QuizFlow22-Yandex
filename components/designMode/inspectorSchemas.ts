import type { DesignElementRole } from '../../src/designMode/elementRegistry';
import type { DesignControlStorage } from '../../src/designMode/designElementOverrides';
import { DEFAULT_ELEMENT_ORDER } from '../../src/designMode/designElementOverrides';

export type InspectorControlType = 'color' | 'range' | 'select' | 'text' | 'url' | 'checkbox' | 'order';

export interface InspectorControlOption {
  value: string;
  label: string;
}

export interface InspectorControlSchema {
  id: string;
  label: string;
  type: InspectorControlType;
  path: string;
  storage: DesignControlStorage;
  defaultValue: string | number | boolean | string[];
  min?: number;
  max?: number;
  step?: number;
  options?: InspectorControlOption[];
  placeholder?: string;
  coalesce?: boolean;
}

export interface InspectorSectionSchema {
  title: string;
  controls: InspectorControlSchema[];
}

export interface InspectorSchema {
  role: DesignElementRole;
  title: string;
  sections: InspectorSectionSchema[];
}

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Слева' },
  { value: 'center', label: 'По центру' },
];

const SHADOW_OPTIONS = [
  { value: 'none', label: 'Без тени' },
  { value: 'soft', label: 'Мягкая' },
  { value: 'strong', label: 'Сильная' },
];

const MEDIA_POSITION_OPTIONS = [
  { value: 'top', label: 'Изображение над заголовком' },
  { value: 'left', label: 'Изображение слева' },
  { value: 'right', label: 'Изображение справа' },
  { value: 'background', label: 'Изображение фоном' },
];

const typographyControls: InspectorControlSchema[] = [
  { id: 'font-family', label: 'Шрифт', type: 'text', path: 'typography.fontFamily', storage: 'design', defaultValue: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'display-font', label: 'Заголовочный шрифт', type: 'text', path: 'typography.displayFontFamily', storage: 'design', defaultValue: "'Newsreader', Georgia, serif" },
  { id: 'font-size', label: 'Размер', type: 'range', path: 'typography.headingScale', storage: 'design', defaultValue: 1, min: 0.6, max: 1.8, step: 0.05, coalesce: true },
  { id: 'font-weight', label: 'Вес', type: 'range', path: 'typography.headingWeight', storage: 'design', defaultValue: 650, min: 100, max: 1000, step: 50, coalesce: true },
  { id: 'line-height', label: 'Line-height', type: 'range', path: 'typography.headingLineHeight', storage: 'design', defaultValue: 1.04, min: 0.8, max: 1.8, step: 0.02, coalesce: true },
  { id: 'letter-spacing', label: 'Letter-spacing', type: 'range', path: 'typography.letterSpacing', storage: 'design', defaultValue: 0, min: -1, max: 2, step: 0.05, coalesce: true },
  { id: 'heading-color', label: 'Цвет', type: 'color', path: 'typography.headingColor', storage: 'design', defaultValue: '#1d1a16' },
  { id: 'text-align', label: 'Выравнивание', type: 'select', path: 'layout.questionAlign', storage: 'design', defaultValue: 'left', options: ALIGN_OPTIONS },
  { id: 'max-width', label: 'Максимальная ширина', type: 'range', path: 'typography.paragraphWidth', storage: 'design', defaultValue: 680, min: 260, max: 1400, step: 20, coalesce: true },
  { id: 'title-hidden', label: 'Скрыть, если допустимо', type: 'checkbox', path: 'visibility.hidden', storage: 'element', defaultValue: false },
];

const mediaControls: InspectorControlSchema[] = [
  { id: 'media-source', label: 'Источник', type: 'url', path: 'media.source', storage: 'element', defaultValue: '', placeholder: 'https://...' },
  { id: 'media-fit', label: 'Object-fit', type: 'select', path: 'questionCard.mediaFit', storage: 'design', defaultValue: 'cover', options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }] },
  { id: 'media-aspect', label: 'Aspect ratio', type: 'select', path: 'media.aspectRatio', storage: 'element', defaultValue: 'auto', options: [{ value: 'auto', label: 'Auto' }, { value: '16/9', label: '16:9' }, { value: '4/3', label: '4:3' }, { value: '1/1', label: '1:1' }] },
  { id: 'media-width', label: 'Ширина', type: 'range', path: 'questionCard.mediaWidth', storage: 'design', defaultValue: 42, min: 0, max: 100, step: 1, coalesce: true },
  { id: 'media-height', label: 'Высота', type: 'range', path: 'media.height', storage: 'element', defaultValue: 320, min: 80, max: 900, step: 10, coalesce: true },
  { id: 'media-radius', label: 'Radius', type: 'range', path: 'questionCard.mediaRadius', storage: 'design', defaultValue: 22, min: 0, max: 120, step: 1, coalesce: true },
  { id: 'media-position', label: 'Положение', type: 'select', path: 'questionCard.mediaPosition', storage: 'design', defaultValue: 'top', options: MEDIA_POSITION_OPTIONS },
  { id: 'media-alt', label: 'Альтернативный текст', type: 'text', path: 'media.altText', storage: 'element', defaultValue: '' },
  { id: 'media-hidden', label: 'Скрыть', type: 'checkbox', path: 'visibility.hidden', storage: 'element', defaultValue: false },
];

const surfaceControls: InspectorControlSchema[] = [
  { id: 'surface-bg', label: 'Фон', type: 'color', path: 'questionCard.backgroundColor', storage: 'design', defaultValue: '#fffefa' },
  { id: 'surface-border', label: 'Рамка', type: 'color', path: 'questionCard.borderColor', storage: 'design', defaultValue: '#dfd8cc' },
  { id: 'surface-radius', label: 'Radius', type: 'range', path: 'questionCard.radius', storage: 'design', defaultValue: 28, min: 0, max: 120, step: 1, coalesce: true },
  { id: 'surface-padding', label: 'Padding', type: 'range', path: 'questionCard.padding', storage: 'design', defaultValue: 32, min: 0, max: 160, step: 2, coalesce: true },
  { id: 'surface-shadow', label: 'Shadow', type: 'select', path: 'questionCard.shadow', storage: 'design', defaultValue: 'none', options: SHADOW_OPTIONS },
  { id: 'surface-opacity', label: 'Opacity', type: 'range', path: 'layout.cardOpacity', storage: 'design', defaultValue: 0.94, min: 0, max: 1, step: 0.01, coalesce: true },
  { id: 'surface-width', label: 'Ширина', type: 'range', path: 'layout.contentWidth', storage: 'design', defaultValue: 920, min: 320, max: 1600, step: 20, coalesce: true },
  { id: 'vertical-align', label: 'Vertical alignment', type: 'select', path: 'layout.verticalAlign', storage: 'design', defaultValue: 'center', options: [{ value: 'top', label: 'Сверху' }, { value: 'center', label: 'По центру' }] },
];

const answerControls: InspectorControlSchema[] = [
  { id: 'answer-style', label: 'Вид', type: 'select', path: 'answerCards.style', storage: 'design', defaultValue: 'card', options: [{ value: 'list', label: 'Список' }, { value: 'card', label: 'Карточки' }, { value: 'tiles', label: 'Плитка' }, { value: 'minimal', label: 'Минимальный' }] },
  { id: 'answer-columns', label: 'Количество колонок', type: 'range', path: 'answerCards.columns', storage: 'design', defaultValue: 1, min: 1, max: 3, step: 1, coalesce: true },
  { id: 'answer-gap', label: 'Gap', type: 'range', path: 'answerCards.spacing', storage: 'design', defaultValue: 12, min: 0, max: 80, step: 2, coalesce: true },
  { id: 'answer-min-height', label: 'Минимальная высота', type: 'range', path: 'answerCards.minHeight', storage: 'design', defaultValue: 58, min: 0, max: 240, step: 2, coalesce: true },
  { id: 'answer-bg', label: 'Фон', type: 'color', path: 'answerCards.backgroundColor', storage: 'design', defaultValue: '#fffefa' },
  { id: 'answer-text', label: 'Текст', type: 'color', path: 'answerCards.textColor', storage: 'design', defaultValue: '#24211c' },
  { id: 'answer-hover-bg', label: 'Hover фон', type: 'color', path: 'answerCards.hoverBackgroundColor', storage: 'design', defaultValue: '#f7f4ed' },
  { id: 'answer-selected-bg', label: 'Selected фон', type: 'color', path: 'answerCards.selectedBackgroundColor', storage: 'design', defaultValue: '#e5f0ea' },
  { id: 'answer-border', label: 'Рамка', type: 'color', path: 'answerCards.borderColor', storage: 'design', defaultValue: '#dfd8cc' },
  { id: 'answer-marker', label: 'Маркеры', type: 'select', path: 'answerCards.markerStyle', storage: 'design', defaultValue: 'letters', options: [{ value: 'none', label: 'Нет' }, { value: 'letters', label: 'A/B/C' }, { value: 'numbers', label: '1/2/3' }] },
];

const buttonControls: InspectorControlSchema[] = [
  { id: 'button-style', label: 'Стиль', type: 'select', path: 'buttons.style', storage: 'design', defaultValue: 'solid', options: [{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'soft', label: 'Soft' }, { value: 'premium', label: 'Premium' }] },
  { id: 'button-bg', label: 'Фон', type: 'color', path: 'buttons.backgroundColor', storage: 'design', defaultValue: '#2f5d50' },
  { id: 'button-text', label: 'Текст', type: 'color', path: 'buttons.textColor', storage: 'design', defaultValue: '#ffffff' },
  { id: 'button-hover-bg', label: 'Hover фон', type: 'color', path: 'buttons.hoverBackgroundColor', storage: 'design', defaultValue: '#25493f' },
  { id: 'button-height', label: 'Высота', type: 'range', path: 'buttons.height', storage: 'design', defaultValue: 52, min: 0, max: 160, step: 2, coalesce: true },
  { id: 'button-width', label: 'Ширина', type: 'select', path: 'buttons.width', storage: 'design', defaultValue: 'auto', options: [{ value: 'auto', label: 'Auto' }, { value: 'full', label: 'Full' }] },
  { id: 'button-radius', label: 'Radius', type: 'range', path: 'buttons.borderRadius', storage: 'design', defaultValue: 18, min: 0, max: 120, step: 1, coalesce: true },
  { id: 'button-shadow', label: 'Shadow', type: 'select', path: 'buttons.shadow', storage: 'design', defaultValue: 'soft', options: SHADOW_OPTIONS },
  { id: 'button-weight', label: 'Font weight', type: 'range', path: 'buttons.fontWeight', storage: 'design', defaultValue: 800, min: 100, max: 1000, step: 50, coalesce: true },
  { id: 'button-transform', label: 'Регистр', type: 'select', path: 'buttons.textTransform', storage: 'design', defaultValue: 'none', options: [{ value: 'none', label: 'Как написано' }, { value: 'uppercase', label: 'UPPERCASE' }] },
  { id: 'button-align', label: 'Выравнивание', type: 'select', path: 'layout.align', storage: 'element', defaultValue: 'left', options: ALIGN_OPTIONS },
];

const progressControls: InspectorControlSchema[] = [
  { id: 'progress-style', label: 'Стиль', type: 'select', path: 'progress.style', storage: 'design', defaultValue: 'bar', options: [{ value: 'bar', label: 'Bar' }, { value: 'steps', label: 'Steps' }, { value: 'ring', label: 'Ring' }, { value: 'hidden', label: 'Hidden' }] },
  { id: 'progress-position', label: 'Положение', type: 'select', path: 'progress.position', storage: 'design', defaultValue: 'top', options: [{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }, { value: 'inside', label: 'Inside' }] },
  { id: 'progress-color', label: 'Цвет', type: 'color', path: 'progress.color', storage: 'design', defaultValue: '#2f5d50' },
  { id: 'progress-track', label: 'Track', type: 'color', path: 'progress.trackColor', storage: 'design', defaultValue: '#e4ded2' },
  { id: 'progress-height', label: 'Высота', type: 'range', path: 'progress.height', storage: 'design', defaultValue: 8, min: 0, max: 80, step: 1, coalesce: true },
  { id: 'progress-percent', label: 'Показывать проценты', type: 'checkbox', path: 'progress.showPercent', storage: 'design', defaultValue: true },
  { id: 'progress-step', label: 'Показывать номер шага', type: 'checkbox', path: 'progress.showStepLabel', storage: 'design', defaultValue: true },
];

const resultControls: InspectorControlSchema[] = [
  { id: 'result-preset', label: 'Preset', type: 'select', path: 'result.preset', storage: 'design', defaultValue: 'card', options: [{ value: 'card', label: 'Card' }, { value: 'certificate', label: 'Certificate' }, { value: 'report', label: 'Report' }, { value: 'landing', label: 'Landing' }] },
  { id: 'result-bg', label: 'Фон', type: 'color', path: 'result.backgroundColor', storage: 'design', defaultValue: '#fffefa' },
  { id: 'result-text', label: 'Типографика', type: 'color', path: 'result.textColor', storage: 'design', defaultValue: '#1d1a16' },
  { id: 'result-score-style', label: 'Score style', type: 'select', path: 'result.scoreStyle', storage: 'design', defaultValue: 'badge', options: [{ value: 'badge', label: 'Badge' }, { value: 'ring', label: 'Ring' }, { value: 'stat', label: 'Stat' }] },
  { id: 'result-show-score', label: 'Показывать баллы', type: 'checkbox', path: 'result.showScore', storage: 'design', defaultValue: true },
  { id: 'result-share', label: 'Шаринг', type: 'checkbox', path: 'result.showShare', storage: 'design', defaultValue: true },
  { id: 'result-cta', label: 'CTA', type: 'text', path: 'cta.text', storage: 'element', defaultValue: 'Пройти ещё раз' },
  { id: 'result-radius', label: 'Radius', type: 'range', path: 'questionCard.radius', storage: 'design', defaultValue: 28, min: 0, max: 120, step: 1, coalesce: true },
  { id: 'result-spacing', label: 'Spacing', type: 'range', path: 'layout.spacing', storage: 'element', defaultValue: 24, min: 0, max: 120, step: 2, coalesce: true },
];

const backgroundControls: InspectorControlSchema[] = [
  { id: 'bg-color', label: 'Цвет', type: 'color', path: 'background.color', storage: 'design', defaultValue: '#f6f3ee' },
  { id: 'bg-mode', label: 'Режим', type: 'select', path: 'background.mode', storage: 'design', defaultValue: 'solid', options: [{ value: 'solid', label: 'Цвет' }, { value: 'gradient', label: 'Градиент' }, { value: 'image', label: 'Изображение' }] },
  { id: 'bg-gradient-from', label: 'Градиент от', type: 'color', path: 'background.gradientFrom', storage: 'design', defaultValue: '#f6f3ee' },
  { id: 'bg-gradient-to', label: 'Градиент до', type: 'color', path: 'background.gradientTo', storage: 'design', defaultValue: '#ebe5db' },
  { id: 'bg-image', label: 'Изображение', type: 'url', path: 'background.imageUrl', storage: 'design', defaultValue: '', placeholder: 'https://...' },
  { id: 'bg-overlay', label: 'Overlay', type: 'color', path: 'background.overlayColor', storage: 'design', defaultValue: '#f6f3ee' },
  { id: 'bg-overlay-opacity', label: 'Overlay opacity', type: 'range', path: 'background.overlayOpacity', storage: 'design', defaultValue: 0, min: 0, max: 1, step: 0.01, coalesce: true },
  { id: 'bg-texture', label: 'Texture', type: 'select', path: 'background.texture', storage: 'design', defaultValue: 'grain', options: [{ value: 'none', label: 'Нет' }, { value: 'grain', label: 'Grain' }, { value: 'grid', label: 'Grid' }, { value: 'paper', label: 'Paper' }] },
  { id: 'bg-fit', label: 'Image fit', type: 'select', path: 'background.imageFit', storage: 'design', defaultValue: 'cover', options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'repeat', label: 'Repeat' }] },
];

const orderControls: InspectorControlSchema[] = [
  {
    id: 'element-order',
    label: 'Порядок блоков',
    type: 'order',
    path: 'layout.elementOrder',
    storage: 'design',
    defaultValue: DEFAULT_ELEMENT_ORDER,
    options: [
      { value: 'title-media-description-answers-cta', label: 'Заголовок над изображением' },
      { value: 'media-title-description-answers-cta', label: 'Изображение над заголовком' },
      { value: 'title-description-media-answers-cta', label: 'Описание до изображения' },
      { value: 'title-media-description-answers-cta', label: 'Описание после изображения' },
      { value: 'title-media-description-cta-answers', label: 'Ответы после CTA' },
      { value: 'title-media-description-answers-cta', label: 'CTA после ответов' },
    ],
  },
];

const schemas: Record<DesignElementRole, InspectorSchema> = {
  'canvas-background': { role: 'canvas-background', title: 'Фон', sections: [{ title: 'Фон', controls: backgroundControls }] },
  'quiz-shell': { role: 'quiz-shell', title: 'Оболочка квиза', sections: [{ title: 'Карточка', controls: surfaceControls }, { title: 'Порядок', controls: orderControls }] },
  topbar: { role: 'topbar', title: 'Верхняя панель', sections: [{ title: 'Фон и видимость', controls: [...backgroundControls.slice(0, 2), { id: 'topbar-hidden', label: 'Скрыть', type: 'checkbox', path: 'layout.blocks.topbar', storage: 'design', defaultValue: true }] }] },
  brand: { role: 'brand', title: 'Бренд', sections: [{ title: 'Типографика', controls: typographyControls }] },
  logo: { role: 'logo', title: 'Логотип', sections: [{ title: 'Изображение', controls: mediaControls }] },
  'quiz-title': { role: 'quiz-title', title: 'Название квиза', sections: [{ title: 'Заголовок', controls: typographyControls }, { title: 'Порядок', controls: orderControls }] },
  progress: { role: 'progress', title: 'Прогресс', sections: [{ title: 'Прогресс', controls: progressControls }] },
  timer: { role: 'timer', title: 'Таймер', sections: [{ title: 'Таймер', controls: progressControls.slice(2) }] },
  'question-card': { role: 'question-card', title: 'Карточка вопроса', sections: [{ title: 'Карточка', controls: surfaceControls }, { title: 'Порядок', controls: orderControls }] },
  'question-title': { role: 'question-title', title: 'Заголовок вопроса', sections: [{ title: 'Заголовок', controls: typographyControls }, { title: 'Порядок', controls: orderControls }] },
  'question-description': { role: 'question-description', title: 'Описание вопроса', sections: [{ title: 'Текст', controls: typographyControls }, { title: 'Порядок', controls: orderControls }] },
  media: { role: 'media', title: 'Медиа', sections: [{ title: 'Изображение', controls: mediaControls }, { title: 'Порядок', controls: orderControls }] },
  'answers-container': { role: 'answers-container', title: 'Блок ответов', sections: [{ title: 'Ответы', controls: answerControls }, { title: 'Порядок', controls: orderControls }] },
  'answer-card': { role: 'answer-card', title: 'Карточка ответа', sections: [{ title: 'Ответы', controls: answerControls }] },
  'primary-action': { role: 'primary-action', title: 'Основная кнопка', sections: [{ title: 'Кнопка', controls: buttonControls }, { title: 'Порядок', controls: orderControls }] },
  achievements: { role: 'achievements', title: 'Достижения', sections: [{ title: 'Карточка', controls: surfaceControls }] },
  variables: { role: 'variables', title: 'Переменные', sections: [{ title: 'Текст', controls: typographyControls }] },
  stats: { role: 'stats', title: 'Статистика', sections: [{ title: 'Результат', controls: resultControls }] },
  'result-card': { role: 'result-card', title: 'Карточка результата', sections: [{ title: 'Результат', controls: resultControls }, { title: 'Карточка', controls: surfaceControls }] },
  'result-title': { role: 'result-title', title: 'Заголовок результата', sections: [{ title: 'Заголовок', controls: typographyControls }] },
  'result-score': { role: 'result-score', title: 'Баллы результата', sections: [{ title: 'Результат', controls: resultControls }] },
  'result-action': { role: 'result-action', title: 'Кнопка результата', sections: [{ title: 'Кнопка', controls: buttonControls }] },
};

export function getInspectorSchema(role: DesignElementRole): InspectorSchema {
  return schemas[role];
}

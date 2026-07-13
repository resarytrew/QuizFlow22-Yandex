import type { DesignSettings } from '../../types';
import {
  DEFAULT_DESIGN_SETTINGS,
  type DeepPartial,
  normalizeDesignSettings,
} from '../design/designResolver';

export interface IntegratedDesignStyle {
  id: string;
  name: string;
  description: string;
  settings: DeepPartial<DesignSettings>;
}

export interface CustomDesignStyle {
  id: string;
  name: string;
  description: string;
  settings: DeepPartial<DesignSettings>;
  thumbnail?: string;
  customCss?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ImportedDesignStyle {
  name: string;
  description: string;
  settings: DeepPartial<DesignSettings>;
  thumbnail?: string;
  customCss?: string;
}

export const BUILT_IN_DESIGN_STYLES: IntegratedDesignStyle[] = [
  {
    id: 'lead-form',
    name: 'Бриф / Lead form',
    description: 'Чистая форма с сильным CTA и спокойной карточкой.',
    settings: {
      brand: { experiencePreset: 'leadForm', primaryColor: '#0f766e', accentColor: '#f59e0b', neutralColor: '#10201d' },
      background: { color: '#f5f7f4', mode: 'solid', texture: 'none' },
      typography: { fontFamily: "'Inter', system-ui, sans-serif", displayFontFamily: "'Inter', system-ui, sans-serif", headingColor: '#10201d', bodyTextColor: '#48524f' },
      layout: { preset: 'conversational', interfacePreset: 'form', contentWidth: 840, cardRadius: 22, cardPadding: 30, surfaceStyle: 'paper', density: 'balanced' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#dce7e2', radius: 22, padding: 30, shadow: 'soft' },
      buttons: { backgroundColor: '#0f766e', hoverBackgroundColor: '#115e59', textColor: '#ffffff', borderRadius: 14, style: 'solid', width: 'full' },
      answerCards: { backgroundColor: '#ffffff', hoverBackgroundColor: '#eef7f4', selectedBorderColor: '#0f766e', selectedBackgroundColor: '#dff4ee', borderRadius: 14, markerStyle: 'none' },
    },
  },
  {
    id: 'assessment',
    name: 'Аттестация',
    description: 'Строгий тест с читаемыми вариантами и явным прогрессом.',
    settings: {
      brand: { experiencePreset: 'assessment', primaryColor: '#1d4ed8', accentColor: '#f97316', neutralColor: '#172554' },
      background: { color: '#eef2ff', mode: 'solid', texture: 'grid' },
      typography: { fontFamily: "'Inter', system-ui, sans-serif", displayFontFamily: "'Inter', system-ui, sans-serif", headingColor: '#172554', bodyTextColor: '#334155', headingWeight: 800 },
      layout: { preset: 'assessment', interfacePreset: 'exam', contentWidth: 940, cardRadius: 16, cardPadding: 28, density: 'compact', chrome: 'full' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#c7d2fe', radius: 16, padding: 28, shadow: 'none' },
      answerCards: { backgroundColor: '#f8fafc', hoverBackgroundColor: '#e0e7ff', selectedBackgroundColor: '#dbeafe', selectedBorderColor: '#1d4ed8', borderRadius: 12, markerStyle: 'letters', minHeight: 54 },
      progress: { style: 'steps', color: '#1d4ed8', trackColor: '#c7d2fe', showStepLabel: true },
    },
  },
  {
    id: 'education',
    name: 'Образовательный тест',
    description: 'Тёплый учебный экран с медиа и мягкими ответами.',
    settings: {
      brand: { experiencePreset: 'conversational', primaryColor: '#2563eb', accentColor: '#16a34a', neutralColor: '#1e293b' },
      background: { color: '#f8fafc', mode: 'gradient', gradientFrom: '#eff6ff', gradientTo: '#f7fee7', texture: 'paper' },
      typography: { fontFamily: "'Nunito Sans', system-ui, sans-serif", displayFontFamily: "'Nunito Sans', system-ui, sans-serif", headingColor: '#1e3a8a', bodyTextColor: '#334155' },
      layout: { preset: 'classic', interfacePreset: 'workshop', contentWidth: 920, cardRadius: 26, cardPadding: 32, density: 'balanced' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#dbeafe', radius: 26, padding: 32, mediaPosition: 'top', mediaRadius: 22, shadow: 'soft' },
      buttons: { backgroundColor: '#2563eb', hoverBackgroundColor: '#1d4ed8', borderRadius: 16, style: 'soft' },
      answerCards: { backgroundColor: '#ffffff', hoverBackgroundColor: '#eff6ff', selectedBackgroundColor: '#dcfce7', selectedBorderColor: '#16a34a', borderRadius: 18 },
    },
  },
  {
    id: 'product-selector',
    name: 'Подбор продукта',
    description: 'Сканируемый продуктовый flow с акцентом на варианты.',
    settings: {
      brand: { experiencePreset: 'leadForm', primaryColor: '#7c3aed', accentColor: '#06b6d4', neutralColor: '#18181b' },
      background: { color: '#f5f3ff', mode: 'solid', texture: 'none' },
      typography: { fontFamily: "'Inter', system-ui, sans-serif", displayFontFamily: "'Inter', system-ui, sans-serif", headingColor: '#2e1065', bodyTextColor: '#4c1d95' },
      layout: { preset: 'split', interfacePreset: 'product', contentWidth: 1040, cardRadius: 20, cardPadding: 30, mediaPosition: 'right' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#ddd6fe', radius: 20, padding: 30, mediaPosition: 'right', mediaWidth: 38, shadow: 'soft' },
      answerCards: { style: 'tiles', columns: 2, backgroundColor: '#ffffff', hoverBackgroundColor: '#ede9fe', selectedBackgroundColor: '#cffafe', selectedBorderColor: '#06b6d4', borderRadius: 16 },
      buttons: { backgroundColor: '#7c3aed', hoverBackgroundColor: '#6d28d9', borderRadius: 14, style: 'premium' },
    },
  },
  {
    id: 'calculator',
    name: 'Калькулятор',
    description: 'Деловой экран для расчётов, оценок и итогов.',
    settings: {
      brand: { experiencePreset: 'calculator', primaryColor: '#0369a1', accentColor: '#22c55e', neutralColor: '#0f172a' },
      background: { color: '#e0f2fe', mode: 'gradient', gradientFrom: '#f0f9ff', gradientTo: '#e0f2fe', texture: 'grid' },
      typography: { fontFamily: "'IBM Plex Sans', system-ui, sans-serif", displayFontFamily: "'IBM Plex Sans', system-ui, sans-serif", headingColor: '#0c4a6e', bodyTextColor: '#334155' },
      layout: { preset: 'calculator', interfacePreset: 'report', contentWidth: 900, cardRadius: 14, cardPadding: 26, density: 'compact' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#bae6fd', radius: 14, padding: 26, shadow: 'none' },
      answerCards: { style: 'list', markerStyle: 'numbers', backgroundColor: '#f8fafc', hoverBackgroundColor: '#e0f2fe', selectedBorderColor: '#0369a1', borderRadius: 10 },
      result: { preset: 'report', accentColor: '#22c55e', scoreStyle: 'stat' },
    },
  },
  {
    id: 'storytelling',
    name: 'Сторителлинг',
    description: 'Сценарный формат с крупным медиа и мягкой драматургией.',
    settings: {
      brand: { experiencePreset: 'editorial', primaryColor: '#9f1239', accentColor: '#f59e0b', neutralColor: '#1c1917' },
      background: { color: '#fff7ed', mode: 'gradient', gradientFrom: '#fff7ed', gradientTo: '#ffe4e6', texture: 'paper' },
      typography: { fontFamily: "'Source Sans 3', system-ui, sans-serif", displayFontFamily: "'Newsreader', Georgia, serif", headingColor: '#7f1d1d', bodyTextColor: '#57534e', headingScale: 1.14 },
      layout: { preset: 'editorial', interfacePreset: 'magazine', contentWidth: 980, cardRadius: 30, cardPadding: 36, mediaPosition: 'top', density: 'relaxed' },
      questionCard: { backgroundColor: '#fffaf2', borderColor: '#fed7aa', radius: 30, padding: 36, mediaRadius: 26, shadow: 'soft' },
      buttons: { backgroundColor: '#9f1239', hoverBackgroundColor: '#881337', borderRadius: 999, style: 'solid' },
      answerCards: { backgroundColor: '#fffaf2', hoverBackgroundColor: '#ffedd5', selectedBackgroundColor: '#fef3c7', selectedBorderColor: '#f59e0b', borderRadius: 18 },
    },
  },
  {
    id: 'minimal-b2b',
    name: 'Минималистичный B2B',
    description: 'Сдержанный интерфейс для корпоративных сценариев.',
    settings: {
      brand: { experiencePreset: 'minimal', primaryColor: '#111827', accentColor: '#0ea5e9', neutralColor: '#030712' },
      background: { color: '#f9fafb', mode: 'solid', texture: 'none' },
      typography: { fontFamily: "'Inter', system-ui, sans-serif", displayFontFamily: "'Inter', system-ui, sans-serif", headingColor: '#111827', bodyTextColor: '#4b5563', headingWeight: 750 },
      layout: { preset: 'compact', interfacePreset: 'minimal', contentWidth: 860, cardRadius: 10, cardPadding: 28, density: 'compact', chrome: 'compact' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', radius: 10, padding: 28, shadow: 'none' },
      buttons: { backgroundColor: '#111827', hoverBackgroundColor: '#000000', borderRadius: 8, style: 'solid', height: 48 },
      answerCards: { backgroundColor: '#ffffff', hoverBackgroundColor: '#f3f4f6', selectedBackgroundColor: '#e0f2fe', selectedBorderColor: '#0ea5e9', borderRadius: 8, markerStyle: 'none' },
    },
  },
  {
    id: 'kiosk-event',
    name: 'Киоск / мероприятие',
    description: 'Крупные элементы для экранов, стендов и тач-панелей.',
    settings: {
      brand: { experiencePreset: 'conversational', primaryColor: '#db2777', accentColor: '#facc15', neutralColor: '#111827' },
      background: { color: '#111827', mode: 'gradient', gradientFrom: '#111827', gradientTo: '#312e81', texture: 'grid' },
      typography: { fontFamily: "'Inter', system-ui, sans-serif", displayFontFamily: "'Inter', system-ui, sans-serif", headingColor: '#ffffff', bodyTextColor: '#e5e7eb', headingScale: 1.2, bodyScale: 1.12 },
      layout: { preset: 'focus', interfacePreset: 'kiosk', contentWidth: 1100, cardRadius: 28, cardPadding: 42, density: 'relaxed', chrome: 'none' },
      questionCard: { backgroundColor: '#ffffff', borderColor: '#facc15', radius: 28, padding: 42, shadow: 'strong' },
      buttons: { backgroundColor: '#db2777', hoverBackgroundColor: '#be185d', borderRadius: 20, height: 64, fontWeight: 900, textTransform: 'uppercase' },
      answerCards: { backgroundColor: '#ffffff', hoverBackgroundColor: '#fdf2f8', selectedBackgroundColor: '#fef9c3', selectedBorderColor: '#facc15', borderRadius: 22, minHeight: 72 },
    },
  },
  {
    id: 'magazine',
    name: 'Журнальный',
    description: 'Редакционная подача с контрастной типографикой.',
    settings: {
      brand: { experiencePreset: 'editorial', primaryColor: '#be123c', accentColor: '#0f766e', neutralColor: '#1c1917' },
      background: { color: '#fbf7ef', mode: 'solid', texture: 'paper' },
      typography: { fontFamily: "'Lora', Georgia, serif", displayFontFamily: "'Lora', Georgia, serif", headingColor: '#1c1917', bodyTextColor: '#57534e', headingScale: 1.22, lineHeight: 1.65 },
      layout: { preset: 'editorial', interfacePreset: 'magazine', contentWidth: 980, cardRadius: 4, cardPadding: 36, surfaceStyle: 'paper' },
      questionCard: { backgroundColor: '#fffdf7', borderColor: '#d6d3d1', radius: 4, padding: 36, shadow: 'none' },
      buttons: { backgroundColor: '#1c1917', hoverBackgroundColor: '#44403c', borderRadius: 2, style: 'solid' },
      answerCards: { backgroundColor: '#fffdf7', hoverBackgroundColor: '#f5f5f4', selectedBackgroundColor: '#ecfdf5', selectedBorderColor: '#0f766e', borderRadius: 4 },
    },
  },
  {
    id: 'quiet-premium',
    name: 'Тихий premium',
    description: 'Дорогой спокойный вид без визуального шума.',
    settings: {
      brand: { experiencePreset: 'minimal', primaryColor: '#334155', accentColor: '#b45309', neutralColor: '#0f172a' },
      background: { color: '#f7f5f0', mode: 'solid', texture: 'grain' },
      typography: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", displayFontFamily: "'Newsreader', Georgia, serif", headingColor: '#0f172a', bodyTextColor: '#475569', headingWeight: 680 },
      layout: { preset: 'classic', interfacePreset: 'studio', contentWidth: 900, cardRadius: 24, cardPadding: 34, density: 'balanced', surfaceStyle: 'paper' },
      questionCard: { backgroundColor: '#fffefa', borderColor: '#e7e0d4', radius: 24, padding: 34, shadow: 'soft' },
      buttons: { backgroundColor: '#334155', hoverBackgroundColor: '#1e293b', borderRadius: 14, style: 'solid', shadow: 'soft' },
      answerCards: { backgroundColor: '#fffefa', hoverBackgroundColor: '#f1f5f9', selectedBackgroundColor: '#fef3c7', selectedBorderColor: '#b45309', borderRadius: 16 },
    },
  },
];

const SECRET_KEY_PATTERN = /(token|secret|password|api[_-]?key|authorization)/i;
const SCRIPT_PATTERN = /<\s*script|javascript:|on\w+\s*=/i;

export function getBuiltInStyle(id: string): IntegratedDesignStyle | undefined {
  return BUILT_IN_DESIGN_STYLES.find((style) => style.id === id);
}

export function normalizeStyleSettings(settings: DeepPartial<DesignSettings>): DesignSettings {
  return normalizeDesignSettings(settings, DEFAULT_DESIGN_SETTINGS);
}

function assertNoUnsafeKeys(value: unknown, path = 'style'): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeKeys(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new Error(`Unsafe key in custom style: ${path}.${key}`);
    }
    if (typeof child === 'string' && SCRIPT_PATTERN.test(child)) {
      throw new Error(`Unsafe script content in custom style: ${path}.${key}`);
    }
    assertNoUnsafeKeys(child, `${path}.${key}`);
  }
}

function stripCustomCss(settings: DeepPartial<DesignSettings>): {
  settings: DeepPartial<DesignSettings>;
  customCss?: string;
} {
  const copy = structuredClone(settings) as DeepPartial<DesignSettings>;
  const customCss = copy.advanced?.customCss;
  if (copy.advanced) {
    copy.advanced = { ...copy.advanced, customCss: '' };
  }
  return {
    settings: copy,
    ...(customCss ? { customCss } : {}),
  };
}

export function validateCustomDesignStyleJson(rawJson: string): ImportedDesignStyle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid design style JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Design style JSON must be an object');
  }
  const source = parsed as Record<string, unknown>;
  if (typeof source.name !== 'string' || source.name.trim().length < 2) {
    throw new Error('Design style name is required');
  }
  if (!source.settings || typeof source.settings !== 'object' || Array.isArray(source.settings)) {
    throw new Error('Design style settings are required');
  }
  assertNoUnsafeKeys(source);
  const { settings, customCss } = stripCustomCss(source.settings as DeepPartial<DesignSettings>);
  normalizeDesignSettings(settings, DEFAULT_DESIGN_SETTINGS);
  return {
    name: source.name.trim(),
    description: typeof source.description === 'string' ? source.description.trim() : '',
    settings,
    thumbnail: typeof source.thumbnail === 'string' && !SCRIPT_PATTERN.test(source.thumbnail) ? source.thumbnail : undefined,
    customCss,
  };
}

export function serializeCustomDesignStyle(style: CustomDesignStyle): string {
  return JSON.stringify({
    name: style.name,
    description: style.description,
    thumbnail: style.thumbnail,
    settings: {
      ...style.settings,
      ...(style.customCss ? { advanced: { ...(style.settings.advanced ?? {}), customCss: style.customCss } } : {}),
    },
  }, null, 2);
}

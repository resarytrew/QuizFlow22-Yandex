import React, { useMemo, useState } from 'react';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { DesignSettings, QuizTemplateId } from '../types.ts';
import { TemplateSection } from './settings/quiz-settings/TemplateSection.tsx';
import { SoundSection } from './settings/quiz-settings/SoundSection.tsx';

type DesignTab = 'quickStart' | 'brand' | 'screen' | 'elements' | 'advanced';
type DesignSettingsPatch = { [K in keyof DesignSettings]?: Partial<NonNullable<DesignSettings[K]>> };

const SELECT_ARROW_SVG = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2378716a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";
const HEX_RE = /^#([0-9a-fA-F]{6})$/;

const tabs: Array<{ id: DesignTab; label: string }> = [
  { id: 'quickStart', label: 'Быстрый старт' },
  { id: 'brand', label: 'Бренд' },
  { id: 'screen', label: 'Экран' },
  { id: 'elements', label: 'Элементы' },
  { id: 'advanced', label: 'Дополнительно' },
];

const fontOptions = [
  { value: "'Plus Jakarta Sans', system-ui, sans-serif", label: 'Plus Jakarta Sans' },
  { value: "'Manrope', system-ui, sans-serif", label: 'Manrope' },
  { value: "'Inter', system-ui, sans-serif", label: 'Inter' },
  { value: "'Montserrat', system-ui, sans-serif", label: 'Montserrat' },
  { value: "'Roboto', system-ui, sans-serif", label: 'Roboto' },
  { value: "'Lora', Georgia, serif", label: 'Lora' },
  { value: "'Newsreader', Georgia, serif", label: 'Newsreader' },
];

const layoutPresets: Array<{
  id: NonNullable<DesignSettings['layout']>['preset'];
  title: string;
  description: string;
  values: Partial<NonNullable<DesignSettings['layout']>>;
}> = [
  { id: 'classic', title: 'Classic', description: 'Универсальная карточка с комфортной шириной.', values: { preset: 'classic', contentWidth: 920, cardRadius: 28, cardPadding: 32, cardOpacity: 0.94, mediaPosition: 'top' } },
  { id: 'split', title: 'Split', description: 'Больше пространства для медиа и визуальных сценариев.', values: { preset: 'split', contentWidth: 1040, cardRadius: 24, cardPadding: 34, cardOpacity: 0.92, mediaPosition: 'right' } },
  { id: 'focus', title: 'Focus', description: 'Узкий спокойный экран для тестов и диагностики.', values: { preset: 'focus', contentWidth: 680, cardRadius: 22, cardPadding: 30, cardOpacity: 0.96, mediaPosition: 'top' } },
  { id: 'editorial', title: 'Editorial', description: 'Крупная типографика и ощущение премиального лонгрида.', values: { preset: 'editorial', contentWidth: 860, cardRadius: 12, cardPadding: 42, cardOpacity: 0.9, mediaPosition: 'background' } },
  { id: 'compact', title: 'Compact', description: 'Плотный интерфейс для коротких опросов и лид-форм.', values: { preset: 'compact', contentWidth: 760, cardRadius: 18, cardPadding: 22, cardOpacity: 0.98, mediaPosition: 'top' } },
];

const experiencePresets: Array<{
  id: NonNullable<NonNullable<DesignSettings['brand']>['experiencePreset']>;
  title: string;
  description: string;
  settings: DesignSettingsPatch;
}> = [
  {
    id: 'conversational',
    title: 'Typeform style',
    description: 'Один экран, один вопрос, крупная типографика и мягкий разговорный ритм.',
    settings: {
      brand: { experiencePreset: 'conversational', primaryColor: '#2f5d50', accentColor: '#b9852b', neutralColor: '#1d1a16' },
      typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1.08, headingLineHeight: 1.02, paragraphWidth: 620 },
      layout: { preset: 'conversational', contentWidth: 760, cardPadding: 42, cardRadius: 30, surfaceStyle: 'minimal', questionAlign: 'center', verticalAlign: 'center', density: 'relaxed' },
      buttons: { style: 'solid', width: 'auto', height: 56, borderRadius: 999, shadow: 'soft', textTransform: 'none' },
      answerCards: { style: 'card', columns: 1, minHeight: 64, spacing: 14, markerStyle: 'letters' },
      progress: { style: 'bar', position: 'top', height: 6, showPercent: true, showStepLabel: true },
    },
  },
  {
    id: 'leadForm',
    title: 'Lead funnel',
    description: 'Карточная форма для брифов, заявок, лид-магнитов и сбора контактов.',
    settings: {
      brand: { experiencePreset: 'leadForm', primaryColor: '#334155', accentColor: '#c56a28', neutralColor: '#111827' },
      background: { mode: 'solid', color: '#f3f4f6', gradientFrom: '#f3f4f6', gradientTo: '#e7e5e4', texture: 'grain' },
      typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.98, headingLineHeight: 1.08, paragraphWidth: 700 },
      layout: { preset: 'classic', contentWidth: 880, cardPadding: 34, cardRadius: 24, surfaceStyle: 'solid', questionAlign: 'left', verticalAlign: 'center', density: 'balanced' },
      buttons: { style: 'premium', width: 'full', height: 54, borderRadius: 16, shadow: 'soft' },
      answerCards: { style: 'list', columns: 1, minHeight: 58, spacing: 10, markerStyle: 'none' },
      result: { preset: 'landing', scoreStyle: 'stat' },
    },
  },
  {
    id: 'calculator',
    title: 'Calculator',
    description: 'Плотный интерфейс для расчётов, подбора продукта и персональных рекомендаций.',
    settings: {
      brand: { experiencePreset: 'calculator', primaryColor: '#155e75', accentColor: '#b45309', neutralColor: '#0f172a' },
      typography: { displayFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", headingScale: 0.94, headingLineHeight: 1.12, paragraphWidth: 760 },
      layout: { preset: 'calculator', contentWidth: 980, cardPadding: 30, cardRadius: 20, surfaceStyle: 'outline', questionAlign: 'left', verticalAlign: 'top', density: 'compact' },
      buttons: { style: 'solid', width: 'full', height: 50, borderRadius: 14, shadow: 'none' },
      answerCards: { style: 'tiles', columns: 2, minHeight: 72, spacing: 12, markerStyle: 'none' },
      progress: { style: 'steps', position: 'inside', height: 8, showPercent: false, showStepLabel: true },
    },
  },
  {
    id: 'assessment',
    title: 'Assessment',
    description: 'Строгий стиль для тестов, аттестаций, баллов и образовательных результатов.',
    settings: {
      brand: { experiencePreset: 'assessment', primaryColor: '#3f3f46', accentColor: '#a16207', neutralColor: '#18181b' },
      typography: { displayFontFamily: "'Lora', Georgia, serif", headingScale: 0.96, headingLineHeight: 1.08, paragraphWidth: 720 },
      layout: { preset: 'assessment', contentWidth: 860, cardPadding: 34, cardRadius: 18, surfaceStyle: 'paper', questionAlign: 'left', verticalAlign: 'center', density: 'balanced' },
      buttons: { style: 'outline', width: 'auto', height: 50, borderRadius: 12, shadow: 'none' },
      answerCards: { style: 'list', columns: 1, minHeight: 56, spacing: 10, markerStyle: 'numbers' },
      progress: { style: 'bar', position: 'top', height: 10, showPercent: true, showStepLabel: true },
      result: { preset: 'report', scoreStyle: 'ring', showScore: true },
    },
  },
  {
    id: 'editorial',
    title: 'Editorial',
    description: 'Журнальная подача для квестов, сторителлинга и событийных сценариев.',
    settings: {
      brand: { experiencePreset: 'editorial', primaryColor: '#9a3412', accentColor: '#111827', neutralColor: '#1c1917' },
      typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1.16, headingLineHeight: 0.98, paragraphWidth: 640 },
      layout: { preset: 'editorial', contentWidth: 860, cardPadding: 44, cardRadius: 12, surfaceStyle: 'minimal', questionAlign: 'left', verticalAlign: 'center', density: 'relaxed' },
      buttons: { style: 'ghost', width: 'auto', height: 52, borderRadius: 0, shadow: 'none', textTransform: 'uppercase' },
      answerCards: { style: 'minimal', columns: 1, minHeight: 60, spacing: 16, markerStyle: 'none' },
      progress: { style: 'hidden' },
    },
  },
  {
    id: 'minimal',
    title: 'Quiet premium',
    description: 'Сдержанный B2B-стиль без декоративного шума.',
    settings: {
      brand: { experiencePreset: 'minimal', primaryColor: '#262626', accentColor: '#78716c', neutralColor: '#171717' },
      background: { mode: 'solid', color: '#f7f7f5', gradientFrom: '#f7f7f5', gradientTo: '#ececea', texture: 'none' },
      typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.92, headingLineHeight: 1.1, paragraphWidth: 700 },
      layout: { preset: 'focus', contentWidth: 720, cardPadding: 34, cardRadius: 18, surfaceStyle: 'outline', questionAlign: 'left', verticalAlign: 'center', density: 'balanced' },
      buttons: { style: 'solid', width: 'auto', height: 50, borderRadius: 12, shadow: 'none' },
      answerCards: { style: 'minimal', columns: 1, minHeight: 54, spacing: 8, markerStyle: 'none' },
    },
  },
];

const palettePresets = [
  { title: 'Forest', primary: '#2f5d50', accent: '#b9852b', neutral: '#1d1a16', bg: '#f6f3ee' },
  { title: 'Graphite', primary: '#262626', accent: '#78716c', neutral: '#171717', bg: '#f7f7f5' },
  { title: 'Cobalt', primary: '#1d4ed8', accent: '#c2410c', neutral: '#111827', bg: '#f5f7fb' },
  { title: 'Bordeaux', primary: '#7f1d1d', accent: '#b45309', neutral: '#1c1917', bg: '#f8f4f1' },
];

const defaultBlocks = {
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
};

const interfacePresets: Array<{
  id: NonNullable<NonNullable<DesignSettings['layout']>['interfacePreset']>;
  title: string;
  description: string;
  values: Partial<NonNullable<DesignSettings['layout']>>;
}> = [
  { id: 'studio', title: 'Studio', description: 'Полная интерфейсная рамка: бренд, прогресс, таймер и карточка.', values: { interfacePreset: 'studio', chrome: 'full', preset: 'classic', surfaceStyle: 'paper', density: 'balanced', questionAlign: 'left', verticalAlign: 'center', contentWidth: 920, cardPadding: 32, cardRadius: 28, blocks: { ...defaultBlocks } } },
  { id: 'immersive', title: 'Immersive', description: 'Фокус на контенте и медиа, минимум служебных элементов.', values: { interfacePreset: 'immersive', chrome: 'compact', preset: 'editorial', surfaceStyle: 'minimal', density: 'relaxed', questionAlign: 'left', verticalAlign: 'center', contentWidth: 900, cardPadding: 42, cardRadius: 10, blocks: { ...defaultBlocks, logo: false, title: false, timer: false, backgroundDecor: true } } },
  { id: 'form', title: 'Lead form', description: 'Плотная форма для заявок: без лишнего медиа и с сильным CTA.', values: { interfacePreset: 'form', chrome: 'compact', preset: 'compact', surfaceStyle: 'solid', density: 'compact', questionAlign: 'left', verticalAlign: 'top', contentWidth: 740, cardPadding: 28, cardRadius: 20, blocks: { ...defaultBlocks, media: false, timer: false, title: false } } },
  { id: 'exam', title: 'Exam', description: 'Строгий режим тестирования с таймером и прогрессом.', values: { interfacePreset: 'exam', chrome: 'full', preset: 'assessment', surfaceStyle: 'outline', density: 'balanced', questionAlign: 'left', verticalAlign: 'top', contentWidth: 860, cardPadding: 32, cardRadius: 16, blocks: { ...defaultBlocks, media: false, backgroundDecor: false } } },
  { id: 'kiosk', title: 'Kiosk', description: 'Большой экран для мероприятий, стендов и touch-интерфейсов.', values: { interfacePreset: 'kiosk', chrome: 'none', preset: 'conversational', surfaceStyle: 'minimal', density: 'relaxed', questionAlign: 'center', verticalAlign: 'center', contentWidth: 980, cardPadding: 54, cardRadius: 32, blocks: { ...defaultBlocks, topbar: false, brand: false, logo: false, title: false, timer: false, progress: false } } },
  { id: 'magazine', title: 'Magazine', description: 'Редакционная подача: крупный заголовок, воздух и минимум рамок.', values: { interfacePreset: 'magazine', chrome: 'compact', preset: 'editorial', surfaceStyle: 'minimal', density: 'relaxed', questionAlign: 'left', verticalAlign: 'center', contentWidth: 820, cardPadding: 46, cardRadius: 0, blocks: { ...defaultBlocks, logo: false, timer: false, progress: false } } },
  { id: 'product', title: 'Product picker', description: 'Сетка ответов для подбора продукта или услуги.', values: { interfacePreset: 'product', chrome: 'compact', preset: 'calculator', surfaceStyle: 'paper', density: 'balanced', questionAlign: 'left', verticalAlign: 'center', contentWidth: 1020, cardPadding: 32, cardRadius: 22, blocks: { ...defaultBlocks, timer: false } } },
  { id: 'minimal', title: 'Minimal', description: 'Чистый B2B-экран: только вопрос, ответы и действие.', values: { interfacePreset: 'minimal', chrome: 'none', preset: 'focus', surfaceStyle: 'outline', density: 'balanced', questionAlign: 'left', verticalAlign: 'center', contentWidth: 700, cardPadding: 34, cardRadius: 18, blocks: { ...defaultBlocks, topbar: false, brand: false, logo: false, title: false, timer: false, progress: false, backgroundDecor: false } } },
  { id: 'workshop', title: 'Workshop', description: 'Учебный режим: видимый прогресс, описание и спокойная карточка.', values: { interfacePreset: 'workshop', chrome: 'full', preset: 'focus', surfaceStyle: 'paper', density: 'relaxed', questionAlign: 'left', verticalAlign: 'center', contentWidth: 780, cardPadding: 38, cardRadius: 24, blocks: { ...defaultBlocks, timer: false } } },
  { id: 'report', title: 'Report', description: 'Для диагностик и отчётов: меньше хрома, больше содержательного текста.', values: { interfacePreset: 'report', chrome: 'compact', preset: 'assessment', surfaceStyle: 'solid', density: 'balanced', questionAlign: 'left', verticalAlign: 'top', contentWidth: 920, cardPadding: 36, cardRadius: 18, blocks: { ...defaultBlocks, logo: false, timer: false, media: false, resultStats: true } } },
];

const blockControls: Array<{ key: keyof typeof defaultBlocks; label: string }> = [
  { key: 'topbar', label: 'Верхняя панель' },
  { key: 'brand', label: 'Бренд-блок' },
  { key: 'logo', label: 'Логотип' },
  { key: 'title', label: 'Название квиза' },
  { key: 'progress', label: 'Прогресс' },
  { key: 'timer', label: 'Таймер' },
  { key: 'description', label: 'Описание вопроса' },
  { key: 'media', label: 'Медиа' },
  { key: 'achievements', label: 'Панель достижений' },
  { key: 'variables', label: 'Панель переменных' },
  { key: 'stats', label: 'Панель статистики' },
  { key: 'resultStats', label: 'Статистика результата' },
  { key: 'backgroundDecor', label: 'Декор фона' },
];

const interfacePresetStyles: Record<NonNullable<NonNullable<DesignSettings['layout']>['interfacePreset']>, DesignSettingsPatch> = {
  studio: {
    background: { mode: 'solid', color: '#f6f3ee', texture: 'grain' },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#dfd8cc', radius: 28, padding: 32, shadow: 'none', mediaPosition: 'top', mediaWidth: 42 },
    typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1, headingLineHeight: 1.04, paragraphWidth: 680 },
    buttons: { style: 'solid', width: 'auto', height: 52, borderRadius: 18, shadow: 'soft' },
    answerCards: { style: 'card', columns: 1, minHeight: 58, spacing: 12, markerStyle: 'letters' },
    progress: { style: 'bar', position: 'top', height: 8, showPercent: true },
  },
  immersive: {
    background: { mode: 'gradient', color: '#f3efe7', gradientFrom: '#f7f2e8', gradientTo: '#e7ece8', texture: 'paper' },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#ffffff', radius: 34, padding: 56, shadow: 'soft', mediaPosition: 'background', mediaWidth: 48 },
    typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1.18, headingLineHeight: 0.94, paragraphWidth: 760 },
    buttons: { style: 'ghost', width: 'auto', height: 58, borderRadius: 999, shadow: 'none' },
    answerCards: { style: 'minimal', columns: 1, minHeight: 66, spacing: 16, markerStyle: 'none' },
    progress: { style: 'hidden' },
  },
  form: {
    background: { mode: 'solid', color: '#f4f5f7', texture: 'none' },
    questionCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', radius: 20, padding: 28, shadow: 'none', mediaPosition: 'top', mediaWidth: 38 },
    typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.9, headingLineHeight: 1.08, paragraphWidth: 640 },
    buttons: { style: 'premium', width: 'full', height: 54, borderRadius: 14, shadow: 'soft' },
    answerCards: { style: 'list', columns: 1, minHeight: 54, spacing: 8, markerStyle: 'none' },
    progress: { style: 'bar', position: 'inside', height: 5, showPercent: false },
  },
  exam: {
    background: { mode: 'solid', color: '#f8fafc', texture: 'none' },
    questionCard: { backgroundColor: '#ffffff', borderColor: '#d4d4d8', radius: 12, padding: 30, shadow: 'none', mediaPosition: 'top', mediaWidth: 36 },
    typography: { displayFontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", headingScale: 0.86, headingLineHeight: 1.14, paragraphWidth: 780 },
    buttons: { style: 'outline', width: 'auto', height: 48, borderRadius: 10, shadow: 'none' },
    answerCards: { style: 'list', columns: 1, minHeight: 52, spacing: 8, markerStyle: 'numbers' },
    progress: { style: 'steps', position: 'top', height: 8, showPercent: true },
  },
  kiosk: {
    background: { mode: 'gradient', color: '#f7f4ed', gradientFrom: '#f7f4ed', gradientTo: '#e6efe9', texture: 'grain' },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#ece7dc', radius: 42, padding: 64, shadow: 'soft', mediaPosition: 'top', mediaWidth: 42 },
    typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1.2, headingLineHeight: 0.9, paragraphWidth: 920 },
    buttons: { style: 'solid', width: 'auto', height: 72, borderRadius: 999, shadow: 'strong' },
    answerCards: { style: 'tiles', columns: 2, minHeight: 118, spacing: 18, markerStyle: 'none' },
    progress: { style: 'hidden' },
  },
  magazine: {
    background: { mode: 'solid', color: '#fbfaf7', texture: 'paper' },
    questionCard: { backgroundColor: '#fbfaf7', borderColor: '#fbfaf7', radius: 0, padding: 24, shadow: 'none', mediaPosition: 'left', mediaWidth: 46 },
    typography: { displayFontFamily: "'Newsreader', Georgia, serif", headingScale: 1.24, headingLineHeight: 0.88, paragraphWidth: 620 },
    buttons: { style: 'ghost', width: 'auto', height: 50, borderRadius: 0, shadow: 'none', textTransform: 'uppercase' },
    answerCards: { style: 'minimal', columns: 1, minHeight: 58, spacing: 18, markerStyle: 'none' },
    progress: { style: 'hidden' },
  },
  product: {
    background: { mode: 'solid', color: '#f5f7fb', texture: 'grid' },
    questionCard: { backgroundColor: '#ffffff', borderColor: '#dbe2ea', radius: 22, padding: 32, shadow: 'none', mediaPosition: 'right', mediaWidth: 44 },
    typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.96, headingLineHeight: 1.06, paragraphWidth: 820 },
    buttons: { style: 'solid', width: 'full', height: 52, borderRadius: 14, shadow: 'soft' },
    answerCards: { style: 'tiles', columns: 3, minHeight: 128, spacing: 14, markerStyle: 'none' },
    progress: { style: 'bar', position: 'top', height: 6, showPercent: false },
  },
  minimal: {
    background: { mode: 'solid', color: '#ffffff', texture: 'none' },
    questionCard: { backgroundColor: '#ffffff', borderColor: '#ffffff', radius: 0, padding: 0, shadow: 'none', mediaPosition: 'top', mediaWidth: 38 },
    typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.86, headingLineHeight: 1.12, paragraphWidth: 620 },
    buttons: { style: 'solid', width: 'auto', height: 48, borderRadius: 10, shadow: 'none' },
    answerCards: { style: 'minimal', columns: 1, minHeight: 50, spacing: 6, markerStyle: 'none' },
    progress: { style: 'hidden' },
  },
  workshop: {
    background: { mode: 'solid', color: '#f6f3ee', texture: 'paper' },
    questionCard: { backgroundColor: '#fffefa', borderColor: '#d8cfbf', radius: 24, padding: 38, shadow: 'none', mediaPosition: 'top', mediaWidth: 42 },
    typography: { displayFontFamily: "'Lora', Georgia, serif", headingScale: 0.96, headingLineHeight: 1.08, paragraphWidth: 720 },
    buttons: { style: 'soft', width: 'auto', height: 52, borderRadius: 16, shadow: 'soft' },
    answerCards: { style: 'card', columns: 1, minHeight: 62, spacing: 12, markerStyle: 'letters' },
    progress: { style: 'bar', position: 'top', height: 10, showPercent: true },
  },
  report: {
    background: { mode: 'solid', color: '#f7f7f5', texture: 'none' },
    questionCard: { backgroundColor: '#ffffff', borderColor: '#e5e5e5', radius: 18, padding: 36, shadow: 'none', mediaPosition: 'top', mediaWidth: 40 },
    typography: { displayFontFamily: "'Manrope', system-ui, sans-serif", headingScale: 0.92, headingLineHeight: 1.08, paragraphWidth: 780 },
    buttons: { style: 'outline', width: 'auto', height: 50, borderRadius: 12, shadow: 'none' },
    answerCards: { style: 'list', columns: 1, minHeight: 58, spacing: 10, markerStyle: 'none' },
    progress: { style: 'bar', position: 'inside', height: 6, showPercent: true },
    result: { preset: 'report', scoreStyle: 'stat' },
  },
};

function safeHex(value: unknown, fallback = '#000000'): string {
  return typeof value === 'string' && HEX_RE.test(value) ? value : fallback;
}

const Section = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
  <section className="rounded-[1.25rem_0.45rem_1.25rem_0.45rem] border border-stone-200/80 bg-[#fffdf8] p-4 shadow-[0_14px_36px_rgba(68,64,60,0.06)]">
    <div className="mb-4">
      <h3 className="font-serif text-xl font-semibold tracking-[-0.035em] text-stone-950">{title}</h3>
      {note && <p className="mt-1 text-xs leading-5 text-stone-500">{note}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{label}</span>
    {children}
    {hint && <span className="mt-1.5 block text-xs leading-4 text-stone-400">{hint}</span>}
  </label>
);

const useGeneratedFieldIdentity = (prefix: string, id?: string, name?: string) => {
  const generatedId = React.useId().replace(/[^a-z0-9_-]+/gi, '');
  const fieldId = id || `${prefix}-${generatedId}`;
  return {
    id: fieldId,
    name: name || fieldId,
  };
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const field = useGeneratedFieldIdentity('design-input', props.id, props.name);
  return (
    <input
      id={field.id}
      name={field.name}
      {...props}
      className={`w-full rounded-xl border border-stone-200 bg-[#faf7f0] px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 ${props.className || ''}`}
    />
  );
};

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const field = useGeneratedFieldIdentity('design-textarea', props.id, props.name);
  return (
    <textarea
      id={field.id}
      name={field.name}
      {...props}
      className={`min-h-[150px] w-full resize-y rounded-xl border border-stone-200 bg-[#faf7f0] px-3.5 py-2.5 font-mono text-xs leading-5 text-stone-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 ${props.className || ''}`}
    />
  );
};

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => {
  const field = useGeneratedFieldIdentity('design-select', props.id, props.name);
  return (
    <select
      id={field.id}
      name={field.name}
      {...props}
      className="w-full appearance-none rounded-xl border border-stone-200 bg-[#faf7f0] bg-no-repeat px-3.5 py-2.5 pr-9 text-sm font-medium text-stone-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
      style={{ backgroundImage: SELECT_ARROW_SVG, backgroundPosition: 'right 0.7rem center', backgroundSize: '1.1rem' }}
    >
      {children}
    </select>
  );
};

const ColorInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const field = useGeneratedFieldIdentity('design-color');
  return (
    <div className="flex items-center gap-2">
      <input
        id={`${field.id}-picker`}
        name={`${field.name}-picker`}
        type="color"
        value={safeHex(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-11 shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-transparent p-1"
      />
      <Input id={`${field.id}-hex`} name={`${field.name}-hex`} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder="#000000" />
    </div>
  );
};

const RangeInput = ({
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) => {
  const field = useGeneratedFieldIdentity('design-range');
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-600">{value}{suffix}</span>
      </div>
      <input
        id={field.id}
        name={field.name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-stone-900"
      />
    </div>
  );
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex h-7 w-12 items-center rounded-full border p-0.5 transition ${checked ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-stone-100'}`}
  >
    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <div className="grid gap-1 rounded-xl border border-stone-200 bg-[#faf7f0] p-1">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded-lg px-3 py-2 text-left text-xs font-bold transition ${value === option.value ? 'bg-stone-950 text-amber-50 shadow-sm' : 'text-stone-600 hover:bg-white'}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const UrlInput = ({ value, onChange, placeholder = 'https://...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) => {
  const openAssetManager = useUIStore((state) => state.openAssetManager);
  return (
    <div className="flex gap-2">
      <Input value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <button
        type="button"
        onClick={() => openAssetManager(onChange)}
        className="rounded-xl border border-stone-200 bg-white px-3 text-stone-600 transition hover:border-amber-300 hover:text-stone-950"
        title="Выбрать из медиатеки"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
      </button>
    </div>
  );
};

type ScreenQuizSettings = NonNullable<DesignSettings['screenQuiz']>;

const screenQuizDefaults: Required<ScreenQuizSettings> = {
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
  transitionEffect: 'swipe-reveal',
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
};


const TimelineMeter = ({
  questionMs,
  mediaMs,
  answerMs,
  gapMs,
  holdSeconds,
  timerSeconds,
  revealSeconds,
  transitionMs,
}: {
  questionMs: number;
  mediaMs: number;
  answerMs: number;
  gapMs: number;
  holdSeconds: number;
  timerSeconds: number;
  revealSeconds: number;
  transitionMs: number;
}) => {
  const segments = [
    { key: 'question', label: 'Q', title: 'Вопрос', ms: questionMs, className: 'bg-sky-500' },
    { key: 'media', label: 'M', title: 'Медиа', ms: mediaMs, className: 'bg-cyan-500' },
    { key: 'answer', label: 'A', title: 'Ответ', ms: answerMs, className: 'bg-violet-500' },
    { key: 'gap', label: 'G', title: 'Пауза', ms: gapMs, className: 'bg-stone-400' },
    { key: 'hold', label: 'H', title: 'Удержание', ms: holdSeconds * 1000, className: 'bg-amber-500' },
    { key: 'timer', label: 'T', title: 'Таймер', ms: timerSeconds * 1000, className: 'bg-emerald-500' },
    { key: 'reveal', label: 'R', title: 'Раскрытие', ms: revealSeconds * 1000, className: 'bg-rose-500' },
    { key: 'transition', label: 'X', title: 'Переход', ms: transitionMs, className: 'bg-stone-900' },
  ].filter((segment) => segment.ms > 0);
  const totalMs = Math.max(1, segments.reduce((sum, segment) => sum + segment.ms, 0));

  return (
    <div className="rounded-xl border border-stone-200 bg-[#faf7f0] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Timeline</span>
        <span className="font-mono text-xs font-semibold text-stone-700">{(totalMs / 1000).toFixed(1)}s</span>
      </div>
      <div className="flex h-9 overflow-hidden rounded-lg border border-white bg-white">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.title}: ${(segment.ms / 1000).toFixed(1)}s`}
            className={`grid min-w-6 place-items-center text-[10px] font-black text-white ${segment.className}`}
            style={{ width: `${Math.max(4, (segment.ms / totalMs) * 100)}%` }}
          >
            {segment.label}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] font-semibold text-stone-500">
        <span>Q/M/A/G intro</span>
        <span>H hold</span>
        <span>T timer</span>
        <span>R/X reveal</span>
      </div>
    </div>
  );
};

const DesignPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DesignTab>('quickStart');
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const templateId = useQuizDataStore((state) => state.templateId);
  const setTemplateId = useQuizDataStore((state) => state.setTemplateId);
  const isPreviewModeActive = useUIStore((state) => state.isPreviewModeActive);
  const setPreviewMode = useUIStore((state) => state.setPreviewMode);

  const ds = designSettings;
  const previewStyle = useMemo(
    () => ({
      background:
        ds.background.mode === 'gradient'
          ? `linear-gradient(135deg, ${ds.background.gradientFrom || ds.background.color}, ${ds.background.gradientTo || ds.background.color})`
          : ds.background.color,
      color: ds.typography.bodyTextColor,
      fontFamily: ds.typography.fontFamily,
    }),
    [ds],
  );

  const updateSection = <T extends keyof DesignSettings>(section: T, patch: Partial<NonNullable<DesignSettings[T]>>) => {
    updateDesignSettings({
      [section]: {
        ...(designSettings[section] as object),
        ...patch,
      },
    } as Partial<DesignSettings>);
  };

  const applyLayoutPreset = (preset: (typeof layoutPresets)[number]) => {
    updateDesignSettings({
      layout: preset.values,
      questionCard: {
        radius: preset.values.cardRadius,
        padding: preset.values.cardPadding,
        mediaPosition: preset.values.mediaPosition,
      },
    } as Partial<DesignSettings>);
  };

  const applyInterfacePreset = (preset: (typeof interfacePresets)[number]) => {
    updateDesignSettings({
      ...interfacePresetStyles[preset.id],
      layout: preset.values,
    } as Partial<DesignSettings>);
  };

  const applyExperiencePreset = (preset: (typeof experiencePresets)[number]) => {
    updateDesignSettings(preset.settings as Partial<DesignSettings>);
  };

  const applyPalettePreset = (palette: (typeof palettePresets)[number]) => {
    updateDesignSettings({
      brand: { primaryColor: palette.primary, accentColor: palette.accent, neutralColor: palette.neutral },
      background: { color: palette.bg, gradientFrom: palette.bg, gradientTo: palette.bg },
      buttons: { backgroundColor: palette.primary, hoverBackgroundColor: palette.neutral },
      progress: { color: palette.primary },
      result: { accentColor: palette.primary },
      answerCards: { selectedBorderColor: palette.primary, selectedBackgroundColor: palette.bg },
    } as Partial<DesignSettings>);
  };

  const updateLayoutBlock = (key: keyof typeof defaultBlocks, value: boolean) => {
    updateSection('layout', {
      blocks: {
        ...defaultBlocks,
        ...(ds.layout?.blocks || {}),
        [key]: value,
      },
    });
  };

  const screenQuiz = { ...screenQuizDefaults, ...(ds.screenQuiz || {}) };
  const updateScreenQuiz = (patch: Partial<ScreenQuizSettings>) => {
    updateSection('screenQuiz', patch);
  };

  if (templateId === 'screenQuiz') {
    return (
      <div className="space-y-5 text-stone-800">
        <div className="rounded-[1.5rem_0.55rem_1.5rem_0.55rem] border border-stone-200 bg-[#fffdf8] p-4 shadow-[0_18px_48px_rgba(68,64,60,0.08)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Экранная викторина</div>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[0] text-stone-950">Настройка ТВ-сцены</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">Отдельные параметры нового шаблона: фон, сцена, крупные карточки, таймер и анимации.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPreviewMode(!isPreviewModeActive)}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition ${isPreviewModeActive ? 'bg-stone-900 text-amber-50' : 'bg-amber-300 text-stone-950 hover:bg-amber-200'}`}
          >
            {isPreviewModeActive ? 'Вернуться в редактор' : 'Предпросмотр в реальном времени'}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${activeTab === tab.id ? 'border-stone-950 bg-stone-950 text-amber-50' : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-stone-950'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
        {activeTab === 'quickStart' && (
          <TemplateSection />
        )}

        {activeTab === 'screen' && (
        <Section title="Фон и движение" note="Можно выбрать готовый фон-паттерн или поставить собственное изображение из медиатеки.">
          <Field label="Пресет фона">
            <Select value={screenQuiz.backgroundPreset} onChange={(e) => updateScreenQuiz({ backgroundPreset: e.target.value as ScreenQuizSettings['backgroundPreset'] })}>
              <option value="none">Без пресета</option>
              <option value="pop">Pop shapes</option>
              <option value="candy">Candy glow</option>
              <option value="aqua">Aqua burst</option>
              <option value="yellow">Yellow show</option>
              <option value="travel">Travel paper</option>
            </Select>
          </Field>
          <Field label="Изображение фона" hint="Если указано изображение, оно станет основой сцены, а пресет останется декоративным слоем.">
            <UrlInput value={screenQuiz.backgroundImageUrl} onChange={(value) => updateScreenQuiz({ backgroundImageUrl: value })} />
          </Field>
          <Field label="Цвет фона"><ColorInput value={screenQuiz.backgroundColor} onChange={(value) => updateScreenQuiz({ backgroundColor: value })} /></Field>
          <Field label="Интенсивность декора"><RangeInput min={0} max={1.4} step={0.05} value={screenQuiz.decorIntensity} onChange={(value) => updateScreenQuiz({ decorIntensity: value })} /></Field>
          <Field label="Анимация">
            <Select value={screenQuiz.motion} onChange={(e) => updateScreenQuiz({ motion: e.target.value as ScreenQuizSettings['motion'] })}>
              <option value="premium">Премиальная</option>
              <option value="calm">Спокойная</option>
              <option value="off">Без движения</option>
            </Select>
          </Field>
          <Field label="Эффект перехода">
            <Select value={screenQuiz.transitionEffect} onChange={(e) => updateScreenQuiz({ transitionEffect: e.target.value as ScreenQuizSettings['transitionEffect'] })}>
              <option value="swipe-reveal">Swipe Reveal - шторка справа</option>
              <option value="pixel-dissolve">Pixel Dissolve - пиксельный распад</option>
              <option value="zoom-in-reveal">Zoom In Reveal - приближение из центра</option>
              <option value="glitch-cut">Glitch Cut - цифровые помехи</option>
            </Select>
          </Field>
        </Section>
        )}

        {activeTab === 'brand' && (
        <Section title="Палитра сцены">
          <Field label="Акцент"><ColorInput value={screenQuiz.accentColor} onChange={(value) => updateScreenQuiz({ accentColor: value })} /></Field>
          <Field label="Второй акцент"><ColorInput value={screenQuiz.secondaryColor} onChange={(value) => updateScreenQuiz({ secondaryColor: value })} /></Field>
          <Field label="Панель вопроса"><ColorInput value={screenQuiz.panelColor} onChange={(value) => updateScreenQuiz({ panelColor: value })} /></Field>
          <Field label="Плашки ответов"><ColorInput value={screenQuiz.answerColor} onChange={(value) => updateScreenQuiz({ answerColor: value })} /></Field>
          <Field label="Текст и контур"><ColorInput value={screenQuiz.inkColor} onChange={(value) => updateScreenQuiz({ inkColor: value })} /></Field>
          <Field label="Правильный ответ"><ColorInput value={screenQuiz.correctColor} onChange={(value) => updateScreenQuiz({ correctColor: value })} /></Field>
        </Section>
        )}

        {activeTab === 'screen' && (
        <Section title="Макет карточки" note="Авто выбирает экран по типу узла и наличию медиа, ручные режимы фиксируют композицию.">
          <Field label="Композиция">
            <Select value={screenQuiz.layout} onChange={(e) => updateScreenQuiz({ layout: e.target.value as ScreenQuizSettings['layout'] })}>
              <option value="auto">Авто</option>
              <option value="media-right">Медиа справа</option>
              <option value="media-left">Медиа слева</option>
              <option value="media-top">Медиа сверху</option>
              <option value="image-grid">Сетка изображений</option>
              <option value="question-only">Только вопрос</option>
              <option value="hero-media">Большое медиа</option>
            </Select>
          </Field>
          <Field label="Толщина контура"><RangeInput min={4} max={18} step={1} suffix="px" value={screenQuiz.borderWidth} onChange={(value) => updateScreenQuiz({ borderWidth: value })} /></Field>
          <Field label="Скругление"><RangeInput min={24} max={80} step={1} suffix="px" value={screenQuiz.radius} onChange={(value) => updateScreenQuiz({ radius: value })} /></Field>
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Показывать таймер</span><Toggle checked={screenQuiz.showTimer} onChange={(value) => updateScreenQuiz({ showTimer: value })} /></div>
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Таймер на Информации и Фидбэке</span><Toggle checked={screenQuiz.showStoryTimer} onChange={(value) => updateScreenQuiz({ showStoryTimer: value })} /></div>
          <Field label="Длительность таймера"><RangeInput min={5} max={180} step={5} suffix=" сек" value={screenQuiz.timerSeconds} onChange={(value) => updateScreenQuiz({ timerSeconds: value })} /></Field>
        </Section>
        )}

        {activeTab === 'elements' && (
        <>
        <Section title="Монтажная лента" note="Собирает экран как монтажный таймлайн: вступление, удержание, таймер, раскрытие ответа и переход к следующей сцене. Локальные настройки экрана могут переопределить эти значения.">
          <TimelineMeter
            questionMs={screenQuiz.introEnabled ? screenQuiz.introQuestionMs : 0}
            mediaMs={screenQuiz.introEnabled ? screenQuiz.introMediaMs : 0}
            answerMs={screenQuiz.introEnabled ? screenQuiz.introAnswerMs : 0}
            gapMs={screenQuiz.introEnabled ? screenQuiz.introGapMs : 0}
            holdSeconds={screenQuiz.holdSeconds}
            timerSeconds={screenQuiz.timerSeconds}
            revealSeconds={screenQuiz.revealSeconds}
            transitionMs={screenQuiz.transitionMs}
          />
          <Field label="Режим ленты">
            <Select value={screenQuiz.timelineMode} onChange={(e) => updateScreenQuiz({ timelineMode: e.target.value as ScreenQuizSettings['timelineMode'] })}>
              <option value="auto">Авто по шоу-ритму</option>
              <option value="timeline">Ручная монтажная лента</option>
            </Select>
          </Field>
          <Field label="Удержание перед таймером"><RangeInput min={0} max={8} step={0.1} suffix=" сек" value={screenQuiz.holdSeconds} onChange={(value) => updateScreenQuiz({ holdSeconds: value })} /></Field>
          <Field label="Таймерный сегмент"><RangeInput min={5} max={180} step={1} suffix=" сек" value={screenQuiz.timerSeconds} onChange={(value) => updateScreenQuiz({ timerSeconds: value })} /></Field>
          <Field label="Раскрытие ответа"><RangeInput min={0.3} max={8} step={0.1} suffix=" сек" value={screenQuiz.revealSeconds} onChange={(value) => updateScreenQuiz({ revealSeconds: value })} /></Field>
          <Field label="Переход между сценами"><RangeInput min={80} max={2000} step={20} suffix=" мс" value={screenQuiz.transitionMs} onChange={(value) => updateScreenQuiz({ transitionMs: value })} /></Field>
        </Section>

        <Section title="Озвучивание перед таймером" note="Вопрос, ответы и медиа появляются по очереди, чтобы ведущий успел их прочитать. Таймер стартует после этой фазы.">
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Включить вступление</span><Toggle checked={screenQuiz.introEnabled} onChange={(value) => updateScreenQuiz({ introEnabled: value })} /></div>
          <Field label="Темп">
            <Select value={screenQuiz.introTiming} onChange={(e) => updateScreenQuiz({ introTiming: e.target.value as ScreenQuizSettings['introTiming'] })}>
              <option value="auto">Авто по длине текста</option>
              <option value="fast">Быстро</option>
              <option value="calm">Спокойно</option>
              <option value="manual">Ручные интервалы</option>
            </Select>
          </Field>
          {screenQuiz.introTiming === 'manual' && (
            <>
              <Field label="Вопрос"><RangeInput min={800} max={12000} step={100} suffix=" мс" value={screenQuiz.introQuestionMs} onChange={(value) => updateScreenQuiz({ introQuestionMs: value })} /></Field>
              <Field label="Вариант ответа"><RangeInput min={600} max={8000} step={100} suffix=" мс" value={screenQuiz.introAnswerMs} onChange={(value) => updateScreenQuiz({ introAnswerMs: value })} /></Field>
              <Field label="Медиа"><RangeInput min={0} max={5000} step={100} suffix=" мс" value={screenQuiz.introMediaMs} onChange={(value) => updateScreenQuiz({ introMediaMs: value })} /></Field>
              <Field label="Пауза"><RangeInput min={0} max={1500} step={20} suffix=" мс" value={screenQuiz.introGapMs} onChange={(value) => updateScreenQuiz({ introGapMs: value })} /></Field>
            </>
          )}
        </Section>
        </>
        )}

        {activeTab === 'advanced' && (
          <SoundSection />
        )}
        </div>
      </div>
    );
  }

  if (templateId !== 'default') {
    return (
      <div className="space-y-5 text-stone-800">
        <TemplateSection />
        <div className="rounded-[1.5rem_0.55rem_1.5rem_0.55rem] border border-stone-200 bg-[#fffdf8] p-4 shadow-[0_18px_48px_rgba(68,64,60,0.08)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Дизайн</div>
          <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[0] text-stone-950">Настройка базового шаблона</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Глубокая настройка интерфейса применяется только к шаблону «Базовый». Тематические шаблоны сохраняют собственную художественную систему и не переопределяются этой панелью.
          </p>
          <button
            type="button"
            onClick={() => setTemplateId('default' as QuizTemplateId)}
            className="mt-4 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-amber-50 transition hover:bg-stone-800"
          >
            Перейти на базовый шаблон
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-stone-800">
      <div className="rounded-[1.5rem_0.55rem_1.5rem_0.55rem] border border-stone-200 bg-[#fffdf8] p-4 shadow-[0_18px_48px_rgba(68,64,60,0.08)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">Дизайн</div>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.04em] text-stone-950">Редактор бренда</h2>
            <p className="mt-1 text-xs leading-5 text-stone-500">Настройте визуальную систему квиза: от логотипа и шрифтов до макета прохождения.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPreviewMode(!isPreviewModeActive)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition ${isPreviewModeActive ? 'bg-stone-900 text-amber-50' : 'bg-amber-300 text-stone-950 hover:bg-amber-200'}`}
        >
          {isPreviewModeActive ? 'Вернуться в редактор' : 'Предпросмотр в реальном времени'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${activeTab === tab.id ? 'border-stone-950 bg-stone-950 text-amber-50' : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-stone-950'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-[1.25rem_0.45rem_1.25rem_0.45rem] border border-stone-200 bg-[#f8f5ee] p-3">
        <div className="rounded-[1rem_0.35rem_1rem_0.35rem] border border-stone-200 bg-white p-4" style={previewStyle}>
          <div className="mb-3 flex items-center gap-2">
            {ds.brand?.logoUrl ? <img src={ds.brand.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-stone-950" />}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ds.brand?.primaryColor }}>Preview</div>
              <div className="font-serif text-lg font-semibold" style={{ color: ds.typography.headingColor, fontFamily: ds.typography.displayFontFamily }}>{ds.brand?.brandName || 'Ваш квиз'}</div>
            </div>
          </div>
          <button type="button" className="mr-2 rounded-lg px-3 py-2 text-xs font-bold" style={{ background: ds.buttons.backgroundColor, color: ds.buttons.textColor, borderRadius: ds.buttons.borderRadius }}>Кнопка</button>
          <span className="inline-block rounded-lg border px-3 py-2 text-xs" style={{ background: ds.answerCards.backgroundColor, color: ds.answerCards.textColor, borderRadius: ds.answerCards.borderRadius }}>Ответ</span>
        </div>
      </div>

      <div className="space-y-4">
        {activeTab === 'quickStart' && (
          <div className="space-y-4">
            <TemplateSection />
            <Section title="Быстрый старт" note="Главный вход для выбора шаблона и включения живого предпросмотра без перехода в настройки рабочего пространства.">
              <button
                type="button"
                onClick={() => setPreviewMode(!isPreviewModeActive)}
                className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition ${isPreviewModeActive ? 'bg-stone-900 text-amber-50' : 'bg-amber-300 text-stone-950 hover:bg-amber-200'}`}
              >
                {isPreviewModeActive ? 'Вернуться в редактор' : 'Предпросмотр в реальном времени'}
              </button>
            </Section>
          </div>
        )}

        {activeTab === 'brand' && (
          <Section title="Бренд" note="Базовая система идентичности для квиза и будущих бренд-китов.">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Профессиональный пресет</div>
              <div className="grid gap-2">
                {experiencePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyExperiencePreset(preset)}
                    className={`rounded-xl border p-3 text-left transition ${ds.brand?.experiencePreset === preset.id ? 'border-stone-950 bg-stone-950 text-amber-50' : 'border-stone-200 bg-white hover:border-amber-300'}`}
                  >
                    <div className="font-serif text-lg font-semibold">{preset.title}</div>
                    <p className={`mt-1 text-xs leading-5 ${ds.brand?.experiencePreset === preset.id ? 'text-amber-50/70' : 'text-stone-500'}`}>{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Палитра</div>
              <div className="grid grid-cols-2 gap-2">
                {palettePresets.map((palette) => (
                  <button key={palette.title} type="button" onClick={() => applyPalettePreset(palette)} className="rounded-xl border border-stone-200 bg-white p-2 text-left transition hover:border-amber-300">
                    <div className="mb-2 flex gap-1">
                      {[palette.primary, palette.accent, palette.neutral, palette.bg].map((color) => <span key={color} className="h-5 flex-1 rounded-md border border-stone-200" style={{ background: color }} />)}
                    </div>
                    <span className="text-xs font-bold text-stone-700">{palette.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Название бренда"><Input value={ds.brand?.brandName || ''} onChange={(e) => updateSection('brand', { brandName: e.target.value })} placeholder="Поток / клиент / проект" /></Field>
            <Field label="Логотип"><UrlInput value={ds.brand?.logoUrl || ''} onChange={(value) => updateSection('brand', { logoUrl: value })} /></Field>
            <Field label="Основной цвет"><ColorInput value={ds.brand?.primaryColor || ds.buttons.backgroundColor} onChange={(value) => updateSection('brand', { primaryColor: value })} /></Field>
            <Field label="Акцент"><ColorInput value={ds.brand?.accentColor || '#b9852b'} onChange={(value) => updateSection('brand', { accentColor: value })} /></Field>
            <Field label="Нейтральный цвет"><ColorInput value={ds.brand?.neutralColor || '#1d1a16'} onChange={(value) => updateSection('brand', { neutralColor: value })} /></Field>
          </Section>
        )}

        {activeTab === 'screen' && (
          <Section title="Фон" note="Цвет, градиент, изображение и наложение для общего пространства квиза.">
            <Field label="Тип фона">
              <Segmented value={ds.background.mode || 'solid'} onChange={(value) => updateSection('background', { mode: value })} options={[
                { value: 'solid', label: 'Цвет' },
                { value: 'gradient', label: 'Градиент' },
                { value: 'image', label: 'Изображение' },
              ]} />
            </Field>
            <Field label="Цвет фона"><ColorInput value={ds.background.color} onChange={(value) => updateSection('background', { color: value })} /></Field>
            <Field label="Градиент от"><ColorInput value={ds.background.gradientFrom || ds.background.color} onChange={(value) => updateSection('background', { gradientFrom: value })} /></Field>
            <Field label="Градиент до"><ColorInput value={ds.background.gradientTo || '#ebe5db'} onChange={(value) => updateSection('background', { gradientTo: value })} /></Field>
            <Field label="Изображение"><UrlInput value={ds.background.imageUrl} onChange={(value) => updateSection('background', { imageUrl: value, mode: value ? 'image' : ds.background.mode })} /></Field>
            <Field label="Поведение изображения">
              <Select value={ds.background.imageFit || 'cover'} onChange={(e) => updateSection('background', { imageFit: e.target.value as NonNullable<DesignSettings['background']>['imageFit'] })}>
                <option value="cover">Заполнить</option>
                <option value="contain">Вместить</option>
                <option value="repeat">Паттерн</option>
              </Select>
            </Field>
            <Field label="Текстура">
              <Select value={ds.background.texture || 'none'} onChange={(e) => updateSection('background', { texture: e.target.value as NonNullable<DesignSettings['background']>['texture'] })}>
                <option value="none">Без текстуры</option>
                <option value="grain">Лёгкое зерно</option>
                <option value="grid">Сетка</option>
                <option value="paper">Бумага</option>
              </Select>
            </Field>
            <Field label="Цвет наложения"><ColorInput value={ds.background.overlayColor} onChange={(value) => updateSection('background', { overlayColor: value })} /></Field>
            <Field label="Прозрачность наложения"><RangeInput min={0} max={1} step={0.05} value={ds.background.overlayOpacity} onChange={(value) => updateSection('background', { overlayOpacity: value })} /></Field>
          </Section>
        )}

        {activeTab === 'brand' && (
          <Section title="Расширенная типографика" note="Отдельные настройки для интерфейсного и заголовочного шрифта, веса, масштаба и ритма.">
            <Field label="Основной шрифт"><Select value={ds.typography.fontFamily} onChange={(e) => updateSection('typography', { fontFamily: e.target.value })}>{fontOptions.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</Select></Field>
            <Field label="Шрифт заголовков"><Select value={ds.typography.displayFontFamily || ds.typography.fontFamily} onChange={(e) => updateSection('typography', { displayFontFamily: e.target.value })}>{fontOptions.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</Select></Field>
            <Field label="Цвет заголовков"><ColorInput value={ds.typography.headingColor} onChange={(value) => updateSection('typography', { headingColor: value })} /></Field>
            <Field label="Цвет текста"><ColorInput value={ds.typography.bodyTextColor} onChange={(value) => updateSection('typography', { bodyTextColor: value })} /></Field>
            <Field label="Вес заголовков"><RangeInput min={300} max={900} step={50} value={ds.typography.headingWeight || 650} onChange={(value) => updateSection('typography', { headingWeight: value })} /></Field>
            <Field label="Вес текста"><RangeInput min={300} max={800} step={50} value={ds.typography.bodyWeight || 450} onChange={(value) => updateSection('typography', { bodyWeight: value })} /></Field>
            <Field label="Масштаб заголовков"><RangeInput min={0.75} max={1.35} step={0.05} value={ds.typography.headingScale || 1} onChange={(value) => updateSection('typography', { headingScale: value })} /></Field>
            <Field label="Масштаб текста"><RangeInput min={0.85} max={1.25} step={0.05} value={ds.typography.bodyScale || 1} onChange={(value) => updateSection('typography', { bodyScale: value })} /></Field>
            <Field label="Межстрочный интервал"><RangeInput min={1.15} max={1.9} step={0.05} value={ds.typography.lineHeight || 1.55} onChange={(value) => updateSection('typography', { lineHeight: value })} /></Field>
            <Field label="Интервал заголовка"><RangeInput min={0.9} max={1.35} step={0.02} value={ds.typography.headingLineHeight || 1.04} onChange={(value) => updateSection('typography', { headingLineHeight: value })} /></Field>
            <Field label="Ширина абзаца"><RangeInput min={460} max={860} step={20} suffix="px" value={ds.typography.paragraphWidth || 680} onChange={(value) => updateSection('typography', { paragraphWidth: value })} /></Field>
            <Field label="Трекинг"><RangeInput min={0} max={1.2} step={0.05} suffix="px" value={ds.typography.letterSpacing || 0} onChange={(value) => updateSection('typography', { letterSpacing: value })} /></Field>
          </Section>
        )}

        {activeTab === 'screen' && (
          <Section title="Пресеты макета экрана" note="Быстро меняют композицию прохождения: ширину, плотность, радиусы и позицию медиа.">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Профессиональные макеты интерфейса</div>
              <div className="grid gap-2">
                {interfacePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyInterfacePreset(preset)}
                    className={`rounded-xl border p-3 text-left transition ${ds.layout?.interfacePreset === preset.id ? 'border-stone-950 bg-stone-950 text-amber-50' : 'border-stone-200 bg-white hover:border-amber-300'}`}
                  >
                    <div className="font-serif text-lg font-semibold">{preset.title}</div>
                    <p className={`mt-1 text-xs leading-5 ${ds.layout?.interfacePreset === preset.id ? 'text-amber-50/70' : 'text-stone-500'}`}>{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f0] p-3">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Видимость блоков</div>
              <div className="grid gap-2">
                {blockControls.map((control) => {
                  const checked = (ds.layout?.blocks?.[control.key] ?? defaultBlocks[control.key]) !== false;
                  return (
                    <div key={control.key} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2">
                      <span className="text-sm font-semibold text-stone-700">{control.label}</span>
                      <Toggle checked={checked} onChange={(value) => updateLayoutBlock(control.key, value)} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f0] p-3">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Карточка вопроса</div>
              <div className="grid gap-3">
                <Field label="Фон карточки"><ColorInput value={ds.questionCard?.backgroundColor || ds.answerCards.backgroundColor} onChange={(value) => updateSection('questionCard', { backgroundColor: value })} /></Field>
                <Field label="Цвет текста"><ColorInput value={ds.questionCard?.textColor || ds.typography.bodyTextColor} onChange={(value) => updateSection('questionCard', { textColor: value })} /></Field>
                <Field label="Рамка"><ColorInput value={ds.questionCard?.borderColor || '#dfd8cc'} onChange={(value) => updateSection('questionCard', { borderColor: value })} /></Field>
                <Field label="Скругление"><RangeInput min={0} max={56} step={1} suffix="px" value={ds.questionCard?.radius ?? ds.layout?.cardRadius ?? 28} onChange={(value) => updateSection('questionCard', { radius: value })} /></Field>
                <Field label="Внутренний отступ"><RangeInput min={16} max={80} step={2} suffix="px" value={ds.questionCard?.padding ?? ds.layout?.cardPadding ?? 32} onChange={(value) => updateSection('questionCard', { padding: value })} /></Field>
                <Field label="Тень"><Select value={ds.questionCard?.shadow || 'soft'} onChange={(e) => updateSection('questionCard', { shadow: e.target.value as NonNullable<DesignSettings['questionCard']>['shadow'] })}><option value="none">Без тени</option><option value="soft">Мягкая</option><option value="strong">Выраженная</option></Select></Field>
                <Field label="Медиа в карточке"><Select value={ds.questionCard?.mediaPosition || ds.layout?.mediaPosition || 'top'} onChange={(e) => updateSection('questionCard', { mediaPosition: e.target.value as NonNullable<DesignSettings['questionCard']>['mediaPosition'] })}><option value="top">Сверху</option><option value="left">Слева</option><option value="right">Справа</option><option value="background">Фоном</option></Select></Field>
                <Field label="Ширина медиа"><RangeInput min={28} max={58} step={1} suffix="%" value={ds.questionCard?.mediaWidth ?? 42} onChange={(value) => updateSection('questionCard', { mediaWidth: value })} /></Field>
                <Field label="Скругление медиа"><RangeInput min={0} max={36} step={1} suffix="px" value={ds.questionCard?.mediaRadius ?? 22} onChange={(value) => updateSection('questionCard', { mediaRadius: value })} /></Field>
                <Field label="Заполнение медиа"><Segmented value={ds.questionCard?.mediaFit || 'cover'} onChange={(value) => updateSection('questionCard', { mediaFit: value })} options={[{ value: 'cover', label: 'Обрезать' }, { value: 'contain', label: 'Вместить' }]} /></Field>
              </div>
            </div>
            <Field label="Хром интерфейса"><Select value={ds.layout?.chrome || 'full'} onChange={(e) => updateSection('layout', { chrome: e.target.value as NonNullable<DesignSettings['layout']>['chrome'] })}><option value="full">Полный</option><option value="compact">Компактный</option><option value="none">Без панели</option></Select></Field>
            <div className="grid gap-3">
              {layoutPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyLayoutPreset(preset)}
                  className={`rounded-xl border p-3 text-left transition ${ds.layout?.preset === preset.id ? 'border-stone-950 bg-stone-950 text-amber-50' : 'border-stone-200 bg-white hover:border-amber-300'}`}
                >
                  <div className="font-serif text-lg font-semibold">{preset.title}</div>
                  <p className={`mt-1 text-xs leading-5 ${ds.layout?.preset === preset.id ? 'text-amber-50/70' : 'text-stone-500'}`}>{preset.description}</p>
                </button>
              ))}
            </div>
            <Field label="Ширина контента"><RangeInput min={560} max={1180} step={20} suffix="px" value={ds.layout?.contentWidth || 920} onChange={(value) => updateSection('layout', { contentWidth: value })} /></Field>
            <Field label="Радиус основной карточки"><RangeInput min={0} max={48} step={1} suffix="px" value={ds.layout?.cardRadius || 28} onChange={(value) => updateSection('layout', { cardRadius: value })} /></Field>
            <Field label="Внутренний отступ"><RangeInput min={16} max={64} step={2} suffix="px" value={ds.layout?.cardPadding || 32} onChange={(value) => updateSection('layout', { cardPadding: value })} /></Field>
            <Field label="Прозрачность поверхности"><RangeInput min={0.7} max={1} step={0.02} value={ds.layout?.cardOpacity || 0.94} onChange={(value) => updateSection('layout', { cardOpacity: value })} /></Field>
            <Field label="Позиция медиа"><Select value={ds.layout?.mediaPosition || 'top'} onChange={(e) => updateSection('layout', { mediaPosition: e.target.value as NonNullable<DesignSettings['layout']>['mediaPosition'] })}><option value="top">Сверху</option><option value="left">Слева</option><option value="right">Справа</option><option value="background">Фоном</option></Select></Field>
            <Field label="Поверхность"><Select value={ds.layout?.surfaceStyle || 'paper'} onChange={(e) => updateSection('layout', { surfaceStyle: e.target.value as NonNullable<DesignSettings['layout']>['surfaceStyle'] })}><option value="solid">Чистая карточка</option><option value="paper">Тёплая бумага</option><option value="outline">Тонкий контур</option><option value="glass">Стекло</option><option value="minimal">Без рамки</option></Select></Field>
            <Field label="Выравнивание вопроса"><Segmented value={ds.layout?.questionAlign || 'left'} onChange={(value) => updateSection('layout', { questionAlign: value })} options={[{ value: 'left', label: 'Слева' }, { value: 'center', label: 'По центру' }]} /></Field>
            <Field label="Вертикальный ритм"><Select value={ds.layout?.verticalAlign || 'center'} onChange={(e) => updateSection('layout', { verticalAlign: e.target.value as NonNullable<DesignSettings['layout']>['verticalAlign'] })}><option value="center">По центру экрана</option><option value="top">Ближе к верху</option></Select></Field>
            <Field label="Плотность"><Select value={ds.layout?.density || 'balanced'} onChange={(e) => updateSection('layout', { density: e.target.value as NonNullable<DesignSettings['layout']>['density'] })}><option value="relaxed">Воздушная</option><option value="balanced">Сбалансированная</option><option value="compact">Плотная</option></Select></Field>
          </Section>
        )}

        {activeTab === 'elements' && (
          <Section title="Кнопки" note="Стиль основных действий: начать, далее, отправить, перейти.">
            <Field label="Стиль"><Select value={ds.buttons.style || 'solid'} onChange={(e) => updateSection('buttons', { style: e.target.value as NonNullable<DesignSettings['buttons']>['style'] })}><option value="solid">Solid</option><option value="outline">Outline</option><option value="ghost">Ghost</option><option value="soft">Soft</option><option value="premium">Premium</option></Select></Field>
            <Field label="Фон"><ColorInput value={ds.buttons.backgroundColor} onChange={(value) => updateSection('buttons', { backgroundColor: value })} /></Field>
            <Field label="Текст"><ColorInput value={ds.buttons.textColor} onChange={(value) => updateSection('buttons', { textColor: value })} /></Field>
            <Field label="Фон при наведении"><ColorInput value={ds.buttons.hoverBackgroundColor} onChange={(value) => updateSection('buttons', { hoverBackgroundColor: value })} /></Field>
            <Field label="Текст при наведении"><ColorInput value={ds.buttons.hoverTextColor} onChange={(value) => updateSection('buttons', { hoverTextColor: value })} /></Field>
            <Field label="Высота"><RangeInput min={38} max={72} step={1} suffix="px" value={ds.buttons.height || 52} onChange={(value) => updateSection('buttons', { height: value })} /></Field>
            <Field label="Скругление"><RangeInput min={0} max={36} step={1} suffix="px" value={ds.buttons.borderRadius} onChange={(value) => updateSection('buttons', { borderRadius: value })} /></Field>
            <Field label="Вес текста"><RangeInput min={400} max={900} step={50} value={ds.buttons.fontWeight || 800} onChange={(value) => updateSection('buttons', { fontWeight: value })} /></Field>
            <Field label="Ширина"><Segmented value={ds.buttons.width || 'auto'} onChange={(value) => updateSection('buttons', { width: value })} options={[{ value: 'auto', label: 'По контенту' }, { value: 'full', label: 'На всю ширину' }]} /></Field>
            <Field label="Регистр"><Segmented value={ds.buttons.textTransform || 'none'} onChange={(value) => updateSection('buttons', { textTransform: value })} options={[{ value: 'none', label: 'Обычный' }, { value: 'uppercase', label: 'Верхний' }]} /></Field>
            <Field label="Тень"><Select value={ds.buttons.shadow || 'soft'} onChange={(e) => updateSection('buttons', { shadow: e.target.value as NonNullable<DesignSettings['buttons']>['shadow'] })}><option value="none">Без тени</option><option value="soft">Мягкая</option><option value="strong">Выраженная</option></Select></Field>
          </Section>
        )}

        {activeTab === 'elements' && (
          <Section title="Ответы" note="Визуальная система вариантов ответа, выбранных состояний и расстояний.">
            <Field label="Стиль"><Select value={ds.answerCards.style || 'card'} onChange={(e) => updateSection('answerCards', { style: e.target.value as NonNullable<DesignSettings['answerCards']>['style'] })}><option value="card">Карточки</option><option value="list">Список</option><option value="tiles">Плитка</option><option value="minimal">Минимальный</option></Select></Field>
            <Field label="Фон"><ColorInput value={ds.answerCards.backgroundColor} onChange={(value) => updateSection('answerCards', { backgroundColor: value })} /></Field>
            <Field label="Текст"><ColorInput value={ds.answerCards.textColor} onChange={(value) => updateSection('answerCards', { textColor: value })} /></Field>
            <Field label="Рамка"><ColorInput value={ds.answerCards.borderColor || '#dfd8cc'} onChange={(value) => updateSection('answerCards', { borderColor: value })} /></Field>
            <Field label="Фон при наведении"><ColorInput value={ds.answerCards.hoverBackgroundColor} onChange={(value) => updateSection('answerCards', { hoverBackgroundColor: value })} /></Field>
            <Field label="Выбранный фон"><ColorInput value={ds.answerCards.selectedBackgroundColor} onChange={(value) => updateSection('answerCards', { selectedBackgroundColor: value })} /></Field>
            <Field label="Выбранный текст"><ColorInput value={ds.answerCards.selectedTextColor} onChange={(value) => updateSection('answerCards', { selectedTextColor: value })} /></Field>
            <Field label="Выбранная рамка"><ColorInput value={ds.answerCards.selectedBorderColor || ds.buttons.backgroundColor} onChange={(value) => updateSection('answerCards', { selectedBorderColor: value })} /></Field>
            <Field label="Скругление"><RangeInput min={0} max={36} step={1} suffix="px" value={ds.answerCards.borderRadius} onChange={(value) => updateSection('answerCards', { borderRadius: value })} /></Field>
            <Field label="Расстояние"><RangeInput min={4} max={28} step={1} suffix="px" value={ds.answerCards.spacing || 12} onChange={(value) => updateSection('answerCards', { spacing: value })} /></Field>
            <Field label="Колонки"><Segmented value={String(ds.answerCards.columns || 1)} onChange={(value) => updateSection('answerCards', { columns: Number(value) as 1 | 2 | 3 })} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} /></Field>
            <Field label="Минимальная высота"><RangeInput min={44} max={120} step={2} suffix="px" value={ds.answerCards.minHeight || 58} onChange={(value) => updateSection('answerCards', { minHeight: value })} /></Field>
            <Field label="Пропорция медиа"><Select value={ds.answerCards.mediaAspectRatio || 'auto'} onChange={(e) => updateSection('answerCards', { mediaAspectRatio: e.target.value as NonNullable<DesignSettings['answerCards']>['mediaAspectRatio'] })}><option value="auto">Авто</option><option value="16/9">16:9</option><option value="4/3">4:3</option><option value="1/1">1:1</option></Select></Field>
            <Field label="Маркеры"><Select value={ds.answerCards.markerStyle || 'letters'} onChange={(e) => updateSection('answerCards', { markerStyle: e.target.value as NonNullable<DesignSettings['answerCards']>['markerStyle'] })}><option value="none">Без маркеров</option><option value="letters">A/B/C</option><option value="numbers">1/2/3</option></Select></Field>
          </Section>
        )}

        {activeTab === 'elements' && (
          <Section title="Прогресс" note="Настройка отображения прогресса прохождения.">
            <Field label="Стиль"><Select value={ds.progress?.style || 'bar'} onChange={(e) => updateSection('progress', { style: e.target.value as NonNullable<DesignSettings['progress']>['style'] })}><option value="bar">Линия</option><option value="steps">Шаги</option><option value="ring">Кольцо</option><option value="hidden">Скрыть</option></Select></Field>
            <Field label="Позиция"><Select value={ds.progress?.position || 'top'} onChange={(e) => updateSection('progress', { position: e.target.value as NonNullable<DesignSettings['progress']>['position'] })}><option value="top">Сверху</option><option value="bottom">Снизу</option><option value="inside">Внутри карточки</option></Select></Field>
            <Field label="Цвет прогресса"><ColorInput value={ds.progress?.color || ds.buttons.backgroundColor} onChange={(value) => updateSection('progress', { color: value })} /></Field>
            <Field label="Цвет трека"><ColorInput value={ds.progress?.trackColor || '#e4ded2'} onChange={(value) => updateSection('progress', { trackColor: value })} /></Field>
            <Field label="Высота линии"><RangeInput min={3} max={16} step={1} suffix="px" value={ds.progress?.height || 8} onChange={(value) => updateSection('progress', { height: value })} /></Field>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Показывать проценты</span><Toggle checked={ds.progress?.showPercent !== false} onChange={(value) => updateSection('progress', { showPercent: value })} /></div>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Показывать шаг</span><Toggle checked={ds.progress?.showStepLabel !== false} onChange={(value) => updateSection('progress', { showStepLabel: value })} /></div>
          </Section>
        )}

        {activeTab === 'elements' && (
          <Section title="Результат" note="Брендирование финального экрана и отчёта прохождения.">
            <Field label="Пресет"><Select value={ds.result?.preset || 'card'} onChange={(e) => updateSection('result', { preset: e.target.value as NonNullable<DesignSettings['result']>['preset'] })}><option value="card">Карточка</option><option value="certificate">Сертификат</option><option value="report">Отчёт</option><option value="landing">Лендинг</option></Select></Field>
            <Field label="Фон результата"><ColorInput value={ds.result?.backgroundColor || ds.answerCards.backgroundColor} onChange={(value) => updateSection('result', { backgroundColor: value })} /></Field>
            <Field label="Текст результата"><ColorInput value={ds.result?.textColor || ds.typography.headingColor} onChange={(value) => updateSection('result', { textColor: value })} /></Field>
            <Field label="Акцент результата"><ColorInput value={ds.result?.accentColor || ds.buttons.backgroundColor} onChange={(value) => updateSection('result', { accentColor: value })} /></Field>
            <Field label="Подача баллов"><Select value={ds.result?.scoreStyle || 'badge'} onChange={(e) => updateSection('result', { scoreStyle: e.target.value as NonNullable<DesignSettings['result']>['scoreStyle'] })}><option value="badge">Бейдж</option><option value="ring">Кольцо</option><option value="stat">Статистика</option></Select></Field>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Показывать баллы</span><Toggle checked={ds.result?.showScore !== false} onChange={(value) => updateSection('result', { showScore: value })} /></div>
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Показывать шаринг</span><Toggle checked={ds.result?.showShare !== false} onChange={(value) => updateSection('result', { showShare: value })} /></div>
          </Section>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <SoundSection />
            <Section title="Дополнительно" note="Тонкие настройки для доступности и scoped CSS. CSS применяется только внутри плеера/публичного HTML.">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Уменьшить анимации</span><Toggle checked={Boolean(ds.advanced?.reducedMotion)} onChange={(value) => updateSection('advanced', { reducedMotion: value })} /></div>
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-[#faf7f0] p-3"><span className="text-sm font-semibold">Повышенный контраст</span><Toggle checked={Boolean(ds.advanced?.highContrast)} onChange={(value) => updateSection('advanced', { highContrast: value })} /></div>
              <Field label="Custom CSS" hint="Для продвинутого брендирования. Не используйте внешние скрипты.">
                <TextArea value={ds.advanced?.customCss || ''} onChange={(e) => updateSection('advanced', { customCss: e.target.value })} placeholder=".node-title { text-transform: uppercase; }" />
              </Field>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignPanel;

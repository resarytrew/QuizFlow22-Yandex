import React from 'react';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { QuizTemplateId } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../../src/design/designResolver';

const TEMPLATE_OPTIONS: Array<{ id: QuizTemplateId; label: string }> = [
  { id: 'default', label: 'Классический' },
  { id: 'newyear', label: 'Новый год' },
  { id: 'screenQuiz', label: 'Экранная викторина' },
  { id: 'ww2', label: 'ВОВ' },
  { id: 'economic', label: 'Экономика' },
  { id: 'yandex', label: 'Яндекс' },
  { id: 'army', label: 'Армия' },
  { id: 'science', label: 'Наука' },
  { id: 'math', label: 'Математика' },
  { id: 'history', label: 'История' },
];

const STATUS_LABELS = {
  applied: 'Стиль применён',
  modified: 'Стиль изменён',
  custom: 'Пользовательский дизайн',
} as const;

const VISUAL_SELECTION_TEMPLATES = new Set<QuizTemplateId>(['default', 'newyear', 'screenQuiz']);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
    />
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    >
      {children}
    </select>
  );
}

const DesignOverviewPanel: React.FC = () => {
  const templateId = useQuizDataStore((state) => state.templateId);
  const setTemplateId = useQuizDataStore((state) => state.setTemplateId);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const designStatus = useQuizDataStore((state) => state.designStatus);
  const activeDesignStyleId = useQuizDataStore((state) => state.activeDesignStyleId);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const resetDesignSection = useQuizDataStore((state) => state.resetDesignSection);

  const brand = {
    ...(DEFAULT_DESIGN_SETTINGS.brand ?? {}),
    ...(designSettings.brand ?? {}),
  };
  const background = {
    ...(DEFAULT_DESIGN_SETTINGS.background ?? {}),
    ...(designSettings.background ?? {}),
  };
  const layout = {
    surfaceStyle: 'paper' as NonNullable<NonNullable<typeof DEFAULT_DESIGN_SETTINGS.layout>['surfaceStyle']>,
    ...(DEFAULT_DESIGN_SETTINGS.layout ?? {}),
    ...(designSettings.layout ?? {}),
  };
  const questionCard = {
    ...(DEFAULT_DESIGN_SETTINGS.questionCard ?? {}),
    ...(designSettings.questionCard ?? {}),
  };
  const brandPrimaryColor = brand.primaryColor ?? '#2f5d50';
  const brandAccentColor = brand.accentColor ?? '#b9852b';
  const brandNeutralColor = brand.neutralColor ?? '#1d1a16';
  const backgroundColor = background.color ?? '#f6f3ee';
  const questionCardRadius = questionCard.radius ?? 28;
  const supportsVisualSelection = VISUAL_SELECTION_TEMPLATES.has(templateId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Дизайн квиза</h2>
        <p className="mt-1 text-sm text-slate-500">Общие настройки текущего визуального режима.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Статус</div>
            <div className="text-sm font-bold text-slate-900">{STATUS_LABELS[designStatus]}</div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {activeDesignStyleId ?? 'custom'}
          </div>
        </div>
      </section>

      {!supportsVisualSelection && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Визуальный выбор элементов для этого шаблона пока недоступен. Общие настройки дизайна работают, а выбор в Player безопасно отключён.
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Шаблон и стиль</h3>
        <Field label="Шаблон">
          <SelectInput value={templateId} onChange={(value) => setTemplateId(value as QuizTemplateId)}>
            {TEMPLATE_OPTIONS.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Стиль поверхности">
          <SelectInput
            value={layout.surfaceStyle ?? 'paper'}
            onChange={(value) => updateDesignSettings({ layout: { surfaceStyle: value as NonNullable<typeof layout.surfaceStyle> } }, { label: 'Update surface style' })}
          >
            <option value="paper">Paper</option>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="glass">Glass</option>
            <option value="minimal">Minimal</option>
          </SelectInput>
        </Field>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Палитра</h3>
          <button
            type="button"
            onClick={() => resetDesignSection('brand')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Сбросить
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary">
            <ColorInput value={brandPrimaryColor} onChange={(value) => updateDesignSettings({ brand: { primaryColor: value } }, { label: 'Update primary color' })} />
          </Field>
          <Field label="Accent">
            <ColorInput value={brandAccentColor} onChange={(value) => updateDesignSettings({ brand: { accentColor: value } }, { label: 'Update accent color' })} />
          </Field>
          <Field label="Neutral">
            <ColorInput value={brandNeutralColor} onChange={(value) => updateDesignSettings({ brand: { neutralColor: value } }, { label: 'Update neutral color' })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Brand Kit</h3>
        <Field label="Название бренда">
          <input
            value={brand.brandName ?? ''}
            onChange={(event) => updateDesignSettings({ brand: { brandName: event.target.value } }, { label: 'Update brand name' })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="Название проекта"
          />
        </Field>
        <Field label="Логотип URL">
          <input
            value={brand.logoUrl ?? ''}
            onChange={(event) => updateDesignSettings({ brand: { logoUrl: event.target.value } }, { label: 'Update logo URL' })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="https://..."
          />
        </Field>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Фон и экран</h3>
          <button
            type="button"
            onClick={() => resetDesignSection('background')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Сбросить фон
          </button>
        </div>
        <Field label="Цвет фона">
          <ColorInput value={backgroundColor} onChange={(value) => updateDesignSettings({ background: { color: value } }, { label: 'Update background color' })} />
        </Field>
        <Field label="Радиус карточки">
          <input
            type="range"
            min={0}
            max={72}
            value={questionCardRadius}
            onChange={(event) => updateDesignSettings(
              { questionCard: { radius: Number(event.target.value) } },
              { label: 'Update card radius', coalesceKey: 'design-mode-card-radius' },
            )}
            className="w-full"
          />
        </Field>
      </section>
    </div>
  );
};

export default DesignOverviewPanel;

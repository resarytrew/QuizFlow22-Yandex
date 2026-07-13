import React from 'react';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { DesignSelection } from '../../store/useUIStore';
import type { DesignSettings } from '../../types';
import { DEFAULT_DESIGN_SETTINGS } from '../../src/design/designResolver';

interface DesignElementInspectorProps {
  selection: DesignSelection;
}

const ROLE_LABELS: Record<DesignSelection['role'], string> = {
  screen: 'Экран',
  background: 'Фон',
  questionCard: 'Карточка вопроса',
  answerCard: 'Ответы',
  button: 'Кнопки',
  media: 'Медиа',
  progress: 'Прогресс',
  result: 'Результат',
  unknown: 'Элемент',
};

function resetSectionForRole(role: DesignSelection['role']): keyof DesignSettings | null {
  if (role === 'questionCard') return 'questionCard';
  if (role === 'answerCard') return 'answerCards';
  if (role === 'button') return 'buttons';
  if (role === 'background' || role === 'screen') return 'background';
  if (role === 'progress') return 'progress';
  if (role === 'result') return 'result';
  return null;
}

const DesignElementInspector: React.FC<DesignElementInspectorProps> = ({ selection }) => {
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const resetDesignSection = useQuizDataStore((state) => state.resetDesignSection);
  const section = resetSectionForRole(selection.role);
  const questionCard = {
    ...(DEFAULT_DESIGN_SETTINGS.questionCard ?? {}),
    ...(designSettings.questionCard ?? {}),
  };
  const buttons = {
    ...(DEFAULT_DESIGN_SETTINGS.buttons ?? {}),
    ...(designSettings.buttons ?? {}),
  };
  const questionCardBackground = questionCard.backgroundColor ?? '#fffefa';
  const questionCardRadius = questionCard.radius ?? 28;
  const buttonBackground = buttons.backgroundColor ?? '#2f5d50';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{ROLE_LABELS[selection.role]}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Контекст выбранного элемента. Точное выделение элементов будет расширено следующим этапом.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-bold text-slate-900">{selection.elementId}</div>
        <div className="mt-1 text-slate-500">Экран: {selection.nodeId ?? 'общий'}</div>
      </div>

      {selection.role === 'questionCard' && (
        <section className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Фон карточки</span>
            <input
              type="color"
              value={questionCardBackground}
              onChange={(event) => updateDesignSettings({ questionCard: { backgroundColor: event.target.value } }, { label: 'Update question card color' })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Радиус</span>
            <input
              type="range"
              min={0}
              max={72}
              value={questionCardRadius}
              onChange={(event) => updateDesignSettings(
                { questionCard: { radius: Number(event.target.value) } },
                { label: 'Update selected element radius', coalesceKey: 'inspector-question-radius' },
              )}
              className="w-full"
            />
          </label>
        </section>
      )}

      {selection.role === 'button' && (
        <section className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Цвет кнопки</span>
            <input
              type="color"
              value={buttonBackground}
              onChange={(event) => updateDesignSettings({ buttons: { backgroundColor: event.target.value } }, { label: 'Update button color' })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
            />
          </label>
        </section>
      )}

      <button
        type="button"
        disabled={!section}
        onClick={() => section && resetDesignSection(section)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Сбросить изменения выбранного элемента
      </button>
    </div>
  );
};

export default DesignElementInspector;

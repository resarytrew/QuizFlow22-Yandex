import React from 'react';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { QuizTemplateId } from '../../../types';
import { Section } from '../ui/Section';

const TEMPLATE_OPTIONS: ReadonlyArray<{ id: QuizTemplateId; name: string; icon: string }> = [
  { id: 'default', name: 'Базовый', icon: '🎨' },
  { id: 'ww2', name: 'WW2 (Великая Отечественная)', icon: '🎖️' },
  { id: 'economic', name: 'Экономический терминал', icon: '💼' },
  { id: 'yandex', name: 'Яндекс Стимпанк', icon: '⚙️' },
  { id: 'army', name: 'Офицерский планшет', icon: '🎖️' },
  { id: 'science', name: 'Научный терминал', icon: '🧪' },
  { id: 'math', name: 'Школьная доска', icon: '📐' },
  { id: 'history', name: 'Исторический свиток', icon: '📜' },
  { id: 'newyear', name: 'Новогодний (Операция НГ)', icon: '🎄' },
  { id: 'screenQuiz', name: 'Экранная викторина', icon: 'TV' },
];

export const TemplateSection: React.FC = () => {
  const templateId = useQuizDataStore((s) => s.templateId);
  const setTemplateId = useQuizDataStore((s) => s.setTemplateId);

  const selectTemplate = (id: QuizTemplateId) => setTemplateId(id);

  return (
    <Section
      title="Шаблон оформления"
      description="Выберите визуальную тему для вашего квиза."
    >
      <div className="grid grid-cols-2 gap-3 py-2">
        {TEMPLATE_OPTIONS.map(({ id, name, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTemplate(id)}
            className={`relative p-4 rounded-xl border-2 text-left transition-all group hover:shadow-md ${
              templateId === id
                ? 'bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500/20'
                : 'bg-white border-slate-200 hover:border-indigo-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center text-lg ${
                templateId === id
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'
              }`}
            >
              {icon}
            </div>
            <div
              className={`font-bold text-sm ${
                templateId === id ? 'text-indigo-900' : 'text-slate-700'
              }`}
            >
              {name}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
              {id}
            </div>

            {templateId === id && (
              <div className="absolute top-3 right-3 text-indigo-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </Section>
  );
};

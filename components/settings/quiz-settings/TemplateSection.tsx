import React from 'react';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { DesignSettings, QuizTemplateId } from '../../../types';
import { Section } from '../ui/Section';

const TEMPLATE_OPTIONS: ReadonlyArray<{ id: QuizTemplateId; name: string; icon: string }> = [
  { id: 'default', name: 'Базовый', icon: '🎨' },
  { id: 'importantTalks', name: 'Разговоры о важном', icon: '💬' },
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

const IMPORTANT_TALKS_PRESET: Partial<DesignSettings> = {
  brand: {
    logoUrl: '',
    avatarUrl: '',
    brandName: 'Разговоры о важном',
    scoreLabel: 'Искры добра',
    primaryColor: '#0b4dcc',
    accentColor: '#e5242f',
    neutralColor: '#071f58',
    experiencePreset: 'assessment',
  },
  background: {
    color: '#f8f7f3',
    imageUrl: '',
    overlayColor: '#f8f7f3',
    overlayOpacity: 0,
    mode: 'solid',
    gradientFrom: '#ffffff',
    gradientTo: '#eef5ff',
    imageFit: 'cover',
    texture: 'paper',
  },
  typography: {
    fontFamily: "'Manrope', 'Arial', sans-serif",
    displayFontFamily: "'Manrope', 'Arial', sans-serif",
    headingColor: '#071f58',
    bodyTextColor: '#16316e',
    headingWeight: 800,
    bodyWeight: 500,
    headingScale: 1,
    bodyScale: 1,
    lineHeight: 1.5,
    letterSpacing: 0,
    headingLineHeight: 1.08,
    paragraphWidth: 760,
  },
  layout: {
    preset: 'split',
    interfacePreset: 'studio',
    contentWidth: 1440,
    cardRadius: 28,
    cardPadding: 38,
    cardOpacity: 0.97,
    mediaPosition: 'right',
    surfaceStyle: 'solid',
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
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f3',
    textColor: '#071f58',
    radius: 28,
    padding: 38,
    shadow: 'soft',
    mediaPosition: 'right',
    mediaWidth: 48,
    mediaRadius: 24,
    mediaFit: 'cover',
  },
  buttons: {
    backgroundColor: '#0b4dcc',
    textColor: '#ffffff',
    hoverBackgroundColor: '#063ca8',
    hoverTextColor: '#ffffff',
    borderRadius: 20,
    style: 'solid',
    height: 58,
    shadow: 'soft',
    fontWeight: 800,
    width: 'auto',
    textTransform: 'none',
  },
  answerCards: {
    backgroundColor: '#ffffff',
    textColor: '#071f58',
    hoverBackgroundColor: '#f1f6ff',
    hoverTextColor: '#071f58',
    selectedBackgroundColor: '#edf4ff',
    selectedTextColor: '#083b9d',
    borderRadius: 18,
    style: 'card',
    borderColor: '#dce4f1',
    selectedBorderColor: '#1462ed',
    spacing: 14,
    markerStyle: 'letters',
    columns: 2,
    minHeight: 68,
    mediaAspectRatio: 'auto',
  },
  progress: {
    style: 'steps',
    position: 'top',
    color: '#0b4dcc',
    trackColor: '#dce2ec',
    showPercent: true,
    showStepLabel: true,
    height: 10,
  },
  result: {
    preset: 'card',
    backgroundColor: '#ffffff',
    textColor: '#071f58',
    accentColor: '#0b4dcc',
    showScore: true,
    showShare: true,
    scoreStyle: 'badge',
  },
};

export const TemplateSection: React.FC = () => {
  const templateId = useQuizDataStore((s) => s.templateId);
  const globalTimerDuration = useQuizDataStore((s) => s.globalTimer.duration);
  const setTemplateId = useQuizDataStore((s) => s.setTemplateId);
  const setGlobalTimer = useQuizDataStore((s) => s.setGlobalTimer);
  const updateDesignSettings = useQuizDataStore((s) => s.updateDesignSettings);

  const selectTemplate = (id: QuizTemplateId) => {
    setTemplateId(id);
    if (id === 'importantTalks') {
      updateDesignSettings(IMPORTANT_TALKS_PRESET);
      setGlobalTimer({ enabled: true, duration: globalTimerDuration > 0 ? globalTimerDuration : 900 });
    }
  };

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

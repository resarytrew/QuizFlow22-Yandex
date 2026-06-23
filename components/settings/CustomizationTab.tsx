import React, { useEffect, useState } from 'react';
import { PresetsSection } from './sections/PresetsSection';
import { EditorSection } from './sections/EditorSection';
import { SidebarFiltersSection } from './sections/SidebarFiltersSection';
import { SidebarSortingSection } from './sections/SidebarSortingSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { NodesVisualSection } from './sections/NodesVisualSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { TemplateSection } from './quiz-settings/TemplateSection';
import { TimerSection } from './quiz-settings/TimerSection';
import { SoundSection } from './quiz-settings/SoundSection';

export type SettingsSectionId =
  | 'quiz'
  | 'timer'
  | 'presets'
  | 'editor'
  | 'nodes'
  | 'filters'
  | 'interface';

interface SectionMeta {
  title: string;
  description: string;
  accentClass: string;
  icon: React.ReactNode;
}

export const SETTINGS_SECTIONS: Record<SettingsSectionId, SectionMeta> = {
  quiz: {
    title: 'Настройки квиза',
    description: 'Шаблон оформления и звуковое сопровождение текущего квиза.',
    accentClass: 'bg-amber-100 text-amber-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13.5" cy="6.5" r="1.5" />
        <circle cx="17.5" cy="10.5" r="1.5" />
        <circle cx="8.5" cy="7.5" r="1.5" />
        <circle cx="6.5" cy="12.5" r="1.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.12-.29-.29-.44-.66-.44-1.13 0-.94.73-1.69 1.67-1.69h1.88c2.86 0 5.18-2.33 5.18-5.18C21.5 6.08 17.25 2 12 2Z" />
      </svg>
    ),
  },
  timer: {
    title: 'Таймер',
    description: 'Общее время прохождения и действие после окончания отсчёта.',
    accentClass: 'bg-rose-100 text-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6M12 2v3" />
      </svg>
    ),
  },
  presets: {
    title: 'Пресеты',
    description: 'Сохранённые наборы настроек для быстрого переключения.',
    accentClass: 'bg-violet-100 text-violet-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M8 3v6h8V4M8 21v-7h8v7" />
      </svg>
    ),
  },
  editor: {
    title: 'Редактор',
    description: 'Холст, сетка, направляющие и поведение рабочего пространства.',
    accentClass: 'bg-sky-100 text-sky-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 3v18M3 8h18" />
      </svg>
    ),
  },
  nodes: {
    title: 'Ноды',
    description: 'Размер, компактность и визуальные элементы карточек нод.',
    accentClass: 'bg-emerald-100 text-emerald-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <path d="M10 6.5h4a3.5 3.5 0 0 1 3.5 3.5v4" />
      </svg>
    ),
  },
  filters: {
    title: 'Фильтры панели',
    description: 'Видимость и порядок Free/Pro-нод в левой палитре.',
    accentClass: 'bg-indigo-100 text-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h16M7 12h10M10 19h4" />
      </svg>
    ),
  },
  interface: {
    title: 'Интерфейс',
    description: 'Тема, цвета, шрифты и режимы производительности.',
    accentClass: 'bg-slate-200 text-slate-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-2.2a2 2 0 0 1-1.8-2.9l1.1-2.2A9 9 0 0 0 12 3Z" />
        <circle cx="7.5" cy="11.5" r=".5" fill="currentColor" />
        <circle cx="10" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="14.5" cy="7" r=".5" fill="currentColor" />
      </svg>
    ),
  },
};

const SECTION_CONTENT: Record<SettingsSectionId, React.ReactNode> = {
  quiz: (
    <div className="space-y-8">
      <TemplateSection />
      <SoundSection />
    </div>
  ),
  timer: <TimerSection />,
  presets: <PresetsSection />,
  editor: <EditorSection />,
  nodes: <NodesVisualSection />,
  filters: (
    <div className="space-y-8">
      <SidebarFiltersSection />
      <SidebarSortingSection />
    </div>
  ),
  interface: (
    <div className="space-y-8">
      <AppearanceSection />
      <PerformanceSection />
    </div>
  ),
};

interface CustomizationTabProps {
  activeSection: SettingsSectionId;
}

export const CustomizationTab: React.FC<CustomizationTabProps> = ({ activeSection }) => {
  const [collapsed, setCollapsed] = useState(false);
  const meta = SETTINGS_SECTIONS[activeSection];

  useEffect(() => {
    setCollapsed(false);
  }, [activeSection]);

  return (
    <section
      className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.accentClass}`}>
            <div className="h-5 w-5">{meta.icon}</div>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{meta.title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{meta.description}</p>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          aria-hidden="true"
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="animate-slide-down border-t border-slate-200 p-5 md:p-6">
          {SECTION_CONTENT[activeSection]}
        </div>
      )}
    </section>
  );
};

export default CustomizationTab;

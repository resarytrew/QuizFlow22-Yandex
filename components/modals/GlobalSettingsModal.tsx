import React, { useEffect, useState } from 'react';
import CustomizationTab, {
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from '../settings/CustomizationTab.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_ORDER: SettingsSectionId[] = [
  'editor',
  'nodes',
  'filters',
  'interface',
  'presets',
];

const NavigationButton: React.FC<{
  id: SettingsSectionId;
  active: boolean;
  onClick: () => void;
}> = ({ id, active, onClick }) => {
  const section = SETTINGS_SECTIONS[id];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
          active ? section.accentClass : 'bg-slate-100 text-slate-400'
        }`}
      >
        <div className="h-[18px] w-[18px]">{section.icon}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{section.title}</div>
        <div className="mt-0.5 truncate text-[11px] text-slate-400">
          {section.description}
        </div>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`ml-auto h-4 w-4 shrink-0 transition-transform ${
          active ? 'translate-x-0 text-slate-500' : '-translate-x-1 text-slate-300'
        }`}
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
};

const GlobalSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('editor');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm md:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[min(820px,calc(100vh-2rem))] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
      >
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="global-settings-title" className="text-lg font-bold text-slate-900">
                  Настройки рабочего пространства
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Настройте сетку, ноды, фильтры, производительность и оформление редактора.
                </p>
              </div>
            </div>
          </div>

          <nav className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-3" aria-label="Разделы настроек">
            {SECTION_ORDER.map((id) => (
              <NavigationButton
                key={id}
                id={id}
                active={activeSection === id}
                onClick={() => setActiveSection(id)}
              />
            ))}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Закрыть
            </button>
          </div>
        </aside>

        <main className="custom-scrollbar min-w-0 flex-1 overflow-y-auto bg-slate-50/40 p-6 md:p-8">
          <CustomizationTab activeSection={activeSection} />
        </main>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-7 top-7 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Закрыть общие настройки"
          title="Закрыть"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-slide-down { animation: slideDown 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default GlobalSettingsModal;

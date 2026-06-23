import React, { useState } from 'react';
import { TemplateSection } from './TemplateSection';
import { TimerSection } from './TimerSection';
import { SoundSection } from './SoundSection';

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const QuizSettingsGroup: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <section className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="1.5" />
              <circle cx="17.5" cy="10.5" r="1.5" />
              <circle cx="8.5" cy="7.5" r="1.5" />
              <circle cx="6.5" cy="12.5" r="1.5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.939.726-1.688 1.667-1.688h1.875c2.857 0 5.187-2.331 5.187-5.187C21.5 6.084 17.249 2 12 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Настройки квиза</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Шаблон оформления, глобальный таймер и звуки — настройки самого квиза.
            </p>
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-slate-200 p-5 space-y-8 animate-fade-in">
          <TemplateSection />
          <TimerSection />
          <SoundSection />
        </div>
      )}
    </section>
  );
};

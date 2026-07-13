import React from 'react';
import type { EditorMode } from '../../store/useUIStore';

interface HeaderModeSwitchProps {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}

const OPTIONS: Array<{ mode: EditorMode; label: string }> = [
  { mode: 'flow', label: 'Сценарий' },
  { mode: 'design', label: 'Дизайн' },
];

const HeaderModeSwitch: React.FC<HeaderModeSwitchProps> = ({ mode, onChange }) => (
  <div
    className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1"
    role="group"
    aria-label="Режим редактора"
  >
    {OPTIONS.map((option) => (
      <button
        key={option.mode}
        type="button"
        aria-pressed={mode === option.mode}
        onClick={() => onChange(option.mode)}
        className={[
          'rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
          mode === option.mode
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:bg-white hover:text-slate-900',
        ].join(' ')}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default HeaderModeSwitch;

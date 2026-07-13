import React from 'react';
import type { DesignInspectorScope } from '../../src/designMode/designElementOverrides';

interface DesignScopeControlProps {
  value: DesignInspectorScope;
  onChange: (scope: DesignInspectorScope) => void;
  canUseNodeScope: boolean;
}

const options: Array<{ value: DesignInspectorScope; label: string }> = [
  { value: 'global', label: 'Весь квиз' },
  { value: 'nodeType', label: 'Все экраны этого типа' },
  { value: 'node', label: 'Текущий экран' },
];

const DesignScopeControl: React.FC<DesignScopeControlProps> = ({ value, onChange, canUseNodeScope }) => (
  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Применить к</div>
    <div className="grid gap-2">
      {options.map((option) => {
        const disabled = option.value !== 'global' && !canUseNodeScope;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
              value === option.value
                ? 'border-indigo-500 bg-white text-indigo-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </section>
);

export default DesignScopeControl;

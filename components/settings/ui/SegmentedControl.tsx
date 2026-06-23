import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center bg-slate-200/70 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-center text-xs font-semibold py-1.5 rounded-md transition-all ${
            value === opt.value
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

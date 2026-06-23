import React from 'react';

interface RangeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const RangeInput: React.FC<RangeInputProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  ...rest
}) => (
  <div className="flex items-center gap-3">
    <input
      type="range"
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      {...rest}
    />
    <span className="text-xs font-mono text-slate-600 w-14 text-right tabular-nums">
      {value}
      {unit}
    </span>
  </div>
);

import React, { useEffect, useState } from 'react';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FALLBACK_COLOR = '#6366f1';

export const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, ariaLabel }) => {
  const [draft, setDraft] = useState(value);
  const generatedId = React.useId().replace(/[^a-z0-9_-]+/gi, '');
  const fieldName = `color-input-${generatedId}`;
  const validValue = HEX_COLOR.test(value) ? value : FALLBACK_COLOR;
  const draftIsValid = HEX_COLOR.test(draft);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draftIsValid) {
      onChange(draft.toLowerCase());
      return;
    }
    setDraft(value);
  };

  return (
    <div className="relative flex h-9 items-center">
      <input
        id={`${fieldName}-picker`}
        name={`${fieldName}-picker`}
        type="color"
        className="absolute left-0 h-9 w-9 cursor-pointer appearance-none border-none bg-transparent p-0"
        style={{ WebkitAppearance: 'none' }}
        value={validValue}
        aria-label={ariaLabel}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
      />
      <input
        id={`${fieldName}-hex`}
        name={`${fieldName}-hex`}
        type="text"
        className={`h-9 w-full rounded-lg border bg-slate-100 pl-10 pr-2.5 font-mono text-sm text-slate-800 focus:outline-none focus:ring-1 ${
          draftIsValid
            ? 'border-slate-200/80 focus:ring-indigo-500'
            : 'border-rose-300 focus:ring-rose-500'
        }`}
        value={draft}
        aria-label={ariaLabel ? `${ariaLabel}, HEX` : 'Цвет в формате HEX'}
        aria-invalid={!draftIsValid}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setDraft(value);
        }}
      />
    </div>
  );
};

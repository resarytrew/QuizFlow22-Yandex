import React from 'react';

type Props = {
  label: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  min?: number;
  max?: number;
  optional?: boolean;
  integer?: boolean;
};

/** Keep an unfinished number local until it is valid and the user leaves the field. */
export function NumericInput({ label, value, onCommit, min, max, optional = false, integer = true }: Props) {
  const id = React.useId();
  const [draft, setDraft] = React.useState(value == null ? '' : String(value));
  const [error, setError] = React.useState('');
  const editing = React.useRef(false);
  React.useEffect(() => { if (!editing.current) setDraft(value == null ? '' : String(value)); }, [value]);
  const commit = () => {
    editing.current = false;
    const raw = draft.trim();
    if (!raw && optional) { setError(''); onCommit(undefined); return; }
    const number = Number(raw);
    if (!raw || !Number.isFinite(number) || (integer && !Number.isInteger(number)) || (min !== undefined && number < min) || (max !== undefined && number > max)) {
      setError(`Введите ${integer ? 'целое число' : 'число'}${min !== undefined ? ` не меньше ${min}` : ''}${max !== undefined ? ` не больше ${max}` : ''}.`);
      return;
    }
    setError('');
    setDraft(String(number));
    onCommit(number);
  };
  return <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
    <input id={id} type="number" min={min} max={max} step={integer ? 1 : 'any'} value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onFocus={() => { editing.current = true; }} onChange={event => { setDraft(event.target.value); setError(''); }} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none" />
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </div>;
}

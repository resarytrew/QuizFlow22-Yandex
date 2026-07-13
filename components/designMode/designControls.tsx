import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import type { InspectorControlSchema } from './inspectorSchemas';
import { elementOrderToControlValue, orderValueToElementOrder } from './orderControlUtils';

interface DesignControlProps {
  schema: InspectorControlSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

function inputClass(extra = '') {
  return `w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${extra}`;
}

const DesignControl: React.FC<DesignControlProps> = ({ schema, value, onChange }) => {
  const openAssetManager = useUIStore((state) => state.openAssetManager);
  const id = `design-control-${schema.id}`;
  const normalizedValue = value ?? schema.defaultValue;

  if (schema.type === 'color') {
    return (
      <input
        id={id}
        aria-label={schema.label}
        type="color"
        value={String(normalizedValue)}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
      />
    );
  }

  if (schema.type === 'range') {
    const numberValue = typeof normalizedValue === 'number' ? normalizedValue : Number(schema.defaultValue);
    return (
      <div className="space-y-2">
        <input
          id={id}
          aria-label={schema.label}
          type="range"
          min={schema.min}
          max={schema.max}
          step={schema.step ?? 1}
          value={numberValue}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full"
        />
        <div className="text-xs font-bold text-slate-500">{numberValue}</div>
      </div>
    );
  }

  if (schema.type === 'select' || schema.type === 'order') {
    const selectValue = schema.type === 'order'
      ? elementOrderToControlValue(normalizedValue)
      : String(normalizedValue);
    return (
      <select
        id={id}
        aria-label={schema.label}
        value={selectValue}
        onChange={(event) => onChange(schema.type === 'order' ? orderValueToElementOrder(event.target.value) : event.target.value)}
        className={inputClass('font-semibold')}
      >
        {schema.options?.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }

  if (schema.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <input
          id={id}
          aria-label={schema.label}
          type="checkbox"
          checked={Boolean(normalizedValue)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        <span className="text-sm font-semibold text-slate-700">Включено</span>
      </label>
    );
  }

  if (schema.type === 'url') {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          aria-label={schema.label}
          value={String(normalizedValue)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={schema.placeholder}
          className={inputClass()}
        />
        <button
          type="button"
          onClick={() => openAssetManager((url) => onChange(url))}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
        >
          Медиа
        </button>
      </div>
    );
  }

  return (
    <input
      id={id}
      aria-label={schema.label}
      value={String(normalizedValue)}
      onChange={(event) => onChange(event.target.value)}
      placeholder={schema.placeholder}
      className={inputClass()}
    />
  );
};

export default DesignControl;

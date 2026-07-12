import React from 'react';
import { useUIStore } from '../../../store/useUIStore';

interface UrlInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

const DEFAULT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const UrlInput: React.FC<UrlInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  icon,
}) => {
  const openAssetManager = useUIStore((s) => s.openAssetManager);
  const generatedId = React.useId().replace(/[^a-z0-9_-]+/gi, '');
  const fieldId = `url-input-${generatedId}`;

  const handlePick = () => {
    openAssetManager((url) => onChange(url));
  };

  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon ?? DEFAULT_ICON}
          </div>
          <input
            id={fieldId}
            name={fieldId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handlePick}
          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center shrink-0"
          title="Выбрать из медиатеки"
          aria-label="Выбрать из медиатеки"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>
    </div>
  );
};

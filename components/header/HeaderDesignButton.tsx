import React from 'react';

interface HeaderDesignButtonProps {
  isActive: boolean;
  onOpen: () => void;
}

export const HeaderDesignButton: React.FC<HeaderDesignButtonProps> = ({
  isActive,
  onOpen,
}) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label="Открыть дизайн квиза"
    aria-pressed={isActive}
    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all duration-200 ${
      isActive
        ? 'border-indigo-200 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
        : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
    }`}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-2.2a2 2 0 0 1-1.8-2.9l1.1-2.2A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11.5" r=".5" fill="currentColor" />
      <circle cx="10" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="14.5" cy="7" r=".5" fill="currentColor" />
    </svg>
    <span>Дизайн</span>
  </button>
);

export default HeaderDesignButton;

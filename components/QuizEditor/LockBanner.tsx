import React from 'react';
import { Icons } from './Icons';

interface LockBannerProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const LockBanner: React.FC<LockBannerProps> = ({ isLocked, onUnlock }) => {
  if (!isLocked) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
    >
      <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-lg shadow-md flex items-center gap-3 animate-fade-in-down pointer-events-auto">
        <div className="flex items-center gap-2">
          <Icons.Lock aria-hidden="true" />
          <span className="font-medium text-sm">Режим чтения (Холст заблокирован)</span>
        </div>
        <button
          onClick={onUnlock}
          aria-label="Разблокировать холст для редактирования"
          className="text-xs font-semibold bg-white border border-amber-300 px-3 py-1 rounded hover:bg-amber-50 transition-colors"
        >
          Разблокировать
        </button>
      </div>
    </div>
  );
};

LockBanner.displayName = 'LockBanner';

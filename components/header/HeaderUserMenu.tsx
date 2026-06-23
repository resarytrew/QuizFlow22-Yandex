import { Link } from '@tanstack/react-router';
import type { RefObject } from 'react';

interface HeaderUserMenuProps {
  email?: string;
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onClose: () => void;
  onDashboard: () => void;
  onSupport: () => void;
  onSignOut: () => void;
}

export function getUserInitial(email?: string): string {
  return email?.charAt(0).toUpperCase() || 'U';
}

export function HeaderUserMenu({
  email,
  isOpen,
  menuRef,
  onToggle,
  onClose,
  onDashboard,
  onSupport,
  onSignOut,
}: HeaderUserMenuProps) {
  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-100 transition-all duration-200"
        aria-label="Открыть меню пользователя"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {getUserInitial(email)}
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute top-full mt-2 right-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 py-2 z-20 animate-scale-in">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Аккаунт</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{email}</p>
            </div>
            <button
              onClick={() => {
                onDashboard();
                onClose();
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-3 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Мои квизы
            </button>
            <Link
              to="/welcome"
              onClick={onClose}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-3 transition-all duration-200"
            >
              О проекте
            </Link>
            <button
              type="button"
              onClick={() => {
                onSupport();
                onClose();
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-800"
            >
              Техническая поддержка
            </button>
            <div className="my-1 h-px bg-slate-200/60" />
            <button
              onClick={onSignOut}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}

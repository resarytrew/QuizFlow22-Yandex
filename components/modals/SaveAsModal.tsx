import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { QuizVisibility } from '../../types.ts';
import { useEntitlementStore } from '../../store/useEntitlementStore';
import { Link } from '@tanstack/react-router';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Visibility the new/edited quiz is currently in. Used to disable
   *  free-tier options the user has no right to use, without losing
   *  the ability to keep saving an already-private quiz. */
  currentVisibility?: QuizVisibility | null;
  /** Called when the user picks a visibility and confirms. */
  onConfirm: (visibility: QuizVisibility) => void | Promise<void>;
  /** If true, this is the very first save of a brand-new quiz. */
  isNew?: boolean;
}

const STORAGE_KEY = 'quiz_default_visibility';

interface Option {
  id: QuizVisibility;
  icon: React.ReactNode;
  title: string;
  description: string;
  proOnly: boolean;
  badge: string;
  gradient: string;
  ring: string;
}

const LockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
  </svg>
);

const PrivateIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
  </svg>
);

const UnlistedIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const PublicIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SaveAsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentVisibility,
  onConfirm,
  isNew = false,
}) => {
  const isPro = useEntitlementStore((s) => s.isPro());
  const [selected, setSelected] = useState<QuizVisibility>(currentVisibility ?? 'public');
  const [remember, setRemember] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Restore last selection from localStorage on first open.
  useEffect(() => {
    if (!isOpen) return;
    if (currentVisibility) {
      setSelected(currentVisibility);
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as QuizVisibility | null;
        if (saved === 'private' || saved === 'unlisted' || saved === 'public') {
          setSelected(saved);
        }
      } catch { /* localStorage unavailable */ }
    }
  }, [isOpen, currentVisibility]);

  // Body scroll lock.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const options: Option[] = useMemo(() => ([
    {
      id: 'private',
      icon: <PrivateIcon />,
      title: 'Только мне',
      description: 'Виден и доступен для редактирования только вам. Идеально для черновиков и личных наработок.',
      proOnly: true,
      badge: 'PRO',
      gradient: 'from-slate-100 to-slate-200',
      ring: 'ring-slate-300',
    },
    {
      id: 'unlisted',
      icon: <UnlistedIcon />,
      title: 'По ссылке',
      description: 'Любой, у кого есть прямая ссылка, сможет пройти квиз. В общей галерее не отображается.',
      proOnly: true,
      badge: 'PRO',
      gradient: 'from-indigo-100 to-violet-100',
      ring: 'ring-indigo-300',
    },
    {
      id: 'public',
      icon: <PublicIcon />,
      title: 'В галерее',
      description: 'Квиз попадёт в общую галерею на главной. Его сможет пройти любой пользователь.',
      proOnly: false,
      badge: 'FREE',
      gradient: 'from-emerald-100 to-teal-100',
      ring: 'ring-emerald-300',
    },
  ]), []);

  // Compute which options are usable for this user.
  // Rule: free users cannot pick private/unlisted UNLESS the quiz is
  // already in that mode (grandfathering via server trigger).
  const isLocked = (opt: Option): boolean => {
    if (!opt.proOnly) return false;
    if (isPro) return false;
    // Grandfathering: if the quiz already lives in this mode, keep it.
    if (currentVisibility === opt.id) return false;
    return true;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    if (isLocked(options.find((o) => o.id === selected)!)) return;
    setSubmitting(true);
    try {
      if (remember) {
        try { localStorage.setItem(STORAGE_KEY, selected); } catch { /* noop */ }
      }
      await onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col animate-scale-in border border-slate-200/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l3 3m-3-3h12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isNew ? 'Сохранить квиз' : 'Сохранить как…'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Выберите уровень доступа</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {options.map((opt) => {
            const locked = isLocked(opt);
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !locked && setSelected(opt.id)}
                disabled={locked}
                className={`w-full text-left relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  locked
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : active
                      ? `border-transparent bg-gradient-to-br ${opt.gradient} ring-2 ${opt.ring} shadow-sm cursor-pointer`
                      : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                  locked
                    ? 'bg-slate-200 text-slate-400'
                    : active
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${locked ? 'text-slate-500' : 'text-slate-900'}`}>
                      {opt.title}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      opt.proOnly
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {opt.badge}
                    </span>
                    {currentVisibility === opt.id && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-600">
                        текущий
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${locked ? 'text-slate-400' : 'text-slate-600'}`}>
                    {opt.description}
                  </p>
                  {locked && (
                    <Link
                      to="/billing"
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <LockIcon />
                      Оформить PRO →
                    </Link>
                  )}
                </div>
                {active && !locked && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}

          {/* Remember choice */}
          <label className="flex items-center gap-2 pt-2 pl-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-600">Запомнить мой выбор для следующих сохранений</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-gradient-to-r from-white to-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || isLocked(options.find((o) => o.id === selected)!)}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Сохранение...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SaveAsModal;

import type { RefObject, ReactNode } from 'react';
import type { QuizVisibility } from '../../types';

interface HeaderSaveControlsProps {
  isSaving: boolean;
  isExistingQuiz: boolean;
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  currentVisibility: QuizVisibility | null;
  canUsePrivateVisibility: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onSaveWithVisibility: (visibility: QuizVisibility) => void | Promise<void>;
}

interface SaveMenuActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
}

const visibilityLabels: Record<QuizVisibility, string> = {
  private: 'Только мне',
  unlisted: 'По ссылке',
  public: 'В галерее',
};

const iconClassName = 'h-4 w-4';

function SaveMenuAction({
  title,
  description,
  icon,
  badge,
  disabled,
  onClick,
}: SaveMenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-all duration-200',
        disabled
          ? 'cursor-not-allowed text-slate-400'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200',
          disabled
            ? 'bg-slate-100 text-slate-300'
            : 'bg-slate-100 text-slate-500 group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-indigo-600',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {badge && (
            <span
              className={[
                'rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-none',
                badge === 'PRO'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                  : 'bg-slate-200 text-slate-600',
              ].join(' ')}
            >
              {badge}
            </span>
          )}
        </div>
        <div className={['text-xs', disabled ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
          {description}
        </div>
      </div>
    </button>
  );
}

export function HeaderSaveControls({
  isSaving,
  isExistingQuiz,
  isOpen,
  menuRef,
  currentVisibility,
  canUsePrivateVisibility,
  onToggle,
  onClose,
  onSave,
  onSaveWithVisibility,
}: HeaderSaveControlsProps) {
  const runAndClose = (action: () => void | Promise<void>) => {
    void action();
    onClose();
  };

  const isVisibilityLocked = (visibility: QuizVisibility): boolean => {
    if (visibility === 'public') return false;
    if (canUsePrivateVisibility) return false;
    return currentVisibility !== visibility;
  };

  const visibilityOptions: Array<{
    id: QuizVisibility;
    description: string;
    badge: string;
    icon: ReactNode;
  }> = [
    {
      id: 'public',
      description: 'Опубликовать в общей галерее',
      badge: 'FREE',
      icon: (
        <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'unlisted',
      description: 'Доступ по прямой ссылке',
      badge: 'PRO',
      icon: (
        <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'private',
      description: 'Черновик виден только вам',
      badge: 'PRO',
      icon: (
        <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm6-3V7a6 6 0 10-12 0v1H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-1zM8 8a4 4 0 018 0v1H8V8z" />
        </svg>
      ),
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={isSaving}
        className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={isSaving ? 'Сохранение...' : 'Сохранить'}
        aria-expanded={isOpen}
      >
        {isSaving ? (
          <svg className="h-4 w-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        )}
        <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isSaving && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl animate-scale-in">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Сохранение</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {isExistingQuiz
                  ? `Текущий доступ: ${currentVisibility ? visibilityLabels[currentVisibility] : 'не задан'}`
                  : 'Выберите уровень доступа'}
              </p>
            </div>

            {isExistingQuiz ? (
              <div className="py-1">
                <SaveMenuAction
                  title="Сохранить изменения"
                  description="Обновить текущую версию квиза"
                  onClick={() => runAndClose(onSave)}
                  icon={
                    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                />
              </div>
            ) : (
              <div className="py-1">
                {visibilityOptions.map((option) => {
                  const locked = isVisibilityLocked(option.id);
                  return (
                    <SaveMenuAction
                      key={option.id}
                      title={visibilityLabels[option.id]}
                      description={locked ? `${option.description}. Доступно в PRO` : option.description}
                      badge={option.badge}
                      disabled={locked}
                      onClick={() => runAndClose(() => onSaveWithVisibility(option.id))}
                      icon={option.icon}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

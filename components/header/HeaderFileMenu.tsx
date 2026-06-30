import { Link } from '@tanstack/react-router';
import type { ReactNode, RefObject } from 'react';

interface HeaderFileMenuProps {
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  importLocked: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onImportJson: () => void;
  onExportJson: () => void;
  onGenerateHtml: () => void;
  onExportMp4: () => void;
  onClearCanvas: () => void;
}

interface MenuActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  badge?: string;
  onClick: () => void;
}

function MenuAction({
  title,
  description,
  icon,
  tone = 'default',
  badge,
  onClick,
}: MenuActionProps) {
  const isDanger = tone === 'danger';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-all duration-200',
        isDanger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
          isDanger
            ? 'bg-red-100 text-red-600'
            : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {badge && (
            <span className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
              {badge}
            </span>
          )}
        </div>
        <div className={['text-xs', isDanger ? 'text-red-500' : 'text-slate-500'].join(' ')}>
          {description}
        </div>
      </div>
    </button>
  );
}

const iconClassName = 'h-4 w-4';

export function HeaderFileMenu({
  isOpen,
  menuRef,
  importLocked,
  onToggle,
  onClose,
  onOpenSettings,
  onImportJson,
  onExportJson,
  onGenerateHtml,
  onExportMp4,
  onClearCanvas,
}: HeaderFileMenuProps) {
  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        aria-label="Открыть меню файла"
        aria-expanded={isOpen}
      >
        <span>Файл</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl animate-scale-in">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Файл проекта</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Редкие действия собраны здесь</p>
            </div>

            <div className="py-1">
              <MenuAction
                title="Настройки проекта"
                description="Параметры квиза и сценария"
                onClick={() => runAndClose(onOpenSettings)}
                icon={
                  <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <MenuAction
                title="Импорт JSON"
                description={importLocked ? 'Доступно в подписке PRO' : 'Загрузить квиз из файла'}
                badge={importLocked ? 'PRO' : undefined}
                onClick={() => runAndClose(onImportJson)}
                icon={
                  <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8" />
                  </svg>
                }
              />
              <MenuAction
                title="Экспорт JSON"
                description="Сохранить структуру квиза"
                onClick={() => runAndClose(onExportJson)}
                icon={
                  <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-8" />
                  </svg>
                }
              />
              <MenuAction
                title="Сгенерировать HTML"
                description="Автономная версия квиза"
                onClick={() => runAndClose(onGenerateHtml)}
                icon={
                  <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
              />
              <MenuAction
                title="Видео MP4"
                description="Записать шаблон «Экранная викторина»"
                onClick={() => runAndClose(onExportMp4)}
                icon={
                  <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h7a3 3 0 013 3v6a3 3 0 01-3 3H5a3 3 0 01-3-3V9a3 3 0 013-3z" />
                  </svg>
                }
              />
            </div>

            <div className="my-1 h-px bg-slate-200/70" />

            <Link
              to="/docs"
              onClick={onClose}
              className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 transition-transform duration-200 group-hover:scale-105">
                <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Документация</div>
                <div className="text-xs text-slate-500">Полное руководство</div>
              </div>
            </Link>

            <div className="my-1 h-px bg-slate-200/70" />

            <MenuAction
              title="Очистить холст"
              description="Удалить все узлы и связи"
              tone="danger"
              onClick={() => runAndClose(onClearCanvas)}
              icon={
                <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

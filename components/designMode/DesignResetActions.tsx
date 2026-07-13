import React from 'react';

interface DesignResetActionsProps {
  onResetElement: () => void;
  onResetScreen: () => void;
  canResetScreen: boolean;
}

const DesignResetActions: React.FC<DesignResetActionsProps> = ({
  onResetElement,
  onResetScreen,
  canResetScreen,
}) => (
  <section className="grid gap-2">
    <button
      type="button"
      onClick={onResetElement}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
    >
      Сбросить выбранный элемент
    </button>
    <button
      type="button"
      disabled={!canResetScreen}
      onClick={onResetScreen}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Сбросить текущий экран
    </button>
  </section>
);

export default DesignResetActions;

import React from 'react';
import type { DesignPropertySourceKind } from '../../src/designMode/designElementOverrides';

const SOURCE_LABELS: Record<DesignPropertySourceKind, string> = {
  template: 'Шаблон',
  style: 'Стиль',
  global: 'Общий дизайн',
  nodeType: 'Тип экрана',
  node: 'Текущий экран',
};

interface DesignPropertySourceProps {
  source: DesignPropertySourceKind;
  overridden: boolean;
  onReset?: () => void;
}

const DesignPropertySource: React.FC<DesignPropertySourceProps> = ({ source, overridden, onReset }) => (
  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
    <span
      title={`Источник значения: ${SOURCE_LABELS[source]}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
        overridden ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {overridden && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {SOURCE_LABELS[source]}
    </span>
    {overridden && onReset && (
      <button
        type="button"
        onClick={onReset}
        className="font-bold text-indigo-600 hover:text-indigo-800"
      >
        Сбросить
      </button>
    )}
  </div>
);

export default DesignPropertySource;

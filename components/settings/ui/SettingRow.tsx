import React from 'react';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-200/70 last:border-b-0">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</div>}
    </div>
    <div className="shrink-0 w-1/2 max-w-[280px]">{children}</div>
  </div>
);

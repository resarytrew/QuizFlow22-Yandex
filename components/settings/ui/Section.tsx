import React from 'react';

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, description, children }) => (
  <section className="space-y-1">
    <div className="mb-4">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
    <div className="space-y-0">{children}</div>
  </section>
);

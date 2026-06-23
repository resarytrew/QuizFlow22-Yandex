import React from 'react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  children: React.ReactNode;
}

const ARROW = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";

export const Select: React.FC<SelectProps> = ({ children, className, ...rest }) => (
  <select
    className={
      'w-full bg-slate-100 border border-slate-200/80 rounded-lg h-9 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none bg-no-repeat bg-right pr-8 ' +
      (className ?? '')
    }
    style={{ backgroundImage: ARROW, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
    {...rest}
  >
    {children}
  </select>
);

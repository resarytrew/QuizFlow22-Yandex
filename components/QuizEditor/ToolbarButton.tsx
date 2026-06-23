import React from 'react';

interface ToolbarButtonProps {
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    icon,
    tooltip,
    onClick,
    active = false,
    disabled = false,
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative p-2 rounded-lg transition-all ${
            active
                ? 'bg-indigo-100 text-indigo-600'
                : disabled
                    ? 'text-slate-300 cursor-not-allowed opacity-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
        title={tooltip}
    >
        {icon}
    </button>
);

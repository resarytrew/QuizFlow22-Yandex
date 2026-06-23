import React from 'react';

export const ConnectionHint: React.FC<{ visible: boolean }> = ({ visible }) => {
    if (!visible) return null;

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-full shadow-xl shadow-indigo-500/30">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-medium">
                    Отпустите на другом узле для создания связи
                </span>
            </div>
        </div>
    );
};

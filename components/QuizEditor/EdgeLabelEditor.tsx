import React, { useState, useEffect, useRef } from 'react';

interface EdgeLabelEditorProps {
    initialValue: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
}

export const EdgeLabelEditor: React.FC<EdgeLabelEditorProps> = ({
    initialValue,
    onSubmit,
    onCancel,
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSubmit(value);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50" onClick={onCancel} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 min-w-[300px] animate-fade-in">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Метка связи</h3>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                    placeholder="Введите текст метки..."
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={() => onSubmit(value)}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </>
    );
};

import React from 'react';

export const LoadingScreen: React.FC = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 z-50 flex items-center justify-center">
        <div className="text-center">
            <div className="relative inline-flex mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <span className="text-white font-serif font-bold text-3xl">П</span>
                </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Загрузка редактора</h2>
            <p className="text-slate-500 mb-6">Подготовка рабочего пространства...</p>
            <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress" />
            </div>
        </div>
    </div>
);

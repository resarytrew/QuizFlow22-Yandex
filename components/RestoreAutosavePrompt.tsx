import React from 'react';
import { useAutosaveStore } from '../store/useAutosaveStore.ts';

const RestoreAutosavePrompt: React.FC = () => {
    const autosavedData = useAutosaveStore(s => s.autosavedData);
    const restoreAutosave = useAutosaveStore(s => s.restoreAutosave);
    const clearAutosave = useAutosaveStore(s => s.clearAutosave);

    if (!autosavedData) {
        return null;
    }
    
    // Safely get timestamp from local storage for display
    let timeString = '';
    const savedDataString = localStorage.getItem('potok_autosave');
    if (savedDataString) {
        try {
            const savedDate = new Date(JSON.parse(savedDataString).timestamp);
            timeString = savedDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            // Could not parse date, do nothing
        }
    }


    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg animate-fade-in-down">
             <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in-down { animation: fadeInDown 0.5s ease-out forwards; }
            `}</style>
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/75 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                     <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">Найдена автосохраненная версия</p>
                        <p className="text-sm text-gray-500">Сохранено сегодня в {timeString}. Хотите восстановить?</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                        onClick={restoreAutosave}
                        className="px-4 py-1.5 rounded-md bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
                    >
                        Восстановить
                    </button>
                    <button 
                        onClick={clearAutosave}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md"
                        title="Пропустить"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RestoreAutosavePrompt;
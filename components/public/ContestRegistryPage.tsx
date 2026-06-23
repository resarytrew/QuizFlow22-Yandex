
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/apiClient';
import { Quiz, ProjectPassport, PublicQuiz } from '../../types';
import QuizPassportModal from '../modals/QuizPassportModal';

const ContestRegistryPage: React.FC = () => {
    const [entries, setEntries] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNomination, setSelectedNomination] = useState<string>('all');
    const [selectedEntry, setSelectedEntry] = useState<Quiz | null>(null);

    useEffect(() => {
        const fetchEntries = async () => {
            setIsLoading(true);
            try {
                const data = await api.listPublicQuizzes();
                const validEntries = data.filter((q: PublicQuiz) => {
                    const passport = q.quiz_data.passport as ProjectPassport;
                    return passport && passport.projectName;
                }).map((q): Quiz => ({
                    ...q,
                    user_id: '',
                    updated_at: q.created_at,
                    visibility: q.visibility ?? 'public',
                    is_favorite: q.is_favorite ?? false,
                } as Quiz));
                setEntries(validEntries);
            } catch (error) {
                console.error(error);
            }
            setIsLoading(false);
        };

        fetchEntries();
    }, []);

    const nominations = useMemo(() => {
        const noms = new Set<string>();
        entries.forEach(e => {
            const p = e.quiz_data.passport as ProjectPassport;
            if (p?.nomination) noms.add(p.nomination);
        });
        return Array.from(noms);
    }, [entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const p = e.quiz_data.passport as ProjectPassport;
            const matchesSearch = 
                (p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 p.authors?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 p.organization?.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesNomination = selectedNomination === 'all' || p.nomination === selectedNomination;
            
            return matchesSearch && matchesNomination;
        });
    }, [entries, searchQuery, selectedNomination]);

    return (
        <div className="min-h-screen bg-slate-50 font-inter">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-3xl">🏛️</span>
                        <h1 className="text-3xl font-bold text-slate-900 font-manrope">Реестр конкурсных работ</h1>
                    </div>
                    <p className="text-slate-600">
                        Официальный список участников конкурса педагогического мастерства «Технологии ИИ»
                    </p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <input
                            type="text"
                            placeholder="Поиск по названию, автору или организации..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">Номинация:</span>
                        <select 
                            value={selectedNomination} 
                            onChange={(e) => setSelectedNomination(e.target.value)}
                            className="w-full md:w-auto py-2.5 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Все номинации</option>
                            {nominations.map(nom => (
                                <option key={nom} value={nom}>{nom}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Загрузка реестра...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                        <p className="text-lg text-slate-500">Записей не найдено.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">№</th>
                                        <th className="px-6 py-4">Название проекта</th>
                                        <th className="px-6 py-4">Автор(ы)</th>
                                        <th className="px-6 py-4">Организация</th>
                                        <th className="px-6 py-4">Номинация</th>
                                        <th className="px-6 py-4 text-center">Действие</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEntries.map((entry, index) => {
                                        const p = entry.quiz_data.passport as ProjectPassport;
                                        return (
                                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{p.projectName || entry.name}</div>
                                                    <div className="text-xs text-slate-400 mt-1">ID: {entry.id.substring(0, 8)}</div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate" title={p.authors}>
                                                    {p.authors || '—'}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate" title={p.organization}>
                                                    {p.organization || '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                        {p.nomination || 'Без номинации'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => setSelectedEntry(entry)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        Паспорт
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {selectedEntry && (
                <QuizPassportModal
                    isOpen={!!selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    quiz={selectedEntry}
                    readOnly={true}
                />
            )}
        </div>
    );
};

export default ContestRegistryPage;

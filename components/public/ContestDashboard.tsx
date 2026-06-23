
import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient';
import { ContestSubmission, ProjectPassport } from '../../types';
import toast from 'react-hot-toast';
import { Link } from '@tanstack/react-router';

const ContestDashboard: React.FC = () => {
    const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<ContestSubmission | null>(null);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setIsLoading(true);
            try {
                const data = await api.listPublicQuizzes();
                const mapped = data
                    .map((quiz): ContestSubmission | null => {
                        const passport = quiz.quiz_data?.passport as ProjectPassport | undefined;
                        if (!passport?.projectName) return null;
                        return {
                            id: quiz.id,
                            user_id: '',
                            created_at: quiz.created_at,
                            project_name: passport.projectName || quiz.name,
                            nomination: passport.nomination || 'Без номинации',
                            authors: passport.authors || '—',
                            organization: passport.organization || '—',
                            passport_data: passport,
                            attached_files: passport.additionalMaterials || [],
                            status: 'approved',
                        };
                    })
                    .filter((item): item is ContestSubmission => item !== null);
                setSubmissions(mapped);
            } catch (error) {
                console.error(error);
                toast.error('Не удалось загрузить заявки');
            }
            setIsLoading(false);
        };
        fetchSubmissions();
    }, []);

    const filtered = submissions.filter(s => 
        s.project_name.toLowerCase().includes(search.toLowerCase()) || 
        s.authors.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-100 font-inter">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">🏛️</div>
                        <h1 className="text-xl font-bold text-slate-900">Реестр конкурсных работ</h1>
                    </div>
                    <div className="flex gap-4">
                        <Link to="/" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            В редактор
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="mb-6 relative">
                    <input 
                        type="text" 
                        placeholder="Поиск по названию или автору..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Загрузка данных...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                        <p className="text-gray-500 text-lg">Заявок пока нет</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Проект</th>
                                    <th className="px-6 py-4">Автор</th>
                                    <th className="px-6 py-4">Номинация</th>
                                    <th className="px-6 py-4">Дата</th>
                                    <th className="px-6 py-4 text-center">Действие</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map(sub => (
                                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{sub.project_name}</td>
                                        <td className="px-6 py-4">{sub.authors}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">
                                                {sub.nomination}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(sub.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => setSelectedItem(sub)}
                                                className="text-indigo-600 hover:underline font-medium"
                                            >
                                                Подробнее
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedItem.project_name}</h2>
                                <p className="text-gray-500 text-sm mt-1">{selectedItem.organization}</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <section>
                                <h3 className="text-lg font-bold text-indigo-900 border-b pb-2 mb-4">Основные данные</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-semibold text-gray-600">Авторы:</span> {selectedItem.authors}</div>
                                    <div><span className="font-semibold text-gray-600">Номинация:</span> {selectedItem.nomination}</div>
                                    <div><span className="font-semibold text-gray-600">Предмет:</span> {selectedItem.passport_data.subject}</div>
                                    <div><span className="font-semibold text-gray-600">Класс:</span> {selectedItem.passport_data.classGrade}</div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-indigo-900 border-b pb-2 mb-4">Описание</h3>
                                <div className="prose prose-sm max-w-none text-gray-700">
                                    <p className="whitespace-pre-line">{selectedItem.passport_data.relevance}</p>
                                    <h4 className="font-bold mt-4">Цель:</h4>
                                    <p>{selectedItem.passport_data.goal}</p>
                                </div>
                            </section>

                            {selectedItem.attached_files && selectedItem.attached_files.length > 0 && (
                                <section>
                                    <h3 className="text-lg font-bold text-indigo-900 border-b pb-2 mb-4">Файлы</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedItem.attached_files.map((url, i) => {
                                             const name = decodeURIComponent(url.split('/').pop() || `File ${i+1}`).split('_').slice(1).join('_');
                                             return (
                                                <a 
                                                    key={i} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z"/></svg>
                                                    {name}
                                                </a>
                                             )
                                        })}
                                    </div>
                                </section>
                            )}
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                                <span className="font-bold">JSON Паспорт:</span> Данные также доступны в структурированном виде для экспорта.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContestDashboard;

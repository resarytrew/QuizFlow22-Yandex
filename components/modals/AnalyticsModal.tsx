
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/apiClient';
import { Quiz, QuizResult, PathEvent, QuizSession } from '../../types.ts';
import { useQuizDataStore } from '../../store/useQuizDataStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizName: string;
}

type TabType = 'leaderboard' | 'funnel' | 'map' | 'leads' | 'sessions' | 'segments';
type SegmentKey = 'all' | 'completed' | 'abandoned' | 'leads' | 'highScore' | 'lowScore' | 'longSessions' | 'withPath';

const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}сек`;
  return `${mins}м ${secs}сек`;
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    in_progress: { className: 'border-amber-200 bg-amber-50 text-amber-800', label: 'В процессе' },
    completed: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Завершен' },
    abandoned: { className: 'border-red-200 bg-red-50 text-red-700', label: 'Покинут' }
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_progress;
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${config.className}`}>
      {config.label}
    </span>
  );
};

const getDisplayName = (session: QuizSession): string => {
  const playerName = typeof session.variables?.playerName === 'string' ? session.variables.playerName : undefined;
  // Сначала проверяем переменную playerName
  if (playerName && playerName !== 'Guest' && playerName !== 'Гость') {
    return playerName;
  }
  // Потом participant_name
  if (session.participant_name && session.participant_name !== 'Guest' && session.participant_name !== 'Гость') {
    return session.participant_name;
  }
  return 'Гость';
};

const StatCard = ({ 
  label, 
  value, 
  icon, 
  trend
}: { 
  label: string; 
  value: string | number;
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'blue' | 'purple' | 'orange';
  trend?: string;
}) => {
  return (
    <div className="group relative overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0] p-5 shadow-[0_12px_36px_rgba(68,64,60,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300/70 hover:shadow-[0_22px_60px_rgba(68,64,60,0.12)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">{label}</p>
          <p className="mb-2 font-serif text-4xl font-semibold tracking-[-0.04em] text-stone-950 tabular-nums">{value}</p>
          {trend && (
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              {trend}
            </span>
          )}
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[0.95rem_0.35rem_0.95rem_0.35rem] border border-amber-200 bg-amber-50 text-amber-700">
          <div>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

const getNodeTypeIcon = (nodeType: string) => {
  const icons: { [key: string]: React.ReactNode } = {
    questionNode: (
      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
    ),
    multipleChoiceNode: (
      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 11a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
        </svg>
      </div>
    ),
    infoNode: (
      <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
    ),
    resultNode: (
      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    ),
    default: (
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    )
  };
  return icons[nodeType] || icons.default;
};

const PathTimeline = ({ path }: { path: PathEvent[] }) => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border-2 border-slate-200/60">
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <h4 className="text-lg font-bold text-slate-900">Путь прохождения</h4>
        <span className="ml-auto text-sm text-slate-500 font-medium">{path.length} шагов</span>
      </div>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="space-y-6">
          {path.map((event, index) => (
            <div key={index} className="relative pl-12 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="absolute left-0 top-0">
                {getNodeTypeIcon(event.nodeType)}
              </div>
              
              <div className="bg-white rounded-xl p-4 border-2 border-slate-200/60 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-slate-900">{event.nodeLabel}</h5>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full inline-block mt-1">
                      {event.nodeType}
                    </span>
                  </div>
                  <time className="text-xs font-medium text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString('ru-RU')}
                  </time>
                </div>
                
                {event.details && event.details.question && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                    <p className="font-medium text-slate-700 italic text-sm mb-2">"{event.details.question}"</p>
                    
                    {event.details.selectedAnswer !== undefined && event.details.selectedAnswer !== null && event.details.selectedAnswer !== '' && (
                      <div className="mt-2 pt-2 border-t border-blue-200/50">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-slate-600">Ответ:</span>
                          <span className="text-xs font-medium text-slate-900 flex-1">
                            {Array.isArray(event.details.selectedAnswer)
                              ? event.details.selectedAnswer.map(String).join(', ')
                              : String(event.details.selectedAnswer)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      {event.details.isCorrect !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                          event.details.isCorrect 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {event.details.isCorrect ? (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Верно
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Неверно
                            </>
                          )}
                        </div>
                      )}

                      {event.details.scoreChange !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                          event.details.scoreChange > 0 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {event.details.scoreChange > 0 ? '+' : ''}{event.details.scoreChange}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ResultsTable = ({ results }: { results: QuizResult[] }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-slate-200/60">
      <table className="w-full text-sm">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200/60">
          <tr>
            <th className="p-4 text-left">
              <div className="w-6"></div>
            </th>
            <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Дата</th>
            <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Участник</th>
            <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Результат</th>
            <th className="p-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wide">Очки</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {results.map((result) => (
            <React.Fragment key={result.id}>
              <tr 
                className="bg-white hover:bg-slate-50 cursor-pointer transition-colors duration-150 group"
                onClick={() => toggleRow(result.id)}
              >
                <td className="p-4">
                  <svg 
                    className={`w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-all duration-200 ${
                      expandedRow === result.id ? 'rotate-90 text-indigo-600' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-slate-900">
                      {new Date(result.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  {(() => {
                    const name = result.participant_name;
                    const email = result.participant_email;
                    if (name && name !== 'Guest' && name !== 'Гость') {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{name}</div>
                            {email && <div className="text-xs text-slate-500">{email}</div>}
                          </div>
                        </div>
                      );
                    }
                    if (email) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                            {email.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-semibold text-slate-900">{email}</div>
                        </div>
                      );
                    }
                    if (result.user_id) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-slate-600 italic">Авторизованный</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-slate-500 italic">Аноним</span>
                      </div>
                    );
                  })()}
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {result.final_node_title}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-base font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200">
                    {result.score}
                  </span>
                </td>
              </tr>
              
              {expandedRow === result.id && (
                <tr className="bg-slate-50 animate-slide-down">
                  <td colSpan={5} className="p-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {result.results_data?.variables && Object.keys(result.results_data.variables).length > 0 && (
                          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <h4 className="text-lg font-bold text-slate-900">Собранные данные</h4>
                            </div>
                            <dl className="space-y-3">
                              {Object.entries(result.results_data.variables).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                  <dt className="text-sm font-semibold text-slate-600 min-w-[120px]">{key}:</dt>
                                  <dd className="flex-1 text-sm font-bold text-slate-900">{String(value)}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                        
                        {result.results_data?.achievements && result.results_data.achievements.length > 0 && (
                          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              <h4 className="text-lg font-bold text-slate-900">Достижения</h4>
                            </div>
                            <ul className="space-y-3">
                              {result.results_data.achievements.map((ach, index) => (
                                <li key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200/50">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-emerald-900">{typeof ach === 'string' ? ach : ach.title}</div>
                                    {typeof ach !== 'string' && ach.description && <div className="text-sm text-emerald-700 mt-1">{ach.description}</div>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {result.path_data && result.path_data.length > 0 && (
                        <PathTimeline path={result.path_data} />
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

void ResultsTable;

const getSessionLeadFields = (session: QuizSession) => {
  const fields: Record<string, string> = {};
  const variables = session.variables || {};

  Object.entries(variables).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    const normalizedKey = key.toLowerCase();
    const isLeadLike =
      /name|имя|email|mail|почт|phone|тел|contact|контакт|company|компан|budget|бюджет|service|услуг|product|продукт/.test(
        normalizedKey,
      );
    if (isLeadLike) fields[key] = String(value);
  });

  if (session.participant_name && session.participant_name !== 'Guest' && session.participant_name !== 'Гость') {
    fields.name = session.participant_name;
  }
  if (session.participant_email) fields.email = session.participant_email;

  return fields;
};

const hasLeadData = (session: QuizSession) => Object.keys(getSessionLeadFields(session)).length > 0;

const getSessionLastNode = (session: QuizSession) => {
  const path = session.path_data || [];
  return path.length > 0 ? path[path.length - 1] : null;
};

const getSessionFinalTitle = (session: QuizSession) => {
  const lastNode = getSessionLastNode(session);
  return lastNode?.nodeType === 'resultNode' ? lastNode.nodeLabel : 'Без финала';
};

const getSegmentLabel = (key: SegmentKey) => {
  const labels: Record<SegmentKey, string> = {
    all: 'Все прохождения',
    completed: 'Завершили',
    abandoned: 'Покинули',
    leads: 'Оставили контакты',
    highScore: 'Высокий балл',
    lowScore: 'Низкий балл',
    longSessions: 'Долгие сессии',
    withPath: 'Есть маршрут',
  };
  return labels[key];
};

const sessionMatchesSegment = (session: QuizSession, segment: SegmentKey) => {
  switch (segment) {
    case 'completed':
      return session.status === 'completed';
    case 'abandoned':
      return session.status === 'abandoned' || session.status === 'in_progress';
    case 'leads':
      return hasLeadData(session);
    case 'highScore':
      return (session.score || 0) >= 80;
    case 'lowScore':
      return (session.score || 0) > 0 && (session.score || 0) < 50;
    case 'longSessions':
      return (session.time_spent_seconds || 0) >= 180;
    case 'withPath':
      return (session.path_data || []).length > 0;
    default:
      return true;
  }
};

const buildAnalyticsModel = (sessions: QuizSession[], quizNodes: Quiz['quiz_data']['nodes'], quizEdges: Quiz['quiz_data']['edges']) => {
  const total = sessions.length || 1;
  const nodeMap = new Map<string, {
    id: string;
    label: string;
    type: string;
    reached: number;
    exits: number;
    totalSeconds: number;
  }>();
  const edgeMap = new Map<string, {
    id: string;
    source: string;
    target: string;
    label: string;
    count: number;
  }>();
  const orderedNodeIds: string[] = [];

  quizNodes.forEach((node) => {
    nodeMap.set(node.id, {
      id: node.id,
      label: node.data?.label || node.data?.title || node.id,
      type: node.type || 'node',
      reached: 0,
      exits: 0,
      totalSeconds: 0,
    });
  });

  quizEdges.forEach((edge) => {
    edgeMap.set(edge.id, {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || edge.data?.label || '',
      count: 0,
    });
  });

  sessions.forEach((session) => {
    const path = session.path_data || [];
    const reachedInSession = new Set<string>();

    path.forEach((event, index) => {
      if (!event?.nodeId) return;
      if (!nodeMap.has(event.nodeId)) {
        nodeMap.set(event.nodeId, {
          id: event.nodeId,
          label: event.nodeLabel || event.nodeId,
          type: event.nodeType || 'node',
          reached: 0,
          exits: 0,
          totalSeconds: 0,
        });
      }
      if (!orderedNodeIds.includes(event.nodeId)) orderedNodeIds.push(event.nodeId);
      reachedInSession.add(event.nodeId);

      const next = path[index + 1];
      if (next?.timestamp && event.timestamp) {
        const spent = Math.round((new Date(next.timestamp).getTime() - new Date(event.timestamp).getTime()) / 1000);
        if (spent > 0 && spent < 3600) {
          const stat = nodeMap.get(event.nodeId)!;
          stat.totalSeconds += spent;
        }
      }

      if (next?.nodeId) {
        const knownEdge = quizEdges.find((edge) => edge.source === event.nodeId && edge.target === next.nodeId);
        const edgeId = knownEdge?.id || `${event.nodeId}->${next.nodeId}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: event.nodeId,
            target: next.nodeId,
            label: knownEdge?.label || knownEdge?.data?.label || '',
            count: 0,
          });
        }
        edgeMap.get(edgeId)!.count += 1;
      }
    });

    reachedInSession.forEach((nodeId) => {
      const stat = nodeMap.get(nodeId);
      if (stat) stat.reached += 1;
    });

    const last = getSessionLastNode(session);
    if (last && session.status !== 'completed') {
      const stat = nodeMap.get(last.nodeId);
      if (stat) stat.exits += 1;
    }
  });

  const flowNodes = Array.from(nodeMap.values())
    .filter((node) => node.reached > 0 || quizNodes.some((quizNode) => quizNode.id === node.id))
    .sort((a, b) => {
      const ai = orderedNodeIds.indexOf(a.id);
      const bi = orderedNodeIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return b.reached - a.reached;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const funnel = flowNodes
    .filter((node) => node.reached > 0)
    .map((node) => ({
      ...node,
      reachRate: Math.round((node.reached / total) * 100),
      exitRate: node.reached > 0 ? Math.round((node.exits / node.reached) * 100) : 0,
      avgSeconds: node.reached > 0 ? Math.round(node.totalSeconds / node.reached) : 0,
    }));

  const edges = Array.from(edgeMap.values())
    .filter((edge) => edge.count > 0)
    .sort((a, b) => b.count - a.count);

  return { funnel, nodes: flowNodes, edges };
};

const AnalyticsModal: React.FC<Props> = ({ isOpen, onClose, quizId, quizName }) => {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('funnel');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const userQuizzes = useQuizDataStore((s) => s.userQuizzes);
  const ensureQuizLoaded = useQuizDataStore((s) => s.ensureQuizLoaded);
  const currentQuiz = useMemo(
    () => userQuizzes.find((quiz) => quiz.id === quizId),
    [quizId, userQuizzes],
  );
  const quizNodes = currentQuiz?.quiz_data?.nodes || [];
  const quizEdges = currentQuiz?.quiz_data?.edges || [];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    
    const interval = setInterval(async () => {
      await fetchResults();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

    const exportToCSV = () => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Заголовки с разделителями точками с запятой для Excel
    const headers = [
      '№',
      'Участник',
      'Название квиза',
      'Баллы',
      'Время прохождения',
      'Дата начала',
      'Дата завершения',
      'Статус',
      'Достижений',
      'ID сессии'
    ];
    
    const rows = completedSessions.map((s, i) => {
      const achievements = s.achievements?.length || 0;
      const startDate = s.started_at ? new Date(s.started_at).toLocaleString('ru-RU') : '';
      const endDate = s.completed_at ? new Date(s.completed_at).toLocaleString('ru-RU') : '';
      
      return [
        i + 1,
        getDisplayName(s),
        quizName,
        s.score || 0,
        formatTime(s.time_spent_seconds || 0),
        startDate,
        endDate,
        s.status === 'completed' ? 'Завершено' : s.status,
        achievements,
        s.id
      ];
    });

    // CSV с BOM для корректной кодировки в Excel и разделителем ;
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        const str = String(cell);
        // Экранируем кавычки и обрамляем в кавычки если содержит разделитель
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `результаты_${quizName}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { sessions: sessionData, results: resultsData } = await api.getQuizAnalytics(quizId);

      // Merge data from both tables
      let allSessions: QuizSession[] = [];
      
      if (sessionData && sessionData.length > 0) {
        allSessions = sessionData.map(s => ({
          id: s.id,
          created_at: s.created_at,
          updated_at: s.updated_at,
          quiz_id: s.quiz_id,
          user_id: s.user_id,
          participant_name: s.participant_name,
          participant_email: s.participant_email,
          status: s.status,
          score: s.score,
          variables: s.variables,
          achievements: s.achievements,
          path_data: s.path_data,
          started_at: s.started_at,
          completed_at: s.completed_at,
          time_spent_seconds: s.time_spent_seconds
        }));
      }
      
      // Add legacy results as sessions
      if (resultsData && resultsData.length > 0) {
        const legacySessions: QuizSession[] = resultsData.map(r => ({
          id: r.id,
          created_at: r.created_at,
          updated_at: r.created_at,
          quiz_id: r.quiz_id,
          user_id: r.user_id,
          participant_name: r.participant_name,
          participant_email: r.participant_email,
          status: 'completed' as const,
          score: r.score,
          variables: r.results_data?.variables || {},
          achievements: r.results_data?.achievements || [],
          path_data: r.path_data || [],
          started_at: r.created_at,
          completed_at: r.created_at,
          time_spent_seconds: r.time_spent_seconds || 0
        }));
        
        const bySessionId = new Map(allSessions.map(s => [s.id, s]));
        legacySessions.forEach((legacySession, index) => {
          const sourceResult = resultsData[index];
          const existing = sourceResult.session_id ? bySessionId.get(sourceResult.session_id) : null;

          if (existing) {
            existing.status = 'completed';
            existing.score = legacySession.score;
            existing.participant_name = legacySession.participant_name || existing.participant_name;
            existing.participant_email = legacySession.participant_email || existing.participant_email;
            existing.variables = { ...(existing.variables || {}), ...(legacySession.variables || {}) };
            existing.achievements = legacySession.achievements?.length ? legacySession.achievements : existing.achievements;
            existing.path_data = legacySession.path_data?.length ? legacySession.path_data : existing.path_data;
            existing.completed_at = legacySession.completed_at;
            existing.time_spent_seconds = legacySession.time_spent_seconds || existing.time_spent_seconds;
            return;
          }

          if (!bySessionId.has(legacySession.id)) {
            bySessionId.set(legacySession.id, legacySession);
            allSessions.push(legacySession);
          }
        });
      }

      console.log("[Analytics] Fetched sessions:", allSessions.length, "from quiz_sessions:", sessionData?.length || 0, "from quiz_results:", resultsData?.length || 0);
      setSessions(allSessions);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные аналитики.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchResults();
    if (!currentQuiz || currentQuiz.quiz_data_loaded === false) {
      void ensureQuizLoaded(quizId).catch(() => undefined);
    }
  }, [isOpen, quizId]);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    if (totalSessions === 0) return { 
      totalSessions: 0, 
      completed: 0, 
      inProgress: 0, 
      abandoned: 0,
      avgScore: 0, 
      topScore: 0,
      avgTime: 0
    };
    
    const completed = sessions.filter(s => s.status === 'completed').length;
    const inProgress = sessions.filter(s => s.status === 'in_progress').length;
    const abandoned = sessions.filter(s => s.status === 'abandoned').length;
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const scores = completedSessions.map(s => s.score || 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const avgScore = completedSessions.length > 0 ? (totalScore / completedSessions.length).toFixed(1) : '0';
    const topScore = completedSessions.length > 0 ? Math.max(...scores) : 0;
    
    const times = completedSessions.map(s => s.time_spent_seconds || 0).filter(t => t > 0);
    const avgTime = times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    
    return { 
      totalSessions, 
      completed, 
      inProgress, 
      abandoned,
      avgScore, 
      topScore,
      avgTime
    };
  }, [sessions]);

  const leaderboard = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...sessions]
      .filter(s => s.status === 'completed')
      .filter((session) => {
        if (!query) return true;
        return [
          getDisplayName(session),
          session.participant_email,
          getSessionFinalTitle(session),
          ...Object.values(getSessionLeadFields(session)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
      });
  }, [sessions, searchQuery]);

  // Анализ вопросов
  const _questionAnalysis = useMemo(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.path_data);
    if (completedSessions.length === 0) return { questions: [], averageTime: 0 };

    const questionStats: Record<string, { attempts: number; correct: number; totalTime: number; labels: string[] }> = {};
    let totalTimeAll = 0;
    let totalTimeWithValue = 0;

    completedSessions.forEach(session => {
      const path = session.path_data || [];
      
      for (let i = 0; i < path.length; i++) {
        const event = path[i];
        const nodeType = event.nodeType;
        
        // Только интерактивные узлы (вопросы)
        if (!['questionNode', 'multipleChoiceNode', 'matchingNode', 'timelineNode', 'textInputNode'].includes(nodeType)) continue;
        
        const nodeId = event.nodeId;
        if (!questionStats[nodeId]) {
          questionStats[nodeId] = { attempts: 0, correct: 0, totalTime: 0, labels: [] };
        }
        
        const nextEvent = path[i + 1];
        if (nextEvent && event.timestamp && nextEvent.timestamp) {
          const timeSpent = new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime();
          if (timeSpent > 0 && timeSpent < 300000) { // до 5 минут
            questionStats[nodeId].totalTime += timeSpent;
            totalTimeAll += timeSpent;
            totalTimeWithValue++;
          }
        }
        
        questionStats[nodeId].attempts++;
        
        // Определяем правильность ответа:
        // 1. Если есть флаг isCorrect - используем его
        // 2. Если есть scoreChange > 0 - значит правильно
        // 3. Для questionNode без очков - считаем неправильным (это может быть вопрос без оценки)
        const details = event.details || {};
        const isCorrect = details.isCorrect === true || details.isCorrect === 'true' || (details.scoreChange && details.scoreChange > 0);
        
        if (isCorrect) {
          questionStats[nodeId].correct++;
        }
        if (event.nodeLabel && !questionStats[nodeId].labels.includes(event.nodeLabel)) {
          questionStats[nodeId].labels.push(event.nodeLabel);
        }
      }
    });

    const questions = Object.entries(questionStats)
      .map(([nodeId, stat]) => ({
        nodeId,
        label: stat.labels[0] || nodeId,
        attempts: stat.attempts,
        correct: stat.correct,
        incorrect: stat.attempts - stat.correct,
        accuracy: stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0,
        avgTime: stat.attempts > 0 ? Math.round(stat.totalTime / stat.attempts / 1000) : 0
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // по сложности (самые сложные первыми)

    return {
      questions,
      averageTime: totalTimeWithValue > 0 ? Math.round(totalTimeAll / totalTimeWithValue / 1000) : 0
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      if (!sessionMatchesSegment(session, activeSegment)) return false;
      if (!query) return true;

      const leadFields = getSessionLeadFields(session);
      const searchable = [
        getDisplayName(session),
        session.participant_email,
        getSessionFinalTitle(session),
        ...Object.values(leadFields),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeSegment, sessions, searchQuery]);

  const selectedSession = useMemo(
    () => filteredSessions.find((session) => session.id === selectedSessionId) || filteredSessions[0] || null,
    [filteredSessions, selectedSessionId],
  );

  const leadSessions = useMemo(
    () => filteredSessions.filter(hasLeadData),
    [filteredSessions],
  );

  const segmentCards = useMemo(() => {
    const keys: SegmentKey[] = ['all', 'completed', 'abandoned', 'leads', 'highScore', 'lowScore', 'longSessions', 'withPath'];
    return keys.map((key) => ({
      key,
      label: getSegmentLabel(key),
      count: sessions.filter((session) => sessionMatchesSegment(session, key)).length,
    }));
  }, [sessions]);

  const analyticsModel = useMemo(
    () => buildAnalyticsModel(filteredSessions, quizNodes, quizEdges),
    [filteredSessions, quizEdges, quizNodes],
  );

  const finalBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    filteredSessions.forEach((session) => {
      const finalTitle = getSessionFinalTitle(session);
      counts.set(finalTitle, (counts.get(finalTitle) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'leaderboard', label: 'Лидеры', icon: '#' },
    { key: 'funnel', label: 'Воронка', icon: '↘' },
    { key: 'map', label: 'Карта сценария', icon: '◎' },
    { key: 'leads', label: 'Лиды и формы', icon: '◼' },
    { key: 'sessions', label: 'Прохождения', icon: '≡' },
    { key: 'segments', label: 'Сегменты', icon: '◇' },
  ] as const;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-md"></div>
      
      {/* Modal */}
      <div
        className="relative flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-200/90 bg-[#f8f7f2] shadow-[0_36px_120px_rgba(68,64,60,0.22)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(68,64,60,0.045) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(68,64,60,0.045) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '44px 44px',
          }}
        />
        <div className="relative flex items-center justify-between border-b border-stone-900/10 bg-[#fffaf0]/82 px-8 py-6 backdrop-blur shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem_0.35rem_1rem_0.35rem] border border-amber-200 bg-amber-50 text-amber-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012-2v-2a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">метрики сценария</p>
              <h2 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950">Аналитика</h2>
              <p className="mt-1 max-w-md truncate text-sm font-medium text-stone-500" title={quizName}>{quizName}</p>
            </div>
          </div>
          <div className="flex gap-3">
             <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-[#fffaf0] px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-amber-200 hover:text-stone-900">
               <input name="components-modals-analyticsmodal-1035-input" 
                 type="checkbox" 
                 checked={autoRefresh} 
                 onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600"
                />
                <span>Автообновление</span>
              </label>
              <button
                 onClick={exportToCSV}
                 className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
             </button>
              <button
                 onClick={fetchResults}
                 className="flex items-center gap-2 rounded-xl border border-stone-200 bg-[#fffaf0] px-4 py-2 text-sm font-bold text-stone-600 transition-colors hover:border-amber-200 hover:text-stone-950"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Обновить
             </button>
            <button 
                onClick={onClose} 
                className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition-all duration-200 hover:bg-stone-100 hover:text-stone-700"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-stone-200"></div>
                <div className="absolute left-0 top-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-amber-600"></div>
              </div>
              <p className="font-medium text-stone-600">Загрузка данных аналитики...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Ошибка загрузки</h3>
                <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">{error}</p>
                <button onClick={fetchResults} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Повторить</button>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-[1.4rem_0.45rem_1.4rem_0.45rem] border border-stone-200 bg-[#fffaf0]">
                  <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012-2v-2a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                  <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <div className="text-center max-w-md">
                <h3 className="mb-2 font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950">Статистика пока пуста</h3>
                <p className="mb-6 text-stone-600">
                    Поделитесь ссылкой на квиз и пройдите его, чтобы данные появились здесь.
                    <br/><span className="text-sm text-slate-400">Убедитесь, что вы прошли квиз до экрана "Результат".</span>
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                    onClick={onClose}
                    className="rounded-xl border border-stone-200 bg-[#fffaf0] px-6 py-3 font-semibold text-stone-700 transition-all duration-200 hover:bg-stone-50"
                    >
                    Закрыть
                    </button>
                    <button 
                    onClick={fetchResults}
                    className="rounded-xl bg-stone-950 px-6 py-3 font-semibold text-amber-50 transition-colors duration-200 hover:bg-stone-800"
                    >
                    Обновить данные
                    </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard 
                  label="Всего сессий" 
                  value={stats.totalSessions}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  color="indigo"
                />
                <StatCard 
                  label="Завершено" 
                  value={stats.completed}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="emerald"
                />
                <StatCard 
                  label="В процессе" 
                  value={stats.inProgress}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="blue"
                />
                <StatCard 
                  label="Покинуто" 
                  value={stats.abandoned}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                  color="orange"
                />
                <StatCard 
                  label="Средний балл" 
                  value={stats.avgScore}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012-2v-2a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                  color="purple"
                />
                <StatCard 
                  label="Среднее время" 
                  value={formatTime(stats.avgTime)}
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="blue"
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-4">
                <div className="flex w-fit gap-1 rounded-xl border border-stone-200 bg-[#fffaf0] p-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                        activeTab === tab.key
                          ? 'bg-amber-300 text-black shadow-[0_10px_30px_rgba(251,191,36,0.16)]'
                          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input name="components-modals-analyticsmodal-1217-input"
                    type="text"
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-[#fffaf0] py-2 pl-10 pr-4 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/25"
                  />
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'leaderboard' && (
                <div className="overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0]">
                  <div className="border-b border-stone-200 bg-[#fbf4e8]/70 px-6 py-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Лидеры</h3>
                        <p className="mt-1 text-sm text-stone-500">Итоговые баллы участников для викторин, тестов и образовательных квизов.</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-white/70 px-4 py-2 text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Завершили</div>
                        <div className="font-serif text-2xl font-semibold text-stone-950">{leaderboard.length}</div>
                      </div>
                    </div>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-sm text-stone-500">Пока нет завершённых прохождений с итоговым баллом.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-stone-200 bg-white/55">
                          <tr>
                            <th className="w-20 px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Место</th>
                            <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Участник</th>
                            <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Баллы</th>
                            <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Время</th>
                            <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Финал</th>
                            <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Дата</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/80">
                          {leaderboard.map((session, index) => (
                            <tr key={session.id} className="transition hover:bg-white/65">
                              <td className="px-5 py-4">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-[0.9rem_0.3rem_0.9rem_0.3rem] border text-sm font-bold ${
                                  index === 0 ? 'border-amber-300 bg-amber-100 text-amber-800' :
                                  index === 1 ? 'border-stone-300 bg-stone-100 text-stone-700' :
                                  index === 2 ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                  'border-stone-200 bg-white/75 text-stone-500'
                                }`}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-semibold text-stone-950">{getDisplayName(session)}</div>
                                {session.participant_email && (
                                  <div className="mt-1 text-xs text-stone-500">{session.participant_email}</div>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="font-serif text-2xl font-semibold tabular-nums text-stone-950">{session.score || 0}</span>
                              </td>
                              <td className="px-5 py-4 text-right font-medium tabular-nums text-stone-600">
                                {formatTime(session.time_spent_seconds || 0)}
                              </td>
                              <td className="max-w-[260px] px-5 py-4">
                                <span className="line-clamp-2 font-medium text-stone-700">{getSessionFinalTitle(session)}</span>
                              </td>
                              <td className="px-5 py-4 text-stone-500">
                                {new Date(session.created_at).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'funnel' && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0]">
                    <div className="border-b border-stone-200 bg-[#fbf4e8]/70 px-6 py-4">
                      <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Воронка прохождения</h3>
                      <p className="mt-1 text-sm text-stone-500">Показывает, где участники доходят, задерживаются и выходят.</p>
                    </div>
                    <div className="divide-y divide-stone-200/80">
                      {analyticsModel.funnel.length === 0 ? (
                        <div className="p-8 text-sm text-stone-500">Пока нет маршрутов прохождения.</div>
                      ) : analyticsModel.funnel.map((node, index) => (
                        <div key={node.id} className="p-5">
                          <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Шаг {index + 1} · {node.type}</div>
                              <div className="mt-1 font-serif text-xl font-semibold text-stone-950">{node.label}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-serif text-3xl font-semibold text-stone-950">{node.reachRate}%</div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{node.reached} визитов</div>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                            <div className="h-full rounded-full bg-gradient-to-r from-stone-800 to-amber-500" style={{ width: Math.min(100, node.reachRate) + '%' }} />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b>{node.exits}</b><span className="ml-1 text-stone-500">выходов</span></div>
                            <div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b>{node.exitRate}%</b><span className="ml-1 text-stone-500">drop-off</span></div>
                            <div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b>{formatTime(node.avgSeconds)}</b><span className="ml-1 text-stone-500">ср. время</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5">
                      <h4 className="font-serif text-xl font-semibold text-stone-950">Финалы</h4>
                      <div className="mt-4 space-y-3">
                        {finalBreakdown.length === 0 ? <p className="text-sm text-stone-500">Нет финалов.</p> : finalBreakdown.map(item => (
                          <div key={item.label}>
                            <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-stone-800">{item.label}</span><span className="text-stone-500">{item.count}</span></div>
                            <div className="h-2 rounded-full bg-stone-200"><div className="h-full rounded-full bg-amber-500" style={{ width: Math.min(100, Math.round((item.count / Math.max(1, filteredSessions.length)) * 100)) + '%' }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-white/70 p-5">
                      <h4 className="font-serif text-xl font-semibold text-stone-950">Сегмент</h4>
                      <p className="mt-2 text-sm text-stone-500">{getSegmentLabel(activeSegment)} · {filteredSessions.length} прохождений</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="relative min-h-[520px] overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0] p-6">
                    <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(68,64,60,0.28) 1px, transparent 0)', backgroundSize: '26px 26px' }} />
                    <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
                      {analyticsModel.nodes.length === 0 ? (
                        <div className="text-sm text-stone-500">Недостаточно данных для карты.</div>
                      ) : analyticsModel.nodes.map((node) => {
                        const intensity = Math.min(100, Math.round((node.reached / Math.max(1, filteredSessions.length)) * 100));
                        return (
                          <div key={node.id} className="rounded-[1.1rem_0.4rem_1.1rem_0.4rem] border border-stone-300/80 bg-white/85 p-4 shadow-[0_16px_38px_rgba(68,64,60,0.08)]">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">{node.type}</div>
                                <div className="mt-1 font-serif text-lg font-semibold text-stone-950">{node.label}</div>
                              </div>
                              <span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (node.exits > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>{node.exits > 0 ? node.exits + ' выход' : 'OK'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-stone-200"><div className="h-full rounded-full bg-stone-900" style={{ width: intensity + '%' }} /></div>
                              <span className="text-xs font-bold text-stone-700">{node.reached}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5">
                    <h4 className="font-serif text-xl font-semibold text-stone-950">Ветки</h4>
                    <div className="mt-4 space-y-3">
                      {analyticsModel.edges.length === 0 ? <p className="text-sm text-stone-500">Переходы ещё не зафиксированы.</p> : analyticsModel.edges.slice(0, 12).map(edge => (
                        <div key={edge.id} className="rounded-xl border border-stone-200 bg-white/70 p-3">
                          <div className="text-xs font-semibold text-stone-800">{edge.source} → {edge.target}</div>
                          <div className="mt-2 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-stone-200"><div className="h-full rounded-full bg-amber-500" style={{ width: Math.min(100, Math.round((edge.count / Math.max(1, filteredSessions.length)) * 100)) + '%' }} /></div><span className="text-xs font-bold text-stone-700">{edge.count}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'leads' && (
                <div className="overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0]">
                  <div className="border-b border-stone-200 bg-[#fbf4e8]/70 px-6 py-4">
                    <h3 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-stone-950">Лиды и формы</h3>
                    <p className="mt-1 text-sm text-stone-500">{leadSessions.length} прохождений с контактными или бизнес-данными</p>
                  </div>
                  <div className="divide-y divide-stone-200/80">
                    {leadSessions.length === 0 ? (
                      <div className="p-8 text-sm text-stone-500">Пока нет лидов или заполненных форм.</div>
                    ) : leadSessions.map(session => {
                      const fields = getSessionLeadFields(session);
                      return (
                        <div key={session.id} className="grid gap-4 p-5 lg:grid-cols-[240px_minmax(0,1fr)_180px]">
                          <div><div className="font-semibold text-stone-950">{getDisplayName(session)}</div><div className="mt-1 text-xs text-stone-500">{new Date(session.created_at).toLocaleString('ru-RU')}</div></div>
                          <div className="flex flex-wrap gap-2">{Object.entries(fields).map(([key, value]) => (<span key={key} className="rounded-lg border border-stone-200 bg-white/80 px-3 py-1.5 text-xs"><b>{key}:</b> {value}</span>))}</div>
                          <div className="text-right"><div className="text-xs text-stone-500">Финал</div><div className="font-semibold text-stone-900">{getSessionFinalTitle(session)}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="overflow-hidden rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200/90 bg-[#fffaf0]">
                    <div className="border-b border-stone-200 bg-[#fbf4e8]/70 px-6 py-4"><h3 className="font-serif text-2xl font-semibold text-stone-950">Индивидуальные прохождения</h3></div>
                    <div className="max-h-[560px] overflow-y-auto divide-y divide-stone-200/80">
                      {filteredSessions.length === 0 ? (
                        <div className="p-8 text-sm text-stone-500">Нет прохождений в выбранном сегменте.</div>
                      ) : filteredSessions.map(session => (
                        <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} className={'block w-full p-4 text-left transition ' + (selectedSession?.id === session.id ? 'bg-amber-50' : 'hover:bg-white/70')}>
                          <div className="flex items-center justify-between gap-4">
                            <div><div className="font-semibold text-stone-950">{getDisplayName(session)}</div><div className="mt-1 text-xs text-stone-500">{new Date(session.created_at).toLocaleString('ru-RU')}</div></div>
                            <div className="flex items-center gap-3">{getStatusBadge(session.status)}<span className="font-bold text-stone-900">{session.score || 0}</span></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border border-stone-200 bg-[#fffaf0] p-5">
                    {selectedSession ? (
                      <div>
                        <div className="flex items-start justify-between gap-4"><div><h4 className="font-serif text-2xl font-semibold text-stone-950">{getDisplayName(selectedSession)}</h4><p className="mt-1 text-sm text-stone-500">{getSessionFinalTitle(selectedSession)}</p></div>{getStatusBadge(selectedSession.status)}</div>
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b className="block text-lg text-stone-950">{selectedSession.score || 0}</b>баллы</div><div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b className="block text-lg text-stone-950">{formatTime(selectedSession.time_spent_seconds || 0)}</b>время</div><div className="rounded-xl border border-stone-200 bg-white/70 p-3"><b className="block text-lg text-stone-950">{selectedSession.path_data?.length || 0}</b>шаги</div></div>
                        <div className="mt-5 space-y-3">{(selectedSession.path_data || []).map((event, index) => (<div key={event.nodeId + '-' + index} className="rounded-xl border border-stone-200 bg-white/70 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">{event.nodeType}</div><div className="mt-1 font-semibold text-stone-900">{event.nodeLabel}</div>{event.details?.selectedAnswer !== undefined && event.details.selectedAnswer !== null && event.details.selectedAnswer !== '' && <div className="mt-2 text-xs text-stone-500">Ответ: {Array.isArray(event.details.selectedAnswer) ? event.details.selectedAnswer.map(String).join(', ') : String(event.details.selectedAnswer)}</div>}</div>))}</div>
                      </div>
                    ) : <p className="text-sm text-stone-500">Выберите прохождение.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'segments' && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {segmentCards.map(segment => (
                    <button key={segment.key} type="button" onClick={() => setActiveSegment(segment.key)} className={'rounded-[1.35rem_0.45rem_1.35rem_0.45rem] border p-5 text-left transition ' + (activeSegment === segment.key ? 'border-stone-900 bg-stone-950 text-amber-50' : 'border-stone-200 bg-[#fffaf0] text-stone-950 hover:border-amber-300')}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">сегмент</div>
                      <div className="mt-2 font-serif text-xl font-semibold">{segment.label}</div>
                      <div className="mt-4 text-3xl font-semibold">{segment.count}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 2000px;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AnalyticsModal;

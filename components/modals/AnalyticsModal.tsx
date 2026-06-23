
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/apiClient';
import { QuizResult, PathEvent, QuizSession } from '../../types.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizName: string;
}

type TabType = 'leaderboard' | 'sessions' | 'questions' | 'details';

const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}сек`;
  return `${mins}м ${secs}сек`;
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'В процессе' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Завершен' },
    abandoned: { bg: 'bg-red-100', text: 'text-red-700', label: 'Покинут' }
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_progress;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const getDisplayName = (session: QuizSession): string => {
  // Сначала проверяем переменную playerName
  if (session.variables?.playerName && session.variables.playerName !== 'Guest' && session.variables.playerName !== 'Гость') {
    return session.variables.playerName;
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
  color = 'indigo',
  trend
}: { 
  label: string; 
  value: string | number;
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'blue' | 'purple' | 'orange';
  trend?: string;
}) => {
  const colorClasses = {
    indigo: { gradient: 'from-indigo-500 to-purple-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    emerald: { gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-600' },
    purple: { gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-50', text: 'text-purple-600' },
    orange: { gradient: 'from-orange-500 to-red-600', bg: 'bg-orange-50', text: 'text-orange-600' },
  };

  const colors = colorClasses[color];

  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">{label}</p>
          <p className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">{value}</p>
          {trend && (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              {trend}
            </span>
          )}
        </div>
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <div className="text-white">
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
                    
                    {event.details.selectedAnswer && (
                      <div className="mt-2 pt-2 border-t border-blue-200/50">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-slate-600">Ответ:</span>
                          <span className="text-xs font-medium text-slate-900 flex-1">
                            {Array.isArray(event.details.selectedAnswer) 
                              ? event.details.selectedAnswer.join(', ') 
                              : event.details.selectedAnswer}
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
          {results.map((result, index) => (
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
                              {result.results_data.achievements.map((ach: any, index: number) => (
                                <li key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200/50">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-emerald-900">{ach.title || ach}</div>
                                    {ach.description && <div className="text-sm text-emerald-700 mt-1">{ach.description}</div>}
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

const AnalyticsModal: React.FC<Props> = ({ isOpen, onClose, quizId, quizName }) => {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

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
        
        // Merge, avoiding duplicates
        const existingIds = new Set(allSessions.map(s => s.id));
        legacySessions.forEach(s => {
          if (!existingIds.has(s.id)) {
            allSessions.push(s);
          }
        });
      }

      console.log("[Analytics] Fetched sessions:", allSessions.length, "from quiz_sessions:", sessionData?.length || 0, "from quiz_results:", resultsData?.length || 0);
      setSessions(allSessions);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось загрузить данные аналитики.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchResults();
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
    return [...sessions]
      .filter(s => s.status === 'completed')
      .filter(s => !searchQuery || getDisplayName(s).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
      });
  }, [sessions, searchQuery]);

  // Анализ вопросов
  const questionAnalysis = useMemo(() => {
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
    if (!searchQuery) return sessions;
    return sessions.filter(s => getDisplayName(s).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sessions, searchQuery]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'leaderboard', label: 'Лидерборд', icon: '🏆' },
    { key: 'sessions', label: 'Все сессии', icon: '📋' },
    { key: 'questions', label: 'Анализ вопросов', icon: '📝' },
    { key: 'details', label: 'Детали', icon: '📊' },
  ] as const;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
      
      {/* Modal */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-scale-in border border-slate-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012-2v-2a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Аналитика квиза</h2>
              <p className="text-sm text-slate-500 truncate max-w-md" title={quizName}>"{quizName}"</p>
            </div>
          </div>
          <div className="flex gap-3">
             <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
               <input 
                 type="checkbox" 
                 checked={autoRefresh} 
                 onChange={(e) => setAutoRefresh(e.target.checked)}
                 className="w-4 h-4 rounded text-indigo-600"
               />
               <span className="text-sm text-slate-700">Автообновление</span>
             </label>
             <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-medium transition-colors flex items-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
             </button>
             <button
                onClick={fetchResults}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Обновить
             </button>
            <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-slate-600 font-medium">Загрузка данных аналитики...</p>
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
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012-2v-2a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center animate-bounce">
                  <svg className="w-5 h-5 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <div className="text-center max-w-md">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Статистика пока пуста</h3>
                <p className="text-slate-600 mb-6">
                    Поделитесь ссылкой на квиз и пройдите его, чтобы данные появились здесь.
                    <br/><span className="text-sm text-slate-400">Убедитесь, что вы прошли квиз до экрана "Результат".</span>
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-200"
                    >
                    Закрыть
                    </button>
                    <button 
                    onClick={fetchResults}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.key
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
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
                  <input
                    type="text"
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'leaderboard' && (
                <div className="bg-white rounded-2xl border-2 border-slate-200/60 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-2xl">🏆</span>
                      Таблица лидеров
                      <span className="ml-auto text-sm text-slate-500 font-normal">
                        {leaderboard.length} завершённых
                      </span>
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-200/60">
                      <tr>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide w-16">Место</th>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Участник</th>
                        <th className="p-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wide">Баллы</th>
                        <th className="p-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wide">Время</th>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Дата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {leaderboard.map((session, index) => (
                        <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-slate-100 text-slate-600' :
                              index === 2 ? 'bg-orange-50 text-orange-700' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {(getDisplayName(session)).charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-900">{getDisplayName(session)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-base font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200">
                              {session.score}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-slate-600 font-medium">{formatTime(session.time_spent_seconds || 0)}</span>
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(session.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div className="bg-white rounded-2xl border-2 border-slate-200/60 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      Все сессии
                      <span className="ml-auto text-sm text-slate-500 font-normal">
                        {sessions.length} сессий
                      </span>
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-200/60">
                      <tr>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Статус</th>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Участник</th>
                        <th className="p-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wide">Баллы</th>
                        <th className="p-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wide">Время</th>
                        <th className="p-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wide">Дата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sessions.map(session => (
                        <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            {getStatusBadge(session.status)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {(getDisplayName(session)).charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-900">{getDisplayName(session)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-base font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200">
                              {session.score}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-slate-600 font-medium">{formatTime(session.time_spent_seconds || 0)}</span>
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(session.created_at).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'questions' && questionAnalysis.questions.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-200/60 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-2xl">📝</span>
                      Анализ вопросов
                      <span className="ml-auto text-sm text-slate-500 font-normal">
                        {questionAnalysis.questions.length} вопросов · среднее время: {questionAnalysis.averageTime}сек
                      </span>
                    </h3>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b-2 border-slate-200/60 sticky top-0">
                        <tr>
                          <th className="p-3 text-left font-bold text-slate-700 text-xs">#</th>
                          <th className="p-3 text-left font-bold text-slate-700 text-xs">Вопрос</th>
                          <th className="p-3 text-center font-bold text-slate-700 text-xs">Ответов</th>
                          <th className="p-3 text-center font-bold text-slate-700 text-xs">Верно</th>
                          <th className="p-3 text-center font-bold text-slate-700 text-xs">Неверно</th>
                          <th className="p-3 text-center font-bold text-slate-700 text-xs">% верных</th>
                          <th className="p-3 text-center font-bold text-slate-700 text-xs">Среднее время</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {questionAnalysis.questions.map((q, idx) => (
                          <tr key={q.nodeId} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500">{idx + 1}</td>
                            <td className="p-3">
                              <span className="font-medium text-slate-900 line-clamp-2" title={q.label}>{q.label}</span>
                            </td>
                            <td className="p-3 text-center text-slate-600">{q.attempts}</td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{q.correct}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{q.incorrect}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${q.accuracy >= 70 ? 'bg-emerald-500' : q.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${q.accuracy}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${q.accuracy >= 70 ? 'text-emerald-600' : q.accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{q.accuracy}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center text-slate-600">{q.avgTime}сек</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'details' && sessions.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-200/60 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Детализация результатов</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sessions.slice(0, 10).map(session => (
                      <div key={session.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            <span className="font-semibold text-slate-900">{getDisplayName(session)}</span>
                          </div>
                          <span className="font-bold text-indigo-600">{session.score} баллов</span>
                        </div>
                        {session.variables && Object.keys(session.variables).length > 0 && (
                          <div className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Переменные:</span>{' '}
                            {Object.entries(session.variables).slice(0, 5).map(([k, v]) => (
                              <span key={k} className="mr-2">{k}: {String(v)}</span>
                            ))}
                          </div>
                        )}
                        {session.achievements && session.achievements.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {session.achievements.map((ach: any, i: number) => (
                              <span key={i} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                🏆 {ach.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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


import React, { useState, useMemo } from 'react';
import { CustomNodeType, isProNode } from '../types.ts';
import VariableManagerModal from './modals/VariableManagerModal.tsx';
import { useUIStore } from '../store/useUIStore';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import { hasFeature } from './Paywall.tsx';
import toast from 'react-hot-toast';
import { writeDraggedNodeType } from './QuizEditor/nodeDragData';

const ICONS: Record<string, React.ReactElement> = {
    [CustomNodeType.Dialogue]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    [CustomNodeType.Question]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    [CustomNodeType.MultipleChoice]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>,
    [CustomNodeType.Result]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    [CustomNodeType.Info]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
    [CustomNodeType.Condition]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l6-6-6-6-6 6z"></path></svg>,
    [CustomNodeType.Score]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 12h10"></path><path d="M12 7v10"></path></svg>,
    [CustomNodeType.Variable]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a2.1 2.1 0 1 1-2.97-2.97L12 7 9.53 4.53a2.1 2.1 0 1 0-2.97 2.97L7.03 9.03l-2.45 2.45a2.1 2.1 0 1 0 2.97 2.97L9 12.97l2.47 2.47a2.1 2.1 0 1 0 2.97-2.97L12.97 11l2.45-2.45 2.03-2.03z"></path></svg>,
    [CustomNodeType.Formula]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16"></path><path d="M4 6h16"></path><path d="M4 18h16"></path><path d="M8 2v20"></path></svg>,
    [CustomNodeType.CollectInfo]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
    [CustomNodeType.Feedback]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    [CustomNodeType.Timer]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    [CustomNodeType.GoTo]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l4 4-4 4"></path><path d="M8 12h8"></path></svg>,
    [CustomNodeType.Timeline]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>,
    [CustomNodeType.Matching]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>,
    [CustomNodeType.TextInput]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>,
    [CustomNodeType.Achievement]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
    [CustomNodeType.Group]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="4 2"></rect></svg>,
    [CustomNodeType.Allocator]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path><circle cx="6" cy="16" r="2"></circle><circle cx="12" cy="10" r="2"></circle><circle cx="18" cy="4" r="2"></circle></svg>,
    [CustomNodeType.Progression]: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>,
};

const NODE_CATEGORIES: Record<string, Array<{ type: CustomNodeType; label: string }>> = {
  'Вопросы': [
    { type: CustomNodeType.Question, label: 'Вопрос' },
    { type: CustomNodeType.MultipleChoice, label: 'Множ. выбор' },
    { type: CustomNodeType.Timeline, label: 'Хронология' },
    { type: CustomNodeType.Matching, label: 'Сопоставление' },
  ],
  'Контент': [
    { type: CustomNodeType.Info, label: 'Информация' },
    { type: CustomNodeType.Dialogue, label: 'Диалог' },
    { type: CustomNodeType.Result, label: 'Результат' },
    { type: CustomNodeType.Feedback, label: 'Фидбэк' },
    { type: CustomNodeType.Achievement, label: 'Достижение' },
  ],
  'Ввод данных': [
    { type: CustomNodeType.TextInput, label: 'Ввод текста' },
    { type: CustomNodeType.CollectInfo, label: 'Сбор инфо' },
    { type: CustomNodeType.Allocator, label: 'Распределение' },
  ],
  'Логика': [
    { type: CustomNodeType.Condition, label: 'Условие' },
    { type: CustomNodeType.Score, label: 'Очки' },
    { type: CustomNodeType.Variable, label: 'Переменная' },
    { type: CustomNodeType.Formula, label: 'Формула' },
    { type: CustomNodeType.GoTo, label: 'Переход' },
    { type: CustomNodeType.Progression, label: 'Прогрессия' },
  ],
  'Дополнительно': [
    { type: CustomNodeType.Timer, label: 'Таймер' },
    { type: CustomNodeType.Group, label: 'Группа' },
  ],
};

const FREQUENT_NODES: Array<{ type: CustomNodeType; label: string }> = [
  { type: CustomNodeType.Info, label: 'Информация' },
  { type: CustomNodeType.Question, label: 'Вопрос' },
  { type: CustomNodeType.MultipleChoice, label: 'Множ. выбор' },
  { type: CustomNodeType.Result, label: 'Результат' },
];

const DraggableNode: React.FC<{ type: string; label: string }> = ({ type, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const nav = useAppNavigation();
  const ent = useEntitlementStore((s) => s.entitlement);
  const nodeType = type as CustomNodeType;
  const locked = isProNode(nodeType) && !hasFeature(ent.plan, ent.features, 'unlimited_logic');

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    if (locked) {
      event.preventDefault();
      toast.error('Эта нода доступна только в PRO', { duration: 2500 });
      return;
    }
    writeDraggedNodeType(event.dataTransfer, nodeType as CustomNodeType);
    setIsDragging(true);
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const onClick = () => {
    if (locked) {
      nav.goToBilling();
    }
  };

  return (
    <div
      className={`group relative flex min-h-[64px] flex-col items-center justify-center overflow-hidden rounded-xl border px-2 py-2 text-center cursor-${locked ? 'pointer' : 'move'} transition-all duration-200 ease-out backdrop-blur-sm ${
        locked
          ? 'border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300'
          : `border-gray-200/60 bg-white/50 hover:bg-white ${
              isDragging
                ? 'opacity-40 scale-90'
                : 'hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5'
            }`
      }`}
      onDragStart={(event) => onDragStart(event, type)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      draggable={!locked}
      title={locked ? `${label} · доступно в PRO` : `Перетащите: ${label}`}
    >
      {locked && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold leading-none">
          PRO
        </div>
      )}
      {/* Icon */}
      <div className={`relative mb-1 transform ${locked ? 'text-amber-600' : 'text-gray-500 group-hover:text-indigo-600'} transition-all duration-200 ${!locked && 'group-hover:scale-105'}`}>
        {React.cloneElement(ICONS[type] as React.ReactElement<any>, { width: 20, height: 20 })}
      </div>

      {/* Label */}
      <span className={`relative text-[10px] font-bold uppercase leading-tight tracking-tight ${locked ? 'text-amber-800' : 'text-gray-600 group-hover:text-indigo-700'} transition-colors duration-200`}>
        {label}
      </span>
    </div>
  );
};

// --- FIX: Defining explicit interface for CategorySection props to handle the 'key' prop correctly in the map function ---
interface CategorySectionProps {
  title: string; 
  nodes: Array<{ type: CustomNodeType; label: string }>; 
  isExpanded: boolean;
  onToggle: () => void;
}

// --- FIX: Changing CategorySection to use React.FC to properly handle property validation when used in lists ---
const CategorySection: React.FC<CategorySectionProps> = ({ 
  title, 
  nodes, 
  isExpanded, 
  onToggle 
}) => {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/60 rounded-lg transition-all duration-200 group"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1 h-4 rounded-full transition-all duration-300 ${isExpanded ? 'bg-indigo-500 h-4' : 'bg-gray-300 h-2 group-hover:h-3 group-hover:bg-indigo-300'}`}></div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
            {title}
          </h3>
        </div>
        <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${
              isExpanded ? 'rotate-90 text-indigo-500' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-2 grid grid-cols-2 gap-2 animate-slide-down px-2">
          {nodes.map((node) => (
            <DraggableNode
              key={node.type}
              type={node.type}
              label={node.label}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const [isVarManagerOpen, setIsVarManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set<string>()
  );
  const closeSidebar = useUIStore(s => s.closeSidebar);
  const ent = useEntitlementStore((s) => s.entitlement);
  const onlyFree = usePreferencesStore((s) => s.preferences.onlyFree);
  const freeFirst = usePreferencesStore((s) => s.preferences.freeFirst);
  const hideUnavailable = usePreferencesStore((s) => s.preferences.hideUnavailable);
  const hasProPlan = hasFeature(ent.plan, ent.features, 'unlimited_logic');

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Explicitly typing filteredCategories to avoid TypeScript inferring values as empty objects {} in nested mapping
  const filteredCategories: Record<string, Array<{ type: CustomNodeType; label: string }>> = useMemo(() => {
    // Phase 1: apply Free/Pro filters and sorting
    const processed: Record<string, Array<{ type: CustomNodeType; label: string }>> = {};

    Object.entries(NODE_CATEGORIES).forEach(([category, nodes]) => {
      const filteredNodes = nodes.filter((node) => {
        const pro = isProNode(node.type);
        if (pro && onlyFree) return false;
        if (pro && hideUnavailable && !hasProPlan) return false;
        return true;
      });

      const sortedNodes = freeFirst
        ? [...filteredNodes].sort((a, b) => {
            const aPro = isProNode(a.type);
            const bPro = isProNode(b.type);
            if (aPro === bPro) return 0;
            return aPro ? 1 : -1;
          })
        : filteredNodes;

      if (sortedNodes.length > 0) {
        processed[category] = sortedNodes;
      }
    });

    // Phase 2: apply search on top
    if (!searchQuery.trim()) return processed;

    const query = searchQuery.toLowerCase();
    const result: Record<string, Array<{ type: CustomNodeType; label: string }>> = {};

    Object.entries(processed).forEach(([category, nodes]) => {
      const matchingNodes = nodes.filter((node) =>
        node.label.toLowerCase().includes(query)
      );
      if (matchingNodes.length > 0) {
        result[category] = matchingNodes;
      }
    });
    return result;
  }, [searchQuery, onlyFree, freeFirst, hideUnavailable, hasProPlan]);

  const frequentNodes = useMemo(() => {
    return FREQUENT_NODES.filter((node) => {
      const pro = isProNode(node.type);
      if (pro && onlyFree) return false;
      if (pro && hideUnavailable && !hasProPlan) return false;
      if (!searchQuery.trim()) return true;
      return node.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, onlyFree, hideUnavailable, hasProPlan]);

  return (
    <>
      <aside className="w-full h-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10">
        {/* Panel Header */}
        <div className="px-4 py-3 shrink-0 relative border-b border-slate-100/80 bg-white/45">
          <button
            type="button"
            onClick={closeSidebar}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/90 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Закрыть панель элементов"
            title="Закрыть панель элементов"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="pr-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Библиотека
            </p>
            <h2 className="mt-1 text-sm font-bold text-slate-800">
              Компоненты квиза
            </h2>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Найти компонент..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
              />
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
          <div className="px-2 pb-2">
            {frequentNodes.length > 0 && (
              <div className="mb-3 rounded-2xl border border-indigo-100/70 bg-indigo-50/35 px-2 py-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    Часто используемые
                  </h3>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-500">
                    быстрый старт
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {frequentNodes.map((node) => (
                    <DraggableNode
                      key={`frequent-${node.type}`}
                      type={node.type}
                      label={node.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Added explicit type casting for entries to fix inference error on line 235 (CategorySection nodes prop) */}
            {(Object.entries(filteredCategories) as [string, Array<{ type: CustomNodeType; label: string }>][]).map(([category, categoryNodes]) => (
              <CategorySection
                key={category}
                title={category}
                nodes={categoryNodes}
                isExpanded={expandedCategories.has(category) || !!searchQuery}
                onToggle={() => toggleCategory(category)}
              />
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Ничего не найдено</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Tools */}
        <div className="p-3 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => setIsVarManagerOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 text-xs font-semibold border border-transparent hover:border-indigo-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79-8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Менеджер переменных
            </button>
        </div>
      </aside>

      <VariableManagerModal isOpen={isVarManagerOpen} onClose={() => setIsVarManagerOpen(false)} />

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
        
        /* Custom Scrollbar for sidebar content */
        aside div[class*="overflow-y-auto"]::-webkit-scrollbar {
            width: 4px;
        }
        aside div[class*="overflow-y-auto"]::-webkit-scrollbar-track {
            background: transparent;
        }
        aside div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 10px;
        }
        aside div[class*="overflow-y-auto"]:hover::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </>
  );
};

export default Sidebar;

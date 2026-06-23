
import React, { useEffect, useRef } from 'react';
import { CustomNodeType, isProNode } from '../types.ts';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useAppNavigation } from '@/src/router/useAppNavigation';
import { hasFeature } from './Paywall';
import toast from 'react-hot-toast';

interface QuickAddMenuProps {
    top: number;
    left: number;
    onClose: () => void;
    onSelect: (type: CustomNodeType) => void;
}

const NODE_TYPES = [
    { type: CustomNodeType.Info, label: 'Информация', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> },
    { type: CustomNodeType.Question, label: 'Вопрос', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> },
    { type: CustomNodeType.MultipleChoice, label: 'Множ. выбор', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg> },
    { type: CustomNodeType.Allocator, label: 'Распределение', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path><circle cx="6" cy="16" r="2"></circle><circle cx="12" cy="10" r="2"></circle><circle cx="18" cy="4" r="2"></circle></svg> },
    { type: CustomNodeType.Result, label: 'Результат', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
    { type: CustomNodeType.Timeline, label: 'Хронология', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg> },
    { type: CustomNodeType.Matching, label: 'Сопоставление', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg> },
    { type: CustomNodeType.TextInput, label: 'Ввод текста', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> },
    { type: CustomNodeType.Achievement, label: 'Достижение', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> },
    { type: CustomNodeType.Condition, label: 'Условие', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l6-6-6-6-6 6z"></path></svg> },
    { type: CustomNodeType.Score, label: 'Очки', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 12h10"></path><path d="M12 7v10"></path></svg> },
    { type: CustomNodeType.Variable, label: 'Переменная', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a2.1 2.1 0 1 1-2.97-2.97L12 7 9.53 4.53a2.1 2.1 0 1 0-2.97 2.97L7.03 9.03l-2.45 2.45a2.1 2.1 0 1 0 2.97 2.97L9 12.97l2.47 2.47a2.1 2.1 0 1 0 2.97-2.97L12.97 11l2.45-2.45 2.03-2.03z"></path></svg> },
    { type: CustomNodeType.CollectInfo, label: 'Сбор инфо', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> },
    { type: CustomNodeType.Feedback, label: 'Фидбэк', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
    { type: CustomNodeType.Timer, label: 'Таймер', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
    { type: CustomNodeType.GoTo, label: 'Переход', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l4 4-4 4"></path><path d="M8 12h8"></path></svg> },
];

const QuickAddMenu: React.FC<QuickAddMenuProps> = ({ top, left, onClose, onSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const ent = useEntitlementStore((s) => s.entitlement);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const nav = useAppNavigation();

    const handleSelect = (type: CustomNodeType) => {
        const locked = isProNode(type) && !hasFeature(ent.plan, ent.features, 'unlimited_logic');
        if (locked) {
            toast.error('Эта нода доступна только в PRO', { duration: 2500 });
            nav.goToBilling();
            onClose();
            return;
        }
        onSelect(type);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            style={{ top: top, left: left }}
            className="absolute z-50 w-64 bg-white/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/75"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="max-h-[50vh] overflow-y-auto p-2">
                {NODE_TYPES.map(node => {
                    const locked = isProNode(node.type) && !hasFeature(ent.plan, ent.features, 'unlimited_logic');
                    return (
                        <button
                            key={node.type}
                            onClick={() => handleSelect(node.type)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-3 transition-colors ${
                                locked
                                    ? 'text-amber-800 hover:bg-amber-50'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                        >
                            <span className={locked ? 'text-amber-600' : 'text-gray-500'}>{node.icon}</span>
                            <span className="flex-1">{node.label}</span>
                            {locked && (
                                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold leading-none">
                                    PRO
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickAddMenu;

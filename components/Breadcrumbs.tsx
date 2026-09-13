
import React, { useMemo } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useReactFlow, type Node } from 'reactflow';
import { NodeData } from '../types.ts';

const Breadcrumbs: React.FC = React.memo(() => {
    const currentGroup = useUIStore(s => s.currentGroup);
    const setCurrentGroup = useUIStore(s => s.setCurrentGroup);
    const selectSingleNode = useCanvasStore(s => s.selectSingleNode);
    const toggleSettingsPanel = useUIStore(s => s.toggleSettingsPanel);
    const { getNodes } = useReactFlow();
    
    const path = useMemo(() => {
        const allNodes = getNodes();
        const result: { id: string; label: string; node: Node<NodeData> }[] = [];
        let currentId: string | undefined = currentGroup || undefined;
        let depth = 0;
        while (currentId && depth < 50) {
            const node = allNodes.find((n: Node<NodeData>) => n.id === currentId);
            if (node) {
                result.unshift({ id: node.id, label: node.data.label || 'Группа', node: node });
                currentId = typeof node.data.parentId === 'string' ? node.data.parentId : undefined;
            } else {
                currentId = undefined;
            }
            depth++;
        }
        return result;
    }, [currentGroup, getNodes]);
    
    const handleEditGroup = (node: Node<NodeData>) => {
        selectSingleNode(node.id);
        toggleSettingsPanel(); // Open settings for this group
    };

    const navigateToGroup = (groupId: string | null) => {
        setCurrentGroup(groupId);
    };

    return (
        <div className="flex items-center gap-2 animate-fade-in bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/60">
            {/* Home Icon */}
            <button
                onClick={() => navigateToGroup(null)}
                className={`
                    p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center
                    ${!currentGroup 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' 
                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }
                `}
                title="Главный холст"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </button>

            {path.length > 0 && <span className="text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
            </span>}

            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                return (
                    <React.Fragment key={item.id}>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => navigateToGroup(item.id)}
                                disabled={isLast}
                                className={`
                                    px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2
                                    ${isLast 
                                        ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                    }
                                `}
                            >
                                <span className="opacity-50">📁</span> {item.label}
                            </button>
                            
                            {isLast && (
                                <button
                                    onClick={() => handleEditGroup(item.node)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Настройки группы"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                            )}
                        </div>
                        
                        {!isLast && (
                            <span className="text-slate-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
});

export default Breadcrumbs;

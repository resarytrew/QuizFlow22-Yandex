
import React from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';
import { useUIStore } from '../../store/useUIStore';
import { GroupNodeData } from '../../types.ts';
const COLOR_MAP: Record<string, { bg: string, border: string, text: string, headerBg: string, highlight: string }> = {
    slate: { bg: 'bg-slate-50/40', border: 'border-slate-300', text: 'text-slate-700', headerBg: 'bg-slate-200', highlight: 'ring-slate-400' },
    blue: { bg: 'bg-blue-50/40', border: 'border-blue-300', text: 'text-blue-700', headerBg: 'bg-blue-200', highlight: 'ring-blue-400' },
    indigo: { bg: 'bg-indigo-50/40', border: 'border-indigo-300', text: 'text-indigo-700', headerBg: 'bg-indigo-200', highlight: 'ring-indigo-400' },
    purple: { bg: 'bg-purple-50/40', border: 'border-purple-300', text: 'text-purple-700', headerBg: 'bg-purple-200', highlight: 'ring-purple-400' },
    rose: { bg: 'bg-rose-50/40', border: 'border-rose-300', text: 'text-rose-700', headerBg: 'bg-rose-200', highlight: 'ring-rose-400' },
    amber: { bg: 'bg-amber-50/40', border: 'border-amber-300', text: 'text-amber-700', headerBg: 'bg-amber-200', highlight: 'ring-amber-400' },
    emerald: { bg: 'bg-emerald-50/40', border: 'border-emerald-300', text: 'text-emerald-700', headerBg: 'bg-emerald-200', highlight: 'ring-emerald-400' },
};

const GroupNode: React.FC<NodeProps<GroupNodeData>> = (props) => {
  const { data, id, selected } = props;
  const setCurrentGroup = useUIStore(s => s.setCurrentGroup);
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentGroup(id);
  };

  const safeData = data || {};
  const colorKey = safeData.color || 'slate';
  const colors = COLOR_MAP[colorKey] || COLOR_MAP.slate;
  const label = safeData.label || 'Новая группа';

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`
        relative w-full h-full group/folder
        transition-all duration-300
      `}
      style={{
          width: '100%',
          height: '100%'
      }}
    >
        {/* Resize Handles (only when selected) */}
        <NodeResizer 
            color="#6366f1" 
            isVisible={selected} 
            minWidth={300} 
            minHeight={200} 
            lineClassName="border-indigo-400 opacity-50"
            handleClassName="w-3 h-3 bg-white border-2 border-indigo-500 rounded-full"
        />

        {/* Folder Tab */}
        <div className={`
            absolute -top-8 left-0 h-8 px-4 flex items-center rounded-t-lg border-t border-l border-r
            ${colors.headerBg} ${colors.border} ${selected ? `border-b-0 z-10` : 'border-b'}
            transition-colors duration-300
        `}>
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${colors.text} opacity-70`}>
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                </svg>
                <span className={`text-xs font-bold uppercase tracking-wide ${colors.text} max-w-[150px] truncate`}>
                    {label}
                </span>
            </div>
        </div>

        {/* Folder Body (Glass Container) */}
        <div className={`
            w-full h-full rounded-b-xl rounded-tr-xl border-2
            ${colors.bg} ${colors.border}
            backdrop-blur-sm shadow-sm
            ${selected ? `ring-4 ${colors.highlight} ring-opacity-30` : 'hover:shadow-md'}
            flex flex-col
            transition-all duration-300
        `}>
            {/* Header Strip inside for drag handle if needed, or visual consistency */}
            <div className={`h-1 w-full ${colors.headerBg} opacity-50`}></div>
            
            {/* Content Area Hint */}
            <div className="flex-1 flex items-center justify-center">
                <div className="opacity-0 group-hover/folder:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col items-center gap-2">
                    <span className={`px-3 py-1.5 bg-white/80 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${colors.border} ${colors.text}`}>
                        Двойной клик для входа
                    </span>
                    {safeData.description && (
                         <span className="text-[10px] text-gray-500 bg-white/60 px-2 py-1 rounded max-w-[200px] text-center truncate">
                            {safeData.description}
                         </span>
                    )}
                </div>
            </div>
        </div>

        {/* Connection Handles - positioned on the body */}
        <Handle 
            type="target" 
            position={Position.Left} 
            className={`!w-3 !h-3 !-ml-1.5 !bg-gray-400 !border-2 !border-white shadow-sm transition-all hover:scale-125 ${selected ? '!bg-indigo-500' : ''}`} 
            style={{ top: '50%' }}
        />
        <Handle 
            type="source" 
            position={Position.Right} 
            className={`!w-3 !h-3 !-mr-1.5 !bg-gray-400 !border-2 !border-white shadow-sm transition-all hover:scale-125 ${selected ? '!bg-indigo-500' : ''}`} 
            style={{ top: '50%' }}
        />
    </div>
  );
};

export default React.memo(GroupNode);

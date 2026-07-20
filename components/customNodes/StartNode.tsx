
import React, { useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { createIsNodeSelectedSelector, useCanvasStore } from '../../store/useCanvasStore';
import { BaseNodeData } from '../../types';
const StartNode: React.FC<NodeProps<BaseNodeData>> = ({ id }) => {
    const isSelectedSelector = useMemo(() => createIsNodeSelectedSelector(id), [id]);
    const isSelected = useCanvasStore(isSelectedSelector);

    return (
        <>
            <div className={`
                px-6 py-3 rounded-full shadow-sm
                transition-[border-color,box-shadow,background-color,opacity] duration-200
                flex items-center justify-center gap-2.5 
                bg-white border
                ${isSelected ? 'border-transparent ring-2 ring-blue-500 shadow-md' : 'border-gray-200/75'}
            `}>
                <span className="text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                </span>
                <span className="font-semibold text-sm text-gray-700 tracking-wide">СТАРТ</span>
            </div>
            <Handle type="source" position={Position.Right} className={`!w-3 !h-3 !-mr-[7px] !border-4 !border-white !bg-gray-400 !rounded-full transition-all ${isSelected ? `!ring-2 !ring-offset-2 !ring-blue-500` : ''}`} />
        </>
    );
};

export default React.memo(StartNode);

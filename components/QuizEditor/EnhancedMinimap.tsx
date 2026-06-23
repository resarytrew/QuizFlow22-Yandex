import React, { useState, useCallback } from 'react';
import * as ReactFlowPkg from 'reactflow';
import { DS } from './constants';
import { Icons } from './Icons';
import type { CustomNodeType } from '../../types';

const { MiniMap } = ReactFlowPkg as any;

export const EnhancedMinimap: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(true);

    const getNodeColor = useCallback(
        (n: { type: CustomNodeType }) => DS.nodeColors[n.type] ?? '#cbd5e1',
        []
    );

    return (
        <div
            className={`
                group relative bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-in-out
                ${isExpanded ? 'w-[240px] h-[180px]' : 'w-[48px] h-[48px] hover:scale-105 hover:bg-white'}
            `}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    absolute z-10 flex items-center justify-center
                    text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 rounded-lg
                    ${isExpanded
                        ? 'top-2 right-2 p-1.5 bg-white/80 shadow-sm opacity-0 group-hover:opacity-100'
                        : 'inset-0 w-full h-full'
                    }
                `}
                title={isExpanded ? 'Свернуть карту' : 'Показать карту'}
            >
                {isExpanded ? <Icons.MapCollapse /> : <Icons.Map />}
            </button>
            <div
                className={`w-full h-full transition-opacity duration-300 ${
                    isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <MiniMap
                    nodeStrokeWidth={3}
                    nodeStrokeColor="transparent"
                    nodeColor={getNodeColor}
                    maskColor="rgba(241, 245, 249, 0.7)"
                    className="!bg-slate-50/50 !w-full !h-full"
                    zoomable
                    pannable
                />
            </div>
        </div>
    );
};

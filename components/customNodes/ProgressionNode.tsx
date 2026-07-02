
import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import BaseNode from './BaseNode.tsx';
import { ProgressionNodeData } from '../../types.ts';

const ProgressionNode: React.FC<NodeProps<ProgressionNodeData>> = (props) => {
    const { data } = props;
    const { levelVar = 'rankLevel', nameVar = 'rankName', rules = [] } = data;

    const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;

    // Extract unique variables from requirements for UX
    const usedVariables = useMemo(() => {
        const vars = new Set<string>();
        rules.forEach(r => {
            r.requirements?.forEach(req => {
                if ('variable' in req && req.variable) {
                    vars.add(req.variable);
                }
            });
        });
        return Array.from(vars);
    }, [rules]);

    return (
        <BaseNode 
            title="Прогрессия" 
            icon={Icon} 
            nodeProps={props} 
            color="purple" 
            hasOutput={false} // We define custom output handles
        >
            <div className="space-y-2 text-xs">
                <div className="bg-purple-50 p-2 rounded border border-purple-100 space-y-1">
                    <div className="flex justify-between">
                        <span className="text-purple-800 font-bold">Level Var:</span>
                        <span className="font-mono">{levelVar}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-purple-800 font-bold">Name Var:</span>
                        <span className="font-mono">{nameVar}</span>
                    </div>
                </div>

                {usedVariables.length > 0 && (
                    <div className="px-1">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">Метрики:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {usedVariables.map(v => (
                                <span key={v} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 font-mono">
                                    {v}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="border-t border-gray-200 pt-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Уровни ({rules.length})</p>
                    <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {rules.map((rule) => (
                            <div key={rule.level} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                                <span className="font-bold text-purple-700">Lvl {rule.level}</span>
                                <span className="truncate max-w-[100px]" title={rule.name}>{rule.name}</span>
                            </div>
                        ))}
                        {rules.length === 0 && <span className="text-gray-400 italic">Нет правил</span>}
                    </div>
                </div>

                {/* Handles Section */}
                <div className="pt-2 border-t border-gray-200 flex flex-col gap-3 relative">
                     <div className="flex justify-between items-center h-4">
                         <span className="text-[10px] text-gray-500 font-medium">Далее (без изм.)</span>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id="default"
                          className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white"
                          style={{ right: -26, top: '50%' }}
                       /> 
                    </div>
                    <div className="flex justify-between items-center h-4">
                         <span className="text-[10px] text-green-600 font-bold">Повышение!</span>
                         <Handle
                           type="source"
                           position={Position.Right}
                           id="levelUp"
                           className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
                           style={{ right: -26, top: '80%' }}
                         />
                    </div>
                </div>
            </div>
        </BaseNode>
    );
};

export default React.memo(ProgressionNode);

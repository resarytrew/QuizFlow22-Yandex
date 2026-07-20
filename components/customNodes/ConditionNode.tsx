
import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { ConditionNodeData } from '../../types';
const operatorMap: Record<string, string> = {
    eq: '==',
    neq: '!=',
    gt: '>',
    lt: '<',
    gte: '>=',
    lte: '<='
};

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, selected }) => {

    return (
        <div className={`
            w-52 rounded-xl bg-white shadow-md border
            transition-[border-color,box-shadow,background-color,opacity] duration-300 ease-in-out
            ${selected ? 'border-transparent ring-2 ring-blue-500' : 'border-gray-200/75'}
        `}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !-mt-[7px] !border-4 !border-white !bg-gray-400 !rounded-full" />

            <div className="text-center py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200/75">
                ЕСЛИ
            </div>

            <div className="p-3">
                <div className="bg-orange-50 border border-orange-200/80 text-orange-800 rounded-lg p-2.5 text-center font-mono font-bold text-sm">
                    {data.variable || '...'} {operatorMap[data.operator] || '...'} {data.value || '...'}
                </div>
            </div>

            <div className="flex border-t border-gray-200/75">
                <div className="w-1/2 text-center py-2 border-r border-gray-200/75 relative">
                    <div className="text-sm font-medium text-green-600">Верно</div>
                    <Handle type="source" position={Position.Bottom} id="true" className="!w-3 !h-3 !-mb-[7px] !border-4 !border-white !bg-green-500 !rounded-full" />
                </div>

                <div className="w-1/2 text-center py-2 relative">
                    <div className="text-sm font-medium text-red-600">Неверно</div>
                    <Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !-mb-[7px] !border-4 !border-white !bg-red-500 !rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default React.memo(ConditionNode);

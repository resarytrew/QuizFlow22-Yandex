
import React from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode.tsx';
import { FormulaNodeData } from '../../types.ts';

const FormulaNode: React.FC<NodeProps<FormulaNodeData>> = (props) => {
  const { data } = props;
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16"></path><path d="M4 6h16"></path><path d="M4 18h16"></path><path d="M8 2v20"></path></svg>;

  return (
    <BaseNode title="Формула" icon={Icon} nodeProps={props} color="pink">
      <div className="font-mono text-xs space-y-2 bg-gray-50/80 p-2 rounded-md border border-gray-200/75">
        <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Результат в:</span>
            <div className="flex items-center justify-between">
                <span className="text-pink-700 font-bold truncate">{data.variableName || '...'}</span>
                {data.decimalPlaces !== undefined && data.decimalPlaces >= 0 && (
                    <span className="text-[9px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded">
                        .{data.decimalPlaces}
                    </span>
                )}
            </div>
        </div>
        <div className="border-t border-gray-200 my-1"></div>
        <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Выражение:</span>
            <span className="text-gray-800 font-semibold break-words max-h-20 overflow-hidden text-ellipsis" title={data.expression}>
                {data.expression || '...'}
            </span>
        </div>
      </div>
    </BaseNode>
  );
};

export default React.memo(FormulaNode);

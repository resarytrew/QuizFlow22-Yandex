
import React from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { VariableNodeData } from '../../types';

const VariableNode: React.FC<NodeProps<VariableNodeData>> = (props) => {
  const { data } = props;
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a2.1 2.1 0 1 1-2.97-2.97L12 7 9.53 4.53a2.1 2.1 0 1 0-2.97 2.97L7.03 9.03l-2.45 2.45a2.1 2.1 0 1 0 2.97 2.97L7.03 9.03l-2.45 2.45a2.1 2.1 0 1 0 2.97 2.97L9 12.97l2.47 2.47a2.1 2.1 0 1 0 2.97-2.97L12.97 11l2.45-2.45 2.03-2.03z"></path></svg>;
  const valueLabel = data.value == null || data.value === '' ? '...' : `"${String(data.value)}"`;

  return (
    <BaseNode title="Переменная" icon={Icon} nodeProps={props} color="orange">
      <div className="font-mono text-xs space-y-1.5 bg-gray-50/80 p-2 rounded-md border border-gray-200/75">
        <div className="truncate"><span className="text-gray-500">SET</span> <span className="text-orange-700 font-semibold">{data.variableName || '...'}</span></div>
        <div className="truncate"><span className="text-gray-500">TO</span> <span className="text-orange-700 font-semibold" title={String(data.value)}>{valueLabel}</span></div>
      </div>
    </BaseNode>
  );
};

export default React.memo(VariableNode);

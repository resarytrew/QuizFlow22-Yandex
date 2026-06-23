
import React from 'react';
import BaseNode from './BaseNode';
import { GoToNodeData } from '../../types';
import { useCanvasStore } from '../../store/useCanvasStore';

// Mock types
type NodeProps<T = any> = any;

const GoToNode: React.FC<NodeProps<GoToNodeData>> = (props) => {
  const { data } = props;
  const nodes = useCanvasStore(s => s.nodes);
  const targetNode = nodes.find(n => n.id === data.targetNodeId);

  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l4 4-4 4"></path><path d="M8 12h8"></path></svg>;

  return (
    <BaseNode title="Переход" icon={Icon} nodeProps={props} color="gray">
        {targetNode ? (
            <div>
                <p className="text-gray-500 text-xs">Переход к узлу:</p>
                <p className="font-semibold text-gray-800 truncate" title={targetNode.data.label || targetNode.id}>
                    {targetNode.data.label || targetNode.id}
                </p>
            </div>
        ) : (
            <p className="text-sm text-orange-600 font-medium">Цель не выбрана</p>
        )}
    </BaseNode>
  );
};

export default React.memo(GoToNode);

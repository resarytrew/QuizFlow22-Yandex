
import React from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { TimerNodeData } from '../../types';
import { useCanvasStore } from '../../store/useCanvasStore';

const formatDuration = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return '0 сек';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const parts = [];
    if (mins > 0) parts.push(`${mins} мин`);
    if (secs > 0) parts.push(`${secs} сек`);
    return parts.join(' ');
};

const TimerNode: React.FC<NodeProps<TimerNodeData>> = (props) => {
    const { data } = props;
    const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

    const targetNodeLabel = useCanvasStore(state => {
        if (data.action === 'goToNode' && data.targetNodeId) {
            const targetNode = state.nodes.find(n => n.id === data.targetNodeId);
            return targetNode?.data?.label || `ID: ${data.targetNodeId.substring(0,5)}...`;
        }
        return null;
    });

    let actionText = 'Переход к следующему узлу';
    if (targetNodeLabel) {
        actionText = `Переход к: ${targetNodeLabel}`;
    }

  return (
    <BaseNode title="Таймер" icon={Icon} nodeProps={props} color="indigo">
        <div className="space-y-1">
            <p className="text-sm">Задержка: <span className="font-bold text-indigo-700">{formatDuration(data.duration)}</span></p>
            <p className="text-xs text-gray-500 truncate" title={actionText}>{actionText}</p>
        </div>
    </BaseNode>
  );
};

export default React.memo(TimerNode);


import React from 'react';
import BaseNode from './BaseNode.tsx';
import { AchievementNodeData } from '../../types.ts';

// Mock types
type NodeProps<T = any> = any;

const AchievementNode: React.FC<NodeProps<AchievementNodeData>> = (props) => {
  const { data } = props;
  const { title } = data;
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;

  return (
    <BaseNode title="Достижение" icon={Icon} nodeProps={props} color="yellow">
        <div className="text-gray-800 text-sm truncate font-medium" title={title}>{title || 'Название...'}</div>
        <div className="text-gray-500 text-xs mt-1 truncate" title={data.description}>{data.description || 'Нет описания'}</div>
    </BaseNode>
  );
};

export default React.memo(AchievementNode);

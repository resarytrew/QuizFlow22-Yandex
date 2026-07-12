
import React from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import { ScoreNodeData } from '../../types';

const ScoreNode: React.FC<NodeProps<ScoreNodeData>> = (props) => {
  const { data } = props;
  const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 12h10"></path><path d="M12 7v10"></path></svg>;

  const renderContent = () => {
    const { operation = 'add', value = 0 } = data;
    switch (operation) {
      case 'add':
        return <>Очки: <span className="font-bold text-green-600">+{value}</span></>;
      case 'subtract':
        return <>Очки: <span className="font-bold text-red-600">-{value}</span></>;
      case 'set':
        return <>Очки: <span className="font-bold text-blue-600">={value}</span></>;
      default:
        return null;
    }
  };

  return (
    <BaseNode title="Подсчет очков" icon={Icon} nodeProps={props} color="yellow">
       <div className="text-gray-700 text-sm text-center font-mono bg-gray-50/80 p-2.5 rounded-md">
        {renderContent()}
      </div>
    </BaseNode>
  );
};

export default React.memo(ScoreNode);

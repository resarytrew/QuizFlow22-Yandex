
import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import BaseNode from './BaseNode.tsx';
import { FeedbackNodeData } from '../../types.ts';

const FeedbackNode: React.FC<NodeProps<FeedbackNodeData>> = (props) => {
    const { data } = props;
    const { message, imageUrl } = data;
    const [isZoomed, setIsZoomed] = useState(false);
    const Icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;

  return (
    <>
        <BaseNode title="Обратная связь" icon={Icon} nodeProps={props} color="pink">
            {imageUrl && (
                <div className="mb-2 p-1 bg-gray-100 rounded-md">
                    <img
                        src={imageUrl}
                        alt="Node content"
                        className="w-full h-auto object-cover rounded-md cursor-pointer"
                        onClick={() => setIsZoomed(true)}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                </div>
            )}
            <p className="truncate" title={message}>{message || 'Сообщение...'}</p>
            <p className="text-gray-500 text-xs mt-1">Переход по кнопке</p>
        </BaseNode>
        {isZoomed && imageUrl && (
            <div 
                className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
                onClick={() => setIsZoomed(false)}
            >
                <img 
                    src={imageUrl} 
                    alt="Node content zoomed" 
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}
    </>
  );
};

export default React.memo(FeedbackNode);

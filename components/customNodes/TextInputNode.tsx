
import React, { useState } from 'react';
import * as ReactFlow from 'reactflow';
import { TextInputNodeData } from '../../types.ts';

const { Handle, Position } = ReactFlow as any;
type NodeProps<T = any> = any;

const TextInputNode: React.FC<NodeProps<TextInputNodeData>> = ({ data, selected }) => {
  const { question, imageUrl } = data;
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
        <div className={`
            w-52 rounded-xl bg-white shadow-md border
            transition-all duration-300 ease-in-out transform
            ${selected ? 'border-transparent ring-2 ring-blue-500 scale-102' : 'border-gray-200/75'}
        `}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !-mt-[7px] !border-4 !border-white !bg-gray-400 !rounded-full" />

            <div className="text-center py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200/75">
                Ввод текста
            </div>

            <div className="p-3">
                    <div className="bg-purple-50 border border-purple-200/80 text-purple-800 rounded-lg p-2.5 text-center">
                    {imageUrl && (
                        <div className="mb-2 p-1 bg-white rounded-md">
                            <img
                                src={imageUrl}
                                alt="Node content"
                                className="w-full h-auto object-cover rounded-md cursor-pointer"
                                onClick={() => setIsZoomed(true)}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}
                    <p className="text-xs font-medium truncate" title={question}>{question || 'Вопрос...'}</p>
                </div>
            </div>

            <div className="flex border-t border-gray-200/75">
                <div className="w-1/2 text-center py-2 border-r border-gray-200/75 relative">
                    <div className="text-sm font-medium text-green-600">Верно</div>
                    <Handle type="source" position={Position.Bottom} id="correct" className="!w-3 !h-3 !-mb-[7px] !border-4 !border-white !bg-green-500 !rounded-full" />
                </div>

                <div className="w-1/2 text-center py-2 relative">
                    <div className="text-sm font-medium text-red-600">Неверно</div>
                    <Handle type="source" position={Position.Bottom} id="incorrect" className="!w-3 !h-3 !-mb-[7px] !border-4 !border-white !bg-red-500 !rounded-full" />
                </div>
            </div>
        </div>
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

export default React.memo(TextInputNode);

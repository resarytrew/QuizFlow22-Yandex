import React from "react";
import type { NodeProps } from 'reactflow';
import BaseNode from "./BaseNode.tsx";
import { AllocatorNodeData } from "../../types.ts";

const AllocatorNode: React.FC<NodeProps<AllocatorNodeData>> = (props) => {
  const { data } = props;
  const { question, items = [], maxTotal } = data;

  const Icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20V10"></path>
      <path d="M18 20V4"></path>
      <path d="M6 20v-4"></path>
      <circle cx="6" cy="16" r="2"></circle>
      <circle cx="12" cy="10" r="2"></circle>
      <circle cx="18" cy="4" r="2"></circle>
    </svg>
  );

  return (
    <BaseNode title="Распределение" icon={Icon} nodeProps={props} color="teal">
      <div className="space-y-3">
        <div
          className="text-gray-800 text-sm font-medium truncate"
          title={question}
        >
          {question || "Вопрос распределения..."}
        </div>

        <div className="bg-teal-50/50 rounded-lg p-2 border border-teal-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-teal-700">
              Лимит:
            </span>
            <span className="text-xs font-bold text-teal-900">{maxTotal}</span>
          </div>
          <div className="space-y-2">
            {items
              .slice(0, 3)
              .map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>{item.label}</span>
                      <span className="font-mono text-gray-400">
                        {item.variableName}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400 w-1/2 rounded-full"></div>
                    </div>
                  </div>
                ))}
            {items.length > 3 && (
              <p className="text-[10px] text-center text-gray-400 italic">
                + еще {items.length - 3} категорий
              </p>
            )}
          </div>
        </div>
      </div>
    </BaseNode>
  );
};

export default React.memo(AllocatorNode);

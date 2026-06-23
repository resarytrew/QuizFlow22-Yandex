import React from "react";
import BaseNode from "./BaseNode";
import { CollectInfoNodeData } from "../../types";

// Mock types
type NodeProps<T = any> = any;

const CollectInfoNode: React.FC<NodeProps<CollectInfoNodeData>> = (props) => {
  const { data } = props;
  const { title, description, fields = [] } = data;

  const Icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
  );

  return (
    <BaseNode title="Сбор данных" icon={Icon} nodeProps={props} color="cyan">
      <div className="space-y-2">
        <div
          className="text-gray-800 text-sm font-medium truncate"
          title={title}
        >
          {title || "Заголовок формы..."}
        </div>
        <div className="text-gray-500 text-xs truncate" title={description}>
          {description || "Нет описания"}
        </div>

        {fields.length > 0 && (
          <div className="mt-2 space-y-1 bg-white/50 rounded-md p-1.5 border border-gray-100">
            {fields
              .slice(0, 3)
              .map(
                (
                  field: {
                    id: any;
                    label:
                      | string
                      | number
                      | bigint
                      | boolean
                      | React.ReactElement<
                          unknown,
                          string | React.JSXElementConstructor<any>
                        >
                      | Iterable<React.ReactNode>
                      | React.ReactPortal
                      | Promise<
                          | string
                          | number
                          | bigint
                          | boolean
                          | React.ReactPortal
                          | React.ReactElement<
                              unknown,
                              string | React.JSXElementConstructor<any>
                            >
                          | Iterable<React.ReactNode>
                          | null
                          | undefined
                        >
                      | null
                      | undefined;
                    type:
                      | string
                      | number
                      | bigint
                      | boolean
                      | React.ReactElement<
                          unknown,
                          string | React.JSXElementConstructor<any>
                        >
                      | Iterable<React.ReactNode>
                      | React.ReactPortal
                      | Promise<
                          | string
                          | number
                          | bigint
                          | boolean
                          | React.ReactPortal
                          | React.ReactElement<
                              unknown,
                              string | React.JSXElementConstructor<any>
                            >
                          | Iterable<React.ReactNode>
                          | null
                          | undefined
                        >
                      | null
                      | undefined;
                  },
                  i: any,
                ) => (
                  <div
                    key={field.id || i}
                    className="flex items-center justify-between text-[10px] text-gray-600"
                  >
                    <span className="truncate max-w-[60%]">{field.label}</span>
                    <span className="font-mono text-gray-400 text-[9px]">
                      {field.type}
                    </span>
                  </div>
                ),
              )}
            {fields.length > 3 && (
              <div className="text-[9px] text-gray-400 text-center pt-0.5">
                + еще {fields.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default React.memo(CollectInfoNode);

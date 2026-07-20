import React, { useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import clsx from "clsx";
import { createIsNodeSelectedSelector, useCanvasStore } from "../../store/useCanvasStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { COLOR_CLASSES, type NodeColor } from "./nodeColors";
import { CustomNodeType, isProNode } from "../../types";
import { hasFeature } from "../Paywall";

interface BaseNodeProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  nodeProps: NodeProps;
  color: NodeColor;
  hasInput?: boolean;
  hasOutput?: boolean;
}

const BaseNode: React.FC<BaseNodeProps> = ({
  title,
  icon,
  children,
  nodeProps,
  color,
  hasInput = true,
  hasOutput = true,
}) => {
  const isSelectedSelector = useMemo(
    () => createIsNodeSelectedSelector(nodeProps.id),
    [nodeProps.id],
  );
  const isSelected = useCanvasStore(isSelectedSelector);

  const ent = useEntitlementStore((s) => s.entitlement);
  const nodeType = nodeProps.type as CustomNodeType;
  const showProBadge =
    isProNode(nodeType) &&
    !hasFeature(ent.plan, ent.features, "unlimited_logic");

  const c = COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;

  const cardStyle: React.CSSProperties = {
    width: "var(--node-width, 14rem)",
    borderRadius: "var(--node-radius, 1rem)",
  };
  const restShadow = !isSelected;

  return (
    <div className="group relative">
      <div
        aria-hidden="true"
        className={clsx(
          "node-card absolute inset-0 blur-xl",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          c.shadow,
          c.glow,
        )}
        style={{ borderRadius: "var(--node-radius, 1rem)" }}
      />

      <div
        className={clsx(
          "node-card relative bg-white border-2",
          "transition-[border-color,box-shadow,background-color,opacity] duration-300 ease-out",
          isSelected
            ? [c.border, c.ring, c.shadow, "shadow-xl ring-4"]
            : "border-slate-200/80",
        )}
        style={{
          ...cardStyle,
          boxShadow: restShadow
            ? "var(--editor-shadow, 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04))"
            : undefined,
        }}
      >
        <div
          className={clsx(
            "relative h-14 flex items-center gap-3 px-4",
            "overflow-hidden bg-gradient-to-br",
            c.gradient,
          )}
          style={{
            borderTopLeftRadius: "var(--node-radius, 1rem)",
            borderTopRightRadius: "var(--node-radius, 1rem)",
          }}
        >
          <div aria-hidden="true" className="absolute inset-0 opacity-20">
            <div className="absolute top-0 -right-4 w-24 h-24 bg-white rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white rounded-full blur-xl" />
          </div>

          <div className="relative shrink-0">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-white rounded-xl blur opacity-50"
            />
            <div
              className={clsx(
                "node-icon relative w-9 h-9 flex items-center justify-center",
                "rounded-xl bg-white/95 backdrop-blur-sm shadow-lg",
                c.text,
              )}
            >
              {icon}
            </div>
          </div>

          <h3 className="relative flex-1 font-bold text-base text-white tracking-tight drop-shadow-sm truncate">
            {title}
          </h3>

          {isSelected && (
            <span
              aria-hidden="true"
              className="relative shrink-0 w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"
            />
          )}
        </div>

        <div
          className="node-description bg-gradient-to-b from-slate-50/50 to-white"
          style={{ padding: "var(--node-padding, 1rem)" }}
        >
          <div className="text-sm text-slate-700 leading-relaxed">
            {children}
          </div>
        </div>

        <div
          aria-hidden="true"
          className={clsx("h-1 opacity-50 bg-gradient-to-r", c.gradient)}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ borderRadius: "var(--node-radius, 1rem)" }}
        />

        {showProBadge && (
          <span
            className="node-pro-badge absolute -top-2 -right-2 z-20 px-2 py-0.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold tracking-wide shadow-lg ring-2 ring-white pointer-events-none"
            aria-label="Pro feature"
          >
            PRO
          </span>
        )}
      </div>

      {isSelected && (
        <div
          aria-hidden="true"
          className={clsx(
            "absolute inset-0 pointer-events-none ring-2 ring-offset-2",
            c.ring,
          )}
          style={{ borderRadius: "var(--node-radius, 1rem)" }}
        />
      )}

      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className={clsx(
            "!w-4 !h-4 !-ml-2 !border-[3px] !border-white",
            "!rounded-full !shadow-lg",
            "transition-all duration-300 hover:!scale-125",
            c.handle,
          )}
        />
      )}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className={clsx(
            "!w-4 !h-4 !-mr-2 !border-[3px] !border-white",
            "!rounded-full !shadow-lg",
            "transition-all duration-300 hover:!scale-125",
            c.handle,
          )}
        />
      )}
    </div>
  );
};

export default React.memo(BaseNode, (prev, next) => {
  return (
    prev.title === next.title &&
    prev.color === next.color &&
    prev.nodeProps.id === next.nodeProps.id &&
    prev.nodeProps.data === next.nodeProps.data &&
    prev.hasInput === next.hasInput &&
    prev.hasOutput === next.hasOutput
  );
});

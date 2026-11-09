import { useRef, useCallback, useEffect } from 'react';
import type { Node, Edge, FitViewOptions } from 'reactflow';
import { FIT_VIEW_OPTIONS } from '../constants';
import { getLayoutedElements } from '../layout';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { getMotionDuration } from '../performanceMode';

function motionDuration(duration: number): number {
  return getMotionDuration(duration, usePreferencesStore.getState().preferences);
}

interface UseCanvasLayoutParams {
  fitView: (opts?: FitViewOptions) => void;
  nodes: Node[];
  visibleNodes: Node[];
  visibleEdges: Edge[];
  visibleNodeIds: Set<string>;
  setNodes: (nodes: Node[]) => void;
}

export function useCanvasLayout({
  fitView,
  nodes,
  visibleNodes,
  visibleEdges,
  visibleNodeIds,
  setNodes,
}: UseCanvasLayoutParams) {
  const needsLayout = useCanvasStore((s) => s.needsLayout);
  const setNeedsLayout = useCanvasStore((s) => s.setNeedsLayout);
  const rafRef = useRef<number | null>(null);

  const handleLayout = useCallback(
    (direction: 'TB' | 'LR') => {
      const { nodes: layouted } = getLayoutedElements(visibleNodes, visibleEdges, direction);
      const layoutById = new Map(layouted.map((node) => [node.id, node]));
      const nextNodes = nodes.map((node) => visibleNodeIds.has(node.id) ? layoutById.get(node.id) ?? node : node);
      const changed = nextNodes.some((node, index) => {
        const previous = nodes[index];
        return node.position.x !== previous.position.x || node.position.y !== previous.position.y
          || node.sourcePosition !== previous.sourcePosition || node.targetPosition !== previous.targetPosition;
      });
      if (changed) {
        useCanvasStore.getState().takeSnapshot();
        setNodes(nextNodes);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        fitView({ ...FIT_VIEW_OPTIONS, duration: motionDuration(500) });
        rafRef.current = null;
      });
    },
    [visibleNodes, visibleEdges, nodes, visibleNodeIds, setNodes, fitView],
  );

  const fitViewWithDefaults = useCallback(
    (duration = 500) => {
      fitView({ ...FIT_VIEW_OPTIONS, duration: motionDuration(duration) });
    },
    [fitView],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!needsLayout) return;
    const timer = setTimeout(() => {
      handleLayout('TB');
      setNeedsLayout(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [needsLayout, handleLayout, setNeedsLayout]);

  return { handleLayout, fitViewWithDefaults };
}

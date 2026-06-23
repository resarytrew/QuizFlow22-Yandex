import { useRef, useCallback, useEffect } from 'react';
import type { Node, Edge, FitViewOptions, SetCenterOptions } from 'reactflow';
import { ZOOM, DEFAULT_W, DEFAULT_H, FIT_VIEW_OPTIONS } from '../constants';
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
      const hiddenNodes = nodes.filter((n) => !visibleNodeIds.has(n.id));
      setNodes([...hiddenNodes, ...layouted]);
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

export function useCanvasResize({
  fitView,
  wrapperRef,
}: {
  fitView: (opts?: FitViewOptions) => void;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const fitViewRef = useRef(fitView);
  useEffect(() => { fitViewRef.current = fitView; }, [fitView]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fitViewRef.current({ ...FIT_VIEW_OPTIONS, duration: motionDuration(300) });
      }, 300);
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useCenterOnSelected({
  getNode,
  setCenter,
  selectedNode,
}: {
  getNode: (id: string) => Node | undefined;
  setCenter: (x: number, y: number, opts?: SetCenterOptions) => void;
  selectedNode: { id: string } | null;
}) {
  useEffect(() => {
    if (!selectedNode) return;
    const node = getNode(selectedNode.id);
    if (!node) return;

    const w = node.width ?? DEFAULT_W;
    const h = node.height ?? DEFAULT_H;
    setCenter(
      node.position.x + w / 2,
      node.position.y + h / 2,
      { zoom: ZOOM.DEFAULT, duration: motionDuration(400) },
    );
  }, [selectedNode, getNode, setCenter]);
}

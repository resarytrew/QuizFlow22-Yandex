import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useUIStore } from '../../../store/useUIStore';

export function useEditorActions() {
  const canvasRef = useRef(useCanvasStore.getState());
  const uiRef = useRef(useUIStore.getState());

  return useMemo(() => {
    const c = canvasRef.current;
    const u = uiRef.current;
    return {
      onNodesChange: c.onNodesChange,
      onEdgesChange: c.onEdgesChange,
      onConnect: c.onConnect,
      addNode: c.addNode,
      deleteNode: c.deleteNode,
      deleteEdge: c.deleteEdge,
      selectSingleNode: c.selectSingleNode,
      toggleNodeSelection: c.toggleNodeSelection,
      selectNodes: c.selectNodes,
      selectSingleEdge: c.selectSingleEdge,
      clearSelection: c.clearSelection,
      selectAllVisibleNodes: c.selectAllVisibleNodes,
      removeMissingItemsFromSelection: c.removeMissingItemsFromSelection,
      syncSelectionFromReactFlow: c.syncSelectionFromReactFlow,
      setPreviewMode: u.setPreviewMode,
      setNodes: c.setNodes,
      setEdges: c.setEdges,
      updateEdgeData: c.updateEdgeData,
      setNeedsLayout: c.setNeedsLayout,
      undo: c.undo,
      redo: c.redo,
      toggleCanvasLock: c.toggleCanvasLock,
      takeSnapshot: c.takeSnapshot,
    } as const;
  }, []);
}

export function useEditorData() {
  const canvas = useCanvasStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      boardSettings: s.boardSettings,
      isCanvasLocked: s.isCanvasLocked,
      selection: s.selection,
      isCanvasLoading: s.isCanvasLoading,
    })),
  );

  const ui = useUIStore(
    useShallow((s) => ({
      currentGroup: s.currentGroup,
    })),
  );

  return { ...canvas, ...ui };
}

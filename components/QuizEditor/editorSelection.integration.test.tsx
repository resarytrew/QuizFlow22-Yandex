import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../types';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';

const nodeA: Node<NodeData> = {
  id: 'node-a',
  type: CustomNodeType.Info,
  position: { x: 0, y: 0 },
  data: { label: 'A' },
};

const nodeB: Node<NodeData> = {
  id: 'node-b',
  type: CustomNodeType.Question,
  position: { x: 200, y: 0 },
  data: { label: 'B' },
};

const edge: Edge = {
  id: 'edge-ab',
  source: nodeA.id,
  target: nodeB.id,
};

function renderIntegratedInteraction() {
  return renderHook(() => {
    const actions = useCanvasStore.getState();
    return useCanvasInteraction({
      reactFlowWrapper: { current: null },
      isCanvasLocked: false,
      connectingFrom: null,
      quickAddMenu: null,
      edges: useCanvasStore.getState().edges,
      setMenu: vi.fn(),
      setEdgeMenu: vi.fn(),
      setQuickAddMenu: vi.fn(),
      setConnectingFrom: vi.fn(),
      setIsConnecting: vi.fn(),
      selectSingleNode: actions.selectSingleNode,
      toggleNodeSelection: actions.toggleNodeSelection,
      isNodeSelected: (nodeId) =>
        useCanvasStore.getState().selection.selectedNodeIds.includes(nodeId),
      selectSingleEdge: actions.selectSingleEdge,
      clearSelection: actions.clearSelection,
      openNodeSettings: vi.fn(),
      onSelectionIntent: vi.fn(),
      addNode: actions.addNode,
      onEditEdgeLabel: vi.fn(),
      onConnect: actions.onConnect,
      screenToFlowPosition: (position) => position,
      getNode: (nodeId) =>
        useCanvasStore.getState().nodes.find((node) => node.id === nodeId),
      setPreviewMode: vi.fn(),
    });
  });
}

describe('editor selection integration', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useCanvasStore.getState().setNodes([nodeA, nodeB]);
    useCanvasStore.getState().setEdges([edge]);
  });

  it('applies click, edge click and pane click through the central commands', () => {
    const { result } = renderIntegratedInteraction();

    act(() => {
      result.current.onNodeClick(
        { shiftKey: false, ctrlKey: false, metaKey: false },
        { ...nodeA, selected: true },
      );
    });
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual(['node-a']);

    act(() => {
      result.current.onEdgeClick(
        { shiftKey: false },
        { ...edge, selected: true },
      );
    });
    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: ['edge-ab'],
    });

    act(() => result.current.onPaneClick());
    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  });

  it('does not invert a modifier selection already emitted by React Flow', () => {
    const { result } = renderIntegratedInteraction();
    useCanvasStore.getState().selectSingleNode('node-a');

    act(() => {
      useCanvasStore.getState().syncSelectionFromReactFlow(['node-a', 'node-b'], []);
      result.current.onNodeClick(
        { shiftKey: true, ctrlKey: false, metaKey: false },
        { ...nodeB, selected: true },
      );
    });
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual([
      'node-a',
      'node-b',
    ]);

    act(() => {
      useCanvasStore.getState().syncSelectionFromReactFlow(['node-a'], []);
      result.current.onNodeClick(
        { shiftKey: true, ctrlKey: false, metaKey: false },
        { ...nodeB, selected: false },
      );
    });
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual(['node-a']);
  });

  it('selects context-menu targets before opening their menus', () => {
    const { result } = renderIntegratedInteraction();

    act(() => {
      result.current.onNodeContextMenu(
        {
          clientX: 10,
          clientY: 20,
          preventDefault: vi.fn(),
        },
        nodeB,
      );
    });
    expect(useCanvasStore.getState().selection.primarySelectedNodeId).toBe('node-b');

    act(() => {
      result.current.onEdgeContextMenu(
        {
          clientX: 10,
          clientY: 20,
          preventDefault: vi.fn(),
        },
        edge,
      );
    });
    expect(useCanvasStore.getState().selection.selectedEdgeIds).toEqual(['edge-ab']);
  });
});

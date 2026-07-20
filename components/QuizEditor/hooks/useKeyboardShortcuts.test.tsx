import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../../types';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn() },
}));

const nodes: Node<NodeData>[] = [
  {
    id: 'start',
    type: CustomNodeType.Start,
    position: { x: 0, y: 0 },
    data: { label: 'Start' },
  },
  {
    id: 'node-a',
    type: CustomNodeType.Info,
    position: { x: 100, y: 0 },
    data: { label: 'A' },
  },
  {
    id: 'node-b',
    type: CustomNodeType.Question,
    position: { x: 300, y: 0 },
    data: { label: 'B' },
  },
];

const edges: Edge[] = [
  { id: 'edge-ab', source: 'node-a', target: 'node-b' },
];

function renderShortcuts(options?: {
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
}) {
  const addNode = vi.fn<(node: Node<NodeData>) => void>();
  const deleteNode = vi.fn<(nodeId: string) => void>();
  const deleteEdge = vi.fn<(edgeId: string) => void>();
  const selectNodes = vi.fn<(nodeIds: readonly string[], primaryId?: string) => void>();
  const selectAllVisibleNodes = vi.fn<() => void>();

  renderHook(() => useKeyboardShortcuts({
    visibleNodes: nodes,
    visibleEdges: edges,
    selectedNodeIds: options?.selectedNodeIds ?? [],
    selectedEdgeIds: options?.selectedEdgeIds ?? [],
    isCanvasLocked: false,
    deleteNode,
    deleteEdge,
    undo: vi.fn(),
    redo: vi.fn(),
    addNode,
    selectNodes,
    selectAllVisibleNodes,
  }));

  return { addNode, deleteNode, deleteEdge, selectNodes, selectAllVisibleNodes };
}

describe('useKeyboardShortcuts selection integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('copies by selection IDs and selects pasted nodes through selectNodes', () => {
    const { addNode, selectNodes } = renderShortcuts({
      selectedNodeIds: ['node-a', 'node-b'],
    });

    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true });

    expect(addNode).toHaveBeenCalledTimes(2);
    const pastedNodeIds = addNode.mock.calls.map(([node]) => node.id);
    expect(selectNodes).toHaveBeenCalledWith(pastedNodeIds, pastedNodeIds[0]);
  });

  it('deletes nodes and edges from the central selection IDs', () => {
    const { deleteNode, deleteEdge } = renderShortcuts({
      selectedNodeIds: ['node-a'],
      selectedEdgeIds: ['edge-ab'],
    });

    fireEvent.keyDown(document, { key: 'Delete' });

    expect(deleteNode).toHaveBeenCalledWith('node-a');
    expect(deleteEdge).not.toHaveBeenCalled();
  });

  it('deletes a selected edge when its endpoints are not being deleted', () => {
    const { deleteEdge } = renderShortcuts({ selectedEdgeIds: ['edge-ab'] });

    fireEvent.keyDown(document, { key: 'Backspace' });

    expect(deleteEdge).toHaveBeenCalledWith('edge-ab');
  });

  it('selects all visible nodes through the centralized command', () => {
    const { selectAllVisibleNodes } = renderShortcuts();

    fireEvent.keyDown(document, { key: 'a', metaKey: true });

    expect(selectAllVisibleNodes).toHaveBeenCalledOnce();
  });
});

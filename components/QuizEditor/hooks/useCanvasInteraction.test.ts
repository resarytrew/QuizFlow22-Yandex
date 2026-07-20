import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomNodeType } from '../../../types';
import type { NodeData } from '../../../types';
import type { Node } from 'reactflow';
import { NODE_DRAG_MIME } from '../nodeDragData';
import { useCanvasInteraction } from './useCanvasInteraction';

function createDropEvent(payload: string) {
  return {
    clientX: 400,
    clientY: 300,
    preventDefault: vi.fn(),
    dataTransfer: {
      getData: vi.fn((type: string) =>
        type === NODE_DRAG_MIME ? payload : '',
      ),
    },
  } as unknown as React.DragEvent;
}

function renderInteraction(
  addNode = vi.fn(),
  isCanvasLocked = false,
  selectionOverrides: Partial<Pick<
    Parameters<typeof useCanvasInteraction>[0],
    'selectSingleNode' | 'toggleNodeSelection' | 'isNodeSelected' |
    'selectSingleEdge' | 'clearSelection' | 'openNodeSettings'
  >> = {},
) {
  return renderHook(() =>
    useCanvasInteraction({
      reactFlowWrapper: { current: null },
      isCanvasLocked,
      connectingFrom: null,
      quickAddMenu: null,
      edges: [],
      setMenu: vi.fn(),
      setEdgeMenu: vi.fn(),
      setQuickAddMenu: vi.fn(),
      setConnectingFrom: vi.fn(),
      setIsConnecting: vi.fn(),
      selectSingleNode: vi.fn(),
      toggleNodeSelection: vi.fn(),
      isNodeSelected: vi.fn(() => false),
      selectSingleEdge: vi.fn(),
      clearSelection: vi.fn(),
      openNodeSettings: vi.fn(),
      ...selectionOverrides,
      onSelectionIntent: vi.fn(),
      addNode,
      onEditEdgeLabel: vi.fn(),
      onConnect: vi.fn(),
      screenToFlowPosition: vi.fn(() => ({ x: 200, y: 160 })),
      getNode: vi.fn(),
      setPreviewMode: vi.fn(),
    }),
  );
}

describe('useCanvasInteraction drag and drop', () => {
  it('adds a valid sidebar node at the converted flow position', () => {
    const addNode = vi.fn();
    const { result } = renderInteraction(addNode);
    const event = createDropEvent(CustomNodeType.Question);

    result.current.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(addNode).toHaveBeenCalledOnce();
    expect(addNode.mock.calls[0][0]).toMatchObject({
      type: CustomNodeType.Question,
      position: { x: 96, y: 85 },
    });
  });

  it('ignores an unknown drag payload', () => {
    const addNode = vi.fn();
    const { result } = renderInteraction(addNode);

    result.current.onDrop(createDropEvent('unknown-node'));

    expect(addNode).not.toHaveBeenCalled();
  });

  it('prevents browser navigation but does not add while canvas is locked', () => {
    const addNode = vi.fn();
    const { result } = renderInteraction(addNode, true);
    const event = createDropEvent(CustomNodeType.Info);

    result.current.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(addNode).not.toHaveBeenCalled();
  });
});

describe('useCanvasInteraction selection', () => {
  const node: Node<NodeData> = {
    id: 'question-1',
    type: CustomNodeType.Question,
    position: { x: 20, y: 30 },
    data: { label: 'Question' },
  };

  it('uses exclusive selection for an ordinary click', () => {
    const selectSingleNode = vi.fn();
    const openNodeSettings = vi.fn();
    const { result } = renderInteraction(vi.fn(), false, {
      selectSingleNode,
      openNodeSettings,
    });

    result.current.onNodeClick(
      { shiftKey: false, ctrlKey: false, metaKey: false },
      node,
    );

    expect(selectSingleNode).toHaveBeenCalledWith(node.id);
    expect(openNodeSettings).toHaveBeenCalledOnce();
  });

  it('toggles selection only with an explicit modifier', () => {
    const toggleNodeSelection = vi.fn();
    const { result } = renderInteraction(vi.fn(), false, {
      toggleNodeSelection,
      isNodeSelected: () => false,
    });

    result.current.onNodeClick(
      { shiftKey: true, ctrlKey: false, metaKey: false },
      { ...node, selected: true },
    );

    expect(toggleNodeSelection).toHaveBeenCalledWith(node.id);
  });

  it('does not toggle twice after React Flow already synchronized a modifier click', () => {
    const toggleNodeSelection = vi.fn();
    const { result } = renderInteraction(vi.fn(), false, {
      toggleNodeSelection,
      isNodeSelected: () => true,
    });

    result.current.onNodeClick(
      { shiftKey: true, ctrlKey: false, metaKey: false },
      { ...node, selected: true },
    );

    expect(toggleNodeSelection).not.toHaveBeenCalled();
  });

  it('selects one edge and clears the primary node through the edge command', () => {
    const selectSingleEdge = vi.fn();
    const { result } = renderInteraction(vi.fn(), false, { selectSingleEdge });
    const edge = { id: 'edge-1', source: 'question-1', target: 'question-2' };

    result.current.onEdgeClick(
      { shiftKey: false },
      edge,
    );

    expect(selectSingleEdge).toHaveBeenCalledWith(edge.id);
  });
});

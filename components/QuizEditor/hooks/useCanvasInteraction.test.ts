import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomNodeType } from '../../../types';
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

function renderInteraction(addNode = vi.fn(), isCanvasLocked = false) {
  return renderHook(() =>
    useCanvasInteraction({
      reactFlowWrapper: { current: null },
      isCanvasLocked,
      connectingFrom: null,
      quickAddMenu: null,
      visibleNodes: [],
      visibleEdges: [],
      edges: [],
      setMenu: vi.fn(),
      setEdgeMenu: vi.fn(),
      setQuickAddMenu: vi.fn(),
      setConnectingFrom: vi.fn(),
      setIsConnecting: vi.fn(),
      setSelectedNode: vi.fn(),
      addNode,
      deleteNode: vi.fn(),
      deleteEdge: vi.fn(),
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

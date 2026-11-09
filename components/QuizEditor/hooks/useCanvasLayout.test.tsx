import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../../types';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useCanvasLayout } from './useCanvasLayout';

const nodes: Node<NodeData>[] = [
  { id: 'a', type: CustomNodeType.Info, position: { x: 400, y: 250 }, data: { label: 'A' } },
  { id: 'hidden', type: CustomNodeType.Info, position: { x: 900, y: 900 }, data: { parentId: 'group' } },
  { id: 'b', type: CustomNodeType.Info, position: { x: 50, y: 50 }, data: { label: 'B' } },
];
const edges = [{ id: 'ab', source: 'a', target: 'b', sourceHandle: 'answer-1' }];

describe('canvas layout history', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useCanvasStore.getState().setNodes(structuredClone(nodes));
    useCanvasStore.getState().setEdges(structuredClone(edges));
  });
  afterEach(() => useCanvasStore.getState().reset());

  it('undoes and redoes one layout without changing hidden nodes or links', () => {
    const { result } = renderHook(() => useCanvasLayout({
      fitView: vi.fn(), nodes: useCanvasStore.getState().nodes,
      visibleNodes: useCanvasStore.getState().nodes.filter(n => n.id !== 'hidden'),
      visibleEdges: useCanvasStore.getState().edges,
      visibleNodeIds: new Set(['a', 'b']),
      setNodes: useCanvasStore.getState().setNodes,
    }));
    act(() => result.current.handleLayout('TB'));
    const laidOut = structuredClone(useCanvasStore.getState().nodes);
    expect(laidOut.find(n => n.id === 'a')?.position).not.toEqual(nodes[0].position);
    expect(laidOut.find(n => n.id === 'hidden')).toEqual(nodes[1]);
    act(() => useCanvasStore.getState().undo());
    expect(useCanvasStore.getState().nodes).toEqual(nodes);
    expect(useCanvasStore.getState().edges).toEqual(edges);
    act(() => useCanvasStore.getState().redo());
    expect(useCanvasStore.getState().nodes).toEqual(laidOut);
    expect(useCanvasStore.getState().edges).toEqual(edges);
  });
  it('does not add history when the layout has not changed', () => {
    const { result, rerender } = renderHook(() => useCanvasLayout({
      fitView: vi.fn(), nodes: useCanvasStore.getState().nodes,
      visibleNodes: useCanvasStore.getState().nodes.filter(n => n.id !== 'hidden'),
      visibleEdges: useCanvasStore.getState().edges,
      visibleNodeIds: new Set(['a', 'b']), setNodes: useCanvasStore.getState().setNodes,
    }));
    act(() => result.current.handleLayout('TB'));
    rerender();
    act(() => result.current.handleLayout('TB'));
    expect(useCanvasStore.getState().history.past).toHaveLength(1);
  });

});

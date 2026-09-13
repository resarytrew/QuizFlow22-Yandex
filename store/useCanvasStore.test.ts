import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../types';
import { useUIStore } from './useUIStore';
import {
  selectPrimarySelectedNode,
  useCanvasStore,
} from './useCanvasStore';

function makeNode(id: string, x: number, parentId?: string): Node<NodeData> {
  return {
    id,
    type: CustomNodeType.Info,
    position: { x, y: 0 },
    data: { label: id, ...(parentId ? { parentId } : {}) },
  };
}

const EDGES: Edge[] = [
  { id: 'edge-ab', source: 'node-a', target: 'node-b' },
  { id: 'edge-bc', source: 'node-b', target: 'node-c' },
];

describe('useCanvasStore editor selection model', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useUIStore.getState().setCurrentGroup(null);
    useCanvasStore.getState().setNodes([
      makeNode('node-a', 0),
      makeNode('node-b', 200),
      makeNode('node-c', 400, 'group-1'),
    ]);
    useCanvasStore.getState().setEdges(EDGES);
  });

  afterEach(() => {
    useCanvasStore.getState().reset();
    useUIStore.getState().setCurrentGroup(null);
  });

  it('selects one node as primary and projects selected flags', () => {
    useCanvasStore.getState().selectSingleEdge('edge-ab');
    useCanvasStore.getState().selectSingleNode('node-b');

    const state = useCanvasStore.getState();
    expect(state.selection).toEqual({
      primarySelectedNodeId: 'node-b',
      selectedNodeIds: ['node-b'],
      selectedEdgeIds: [],
    });
    expect(state.nodes.map((node) => Boolean(node.selected))).toEqual([false, true, false]);
    expect(state.edges.every((edge) => !edge.selected)).toBe(true);
  });

  it('toggles nodes and assigns a deterministic remaining primary node', () => {
    const actions = useCanvasStore.getState();
    actions.selectSingleNode('node-a');
    actions.toggleNodeSelection('node-b');

    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: 'node-b',
      selectedNodeIds: ['node-a', 'node-b'],
      selectedEdgeIds: [],
    });

    actions.toggleNodeSelection('node-b');
    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
      selectedEdgeIds: [],
    });
  });

  it('normalizes batch selection to existing IDs and graph order', () => {
    useCanvasStore.getState().selectNodes(
      ['missing', 'node-b', 'node-a', 'node-b'],
      'node-b',
    );

    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: 'node-b',
      selectedNodeIds: ['node-a', 'node-b'],
      selectedEdgeIds: [],
    });
  });

  it('selects a single edge and resets the primary node', () => {
    useCanvasStore.getState().selectSingleNode('node-a');
    useCanvasStore.getState().selectSingleEdge('edge-bc');

    const state = useCanvasStore.getState();
    expect(state.selection).toEqual({
      primarySelectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: ['edge-bc'],
    });
    expect(state.nodes.every((node) => !node.selected)).toBe(true);
    expect(state.edges.map((edge) => Boolean(edge.selected))).toEqual([false, true]);
  });

  it('clears all node and edge selection', () => {
    useCanvasStore.getState().selectSingleEdge('edge-ab');
    useCanvasStore.getState().clearSelection();

    const state = useCanvasStore.getState();
    expect(state.selection).toEqual({
      primarySelectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
    expect(state.nodes.every((node) => !node.selected)).toBe(true);
    expect(state.edges.every((edge) => !edge.selected)).toBe(true);
  });

  it('selects only nodes visible in the current group', () => {
    useCanvasStore.getState().selectAllVisibleNodes();
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual([
      'node-a',
      'node-b',
    ]);

    useUIStore.getState().setCurrentGroup('group-1');
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual([]);
    useCanvasStore.getState().selectAllVisibleNodes();
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual(['node-c']);

    useUIStore.getState().reset();
    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual([]);
  });

  it('removes deleted nodes and edges from selection', () => {
    useCanvasStore.getState().selectSingleEdge('edge-ab');
    useCanvasStore.getState().deleteEdge('edge-ab');
    expect(useCanvasStore.getState().selection.selectedEdgeIds).toEqual([]);

    useCanvasStore.getState().selectNodes(['node-a', 'node-b'], 'node-b');
    useCanvasStore.getState().deleteNode('node-b');

    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
      selectedEdgeIds: [],
    });
  });

  it('removes stale IDs through removeMissingItemsFromSelection', () => {
    useCanvasStore.setState({
      selection: {
        primarySelectedNodeId: 'missing-node',
        selectedNodeIds: ['node-a', 'missing-node'],
        selectedEdgeIds: ['edge-ab', 'missing-edge'],
      },
    });

    useCanvasStore.getState().removeMissingItemsFromSelection();

    expect(useCanvasStore.getState().selection).toEqual({
      primarySelectedNodeId: 'node-a',
      selectedNodeIds: ['node-a'],
      selectedEdgeIds: ['edge-ab'],
    });
  });

  it('ignores React Flow select changes outside the centralized selection commands', () => {
    useCanvasStore.getState().selectSingleNode('node-a');
    useCanvasStore.getState().onNodesChange([
      { id: 'node-a', type: 'select', selected: false },
      { id: 'node-b', type: 'select', selected: true },
    ]);

    expect(useCanvasStore.getState().selection.selectedNodeIds).toEqual(['node-a']);
    expect(useCanvasStore.getState().nodes.map((node) => Boolean(node.selected))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('does not notify subscribers for an identical React Flow selection sync', () => {
    const listener = vi.fn();
    const unsubscribe = useCanvasStore.subscribe(listener);

    useCanvasStore.getState().syncSelectionFromReactFlow(['node-a'], []);
    listener.mockClear();
    useCanvasStore.getState().syncSelectionFromReactFlow(['node-a'], []);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('moves only the node included in an ordinary drag change', () => {
    useCanvasStore.getState().selectSingleNode('node-a');
    useCanvasStore.getState().onNodesChange([
      {
        id: 'node-a',
        type: 'position',
        position: { x: 80, y: 40 },
        dragging: true,
      },
    ]);

    expect(useCanvasStore.getState().nodes.map((node) => node.position)).toEqual([
      { x: 80, y: 40 },
      { x: 200, y: 0 },
      { x: 400, y: 0 },
    ]);
  });

  it('keeps explicit multi-selection available for group dragging', () => {
    useCanvasStore.getState().selectNodes(['node-a', 'node-b'], 'node-b');
    useCanvasStore.getState().onNodesChange([
      {
        id: 'node-a',
        type: 'position',
        position: { x: 50, y: 20 },
        dragging: true,
      },
      {
        id: 'node-b',
        type: 'position',
        position: { x: 250, y: 20 },
        dragging: true,
      },
    ]);

    const state = useCanvasStore.getState();
    expect(state.selection.selectedNodeIds).toEqual(['node-a', 'node-b']);
    expect(state.nodes.map((node) => node.position)).toEqual([
      { x: 50, y: 20 },
      { x: 250, y: 20 },
      { x: 400, y: 0 },
    ]);
  });

  it('keeps the primary node selector stable when another node data changes', () => {
    useCanvasStore.getState().selectSingleNode('node-a');
    const selectedBefore = selectPrimarySelectedNode(useCanvasStore.getState());
    const selectionBefore = useCanvasStore.getState().selection;

    useCanvasStore.getState().updateNodeData('node-b', { label: 'Updated B' });

    const selectedAfter = selectPrimarySelectedNode(useCanvasStore.getState());
    expect(selectedAfter).toBe(selectedBefore);
    expect(useCanvasStore.getState().selection).toBe(selectionBefore);
  });

  it('derives the edited primary node from the memoized nodesById selector', () => {
    useCanvasStore.getState().selectSingleNode('node-a');
    useCanvasStore.getState().updateNodeData('node-a', { label: 'Updated A' });

    const selectedNode = selectPrimarySelectedNode(useCanvasStore.getState());
    expect(selectedNode).toBe(useCanvasStore.getState().nodes[0]);
    expect(selectedNode?.data.label).toBe('Updated A');
  });
});

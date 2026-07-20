import { create } from 'zustand';
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from 'reactflow';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from 'reactflow';

import {
  NodeData,
  BoardSettings,
  CustomNodeType,
  EffectOp,
  EdgeData,
} from '../types';
import { useUIStore } from './useUIStore';
import { storeEvents } from './storeEvents';

// NOTE: updateNodeDataTimer is intentionally stored in closure,
// not in store state, to avoid triggering re-renders.

export type EditorSelection = {
  primarySelectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
};

export interface CanvasStoreState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<NodeData>) => void;
  setNodes: (nodes: Node<NodeData>[] | ((nodes: Node<NodeData>[]) => Node<NodeData>[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void;
  clearCanvas: () => void;
  collapseVariableChainToEffects: (edgeId: string) => void;

  // Selection
  selection: EditorSelection;
  selectSingleNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNodes: (nodeIds: readonly string[], primaryId?: string) => void;
  selectSingleEdge: (edgeId: string) => void;
  clearSelection: () => void;
  selectAllVisibleNodes: () => void;
  removeMissingItemsFromSelection: () => void;
  syncSelectionFromReactFlow: (
    nodeIds: readonly string[],
    edgeIds: readonly string[],
  ) => void;

  // Canvas settings
  boardSettings: BoardSettings;
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;
  isCanvasLocked: boolean;
  toggleCanvasLock: () => void;
  needsLayout: boolean;
  setNeedsLayout: (needs: boolean) => void;
  isCanvasLoading: boolean;
  setCanvasLoading: (loading: boolean) => void;

  // History
  history: { past: { nodes: Node<NodeData>[]; edges: Edge[] }[]; future: { nodes: Node<NodeData>[]; edges: Edge[] }[] };
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Reset
  reset: () => void;
}

function isEffectOp(value: unknown): value is EffectOp {
  return value === 'set' || value === 'add' || value === 'subtract';
}

function toEffectValue(value: unknown, fallback: string | number): string | number {
  return typeof value === 'string' || typeof value === 'number' ? value : fallback;
}

const EMPTY_SELECTION: EditorSelection = {
  primarySelectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
};

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameSelection(left: EditorSelection, right: EditorSelection): boolean {
  return left.primarySelectedNodeId === right.primarySelectedNodeId
    && sameIds(left.selectedNodeIds, right.selectedNodeIds)
    && sameIds(left.selectedEdgeIds, right.selectedEdgeIds);
}

function projectSelection(
  nodes: Node<NodeData>[],
  edges: Edge[],
  requested: EditorSelection,
): { nodes: Node<NodeData>[]; edges: Edge[]; selection: EditorSelection } {
  const requestedNodeIds = new Set(requested.selectedNodeIds);
  const requestedEdgeIds = new Set(requested.selectedEdgeIds);
  const selectedNodeIds = nodes
    .filter((node) => requestedNodeIds.has(node.id))
    .map((node) => node.id);
  const selectedEdgeIds = edges
    .filter((edge) => requestedEdgeIds.has(edge.id))
    .map((edge) => edge.id);
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const selectedEdgeIdSet = new Set(selectedEdgeIds);
  const primarySelectedNodeId = requested.primarySelectedNodeId
    && selectedNodeIdSet.has(requested.primarySelectedNodeId)
    ? requested.primarySelectedNodeId
    : selectedNodeIds[0] ?? null;

  let nodeFlagsChanged = false;
  const projectedNodes = nodes.map((node) => {
    const selected = selectedNodeIdSet.has(node.id);
    if (Boolean(node.selected) === selected) return node;
    nodeFlagsChanged = true;
    return { ...node, selected };
  });
  let edgeFlagsChanged = false;
  const projectedEdges = edges.map((edge) => {
    const selected = selectedEdgeIdSet.has(edge.id);
    if (Boolean(edge.selected) === selected) return edge;
    edgeFlagsChanged = true;
    return { ...edge, selected };
  });

  return {
    nodes: nodeFlagsChanged ? projectedNodes : nodes,
    edges: edgeFlagsChanged ? projectedEdges : edges,
    selection: { primarySelectedNodeId, selectedNodeIds, selectedEdgeIds },
  };
}

function selectionUpdate(
  state: CanvasStoreState,
  requested: EditorSelection,
  nodes = state.nodes,
  edges = state.edges,
): CanvasStoreState | Partial<CanvasStoreState> {
  const projected = projectSelection(nodes, edges, requested);
  const nodesChanged = projected.nodes.some((node, index) => node !== state.nodes[index])
    || projected.nodes.length !== state.nodes.length;
  const edgesChanged = projected.edges.some((edge, index) => edge !== state.edges[index])
    || projected.edges.length !== state.edges.length;
  const selectionChanged = !sameSelection(projected.selection, state.selection);

  if (!nodesChanged && !edgesChanged && !selectionChanged) {
    return state;
  }
  return {
    ...projected,
    selection: selectionChanged ? projected.selection : state.selection,
  };
}

const createInitialState = () => ({
  nodes: [
    {
      id: 'start',
      type: CustomNodeType.Start,
      position: { x: 0, y: 0 },
      data: { label: 'Старт' },
    },
  ] as Node<NodeData>[],
  edges: [] as Edge[],
  selection: { ...EMPTY_SELECTION } as EditorSelection,
  boardSettings: {
    backgroundColor: '#f8fafc',
    pattern: 'small',
    lineColor: '#e2e8f0',
    lineWidth: 1,
  } as BoardSettings,
  isCanvasLocked: false,
  needsLayout: false,
  isCanvasLoading: false,
  history: { past: [], future: [] } as {
    past: { nodes: Node<NodeData>[]; edges: Edge[] }[];
    future: { nodes: Node<NodeData>[]; edges: Edge[] }[];
  },
});

export const useCanvasStore = create<CanvasStoreState>((set, get) => {
  // Closure-stored timer for debounced snapshots
  let updateNodeDataTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    ...createInitialState(),

    onNodesChange: (changes) => {
      set((state) => {
        const graphChanges = changes.filter((change) => change.type !== 'select');
        if (graphChanges.length === 0) return state;
        const nodes = applyNodeChanges(graphChanges, state.nodes);
        return selectionUpdate(state, state.selection, nodes, state.edges);
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const graphChanges = changes.filter((change) => change.type !== 'select');
        if (graphChanges.length === 0) return state;
        const edges = applyEdgeChanges(graphChanges, state.edges);
        return selectionUpdate(state, state.selection, state.nodes, edges);
      });
    },

    onConnect: (connection) => {
      const edge: Edge = {
        ...connection,
        source: connection.source ?? '',
        target: connection.target ?? '',
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: 'default',
        data: {},
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      get().takeSnapshot();
      set((state) => {
        const edges = addEdge(edge, state.edges) as Edge[];
        return selectionUpdate(state, state.selection, state.nodes, edges);
      });
    },

    addNode: (node) => {
      const currentGroup = useUIStore.getState().currentGroup;
      const nodeWithParent = currentGroup
        ? { ...node, data: { ...node.data, parentId: currentGroup } }
        : node;
      get().takeSnapshot();
      set((state) => selectionUpdate(
        state,
        state.selection,
        [...state.nodes, nodeWithParent],
        state.edges,
      ));
    },

    setNodes: (nodesOrFn) => {
      set((state) => {
        const nodes =
          typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn;
        return selectionUpdate(state, state.selection, nodes, state.edges);
      });
    },

    setEdges: (edgesOrFn) => {
      set((state) => {
        const edges = typeof edgesOrFn === 'function'
          ? edgesOrFn(state.edges)
          : edgesOrFn;
        return selectionUpdate(state, state.selection, state.nodes, edges);
      });
    },

    deleteNode: (id) => {
      get().takeSnapshot();
      set((state) => selectionUpdate(
        state,
        state.selection,
        state.nodes.filter((node) => node.id !== id),
        state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      ));
    },

    deleteEdge: (id) => {
      get().takeSnapshot();
      set((state) => selectionUpdate(
        state,
        state.selection,
        state.nodes,
        state.edges.filter((edge) => edge.id !== id),
      ));
    },

    updateNodeData: (id, data) => {
      set((state) => {
        const nodes = state.nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        );
        return selectionUpdate(state, state.selection, nodes, state.edges);
      });

      if (updateNodeDataTimer) clearTimeout(updateNodeDataTimer);
      updateNodeDataTimer = setTimeout(() => {
        get().takeSnapshot();
        updateNodeDataTimer = null;
      }, 500);
    },

    updateEdgeData: (id, patch) => {
      set((state) => {
        const edges = state.edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...(edge.data || {}), ...(patch || {}) } }
            : edge
        );
        return selectionUpdate(state, state.selection, state.nodes, edges);
      });
      get().takeSnapshot();
    },

    clearCanvas: () => {
      const init = createInitialState();
      set({
        nodes: init.nodes,
        edges: init.edges,
        history: { past: [], future: [] },
        selection: { ...EMPTY_SELECTION },
      });
      useUIStore.getState().setCurrentGroup(null);
    },

    collapseVariableChainToEffects: (edgeId) => {
      const { edges, nodes } = get();
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const nodeById = new Map<string, Node<NodeData>>(nodes.map((n) => [n.id, n]));
      const edgeBySource = new Map<string, Edge[]>();
      edges.forEach((e) => {
        const arr = edgeBySource.get(e.source) || [];
        arr.push(e);
        edgeBySource.set(e.source, arr);
      });

      const collectedEffects: { variableName: string; op: EffectOp; value: string | number }[] = [];
      const nodesToDelete: string[] = [];
      const edgesToDelete: string[] = [];

      let currentId = edge.target;
      const seen = new Set<string>();

      while (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        const n = nodeById.get(currentId);
        if (!n) break;

        const isLogicNode =
          n.type === CustomNodeType.Variable || n.type === 'variableNode' ||
          n.type === CustomNodeType.Score || n.type === 'scoreNode';

        if (!isLogicNode) break;

        const data = (n.data || {}) as Record<string, unknown>;

        if (n.type === CustomNodeType.Variable || n.type === 'variableNode') {
          if (typeof data.variableName !== 'string' || !isEffectOp(data.operation)) break;
          collectedEffects.push({
            variableName: data.variableName,
            op: data.operation,
            value: toEffectValue(data.value, ''),
          });
        } else {
          collectedEffects.push({
            variableName: 'score',
            op: isEffectOp(data.operation) ? data.operation : 'add',
            value: toEffectValue(data.value, 0),
          });
        }

        nodesToDelete.push(n.id);

        const outs = edgeBySource.get(n.id) || [];
        if (outs.length !== 1) break;
        const outEdge = outs[0];
        edgesToDelete.push(outEdge.id);
        currentId = outEdge.target;
      }

      if (collectedEffects.length === 0) return;

      const finalTarget = nodeById.get(currentId);
      if (!finalTarget) return;

      if (
        finalTarget.type === CustomNodeType.Variable || finalTarget.type === 'variableNode' ||
        finalTarget.type === CustomNodeType.Score || finalTarget.type === 'scoreNode' ||
        finalTarget.type === CustomNodeType.Formula || finalTarget.type === 'formulaNode'
      ) return;

      const prevEffects = (edge.data && edge.data.effects) ? edge.data.effects : [];
      const nextEffects = [...prevEffects, ...collectedEffects];

      const nextEdges = edges
        .filter((e) => !edgesToDelete.includes(e.id))
        .map((e) => {
          if (e.id !== edgeId) return e;
          return {
            ...e,
            target: finalTarget.id,
            data: { ...(e.data || {}), effects: nextEffects },
          };
        });

      const nextNodes = nodes.filter((n) => !nodesToDelete.includes(n.id));

      set((state) => selectionUpdate(
        state,
        state.selection,
        nextNodes,
        nextEdges,
      ));
      get().takeSnapshot();
    },

    selectSingleNode: (nodeId) =>
      set((state) => selectionUpdate(state, {
        primarySelectedNodeId: nodeId,
        selectedNodeIds: [nodeId],
        selectedEdgeIds: [],
      })),

    toggleNodeSelection: (nodeId) =>
      set((state) => {
        const selectedIds = new Set(state.selection.selectedNodeIds);
        if (selectedIds.has(nodeId)) selectedIds.delete(nodeId);
        else selectedIds.add(nodeId);
        const selectedNodeIds = state.nodes
          .filter((node) => selectedIds.has(node.id))
          .map((node) => node.id);
        const primarySelectedNodeId = selectedIds.has(nodeId)
          ? nodeId
          : selectedNodeIds[0] ?? null;
        return selectionUpdate(state, {
          primarySelectedNodeId,
          selectedNodeIds,
          selectedEdgeIds: [],
        });
      }),

    selectNodes: (nodeIds, primaryId) =>
      set((state) => selectionUpdate(state, {
        primarySelectedNodeId: primaryId ?? nodeIds[0] ?? null,
        selectedNodeIds: [...nodeIds],
        selectedEdgeIds: [],
      })),

    selectSingleEdge: (edgeId) =>
      set((state) => selectionUpdate(state, {
        primarySelectedNodeId: null,
        selectedNodeIds: [],
        selectedEdgeIds: [edgeId],
      })),

    clearSelection: () =>
      set((state) => selectionUpdate(state, EMPTY_SELECTION)),

    selectAllVisibleNodes: () =>
      set((state) => {
        const currentGroup = useUIStore.getState().currentGroup;
        const selectedNodeIds = state.nodes
          .filter((node) => {
            const parentId = node.data.parentId;
            return currentGroup ? parentId === currentGroup : !parentId;
          })
          .map((node) => node.id);
        return selectionUpdate(state, {
          primarySelectedNodeId: selectedNodeIds[0] ?? null,
          selectedNodeIds,
          selectedEdgeIds: [],
        });
      }),

    removeMissingItemsFromSelection: () =>
      set((state) => selectionUpdate(state, state.selection)),

    syncSelectionFromReactFlow: (nodeIds, edgeIds) =>
      set((state) => {
        const nodeIdSet = new Set(nodeIds);
        const primarySelectedNodeId = state.selection.primarySelectedNodeId
          && nodeIdSet.has(state.selection.primarySelectedNodeId)
          ? state.selection.primarySelectedNodeId
          : nodeIds[0] ?? null;
        return selectionUpdate(state, {
          primarySelectedNodeId,
          selectedNodeIds: [...nodeIds],
          selectedEdgeIds: [...edgeIds],
        });
      }),

    updateBoardSettings: (settings) =>
      set((state) => ({ boardSettings: { ...state.boardSettings, ...settings } })),
    toggleCanvasLock: () =>
      set((state) => ({ isCanvasLocked: !state.isCanvasLocked })),
    setNeedsLayout: (needs) => set({ needsLayout: needs }),
    setCanvasLoading: (loading) => set({ isCanvasLoading: loading }),

    // History — debounce already protects from excessive snapshots
    takeSnapshot: () => {
      const { nodes, edges, history } = get();
      const snapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
      };
      const newPast = [...history.past, snapshot].slice(-50);
      set({ history: { past: newPast, future: [] } });
    },

    undo: () => {
      const { history, nodes, edges } = get();
      if (history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      const restored = projectSelection(
        structuredClone(previous.nodes),
        structuredClone(previous.edges),
        EMPTY_SELECTION,
      );
      set({
        nodes: restored.nodes,
        edges: restored.edges,
        selection: restored.selection,
        history: {
          past: history.past.slice(0, -1),
          future: [structuredClone({ nodes, edges }), ...history.future],
        },
      });
    },

    redo: () => {
      const { history, nodes, edges } = get();
      if (history.future.length === 0) return;
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      const restored = projectSelection(
        structuredClone(next.nodes),
        structuredClone(next.edges),
        EMPTY_SELECTION,
      );
      set({
        nodes: restored.nodes,
        edges: restored.edges,
        selection: restored.selection,
        history: {
          past: [...history.past, structuredClone({ nodes, edges })],
          future: newFuture,
        },
      });
    },

    reset: () => {
      if (updateNodeDataTimer) {
        clearTimeout(updateNodeDataTimer);
        updateNodeDataTimer = null;
      }
      set(createInitialState());
    },
  };
});

// --- Cross-store event subscriptions (registered once at module load) ---

const unsubscribers = [
  storeEvents.on('CANVAS_CLEAR', () => {
    useCanvasStore.getState().reset();
  }),

  storeEvents.on('QUIZ_LOADED', ({ nodes, edges }) => {
    useCanvasStore.getState().setNodes(nodes);
    useCanvasStore.getState().setEdges(edges);
    useCanvasStore.getState().clearSelection();
    useCanvasStore.setState({ history: { past: [], future: [] } });
  }),

  storeEvents.on('AUTOSAVE_RESTORE', ({ nodes, edges }) => {
    useCanvasStore.getState().setNodes(nodes);
    useCanvasStore.getState().setEdges(edges);
    useCanvasStore.getState().removeMissingItemsFromSelection();
  }),

  storeEvents.on('GROUP_CHANGED', () => {
    useCanvasStore.getState().clearSelection();
  }),
];

let cachedNodes: Node<NodeData>[] | null = null;
let cachedNodesById = new Map<string, Node<NodeData>>();

export function selectNodesById(state: CanvasStoreState): ReadonlyMap<string, Node<NodeData>> {
  if (cachedNodes !== state.nodes) {
    cachedNodes = state.nodes;
    cachedNodesById = new Map(state.nodes.map((node) => [node.id, node]));
  }
  return cachedNodesById;
}

export function selectPrimarySelectedNode(state: CanvasStoreState): Node<NodeData> | null {
  const primaryId = state.selection.primarySelectedNodeId;
  return primaryId ? selectNodesById(state).get(primaryId) ?? null : null;
}

export const selectPrimarySelectedNodeId = (state: CanvasStoreState): string | null =>
  state.selection.primarySelectedNodeId;

export const selectSelectedNodeIds = (state: CanvasStoreState): string[] =>
  state.selection.selectedNodeIds;

export const selectSelectedEdgeIds = (state: CanvasStoreState): string[] =>
  state.selection.selectedEdgeIds;

export function createIsNodeSelectedSelector(nodeId: string) {
  return (state: CanvasStoreState): boolean =>
    state.selection.selectedNodeIds.includes(nodeId);
}

export function createNodeByIdSelector(nodeId: string) {
  return (state: CanvasStoreState): Node<NodeData> | null =>
    selectNodesById(state).get(nodeId) ?? null;
}

export function unsubscribeCanvasEvents() {
  unsubscribers.forEach((unsub) => unsub());
}

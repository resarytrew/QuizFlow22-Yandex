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

interface CanvasStoreState {
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
  selectedNode: Node<NodeData> | null;
  setSelectedNode: (node: Node<NodeData> | null) => void;

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
  selectedNode: null as Node<NodeData> | null,
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
        const nodes = applyNodeChanges(changes, state.nodes);
        const selId = state.selectedNode?.id;
        const selectedNode = selId ? nodes.find((n) => n.id === selId) ?? null : null;
        return { nodes, selectedNode };
      });
    },

    onEdgesChange: (changes) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      }));
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
      set((state) => ({
        edges: addEdge(edge, state.edges) as Edge[],
      }));
    },

    addNode: (node) => {
      const currentGroup = useUIStore.getState().currentGroup;
      const nodeWithParent = currentGroup
        ? { ...node, data: { ...node.data, parentId: currentGroup } }
        : node;
      get().takeSnapshot();
      set((state) => ({ nodes: [...state.nodes, nodeWithParent] }));
    },

    setNodes: (nodesOrFn) => {
      set((state) => {
        const nodes =
          typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn;
        const selId = state.selectedNode?.id;
        const selectedNode = selId
          ? nodes.find((n) => n.id === selId) ?? null
          : null;
        return { nodes, selectedNode };
      });
    },

    setEdges: (edgesOrFn) => {
      set((state) => ({
        edges:
          typeof edgesOrFn === 'function' ? edgesOrFn(state.edges) : edgesOrFn,
      }));
    },

    deleteNode: (id) => {
      get().takeSnapshot();
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNode:
          state.selectedNode?.id === id ? null : state.selectedNode,
      }));
    },

    deleteEdge: (id) => {
      get().takeSnapshot();
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== id),
      }));
    },

    updateNodeData: (id, data) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        ),
        selectedNode:
          state.selectedNode?.id === id
            ? { ...state.selectedNode!, data: { ...state.selectedNode!.data, ...data } }
            : state.selectedNode,
      }));

      if (updateNodeDataTimer) clearTimeout(updateNodeDataTimer);
      updateNodeDataTimer = setTimeout(() => {
        get().takeSnapshot();
        updateNodeDataTimer = null;
      }, 500);
    },

    updateEdgeData: (id, patch) => {
      set((state) => ({
        edges: state.edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...(edge.data || {}), ...(patch || {}) } }
            : edge
        ),
      }));
      get().takeSnapshot();
    },

    clearCanvas: () => {
      const init = createInitialState();
      set({
        nodes: init.nodes,
        edges: init.edges,
        history: { past: [], future: [] },
        selectedNode: null,
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

      const collectedEffects: { variableName: string; op: EffectOp; value: any }[] = [];
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

        const data: any = n.data || {};

        if (n.type === CustomNodeType.Variable || n.type === 'variableNode') {
          if (!data.variableName || !data.operation) break;
          collectedEffects.push({
            variableName: data.variableName,
            op: data.operation,
            value: data.value ?? '',
          });
        } else {
          collectedEffects.push({
            variableName: 'score',
            op: data.operation || 'add',
            value: data.value ?? 0,
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

      set({ nodes: nextNodes, edges: nextEdges });
      get().takeSnapshot();
    },

    setSelectedNode: (node) => set({ selectedNode: node }),

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
      set({
        nodes: structuredClone(previous.nodes),
        edges: structuredClone(previous.edges),
        selectedNode: null,
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
      set({
        nodes: structuredClone(next.nodes),
        edges: structuredClone(next.edges),
        selectedNode: null,
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
    useCanvasStore.setState({ history: { past: [], future: [] }, selectedNode: null });
  }),

  storeEvents.on('AUTOSAVE_RESTORE', ({ nodes, edges }) => {
    useCanvasStore.getState().setNodes(nodes);
    useCanvasStore.getState().setEdges(edges);
  }),
];

export function unsubscribeCanvasEvents() {
  unsubscribers.forEach((unsub) => unsub());
}

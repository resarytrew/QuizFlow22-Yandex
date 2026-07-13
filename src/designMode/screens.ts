import type { Edge, Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../types';

const SCREEN_NODE_TYPES = new Set<string>([
  CustomNodeType.Start,
  CustomNodeType.Question,
  CustomNodeType.MultipleChoice,
  CustomNodeType.Result,
  CustomNodeType.Info,
  CustomNodeType.CollectInfo,
  CustomNodeType.Feedback,
  CustomNodeType.Timeline,
  CustomNodeType.Matching,
  CustomNodeType.TextInput,
  CustomNodeType.Achievement,
  CustomNodeType.Allocator,
  CustomNodeType.Progression,
  CustomNodeType.Dialogue,
]);

export interface DesignModeScreen {
  id: string;
  label: string;
  type: string;
  reachable: boolean;
}

function screenLabel(node: Node<NodeData>, index: number): string {
  const data = node.data ?? {};
  const title = data.title || data.label;
  return typeof title === 'string' && title.trim()
    ? title.trim()
    : `Screen ${index + 1}`;
}

function isScreenNode(node: Node<NodeData>): boolean {
  return SCREEN_NODE_TYPES.has(String(node.type));
}

export function getDesignModeScreens(
  nodes: Node<NodeData>[],
  edges: Edge[],
): DesignModeScreen[] {
  const screenNodes = nodes.filter(isScreenNode);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    if (!edge.source || !edge.target) return;
    const group = outgoing.get(edge.source) ?? [];
    group.push(edge);
    outgoing.set(edge.source, group);
  });

  const startNode =
    nodes.find((node) => node.type === CustomNodeType.Start)
    ?? screenNodes[0]
    ?? null;
  const ordered: Node<NodeData>[] = [];
  const visited = new Set<string>();

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = byId.get(nodeId);
    if (!node) return;

    if (isScreenNode(node)) ordered.push(node);

    const nextEdges = [...(outgoing.get(nodeId) ?? [])].sort((left, right) =>
      String(left.sourceHandle ?? '').localeCompare(String(right.sourceHandle ?? '')),
    );
    nextEdges.forEach((edge) => visit(edge.target));
  };

  if (startNode) visit(startNode.id);

  const orderedIds = new Set(ordered.map((node) => node.id));
  const orphanScreens = screenNodes.filter((node) => !orderedIds.has(node.id));
  const combined = [...ordered, ...orphanScreens];

  return combined.map((node, index) => ({
    id: node.id,
    label: screenLabel(node, index),
    type: String(node.type ?? ''),
    reachable: orderedIds.has(node.id),
  }));
}

export function getAdjacentScreenIds(screens: DesignModeScreen[], currentNodeId: string | null) {
  if (screens.length === 0) {
    return { current: null, previous: null, next: null };
  }

  const currentIndex = Math.max(0, screens.findIndex((screen) => screen.id === currentNodeId));
  const current = screens[currentIndex] ?? screens[0];

  return {
    current: current.id,
    previous: screens[currentIndex - 1]?.id ?? null,
    next: screens[currentIndex + 1]?.id ?? null,
  };
}

import dagre from 'dagre';
import { Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import { NodeData } from '../../types';
import { DEFAULT_W, DEFAULT_H } from './constants';

type FlowNode<T = NodeData> = Node<T>;

interface NodeWithDimensions extends FlowNode<NodeData> {
    width?: number;
    height?: number;
    position: { x: number; y: number };
}

export function getLayoutedElements(
    nodes: FlowNode<NodeData>[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
): { nodes: FlowNode<NodeData>[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph({ directed: true });
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 100,
        marginx: 50,
        marginy: 50,
    });

    nodes.forEach((n) => {
        const node = n as NodeWithDimensions;
        g.setNode(n.id, {
            width: node.width ?? DEFAULT_W,
            height: node.height ?? DEFAULT_H,
        });
    });

    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);

    return {
        nodes: nodes.map((n) => {
            const point = g.node(n.id);
            const node = n as NodeWithDimensions;
            if (!point) return n;
            const { x, y } = point;
            return {
                ...n,
                targetPosition: direction === 'LR' ? Position.Left : Position.Top,
                sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
                position: { x: x - (node.width || DEFAULT_W) / 2, y: y - (node.height || DEFAULT_H) / 2 },
            };
        }),
        edges,
    };
}

import { useCallback } from 'react';
import type { Node, Edge, Connection, OnConnectStartParams } from 'reactflow';
import { CustomNodeType, NodeData } from '../../../types';
import { DEFAULT_W, DEFAULT_H } from '../constants';
import { createNewNode } from '../createNewNode';
import { readDraggedNodeType } from '../nodeDragData';

type FlowNode<T = NodeData> = Node<T>;

interface UseCanvasInteractionProps {
    reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
    isCanvasLocked: boolean;
    connectingFrom: { nodeId: string; handleId?: string | null } | null;
    quickAddMenu: { screen: { x: number; y: number }; local: { x: number; y: number } } | null;
    edges: Edge[];
    setMenu: React.Dispatch<React.SetStateAction<{ id: string; top: number; left: number } | null>>;
    setEdgeMenu: React.Dispatch<React.SetStateAction<{ id: string; top: number; left: number } | null>>;
    setQuickAddMenu: React.Dispatch<React.SetStateAction<{ screen: { x: number; y: number }; local: { x: number; y: number } } | null>>;
    setConnectingFrom: React.Dispatch<React.SetStateAction<{ nodeId: string; handleId?: string | null } | null>>;
    setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedNode: (node: FlowNode<NodeData> | null) => void;
    addNode: (node: FlowNode<NodeData>) => void;
    onEditEdgeLabel: (edgeId: string, currentLabel: string) => void;
    onConnect: (connection: Connection) => void;
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    getNode: (id: string) => FlowNode<NodeData> | undefined;
    setPreviewMode: (active: boolean, nodeId?: string) => void;
}

export function useCanvasInteraction({
    reactFlowWrapper,
    isCanvasLocked,
    connectingFrom,
    quickAddMenu,
    edges,
    setMenu,
    setEdgeMenu,
    setQuickAddMenu,
    setConnectingFrom,
    setIsConnecting,
    setSelectedNode,
    addNode,
    onEditEdgeLabel,
    onConnect,
    screenToFlowPosition,
    getNode,
    setPreviewMode,
}: UseCanvasInteractionProps) {

    const toLocal = useCallback((e: { clientX: number; clientY: number }) => {
        const el = reactFlowWrapper.current;
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }, [reactFlowWrapper]);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (isCanvasLocked) return;
            const type = readDraggedNodeType(event.dataTransfer);
            if (!type) return;
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNode(createNewNode(type, { x: position.x - DEFAULT_W / 2, y: position.y - DEFAULT_H / 2 }));
        },
        [addNode, screenToFlowPosition, isCanvasLocked, DEFAULT_W, DEFAULT_H]
    );

    const onDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = isCanvasLocked ? 'none' : 'move';
        },
        [isCanvasLocked]
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent) => {
            if (isCanvasLocked) return;
            event.preventDefault();
            setQuickAddMenu({ screen: { x: event.clientX, y: event.clientY }, local: toLocal(event) });
        },
        [isCanvasLocked, toLocal, setQuickAddMenu]
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: FlowNode) => {
            if (isCanvasLocked) return;
            event.preventDefault();
            if (node.type === CustomNodeType.Start) return;
            const local = toLocal(event);
            setMenu({ id: node.id, top: local.y, left: local.x });
        },
        [isCanvasLocked, toLocal, setMenu]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            if (isCanvasLocked) return;
            event.preventDefault();
            const local = toLocal(event);
            setEdgeMenu({ id: edge.id, top: local.y, left: local.x });
        },
        [isCanvasLocked, toLocal, setEdgeMenu]
    );

    const onEdgeDoubleClick = useCallback(
        (_: React.MouseEvent, edge: Edge) => {
            if (isCanvasLocked) return;
            onEditEdgeLabel(edge.id, (edge.label as string) || '');
        },
        [onEditEdgeLabel, isCanvasLocked]
    );

    const isValidConnection = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return false;
            if (connection.source === connection.target) return false;

            const isDuplicate = edges.some(
                (e) =>
                    e.source === connection.source &&
                    e.target === connection.target &&
                    (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
                    (e.targetHandle ?? null) === (connection.targetHandle ?? null)
            );

            return !isDuplicate;
        },
        [edges]
    );

    const handleQuickAdd = useCallback(
        (nodeType: CustomNodeType) => {
            if (!quickAddMenu) return;
            const pos = screenToFlowPosition(quickAddMenu.screen);
            const newNode = createNewNode(nodeType, { x: pos.x - DEFAULT_W / 2, y: pos.y - DEFAULT_H / 2 });
            addNode(newNode);
            if (connectingFrom) {
                const connection = {
                    source: connectingFrom.nodeId,
                    target: newNode.id,
                    sourceHandle: connectingFrom.handleId ?? null,
                    targetHandle: null,
                };
                if (!isValidConnection(connection)) {
                    setConnectingFrom(null);
                    setQuickAddMenu(null);
                    return;
                }
                onConnect(connection);
                setConnectingFrom(null);
            }
            setQuickAddMenu(null);
        },
        [quickAddMenu, screenToFlowPosition, addNode, connectingFrom, onConnect, isValidConnection, setConnectingFrom, setQuickAddMenu, DEFAULT_W, DEFAULT_H]
    );

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: FlowNode) => {
            setSelectedNode(node as FlowNode<NodeData>);
            setMenu(null);
            setEdgeMenu(null);
            setQuickAddMenu(null);
        },
        [setSelectedNode, setMenu, setEdgeMenu, setQuickAddMenu]
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setMenu(null);
        setEdgeMenu(null);
        setQuickAddMenu(null);
        setConnectingFrom(null);
    }, [setSelectedNode, setMenu, setEdgeMenu, setQuickAddMenu, setConnectingFrom]);

    const handleConnectStart = useCallback(
        (_: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
            if (params.nodeId) {
                setConnectingFrom({ nodeId: params.nodeId, handleId: params.handleId });
            }
            setIsConnecting(true);
        },
        [setConnectingFrom, setIsConnecting]
    );

    const handleConnectEnd = useCallback(() => {
        if (!quickAddMenu) {
            setConnectingFrom(null);
        }
        setIsConnecting(false);
    }, [quickAddMenu, setConnectingFrom, setIsConnecting]);

    const handleDuplicate = useCallback(
        (id: string) => {
            const n = getNode(id) as FlowNode<NodeData> | undefined;
            if (n) {
                const newNode: FlowNode<NodeData> = {
                    ...n,
                    id: `${n.type}-${Date.now()}`,
                    position: { x: n.position.x + 50, y: n.position.y + 50 },
                    data: JSON.parse(JSON.stringify(n.data)),
                    selected: false,
                };
                addNode(newNode);
            }
        },
        [getNode, addNode]
    );

    const handleEditFromMenu = useCallback(
        (id: string) => {
            const n = getNode(id);
            if (n) setSelectedNode(n as FlowNode<NodeData>);
        },
        [getNode, setSelectedNode]
    );

    const handlePreviewFromNode = useCallback(
        (id: string) => {
            setPreviewMode(true, id);
        },
        [setPreviewMode]
    );

    return {
        onDrop,
        onDragOver,
        onPaneContextMenu,
        onNodeContextMenu,
        onEdgeContextMenu,
        onEdgeDoubleClick,
        handleQuickAdd,
        onNodeClick,
        onPaneClick,
        isValidConnection,
        handleConnectStart,
        handleConnectEnd,
        handleDuplicate,
        handleEditFromMenu,
        handlePreviewFromNode,
    };
}

import { copyFragment, pasteFragment } from '../../../utils/editorFragment';
import { useEffect, useRef } from 'react';
import type { Edge, Node } from 'reactflow';
import toast from 'react-hot-toast';
import { CustomNodeType, NodeData } from '../../../types';

type FlowNode<T = NodeData> = Node<T>;

interface UseKeyboardShortcutsProps {
    allNodes?: FlowNode<NodeData>[];
    allEdges?: Edge[];
    applyGraph?: (nodes: FlowNode<NodeData>[], edges: Edge[]) => void;
    visibleNodes: FlowNode<NodeData>[];
    visibleEdges: Edge[];
    selectedNodeIds: readonly string[];
    selectedEdgeIds: readonly string[];
    isCanvasLocked: boolean;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    undo: () => void;
    redo: () => void;
    addNode: (node: FlowNode<NodeData>) => void;
    selectNodes: (nodeIds: readonly string[], primaryId?: string) => void;
    selectAllVisibleNodes: () => void;
}

export function useKeyboardShortcuts({
    allNodes, allEdges, applyGraph,
    visibleNodes,
    visibleEdges,
    selectedNodeIds,
    selectedEdgeIds,
    isCanvasLocked,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    addNode,
    selectNodes,
    selectAllVisibleNodes,
}: UseKeyboardShortcutsProps) {
    const clipboardRef = useRef<ReturnType<typeof copyFragment>>({nodes:[],edges:[]});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const el = document.activeElement as HTMLElement | null;
            const isTyping = el && (['INPUT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable);
            if ((e.ctrlKey || e.metaKey) && !isTyping) {
                if (e.repeat) return;
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                    return;
                }
                if (e.key.toLowerCase() === 'c') {
                    if (isCanvasLocked) return;
                    e.preventDefault();
                    const selectedIds = new Set(selectedNodeIds);
                    const selected = visibleNodes.filter(
                        (node) => selectedIds.has(node.id) && node.type !== CustomNodeType.Start,
                    );
                    if (selected.length > 0) {
                        clipboardRef.current = copyFragment(allNodes || visibleNodes, allEdges || visibleEdges, selected.map(n=>n.id));
                        toast.success(`Скопировано: ${selected.length} ${selected.length === 1 ? 'нода' : 'нод(ы)'}`);
                    }
                    return;
                }
                if (e.key.toLowerCase() === 'v') {
                    if (isCanvasLocked || clipboardRef.current.nodes.length === 0) return;
                    e.preventDefault();
                    const fragment = pasteFragment(clipboardRef.current, visibleNodes.find(n=>selectedNodeIds.includes(n.id))?.data.parentId);
                    const pastedNodeIds = fragment.nodes.map(n=>n.id);
                    if(applyGraph) applyGraph([...(allNodes || visibleNodes),...fragment.nodes],[...(allEdges || visibleEdges),...fragment.edges]);
                    else fragment.nodes.forEach(addNode);
                    selectNodes(pastedNodeIds, pastedNodeIds[0]);
                    toast.success(`Вставлено: ${clipboardRef.current.nodes.length} ${clipboardRef.current.nodes.length === 1 ? 'нода' : 'нод(ы)'}`);
                    return;
                }
                if (e.key.toLowerCase() === 'a') {
                    if (isCanvasLocked) return;
                    e.preventDefault();
                    selectAllVisibleNodes();
                    return;
                }
            }
            if (isTyping || e.repeat) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isCanvasLocked) {
                e.preventDefault();
                const selectedNodeIdSet = new Set(selectedNodeIds);
                const selectedEdgeIdSet = new Set(selectedEdgeIds);
                const toDelete = visibleNodes.filter(
                    (node) => selectedNodeIdSet.has(node.id) && node.type !== CustomNodeType.Start,
                );
                const deletedNodeIds = new Set(toDelete.map((n) => n.id));
                const fragment = copyFragment(allNodes || visibleNodes, allEdges || visibleEdges, [...deletedNodeIds]);
                const removal = new Set(fragment.nodes.map(n=>n.id));
                if(applyGraph) applyGraph((allNodes || visibleNodes).filter(n=>!removal.has(n.id)), (allEdges || visibleEdges).filter(e=>!removal.has(e.source)&&!removal.has(e.target)&&!selectedEdgeIdSet.has(e.id)));
                else {
                  toDelete.forEach(n=>deleteNode(n.id));
                  visibleEdges.filter(e=>selectedEdgeIdSet.has(e.id)&&!deletedNodeIds.has(e.source)&&!deletedNodeIds.has(e.target)).forEach(e=>deleteEdge(e.id));
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [allNodes, allEdges, applyGraph, visibleNodes, visibleEdges, selectedNodeIds, selectedEdgeIds, deleteNode, deleteEdge, isCanvasLocked, undo, redo, addNode, selectNodes, selectAllVisibleNodes]);
}

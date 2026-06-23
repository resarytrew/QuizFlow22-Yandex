import { useEffect, useRef } from 'react';
import type { Node } from 'reactflow';
import toast from 'react-hot-toast';
import { CustomNodeType, NodeData } from '../../../types';

type FlowNode<T = any> = Node<T>;

interface UseKeyboardShortcutsProps {
    visibleNodes: any[];
    visibleEdges: any[];
    isCanvasLocked: boolean;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
    undo: () => void;
    redo: () => void;
    addNode: (node: FlowNode<NodeData>) => void;
}

export function useKeyboardShortcuts({
    visibleNodes,
    visibleEdges,
    isCanvasLocked,
    deleteNode,
    deleteEdge,
    undo,
    redo,
    addNode,
}: UseKeyboardShortcutsProps) {
    const clipboardRef = useRef<FlowNode<NodeData>[]>([]);

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
                    const selected = visibleNodes.filter((n: any) => n.selected && n.type !== CustomNodeType.Start);
                    if (selected.length > 0) {
                        clipboardRef.current = selected.map((n: any) => ({
                            ...n,
                            data: JSON.parse(JSON.stringify(n.data)),
                        }));
                        toast.success(`Скопировано: ${selected.length} ${selected.length === 1 ? 'нода' : 'нод(ы)'}`);
                    }
                    return;
                }
                if (e.key.toLowerCase() === 'v') {
                    if (isCanvasLocked || clipboardRef.current.length === 0) return;
                    e.preventDefault();
                    const offset = { x: 40, y: 40 };
                    clipboardRef.current.forEach((n: any, i: number) => {
                        const newNode: FlowNode<NodeData> = {
                            ...n,
                            id: `${n.type}-${Date.now()}-${i}`,
                            position: {
                                x: n.position.x + offset.x,
                                y: n.position.y + offset.y + i * 30,
                            },
                            selected: false,
                        };
                        addNode(newNode);
                    });
                    toast.success(`Вставлено: ${clipboardRef.current.length} ${clipboardRef.current.length === 1 ? 'нода' : 'нод(ы)'}`);
                    return;
                }
            }
            if (isTyping || e.repeat) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isCanvasLocked) {
                e.preventDefault();
                const toDelete = visibleNodes.filter((n) => n.selected && n.type !== CustomNodeType.Start);
                const deletedNodeIds = new Set(toDelete.map((n) => n.id));
                toDelete.forEach((n) => deleteNode(n.id));
                visibleEdges
                    .filter((ed) => ed.selected && !deletedNodeIds.has(ed.source) && !deletedNodeIds.has(ed.target))
                    .forEach((ed) => deleteEdge(ed.id));
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [visibleNodes, visibleEdges, deleteNode, deleteEdge, isCanvasLocked, undo, redo, addNode]);
}

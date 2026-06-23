import React, { useState, useMemo } from 'react';
import * as ReactFlowPkg from 'reactflow';
import type { Node, Edge } from 'reactflow';
import { CustomNodeType, NodeData } from '../../types';
import { Icons } from './Icons';

const { useViewport } = ReactFlowPkg as any;

type FlowNode<T = any> = Node<T>;

interface StatusBarProps {
    nodes: FlowNode<NodeData>[];
    edges: Edge[];
}

export const StatusBar: React.FC<StatusBarProps> = ({ nodes, edges }) => {
    const { zoom } = useViewport();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const stats = useMemo(() => {
        const hasStart = nodes.some((n) => n.type === CustomNodeType.Start);
        const hasResult = nodes.some((n) => n.type === CustomNodeType.Result);
        const selectedCount = nodes.filter((n) => n.selected).length;

        return {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            selectedCount,
            isValid: hasStart && hasResult,
            issues: !hasResult ? 'Добавьте узел "Результат"' : null,
        };
    }, [nodes, edges]);

    if (isCollapsed) {
        return (
            <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center justify-center p-2 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg hover:bg-white text-slate-600 transition-all"
                title="Показать статистику"
            >
                <Icons.Info />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg text-sm animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 text-indigo-600">
                        <Icons.Layers />
                    </div>
                    <span className="font-medium">{stats.nodeCount}</span>
                    <span className="text-slate-400">узлов</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-600">
                        <Icons.Connection />
                    </div>
                    <span className="font-medium">{stats.edgeCount}</span>
                    <span className="text-slate-400">связей</span>
                </div>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="text-xs text-slate-400 font-mono">
                {Math.round(zoom * 100)}%
            </div>
            <div className="w-px h-4 bg-slate-200" />
            {stats.selectedCount > 0 && (
                <>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">
                        <span>Выбрано: {stats.selectedCount}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                </>
            )}
            <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    stats.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
            >
                {stats.isValid ? <Icons.Check /> : <Icons.Warning />}
                <span>{stats.isValid ? 'Готов' : stats.issues}</span>
            </div>
            <button
                onClick={() => setIsCollapsed(true)}
                className="ml-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title="Скрыть статистику"
            >
                <Icons.ChevronUp />
            </button>
        </div>
    );
};

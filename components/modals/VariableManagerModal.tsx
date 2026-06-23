
import React, { useMemo } from 'react';
import * as ReactFlow from 'reactflow';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CustomNodeType, NodeData, VariableNodeData, ConditionNodeData } from '../../types.ts';

const { useReactFlow } = ReactFlow as any;
type Node<T = any> = any;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type VariableUsage = {
    sets: string[];
    reads: string[];
    displayName: string;
}

const VariableManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const nodes = useCanvasStore(s => s.nodes);
    const { setCenter, getNode, setNodes } = useReactFlow();

    const variableMap = useMemo(() => {
        const map: Record<string, VariableUsage> = {};

        const addUsage = (varName: string, nodeId: string, type: 'set' | 'read', displayName?: string) => {
            if (!varName) return;
            if (!map[varName]) {
                map[varName] = { sets: [], reads: [], displayName: '' };
            }
            if (type === 'set' && !map[varName].sets.includes(nodeId)) {
                map[varName].sets.push(nodeId);
            }
            if (type === 'read' && !map[varName].reads.includes(nodeId)) {
                map[varName].reads.push(nodeId);
            }
            if (displayName && !map[varName].displayName) {
                map[varName].displayName = displayName;
            }
        };

        addUsage('score', '', 'read'); // Always track score

        nodes.forEach(node => {
            if (node.type === CustomNodeType.Variable) {
                const data = node.data as VariableNodeData;
                addUsage(data.variableName, node.id, 'set', data.displayName);
            } else if (node.type === CustomNodeType.Condition) {
                const data = node.data as ConditionNodeData;
                addUsage(data.variable, node.id, 'read');
            }
        });

        return map;
    }, [nodes]);
    
    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

    const handleJumpToNode = (nodeId: string) => {
        const node = getNode(nodeId);
        if (node) {
            setCenter(node.position.x + (node.width || 0) / 2, node.position.y + (node.height || 0) / 2, {
                zoom: 1.2,
                duration: 500
            });
            // Highlight the node
            setNodes((nds: Array<{ id: string; selected?: boolean; [key: string]: unknown }>) => nds.map(n => ({...n, selected: n.id === nodeId})));
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white border border-gray-200/75 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-5 border-b border-gray-200 shrink-0">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-manrope font-semibold text-gray-800">Менеджер переменных</h2>
                        <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Обзор всех переменных, используемых в квизе.</p>
                </header>

                <main className="flex-grow p-6 overflow-y-auto">
                    {Object.keys(variableMap).length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">В этом квизе переменные еще не используются.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* FIX: Added explicit type annotation to the map callback parameter to resolve 'unknown' type errors. */}
                            {Object.entries(variableMap).map(([varName, usage]: [string, VariableUsage]) => {
                                return (
                                    <div key={varName} className="bg-gray-50 border border-gray-200/80 rounded-lg p-4">
                                        <div className="flex items-baseline gap-3">
                                            <h3 className="font-mono font-bold text-lg text-indigo-700">{varName}</h3>
                                            {usage.displayName && <p className="text-sm text-gray-600">({usage.displayName})</p>}
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <h4 className="font-semibold text-gray-600 mb-2">Изменяется в:</h4>
                                                {usage.sets.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {usage.sets.map(nodeId => {
                                                            const node: Node<NodeData> | undefined = nodeMap.get(nodeId);
                                                            return <li key={nodeId}><button onClick={() => handleJumpToNode(nodeId)} className="text-blue-600 hover:underline"> - {node?.data.label || nodeId}</button></li>
                                                        })}
                                                    </ul>
                                                ) : <p className="text-xs text-gray-500 italic">Нигде</p>}
                                            </div>
                                             <div>
                                                <h4 className="font-semibold text-gray-600 mb-2">Проверяется в:</h4>
                                                 {usage.reads.length > 0 ? (
                                                    <ul className="space-y-1">
                                                         {usage.reads.map(nodeId => {
                                                            const node: Node<NodeData> | undefined = nodeMap.get(nodeId);
                                                            return <li key={nodeId}><button onClick={() => handleJumpToNode(nodeId)} className="text-blue-600 hover:underline"> - {node?.data.label || nodeId}</button></li>
                                                        })}
                                                    </ul>
                                                ) : <p className="text-xs text-gray-500 italic">Нигде</p>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default VariableManagerModal;

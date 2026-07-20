
import React, { useState, useMemo, useEffect } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useReactFlow } from 'reactflow';

const CanvasSearch: React.FC = () => {
    const nodes = useCanvasStore(s => s.nodes);
    const selectSingleNode = useCanvasStore(s => s.selectSingleNode);
    const { setCenter } = useReactFlow();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const filteredNodes = useMemo(() => {
        if (!searchTerm) return [];
        return nodes.filter(node => 
            node.data.label && node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, nodes]);
    
    useEffect(() => {
        setActiveIndex(0);
    }, [filteredNodes]);

    const handleSelectNode = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            selectSingleNode(node.id);
            setCenter(node.position.x + (node.width || 0) / 2, node.position.y + (node.height || 0) / 2, {
                zoom: 1.5,
                duration: 600,
            });
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, filteredNodes.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            if (filteredNodes[activeIndex]) {
                handleSelectNode(filteredNodes[activeIndex].id);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className="absolute top-4 right-4 z-10">
            {isOpen ? (
                <div className="relative">
                    <input
                        id="canvas-node-search"
                        name="canvas-node-search"
                        type="text"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Найти узел..."
                        className="w-64 bg-white border border-gray-300 rounded-lg py-2 pl-4 pr-10 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    />
                    {filteredNodes.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {filteredNodes.map((node, index) => (
                                <button
                                    key={node.id}
                                    onClick={() => handleSelectNode(node.id)}
                                    className={`w-full text-left px-4 py-2 text-sm ${index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {node.data.label} <span className="text-xs text-gray-400">({node.type})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 bg-white rounded-full shadow-md border border-gray-200/80 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    title="Найти узел"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
            )}
        </div>
    );
};

export default CanvasSearch;

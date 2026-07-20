
import React from 'react';
import { selectPrimarySelectedNode, useCanvasStore } from '../store/useCanvasStore';
import { useUIStore } from '../store/useUIStore';
import { useAIStore, type AISuggestion } from '../store/useAIStore';
import toast from 'react-hot-toast';
import { callOpenRouter, AI_MODEL, extractJsonArray } from '../services/openRouterClient';
import { CustomNodeType, NodeData } from '../types';
import type { Node } from 'reactflow';

// Helper to create node
const createNewNodeFromAI = (type: CustomNodeType, position: { x: number, y: number }, data: Partial<NodeData>): Node<NodeData> => {
    return {
        id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        position,
        data: data as NodeData
    };
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isCustomNodeType(value: unknown): value is CustomNodeType {
    return typeof value === 'string' && Object.values(CustomNodeType).includes(value as CustomNodeType);
}

function getTextField(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
}

function toSuggestion(value: unknown): AISuggestion | null {
    if (!isRecord(value) || !isRecord(value.newNode) || !isRecord(value.newNode.data)) return null;
    if (!isCustomNodeType(value.newNode.type)) return null;
    const data = { ...value.newNode.data } as Partial<NodeData>;
    const dataRecord = data as Record<string, unknown>;
    const title = getTextField(value, 'title') || getTextField(dataRecord, 'label') || 'Новый узел';
    if (!getTextField(dataRecord, 'label') && !getTextField(dataRecord, 'title')) {
        data.label = title;
    }
    return {
        title,
        description: getTextField(value, 'description') || '',
        newNode: { type: value.newNode.type, data },
    };
}

const AIAssistantPanel: React.FC = () => {
    const nodes = useCanvasStore(s => s.nodes);
    const addNode = useCanvasStore(s => s.addNode);
    const onConnect = useCanvasStore(s => s.onConnect);
    const selectedNode = useCanvasStore(selectPrimarySelectedNode);
    const isAILoading = useAIStore(s => s.isAILoading);
    const aiSuggestions = useAIStore(s => s.aiSuggestions);
    const setAILoading = useAIStore(s => s.setAILoading);
    const setAISuggestions = useAIStore(s => s.setAISuggestions);
    const closeAIAssistantPanel = useUIStore(s => s.closeAIAssistantPanel);
    const setWizardOpen = useUIStore(s => s.setWizardOpen);

    const handleContinueBranch = async () => {
        if (!selectedNode) return;
        setAILoading(true);
        try {
            // Simplify graph context - extract mainly labels and questions to give context
            const simplifiedContext = nodes.map(n => {
                const data = n.data as Record<string, unknown>;
                return {
                    type: n.type,
                    content: getTextField(data, 'question') || getTextField(data, 'title') || getTextField(data, 'label'),
                };
            }).slice(-5); // Only take last 5 nodes for context to save tokens

            const selectedRecord = selectedNode.data as Record<string, unknown>;
            const selectedNodeData: Record<string, unknown> = { label: selectedNode.data.label };
            const question = getTextField(selectedRecord, 'question');
            const title = getTextField(selectedRecord, 'title');
            const description = getTextField(selectedRecord, 'description');
            if (question) selectedNodeData.question = question;
            if (title) selectedNodeData.title = title;
            if (description) selectedNodeData.description = description;
            if (Array.isArray(selectedRecord.answers)) {
                selectedNodeData.answers = selectedRecord.answers
                    .map((answer) => isRecord(answer) ? getTextField(answer, 'text') : undefined)
                    .filter((answer): answer is string => Boolean(answer));
            }

            const prompt = `Ты — креативный сценарист и методолог образовательных квизов.
Твоя задача — предложить 3-4 варианта продолжения ветки квиза, исходя из контекста.

КОНТЕКСТ (предыдущие узлы):
${JSON.stringify(simplifiedContext)}

ВЫБРАННЫЙ УЗЕЛ (к которому создаем продолжение):
${JSON.stringify({ type: selectedNode.type, data: selectedNodeData })}

ТРЕБОВАНИЯ:
1. **ЗАПРЕЩЕНО** использовать заглушки вроде "Текст вопроса", "Вариант 1", "Lorem Ipsum".
2. Ты должен написать **РЕАЛЬНЫЙ, ГОТОВЫЙ К ПУБЛИКАЦИИ** контент: конкретные вопросы, правильные и неправильные ответы, обучающие пояснения.
3. Контент должен логически продолжать выбранный узел.
4. Используй разные типы узлов (не только QuestionNode).

ФОРМАТ ОТВЕТА (JSON):
[
    {
      "title": "Краткое название действия (напр: 'Проверка знаний')",
      "description": "Методическое обоснование (напр: 'Закрепляем материал через практику')",
      "newNode": {
        "type": "questionNode", // или infoNode, feedbackNode, multipleChoiceNode
        "data": { 
           "label": "Тема вопроса (кратко)",
           "question": "Полный текст вопроса...",
           "answers": [
               {"id": "a1", "text": "Правильный ответ"},
               {"id": "a2", "text": "Неправильный ответ"}
           ],
           // Если это InfoNode/FeedbackNode:
           // "title": "Заголовок",
           // "description": "Полезный текст..."
           // "message": "Текст обратной связи..."
        }
      }
    }
]`;
            
            const responseText = await callOpenRouter(AI_MODEL, prompt, true);
            const jsonText = extractJsonArray(responseText);

            if (!jsonText) throw new Error("Ответ AI не содержит валидный JSON массив.");
            
            const rawSuggestions: unknown = JSON.parse(jsonText);
            if (!Array.isArray(rawSuggestions)) throw new Error("Ответ AI должен быть JSON-массивом.");

            const suggestions: AISuggestion[] = rawSuggestions
                .map(toSuggestion)
                .filter((s): s is AISuggestion => s !== null);

            setAISuggestions(suggestions);

        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Ошибка AI.');
        } finally {
            setAILoading(false);
        }
    };

    const handleAddSuggestion = (suggestion: AISuggestion) => {
        if (!selectedNode) return;
        const position = {
            x: selectedNode.position.x + (selectedNode.width || 250) + 80,
            y: selectedNode.position.y
        };
        const newNode = createNewNodeFromAI(suggestion.newNode.type as CustomNodeType, position, suggestion.newNode.data);
        addNode(newNode);
        onConnect({ source: selectedNode.id, sourceHandle: null, target: newNode.id, targetHandle: null });
        toast.success(`Добавлен узел: ${suggestion.title}`);
    };

    return (
        <aside className="w-full h-full bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 relative transition-all duration-300 hover:shadow-purple-500/20">
            {/* Header */}
            <div className="relative p-4 border-b border-white/10 bg-white/5 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-1.73c.34.6.73 1.26.73 2a2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-.74.4-1.39 1-1.73V14a5 5 0 0 0-5-5v2.73c.6.34 1 .99 1 1.73a2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-.74.4-1.39 1-1.73V9a5 5 0 0 0-5 5v3.27c.6.34 1 .99 1 1.73a2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-.74.4-1.39 1-1.73H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                AI Ассистент
                                <span className="px-2 py-0.5 bg-purple-500/30 border border-purple-400/30 rounded-full text-[10px] font-bold text-purple-200">
                                    BETA
                                </span>
                            </h2>
                            <p className="text-xs text-purple-300">
                                Нейросеть поможет
                            </p>
                        </div>
                    </div>
                    <button onClick={closeAIAssistantPanel} className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            <div className="relative flex-grow p-4 overflow-y-auto custom-scrollbar-dark">
                {isAILoading ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-purple-200 text-sm font-medium animate-pulse text-center">
                            Думаю...
                        </p>
                    </div>
                ) : selectedNode ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">Контекст</h3>
                            </div>
                            <p className="text-sm text-white font-medium">{selectedNode.data.label}</p>
                        </div>
                        
                        {/* Branch Continue */}
                        <button onClick={handleContinueBranch} className="group w-full relative px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg overflow-hidden flex flex-col items-center gap-2">
                            <span className="relative flex items-center justify-center gap-2">⚡ Продолжить ветку</span>
                        </button>

                        {/* Suggestions List */}
                        <div className="space-y-3">
                            {aiSuggestions.map((s, i) => (
                                <button key={i} onClick={() => handleAddSuggestion(s)} className="group w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:border-purple-500/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                        <p className="font-bold text-white text-sm group-hover:text-purple-300">{s.title}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 pl-3.5 leading-relaxed line-clamp-2">{s.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-2">Генератор</h3>
                            
                            <button 
                                onClick={() => setWizardOpen(true)}
                                className="w-full px-4 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg"
                            >
                                <span className="text-2xl">🧙‍♂️</span>
                                <div className="text-left">
                                    <div>AI Конструктор (Wizard)</div>
                                    <div className="text-xs font-normal opacity-80">Пошаговое создание</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar-dark::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
                    background: rgba(168, 85, 247, 0.5);
                }
            `}</style>
        </aside>
    );
};

export default AIAssistantPanel;

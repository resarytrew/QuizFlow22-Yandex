import React, { useState, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import BaseNode from './BaseNode.tsx';
import { Answer, MultipleChoiceNodeData } from '../../types.ts';

const MULTIPLE_CHOICE_ICON = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="m9 14 2 2 4-4"/>
    </svg>
);

const MultipleChoiceNode: React.FC<NodeProps<MultipleChoiceNodeData>> = (props) => {
    const { data, selected } = props;
    const { 
        question, 
        answers = [], 
        imageUrl, 
        correctOptions = []
    } = data;
    const [isZoomed, setIsZoomed] = useState(false);

    const correctCount = correctOptions.length;
    const totalAnswers = answers.length;

    // Генерируем выходы: от максимума к нулю
    const outputs = useMemo(() => {
        if (correctCount === 0) {
            return [{ id: 'next', count: 0, label: '→', fullLabel: 'Далее', color: '#6b7280' }];
        }

        const result = [];
        for (let i = correctCount; i >= 0; i--) {
            result.push({
                id: `correct-${i}`,
                count: i,
                label: i.toString(),
                fullLabel: i === correctCount ? 'Всё верно' : i === 0 ? 'Неверно' : `${i} из ${correctCount}`,
                color: getColorForCount(i, correctCount)
            });
        }
        return result;
    }, [correctCount]);

    return (
        <>
            <BaseNode 
                title="Множ. выбор" 
                icon={MULTIPLE_CHOICE_ICON} 
                nodeProps={props} 
                hasOutput={false} 
                color="purple"
            >
                {/* Изображение */}
                {imageUrl && (
                    <div className="mb-2 p-1 bg-gray-100 rounded-md">
                        <img
                            src={imageUrl}
                            alt="Node content"
                            className="w-full h-auto object-cover rounded-md cursor-pointer max-h-24"
                            onClick={() => setIsZoomed(true)}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                )}
                
                {/* Вопрос */}
                <div className="text-gray-800 text-sm font-medium mb-2 line-clamp-2" title={question}>
                    {question || 'Вопрос...'}
                </div>

                {/* Компактный список вариантов - 2 колонки */}
                <div className="grid grid-cols-2 gap-1 mb-3">
                    {answers.slice(0, 6).map((ans: Answer) => (
                        <div 
                            key={ans.id} 
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] truncate ${
                                correctOptions.includes(ans.id) 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}
                            title={ans.text}
                        >
                            <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${
                                correctOptions.includes(ans.id)
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white border-gray-300'
                            }`}>
                                {correctOptions.includes(ans.id) && (
                                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </span>
                            <span className="truncate">{ans.text}</span>
                        </div>
                    ))}
                </div>

                {answers.length > 6 && (
                    <div className="text-[10px] text-gray-400 text-center mb-2">
                        +{answers.length - 6} ещё
                    </div>
                )}

                {/* Блок с выходами - градиентная шкала */}
                <div className="border-t border-purple-200 -mx-4 mt-2 bg-gradient-to-b from-purple-50/50 to-purple-100/30 rounded-b-lg">
                    
                    {/* Заголовок */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-100">
                        <span className="text-[10px] text-purple-600 font-medium">
                            Правильных:
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                            {correctCount} из {totalAnswers}
                        </span>
                    </div>

                    {/* Шкала с выходами */}
                    <div className="px-4 pt-3 pb-5">
                        {/* Градиентная линия */}
                        <div className="relative h-2 bg-gradient-to-r from-green-400 via-amber-400 to-red-400 rounded-full shadow-inner">
                            {/* Точки на линии */}
                            {outputs.map((output, index) => {
                                const position = outputs.length === 1 
                                    ? 50 
                                    : (index / (outputs.length - 1)) * 100;
                                
                                return (
                                    <div
                                        key={output.id}
                                        className="absolute top-1/2"
                                        style={{
                                            left: `${position}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                                            style={{ backgroundColor: output.color }}
                                            title={output.fullLabel}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Подписи и хэндлы */}
                        <div className="relative mt-2" style={{ height: '24px' }}>
                            {outputs.map((output, index) => {
                                const position = outputs.length === 1 
                                    ? 50 
                                    : (index / (outputs.length - 1)) * 100;
                                
                                return (
                                    <div
                                        key={output.id}
                                        className="absolute flex flex-col items-center"
                                        style={{
                                            left: `${position}%`,
                                            transform: 'translateX(-50%)'
                                        }}
                                    >
                                        {/* Число или метка */}
                                        <div 
                                            className="text-[10px] font-bold leading-none mb-0.5"
                                            style={{ color: output.color }}
                                            title={output.fullLabel}
                                        >
                                            {output.label}
                                        </div>
                                        
                                        {/* Подсказка для крайних значений */}
                                        {outputs.length > 1 && (index === 0 || index === outputs.length - 1) && (
                                            <div className="text-[7px] text-gray-400 leading-none">
                                                {index === 0 ? 'всё' : 'нет'}
                                            </div>
                                        )}

                                        {/* Handle для подключения */}
                                        <Handle 
                                            type="source" 
                                            position={Position.Bottom} 
                                            id={output.id}
                                            style={{
                                                backgroundColor: output.color,
                                                width: '9px',
                                                height: '9px',
                                                border: '2px solid white',
                                                bottom: '-14px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                            }}
                                            className={`!rounded-full transition-all hover:scale-125 ${
                                                selected ? 'ring-2 ring-offset-1 ring-purple-400' : ''
                                            }`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </BaseNode>

            {/* Модальное окно для увеличенного изображения */}
            {isZoomed && imageUrl && (
                <div 
                    className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
                    onClick={() => setIsZoomed(false)}
                >
                    <img 
                        src={imageUrl} 
                        alt="Zoomed" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

// Функция для получения цвета по количеству правильных ответов
function getColorForCount(count: number, max: number): string {
    if (max === 0) return '#6b7280';        // gray
    if (count === max) return '#22c55e';    // green-500
    if (count === 0) return '#ef4444';       // red-500
    
    const ratio = count / max;
    if (ratio >= 0.75) return '#84cc16';     // lime-500
    if (ratio >= 0.5) return '#eab308';      // yellow-500
    if (ratio >= 0.25) return '#f97316';     // orange-500
    return '#ef4444';                         // red-500
}

export default React.memo(MultipleChoiceNode);

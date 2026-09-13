
import React, { useMemo } from 'react';
import type { Node } from 'reactflow';
import { selectPrimarySelectedNode, useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { CustomNodeType, NodeData, QuestionNodeData, Answer, ResultNodeData, ScoreNodeData, VariableNodeData, ConditionNodeData, CollectInfoNodeData, FormField, FeedbackNodeData, GoToNodeData, TimerNodeData, TimelineNodeData, TimelineEvent, MatchingNodeData, MatchColumnItem, MatchPair, TextInputNodeData, InfoNodeData, AchievementNodeData, MultipleChoiceNodeData, AllocatorNodeData, GroupNodeData, FormulaNodeData, NodeSoundSettings, AllocatorItem, ProgressionNodeData, RankRule, Requirement, DialogueNodeData, ScreenQuizIntroTiming, ScreenQuizLayout, ScreenQuizTimelineMode, ImportantTalksInteractionContent } from '../types.ts';
import DesignPanel from './DesignPanel.tsx';
import toast from 'react-hot-toast';
import { getRutubeId } from '../utils/videoUtils.ts';
import { parseMarkdown } from '../utils/parseText.ts';

type UpdateNodeData = (id: string, data: Partial<NodeData>) => void;

type TrueFalseCorrectAnswer = 'true' | 'false';

const TRUE_FALSE_LABELS: Record<TrueFalseCorrectAnswer, string> = {
    true: 'Верно',
    false: 'Неверно',
};

const normalizeAnswerText = (value: string | undefined): string => String(value || '').trim().toLowerCase();

const parseOptionalNumber = (value: string, min: number, max: number, fallback: number): number | undefined => {
    if (value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
};

function useDerivedNodes<T>(compute: (nodes: Node<NodeData>[]) => T, isEqual: (a: T, b: T) => boolean): T {
    const computeRef = React.useRef(compute);
    const isEqualRef = React.useRef(isEqual);
    computeRef.current = compute;
    isEqualRef.current = isEqual;
    const [value, setValue] = React.useState<T>(() => compute(useCanvasStore.getState().nodes));
    React.useEffect(() => {
        return useCanvasStore.subscribe((state) => {
            const next = computeRef.current(state.nodes);
            setValue(prev => isEqualRef.current(prev, next) ? prev : next);
        });
    }, []);
    return value;
}

const getNodeTypeName = (type: CustomNodeType): string => {
    const names: Record<CustomNodeType, string> = {
    [CustomNodeType.Start]: 'Старт',
    [CustomNodeType.Question]: 'Вопрос',
    [CustomNodeType.MultipleChoice]: 'Множественный выбор',
    [CustomNodeType.Result]: 'Результат',
    [CustomNodeType.Condition]: 'Условие',
    [CustomNodeType.Score]: 'Подсчет очков',
    [CustomNodeType.Variable]: 'Переменная',
    [CustomNodeType.Formula]: 'Формула',
    [CustomNodeType.GoTo]: 'Переход',
    [CustomNodeType.Timer]: 'Таймер',
    [CustomNodeType.CollectInfo]: 'Сбор информации',
    [CustomNodeType.Feedback]: 'Обратная связь',
    [CustomNodeType.Timeline]: 'Хронология',
    [CustomNodeType.Matching]: 'Сопоставление',
    [CustomNodeType.TextInput]: 'Ввод текста',
    [CustomNodeType.Info]: 'Информация',
    [CustomNodeType.Achievement]: 'Достижение',
    [CustomNodeType.Group]: 'Группа',
    [CustomNodeType.Allocator]: 'Распределение',
    [CustomNodeType.Progression]: 'Прогрессия',
    [CustomNodeType.Dialogue]: 'Диалог',
};
    return names[type] || 'Неизвестный узел';
};

// --- Polished Settings Components ---
const SettingsSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="space-y-4 border-t border-gray-200/75 pt-6 first:border-t-0 first:pt-0">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const slugifyFieldName = (value: string): string => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'field';
};

const useFieldIdentity = (prefix: string, label?: string, id?: string, name?: string) => {
    const generatedId = React.useId().replace(/[^a-z0-9_-]+/gi, '');
    const fieldId = id || `${prefix}-${label ? slugifyFieldName(label) : generatedId}`;
    return {
        id: fieldId,
        name: name || fieldId,
    };
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
    const field = useFieldIdentity('settings-input', label, props.id, props.name);
    return (
        <div>
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
            <input id={field.id} name={field.name} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" {...props} />
        </div>
    );
};

const Textarea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => {
    const field = useFieldIdentity('settings-textarea', label, props.id, props.name);
    return (
        <div>
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
            <textarea id={field.id} name={field.name} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" {...props} />
        </div>
    );
};

const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }) => {
    const field = useFieldIdentity('settings-select', label, props.id, props.name);
    return (
        <div>
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
            <select id={field.id} name={field.name} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none appearance-none bg-no-repeat bg-right pr-8" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }} {...props}>
                {children}
            </select>
        </div>
    );
};

const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
    const field = useFieldIdentity('settings-checkbox', label, props.id, props.name);
    return (
        <label htmlFor={field.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-lg py-3 px-3.5 cursor-pointer hover:bg-slate-100 transition-colors has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-300">
            <input id={field.id} name={field.name} type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/50" {...props} />
            <span className="text-sm text-gray-700 font-medium">{label}</span>
        </label>
    );
};

const HelperText = ({ children }: { children?: React.ReactNode }) => (
    <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200/75 p-2.5 rounded-lg">{children}</p>
);

const ImportantTalksInteractionSettings = ({
    timer,
    content,
    updateTimer,
    updateContent,
    includeTimer = true,
}: {
    timer?: number;
    content: ImportantTalksInteractionContent;
    updateTimer: (timer: number | undefined) => void;
    updateContent: (patch: Partial<ImportantTalksInteractionContent>) => void;
    includeTimer?: boolean;
}) => (
    <SettingsSection title="Фидбэк и таймер «Разговоров о важном»">
        <HelperText>Эти параметры действуют только в тематическом шаблоне. После ответа участник увидит объяснение и сам продолжит прохождение.</HelperText>
        {includeTimer && (
            <>
                <Checkbox
                    label="Включить таймер на этом экране"
                    checked={Boolean(timer && timer > 0)}
                    onChange={event => updateTimer(event.target.checked ? 30 : undefined)}
                />
                {Boolean(timer && timer > 0) && (
                    <Input
                        label="Время на ответ, секунд"
                        type="number"
                        min="1"
                        max="3600"
                        value={timer ?? 30}
                        onChange={event => updateTimer(parseOptionalNumber(event.target.value, 1, 3600, 30))}
                    />
                )}
            </>
        )}
        <Input
            label="Заголовок правильного ответа"
            value={content.correctTitle ?? ''}
            onChange={event => updateContent({ correctTitle: event.target.value })}
            placeholder="Вы зажгли искру добра"
        />
        <Textarea
            label="Пояснение правильного ответа"
            value={content.correctText ?? ''}
            onChange={event => updateContent({ correctText: event.target.value })}
            rows={2}
            placeholder="Почему этот ответ важен"
        />
        <Input
            label="Заголовок неверного ответа"
            value={content.incorrectTitle ?? ''}
            onChange={event => updateContent({ incorrectTitle: event.target.value })}
            placeholder="Посмотрите на ситуацию ещё раз"
        />
        <Textarea
            label="Пояснение неверного ответа"
            value={content.incorrectText ?? ''}
            onChange={event => updateContent({ incorrectText: event.target.value })}
            rows={2}
            placeholder="Подсказка без раскрытия ответа"
        />
        <Input
            label="Заголовок по окончании времени"
            value={content.timeoutTitle ?? ''}
            onChange={event => updateContent({ timeoutTitle: event.target.value })}
            placeholder="Продолжим размышление"
        />
        <Textarea
            label="Текст по окончании времени"
            value={content.timeoutText ?? ''}
            onChange={event => updateContent({ timeoutText: event.target.value })}
            rows={2}
            placeholder="Можно двигаться дальше — важные ответы иногда приходят не сразу"
        />
        <Input
            label="Текст кнопки фидбэка"
            value={content.feedbackButtonText ?? ''}
            onChange={event => updateContent({ feedbackButtonText: event.target.value })}
            placeholder="Продолжить"
        />
    </SettingsSection>
);

const MarkdownPreview = ({ text }: { text?: string }) => {
    if (!text) return null;
    return (
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5 px-1">Предпросмотр</label>
            <div
                className="prose prose-sm max-w-none bg-white border border-gray-200/80 rounded-lg p-3.5 min-h-[60px] text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}
            />
        </div>
    );
};

const UrlInput = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
    const openAssetManager = useUIStore(s => s.openAssetManager);
    const field = useFieldIdentity('settings-url', label, props.id, props.name);

    const handlePick = () => {
        openAssetManager((url) => {
            if (props.onChange) {
                 const event = {
                    target: { value: url }
                } as React.ChangeEvent<HTMLInputElement>;
                props.onChange(event);
            }
        });
    };

    return (
        <div>
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
            <div className="flex gap-2">
                <input id={field.id} name={field.name} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" {...props} />
                <button 
                    onClick={handlePick}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center shrink-0"
                    title="Выбрать из медиатеки"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
            </div>
        </div>
    );
};

const VideoUrlInput = ({ label, isRequired, onRequiredChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string, isRequired?: boolean, onRequiredChange?: (val: boolean) => void }) => {
    const field = useFieldIdentity('settings-video-url', label, props.id, props.name);
    const requiredFieldId = `${field.id}-required-watch`;

    const isValidRutube = (url: string) => {
        if (!url) return true;
        return !!getRutubeId(url);
    };

    const hasVideo = !!props.value && isValidRutube(props.value as string);

    return (
        <div className="space-y-2">
            <div>
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1.5 px-1 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                    {label}
                </label>
                <input 
                    id={field.id}
                    name={field.name}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" 
                    placeholder="https://rutube.ru/video/..." 
                    {...props} 
                    onChange={(e) => {
                        props.onChange?.(e);
                    }}
                />
                {props.value && !isValidRutube(props.value as string) && (
                    <p className="text-xs text-red-500 mt-1 px-1">Некорректная ссылка на RuTube</p>
                )}
            </div>
            {hasVideo && onRequiredChange && (
                 <label htmlFor={requiredFieldId} className="flex items-center gap-2 cursor-pointer p-2 bg-rose-50 rounded-lg border border-rose-100">
                    <input 
                        id={requiredFieldId}
                        name={requiredFieldId}
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" 
                        checked={isRequired || false}
                        onChange={(e) => onRequiredChange(e.target.checked)}
                    />
                    <span className="text-xs font-semibold text-rose-800">
                        Блокировать переход до конца видео
                    </span>
                 </label>
            )}
        </div>
    );
};

// --- Node Sound Settings Component ---
const NodeSoundSettingsSection = React.memo(({ node, update }: { node: Node<NodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const soundSettings = data.soundSettings || {};

    const handleSoundChange = (key: keyof NodeSoundSettings, value: string) => {
        update(id, { 
            soundSettings: { 
                ...soundSettings, 
                [key]: value 
            } 
        });
    };

    return (
        <SettingsSection title="Звуковые эффекты">
            <UrlInput 
                label="Звук при появлении (On Entry)" 
                value={soundSettings.onEntry || ''} 
                onChange={e => handleSoundChange('onEntry', e.target.value)}
                placeholder="https://... (mp3/wav)"
            />
            <UrlInput 
                label="Звук при нажатии кнопки" 
                value={soundSettings.onButtonPress || ''} 
                onChange={e => handleSoundChange('onButtonPress', e.target.value)}
                placeholder="https://... (mp3/wav)"
            />
            <UrlInput
                label="Диктор / озвучка сцены"
                value={soundSettings.voiceover || ''}
                onChange={e => handleSoundChange('voiceover', e.target.value)}
                placeholder="https://... (mp3/wav)"
            />
            <HelperText>Эти звуки имеют приоритет над глобальными настройками. В шаблоне "Экранная викторина" озвучка приглушает фоновую музыку на время проигрывания.</HelperText>
        </SettingsSection>
    );
});

// --- Settings Components ---

const GroupSettings = React.memo(({ node, update }: { node: Node<GroupNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    
    return (
        <div className="space-y-8">
            <SettingsSection title="Основные">
                <Input 
                    label="Название группы" 
                    value={data.label || ''} 
                    onChange={e => update(id, { label: e.target.value })} 
                    placeholder="Например: Введение"
                />
                <Textarea
                    label="Описание (для автора)"
                    value={data.description || ''}
                    onChange={e => update(id, { description: e.target.value })}
                    rows={2}
                    placeholder="Краткая заметка о содержимом"
                />
            </SettingsSection>
            
            <SettingsSection title="Цветовая кодировка">
                <HelperText>Цвет папки помогает визуально разделить логические блоки квиза.</HelperText>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { key: 'slate', color: 'bg-slate-400' },
                        { key: 'blue', color: 'bg-blue-500' },
                        { key: 'indigo', color: 'bg-indigo-500' },
                        { key: 'purple', color: 'bg-purple-500' },
                        { key: 'rose', color: 'bg-rose-500' },
                        { key: 'amber', color: 'bg-amber-500' },
                        { key: 'emerald', color: 'bg-emerald-500' },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => update(id, { color: opt.key })}
                            className={`
                                h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
                                ${data.color === opt.key ? 'border-gray-900 shadow-md scale-105' : 'border-transparent hover:border-gray-300'}
                                ${opt.color}
                            `}
                            title={opt.key}
                        >
                            {data.color === opt.key && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            )}
                        </button>
                    ))}
                </div>
            </SettingsSection>
        </div>
    );
});

const FormulaSettings = React.memo(({ node, update }: { node: Node<FormulaNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;

    const availableVars = useDerivedNodes(
        (nodes) => {
            const vars = new Set<string>(['score']);
            nodes.forEach(n => {
                if (n.type === CustomNodeType.Variable) {
                    const d = n.data as VariableNodeData;
                    if (d.variableName) vars.add(d.variableName);
                }
                if (n.type === CustomNodeType.CollectInfo) {
                    const d = n.data as CollectInfoNodeData;
                    if (d.fields) {
                        d.fields.forEach((f) => { if (f.variableName) vars.add(f.variableName) });
                    }
                }
                if (n.type === CustomNodeType.Allocator) {
                    const d = n.data as AllocatorNodeData;
                    if (d.items) {
                        d.items.forEach((i) => { if (i.variableName) vars.add(i.variableName) });
                    }
                }
                if (n.type === CustomNodeType.Formula && n.id !== id) {
                    const d = n.data as FormulaNodeData;
                    if (d.variableName) vars.add(d.variableName);
                }
            });
            return Array.from(vars);
        },
        (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
    );

    const handleInsert = (text: string) => {
        const el = document.getElementById('formula-textarea') as HTMLTextAreaElement;
        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const textBefore = (data.expression || '').substring(0, start);
            const textAfter = (data.expression || '').substring(end, (data.expression || '').length);
            const newExp = textBefore + text + textAfter;
            update(id, { expression: newExp });
            // Defer focus/selection move (simple implementation)
            setTimeout(() => el.focus(), 0);
        } else {
             update(id, { expression: (data.expression || '') + text });
        }
    };

    return (
        <div className="space-y-6">
            {/* Variable Name Input */}
            <SettingsSection title="Целевая переменная">
                <HelperText>Куда сохранить результат вычисления?</HelperText>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-mono text-xs">var</span>
                    </div>
                    <input 
                        id={`formula-variable-${id}`}
                        name={`formula-variable-${id}`}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 pl-10 pr-3.5 text-sm text-indigo-700 font-mono font-bold placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none"
                        value={data.variableName || ''} 
                        onChange={e => update(id, { variableName: e.target.value })} 
                        placeholder="myResult"
                    />
                </div>
            </SettingsSection>

            {/* Expression Builder */}
            <SettingsSection title="Конструктор формулы">
                 {/* Toolbar - Operators */}
                 <div className="flex flex-wrap gap-1.5 mb-2">
                    {['+', '-', '*', '/', '(', ')', '^', '%'].map(op => (
                        <button 
                            key={op}
                            onClick={() => handleInsert(` ${op} `)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-gray-700 font-mono text-sm transition-colors"
                            title="Оператор"
                        >
                            {op}
                        </button>
                    ))}
                 </div>
                 
                 {/* Toolbar - Functions */}
                 <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                        { label: 'ROUND', val: 'round(' },
                        { label: 'FLOOR', val: 'floor(' },
                        { label: 'CEIL', val: 'ceil(' },
                        { label: 'MAX', val: 'max(' },
                        { label: 'MIN', val: 'min(' },
                        { label: 'RAND', val: 'random(' },
                        { label: 'SQRT', val: 'sqrt(' },
                    ].map(fn => (
                         <button 
                            key={fn.label}
                            onClick={() => handleInsert(`${fn.val}`)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 font-bold text-[10px] uppercase tracking-wide transition-colors"
                            title="Функция"
                        >
                            {fn.label}
                        </button>
                    ))}
                 </div>

                <textarea 
                    id="formula-textarea"
                    name={`formula-expression-${id}`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-sm text-green-400 font-mono placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none leading-relaxed shadow-inner" 
                    value={data.expression || ''} 
                    onChange={e => update(id, { expression: e.target.value })} 
                    placeholder="(price * 0.8) + tax"
                    rows={6}
                />
                
                {/* Variables Chips */}
                 <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Доступные переменные:</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {availableVars.map(v => (
                            <button
                                key={v}
                                onClick={() => handleInsert(v)}
                                className="px-2.5 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center gap-1 shadow-sm"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                {v}
                            </button>
                        ))}
                        {availableVars.length === 0 && <span className="text-xs text-gray-400 italic">Нет переменных</span>}
                    </div>
                 </div>
            </SettingsSection>
            
            <SettingsSection title="Настройки результата">
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Округление (знаков)" 
                        type="number"
                        min="0"
                        max="10"
                        value={data.decimalPlaces !== undefined ? data.decimalPlaces : ''} 
                        onChange={e => update(id, { decimalPlaces: e.target.value === '' ? undefined : parseInt(e.target.value) })} 
                        placeholder="0"
                    />
                </div>
                 <HelperText>
                    Поддерживаются функции math.js: sin, cos, log, e, pi и другие. Используйте точку для дробей (3.14).
                </HelperText>
            </SettingsSection>
        </div>
    );
});

const ProgressionSettings = React.memo(({ node, update }: { node: Node<ProgressionNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { levelVar = 'rankLevel', nameVar = 'rankName' } = data;
    const rules: RankRule[] = data.rules ?? [];

    const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const addRule = () => {
        const newRule: RankRule = { 
            id: generateId(),
            level: rules.length + 1, 
            name: `Уровень ${rules.length + 1}`, 
            requireAll: true,
            requirements: [] 
        };
        update(id, { rules: [...rules, newRule] });
    };

    const updateRule = (index: number, patch: Partial<RankRule>) => {
        const newRules = rules.map((r, i) => i === index ? { ...r, ...patch } : r);
        update(id, { rules: newRules });
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        update(id, { rules: newRules });
    };

    const addRequirement = (ruleIndex: number) => {
        const rule = rules[ruleIndex];
        const newReq: Requirement = { 
            id: generateId(),
            type: 'minVar', 
            variable: '', 
            value: 0 
        };
        updateRule(ruleIndex, { requirements: [...rule.requirements, newReq] });
    };

    const updateRequirement = (ruleIndex: number, reqIndex: number, patch: Partial<Requirement>) => {
        const rule = rules[ruleIndex];
        const newReqs = rule.requirements.map((r, i) => i === reqIndex ? { ...r, ...patch } : r) as Requirement[];
        updateRule(ruleIndex, { requirements: newReqs });
    };

    const removeRequirement = (ruleIndex: number, reqIndex: number) => {
         const rule = rules[ruleIndex];
         const newReqs = rule.requirements.filter((_, i) => i !== reqIndex);
         updateRule(ruleIndex, { requirements: newReqs });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Переменные ранга">
                <Input label="Переменная уровня (число)" value={levelVar} onChange={e => update(id, { levelVar: e.target.value })} placeholder="rankLevel" />
                <Input label="Переменная названия (текст)" value={nameVar} onChange={e => update(id, { nameVar: e.target.value })} placeholder="rankName" />
            </SettingsSection>

            <SettingsSection title="Таблица правил">
                {rules.map((rule, ruleIdx) => (
                    <div key={ruleIdx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 relative">
                        <button onClick={() => removeRule(ruleIdx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                        <div className="flex gap-2">
                             <div className="w-1/4">
                                <label className="text-[10px] font-bold text-gray-500">LVL</label>
                                <input 
                                    id={`rank-rule-level-${id}-${ruleIdx}`}
                                    name={`rank-rule-level-${id}-${ruleIdx}`}
                                    type="number" 
                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-gray-800 focus:outline-none focus:border-indigo-500" 
                                    value={rule.level} 
                                    onChange={e => updateRule(ruleIdx, { level: parseInt(e.target.value) })} 
                                />
                             </div>
                             <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-600">Название</label>
                                <input 
                                    id={`rank-rule-name-${id}-${ruleIdx}`}
                                    name={`rank-rule-name-${id}-${ruleIdx}`}
                                    type="text" 
                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-gray-800 focus:outline-none focus:border-indigo-500" 
                                    value={rule.name} 
                                    onChange={e => updateRule(ruleIdx, { name: e.target.value })} 
                                />
                             </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500">Требования</label>
                            {rule.requirements.map((req, reqIdx) => (
                                <div key={reqIdx} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-200">
                                    <select 
                                        id={`rank-rule-requirement-type-${id}-${ruleIdx}-${reqIdx}`}
                                        name={`rank-rule-requirement-type-${id}-${ruleIdx}-${reqIdx}`}
                                        className="text-xs border border-slate-200 rounded-lg p-2 w-24 bg-slate-50 text-gray-800 focus:outline-none focus:border-indigo-500"
                                        value={req.type}
                                        onChange={e => updateRequirement(ruleIdx, reqIdx, { type: e.target.value as Requirement['type'] })}
                                    >
                                        <option value="minVar">Var &gt;=</option>
                                        <option value="maxVar">Var &lt;=</option>
                                        <option value="minScore">Score &gt;=</option>
                                        <option value="maxScore">Score &lt;=</option>
                                    </select>
                                    
                                    {(req.type === 'minVar' || req.type === 'maxVar') && (
                                        <input 
                                            id={`rank-rule-requirement-variable-${id}-${ruleIdx}-${reqIdx}`}
                                            name={`rank-rule-requirement-variable-${id}-${ruleIdx}-${reqIdx}`}
                                            className="text-xs border border-slate-200 rounded-lg p-2 flex-1 min-w-0 bg-slate-50 text-gray-800 focus:outline-none focus:border-indigo-500" 
                                            placeholder="Var name"
                                            value={req.variable} 
                                            onChange={e => updateRequirement(ruleIdx, reqIdx, { variable: e.target.value })} 
                                        />
                                    )}
                                    
                                    <input 
                                        id={`rank-rule-requirement-value-${id}-${ruleIdx}-${reqIdx}`}
                                        name={`rank-rule-requirement-value-${id}-${ruleIdx}-${reqIdx}`}
                                        type="number" 
                                        className="text-xs border border-slate-200 rounded-lg p-2 w-16 bg-slate-50 text-gray-800 focus:outline-none focus:border-indigo-500" 
                                        value={req.value} 
                                        onChange={e => updateRequirement(ruleIdx, reqIdx, { value: parseInt(e.target.value) })} 
                                    />

                                    <button onClick={() => removeRequirement(ruleIdx, reqIdx)} className="text-red-400 hover:text-red-600">×</button>
                                </div>
                            ))}
                            <button onClick={() => addRequirement(ruleIdx)} className="text-xs text-indigo-600 font-bold">+ Добавить условие</button>
                        </div>
                    </div>
                ))}
                <button onClick={addRule} className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100">+ Добавить уровень</button>
            </SettingsSection>
        </div>
    );
});

const QuestionSettings = React.memo(({ node, update }: { node: Node<QuestionNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { question = '', timer } = data;
    const answers: Answer[] = data.answers ?? [];
    const screenQuiz = data.screenQuiz || {};
    const importantTalks = data.importantTalks || {};
    const isTrueFalseQuestion =
        answers.length === 2 &&
        normalizeAnswerText(answers[0]?.text) === normalizeAnswerText(TRUE_FALSE_LABELS.true) &&
        normalizeAnswerText(answers[1]?.text) === normalizeAnswerText(TRUE_FALSE_LABELS.false);
    const trueFalseCorrectAnswer: TrueFalseCorrectAnswer | null = isTrueFalseQuestion
        ? (answers[0]?.isCorrect || data.correctAnswer === answers[0]?.id ? 'true'
            : answers[1]?.isCorrect || data.correctAnswer === answers[1]?.id ? 'false'
                : null)
        : null;

    const updateAnswer = (index: number, patch: Partial<Answer>) => {
        const newAnswers = [...answers];
        newAnswers[index] = { ...newAnswers[index], ...patch };
        update(id, { answers: newAnswers });
    };

    const handleAnswerChange = (index: number, text: string) => {
        updateAnswer(index, { text });
    };

    const addAnswer = () => {
        const newAnswer: Answer = { id: `ans-${Date.now()}`, text: `Ответ ${answers.length + 1}` };
        update(id, { answers: [...answers, newAnswer] });
    };

    const removeAnswer = (index: number) => {
        const removedAnswerId = answers[index]?.id;
        update(id, {
            answers: answers.filter((_, i) => i !== index),
            ...(data.correctAnswer === removedAnswerId ? { correctAnswer: undefined } : {}),
        });
    };

    const setCorrectAnswer = (answerId: string) => {
        update(id, {
            correctAnswer: answerId,
            answers: answers.map(answer => ({ ...answer, isCorrect: answer.id === answerId })),
        });
    };

    const applyTrueFalsePreset = (correct: TrueFalseCorrectAnswer) => {
        const trueId = answers[0]?.id || 'true';
        const falseId = answers[1]?.id || 'false';
        const correctAnswer = correct === 'true' ? trueId : falseId;

        update(id, {
            answers: [
                { id: trueId, text: TRUE_FALSE_LABELS.true, isCorrect: correct === 'true' },
                { id: falseId, text: TRUE_FALSE_LABELS.false, isCorrect: correct === 'false' },
            ],
            correctAnswer,
            screenQuiz: {
                ...screenQuiz,
                layout: 'question-only',
            },
        });
    };

    const updateScreenQuiz = (patch: Partial<NonNullable<QuestionNodeData['screenQuiz']>>) => {
        const next = { ...screenQuiz, ...patch };
        Object.keys(next).forEach((key) => {
            const typedKey = key as keyof typeof next;
            if (next[typedKey] === undefined || next[typedKey] === null || next[typedKey] === '') {
                delete next[typedKey];
            }
        });
        update(id, { screenQuiz: Object.keys(next).length > 0 ? next : undefined });
    };

    const updateImportantTalks = (patch: Partial<NonNullable<QuestionNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };

    const handleTimerToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            update(id, { timer: 30 }); // Default to 30 seconds
        } else {
            update(id, { timer: undefined });
        }
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Содержимое вопроса">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Текст вопроса" value={question} onChange={(e) => update(id, { question: e.target.value })} rows={4} />
                <UrlInput label="URL изображения (необязательно)" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} placeholder="https://example.com/image.png" />
                <UrlInput label="Видеофайл из медиатеки" value={data.videoUrl || ''} onChange={e => update(id, { videoUrl: e.target.value })} placeholder="https://.../video.mp4" />
                <Input
                    label="Подсказка над ответами для «Разговоров о важном»"
                    value={importantTalks.instruction ?? ''}
                    onChange={e => updateImportantTalks({ instruction: e.target.value })}
                    placeholder="Выберите один ответ"
                />
            </SettingsSection>
            <SettingsSection title="Фон узла">
                <UrlInput
                    label="URL фонового изображения"
                    value={data.backgroundImageUrl || ''}
                    onChange={e => update(id, { backgroundImageUrl: e.target.value })}
                    placeholder="Переопределить глобальный фон"
                />
            </SettingsSection>
            <SettingsSection title="Варианты ответов">
                <HelperText>Отметьте правильный ответ, чтобы экранная викторина могла подсветить верный вариант анимацией.</HelperText>
                <div className="rounded-xl border border-blue-200/70 bg-blue-50/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-blue-700">Пресет</div>
                            <div className="text-sm font-semibold text-slate-800">Верно / Неверно</div>
                        </div>
                        {isTrueFalseQuestion && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                                Активен
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => applyTrueFalsePreset('true')}
                            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                                trueFalseCorrectAnswer === 'true'
                                    ? 'border-green-300 bg-green-100 text-green-800'
                                    : 'border-white bg-white text-slate-700 hover:border-green-200 hover:bg-green-50'
                            }`}
                        >
                            Верно правильно
                        </button>
                        <button
                            type="button"
                            onClick={() => applyTrueFalsePreset('false')}
                            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                                trueFalseCorrectAnswer === 'false'
                                    ? 'border-green-300 bg-green-100 text-green-800'
                                    : 'border-white bg-white text-slate-700 hover:border-green-200 hover:bg-green-50'
                            }`}
                        >
                            Неверно правильно
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    {answers.map((ans, index) => (
                        <div key={ans.id} className={`rounded-lg border p-3 space-y-3 transition-colors ${ans.isCorrect ? 'border-green-200 bg-green-50' : 'border-slate-200/80 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCorrectAnswer(ans.id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${ans.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 hover:border-green-400'}`}
                                    title={ans.isCorrect ? 'Правильный ответ' : 'Отметить как правильный'}
                                >
                                    {ans.isCorrect && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    id={`question-answer-text-${id}-${ans.id}`}
                                    name={`question-answer-text-${id}-${ans.id}`}
                                    type="text"
                                    value={ans.text}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    className="flex-grow bg-white border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm"
                                    placeholder="Текст ответа..."
                                />
                                <button onClick={() => removeAnswer(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 shrink-0" title="Удалить ответ">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                            <UrlInput
                                label="Изображение ответа"
                                value={ans.imageUrl || ''}
                                onChange={(e) => updateAnswer(index, { imageUrl: e.target.value })}
                                placeholder="URL или выберите из медиатеки"
                            />
                        </div>
                    ))}
                </div>
                <button onClick={addAnswer} className="w-full text-sm py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200/80 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Добавить ответ
                </button>
            </SettingsSection>
            <SettingsSection title="Экранная викторина">
                <HelperText>Эти параметры применяются только к этому экрану. Значение "Наследовать" берет настройку из глобального дизайна шаблона.</HelperText>
                <Select
                    label="Композиция этого экрана"
                    value={screenQuiz.layout || 'inherit'}
                    onChange={e => updateScreenQuiz({ layout: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizLayout })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто</option>
                    <option value="media-right">Медиа справа</option>
                    <option value="media-left">Медиа слева</option>
                    <option value="media-top">Медиа сверху</option>
                    <option value="image-grid">Сетка изображений</option>
                    <option value="question-only">Только вопрос</option>
                    <option value="hero-media">Большое медиа</option>
                </Select>
                <Select
                    label="Таймер на этом экране"
                    value={screenQuiz.showTimer === undefined ? 'inherit' : screenQuiz.showTimer ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ showTimer: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Показать</option>
                    <option value="hide">Скрыть</option>
                </Select>
                <Input
                    label="Длительность таймера, сек"
                    type="number"
                    min="5"
                    max="180"
                    value={screenQuiz.timerSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ timerSeconds: e.target.value === '' ? undefined : Math.max(5, Math.min(180, parseInt(e.target.value, 10) || 30)) })}
                    placeholder="Наследовать"
                />
                <Select
                    label="Показ перед таймером"
                    value={screenQuiz.introEnabled === undefined ? 'inherit' : screenQuiz.introEnabled ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ introEnabled: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Включить</option>
                    <option value="hide">Выключить</option>
                </Select>
                <Select
                    label="Темп озвучивания"
                    value={screenQuiz.introTiming || 'inherit'}
                    onChange={e => updateScreenQuiz({ introTiming: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizIntroTiming })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто</option>
                    <option value="fast">Быстро</option>
                    <option value="calm">Спокойно</option>
                    <option value="manual">Ручной</option>
                </Select>
                <Select
                    label="Режим монтажной ленты"
                    value={screenQuiz.timelineMode || 'inherit'}
                    onChange={e => updateScreenQuiz({ timelineMode: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizTimelineMode })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто по шоу-ритму</option>
                    <option value="timeline">Ручная монтажная лента</option>
                </Select>
                <Input
                    label="Удержание перед таймером, сек"
                    type="number"
                    min="0"
                    max="8"
                    step="0.1"
                    value={screenQuiz.holdSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ holdSeconds: parseOptionalNumber(e.target.value, 0, 8, 1.2) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Раскрытие ответа, сек"
                    type="number"
                    min="0.3"
                    max="8"
                    step="0.1"
                    value={screenQuiz.revealSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ revealSeconds: parseOptionalNumber(e.target.value, 0.3, 8, 1.4) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Переход, мс"
                    type="number"
                    min="80"
                    max="2000"
                    step="20"
                    value={screenQuiz.transitionMs ?? ''}
                    onChange={e => updateScreenQuiz({ transitionMs: parseOptionalNumber(e.target.value, 80, 2000, 340) })}
                    placeholder="Наследовать"
                />
            </SettingsSection>
            <SettingsSection title="Таймер">
                <HelperText>Если время выйдет, произойдет переход по красной точке выхода внизу узла.</HelperText>
                <Checkbox label="Включить таймер на ответ" checked={!!timer && timer > 0} onChange={handleTimerToggle} />
                {timer !== undefined && timer > 0 && (
                    <Input
                        label="Время на ответ (сек)"
                        type="number"
                        value={timer || 0}
                        onChange={e => update(id, { timer: parseInt(e.target.value) || 0 })}
                        min="1"
                    />
                )}
            </SettingsSection>
            <ImportantTalksInteractionSettings
                timer={timer}
                content={importantTalks}
                updateTimer={nextTimer => update(id, { timer: nextTimer })}
                updateContent={updateImportantTalks}
                includeTimer={false}
            />
            <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

// Функция для получения цвета в зависимости от количества правильных
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

const MultipleChoiceSettings = React.memo(({ node, update }: { node: Node<MultipleChoiceNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { question = '' } = data;
    const answers: Answer[] = data.answers ?? [];
    const correctOptions: string[] = data.correctOptions ?? [];
    const screenQuiz = data.screenQuiz || {};
    const importantTalks = data.importantTalks || {};

    const correctCount = correctOptions.length;
    const totalAnswers = answers.length;

    const updateAnswer = (index: number, patch: Partial<Answer>) => {
        const newAnswers = [...answers];
        newAnswers[index] = { ...newAnswers[index], ...patch };
        update(id, { answers: newAnswers });
    };

    const handleAnswerChange = (index: number, text: string) => {
        updateAnswer(index, { text });
    };

    const addAnswer = () => {
        const newAnswer: Answer = { id: `opt-${Date.now()}`, text: `Вариант ${answers.length + 1}` };
        update(id, { answers: [...answers, newAnswer] });
    };

    const removeAnswer = (index: number) => {
        const answerIdToRemove = answers[index].id;
        const newAnswers = answers.filter((_, i) => i !== index);
        const newCorrectOptions = correctOptions.filter(optId => optId !== answerIdToRemove);
        update(id, { answers: newAnswers, correctOptions: newCorrectOptions });
    };

    const toggleCorrect = (answerId: string) => {
        const newCorrectOptions = correctOptions.includes(answerId)
            ? correctOptions.filter(id => id !== answerId)
            : [...correctOptions, answerId];
        update(id, { correctOptions: newCorrectOptions });
    };

    const updateScreenQuiz = (patch: Partial<NonNullable<MultipleChoiceNodeData['screenQuiz']>>) => {
        const next = { ...screenQuiz, ...patch };
        Object.keys(next).forEach((key) => {
            const typedKey = key as keyof typeof next;
            if (next[typedKey] === undefined || next[typedKey] === null || next[typedKey] === '') {
                delete next[typedKey];
            }
        });
        update(id, { screenQuiz: Object.keys(next).length > 0 ? next : undefined });
    };

    const updateImportantTalks = (patch: Partial<NonNullable<MultipleChoiceNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };

    // Генерация превью выходов
    const outputsPreview = useMemo(() => {
        if (correctCount === 0) return [];
        
        const result = [];
        for (let i = correctCount; i >= 0; i--) {
            result.push({
                count: i,
                label: i === correctCount ? 'Всё верно' : i === 0 ? 'Неверно' : `${i} из ${correctCount}`,
                color: getColorForCount(i, correctCount)
            });
        }
        return result;
    }, [correctCount]);

    return (
        <div className="space-y-6">
            {/* Содержимое вопроса */}
            <SettingsSection title="Содержимое вопроса">
                <Input 
                    label="Заголовок" 
                    value={data.title || ''} 
                    onChange={e => update(id, { title: e.target.value })} 
                    placeholder="Необязательно"
                />
                <Textarea 
                    label="Текст вопроса" 
                    value={question} 
                    onChange={e => update(id, { question: e.target.value })} 
                    rows={4}
                    placeholder="Введите вопрос..."
                />
                <UrlInput 
                    label="URL изображения" 
                    value={data.imageUrl || ''} 
                    onChange={e => update(id, { imageUrl: e.target.value })}
                    placeholder="https://example.com/image.png"
                />
                <UrlInput 
                    label="Видеофайл из медиатеки" 
                    value={data.videoUrl || ''} 
                    onChange={e => update(id, { videoUrl: e.target.value })} 
                    placeholder="https://.../video.mp4"
                />
                <Input
                    label="Подсказка для «Разговоров о важном»"
                    value={importantTalks.hint ?? ''}
                    onChange={e => updateImportantTalks({ hint: e.target.value })}
                    placeholder="Можно выбрать несколько вариантов"
                />
            </SettingsSection>

            {/* Варианты ответа */}
            <SettingsSection title="Варианты ответа">
                <HelperText>
                    Отметьте галочкой все правильные варианты ответа. Количество выходов узла зависит от количества правильных ответов.
                </HelperText>
                
                <div className="space-y-2">
                    {answers.map((ans, index) => (
                        <div 
                            key={ans.id} 
                            className={`p-3 rounded-lg border transition-colors ${
                                correctOptions.includes(ans.id)
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {/* Чекбокс */}
                                <button
                                    onClick={() => toggleCorrect(ans.id)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        correctOptions.includes(ans.id)
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'bg-white border-gray-300 hover:border-green-400'
                                    }`}
                                    title={correctOptions.includes(ans.id) ? 'Убрать из правильных' : 'Отметить как правильный'}
                                >
                                    {correctOptions.includes(ans.id) && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>

                                {/* Текст ответа */}
                                <input
                                    id={`multiple-choice-answer-text-${id}-${ans.id}`}
                                    name={`multiple-choice-answer-text-${id}-${ans.id}`}
                                    type="text"
                                    value={ans.text}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    className="flex-grow bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                                    placeholder="Текст варианта..."
                                />

                                {/* Кнопка удаления */}
                                <button
                                    onClick={() => removeAnswer(index)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                    title="Удалить вариант"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="mt-3">
                                <UrlInput
                                    label="Изображение варианта"
                                    value={ans.imageUrl || ''}
                                    onChange={(e) => updateAnswer(index, { imageUrl: e.target.value })}
                                    placeholder="URL или выберите из медиатеки"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Кнопка добавления */}
                <button 
                    onClick={addAnswer} 
                    className="w-full py-2.5 bg-purple-50 text-purple-700 font-medium rounded-lg hover:bg-purple-100 border border-purple-200 border-dashed flex items-center justify-center gap-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Добавить вариант
                </button>
            </SettingsSection>

            {/* Информация о выходах */}
            {correctCount > 0 && (
                <SettingsSection title="Выходы узла">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-purple-600 font-medium">
                                Правильных ответов:
                            </span>
                            <span className="text-sm font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full shadow-sm">
                                {correctCount} из {totalAnswers}
                            </span>
                        </div>

                        {/* Визуализация шкалы */}
                        <div className="mb-3">
                            <div className="h-2 bg-gradient-to-r from-green-400 via-amber-400 to-red-400 rounded-full relative">
                                {outputsPreview.map((output, index) => {
                                    const position = outputsPreview.length === 1 
                                        ? 50 
                                        : (index / (outputsPreview.length - 1)) * 100;
                                    return (
                                        <div
                                            key={output.count}
                                            className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                                            style={{
                                                left: `${position}%`,
                                                transform: 'translate(-50%, -50%)',
                                                backgroundColor: output.color
                                            }}
                                            title={output.label}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Список выходов */}
                        <div className="flex flex-wrap gap-1.5">
                            {outputsPreview.map((output) => (
                                <div 
                                    key={output.count}
                                    className="text-[11px] px-2.5 py-1 rounded-full font-medium border"
                                    style={{
                                        backgroundColor: output.color + '15',
                                        borderColor: output.color + '40',
                                        color: output.color
                                    }}
                                >
                                    {output.label}
                                </div>
                            ))}
                        </div>

                        <div className="text-[10px] text-purple-500 mt-3 flex items-start gap-1.5">
                            <span className="text-purple-400">💡</span>
                            <span>Подключите к каждому выходу узел "Очки" для начисления баллов</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {/* Предупреждение если нет правильных */}
            {correctCount === 0 && answers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <div className="text-xs text-amber-700">
                        <strong>Не выбраны правильные ответы.</strong>
                        <br />
                        Отметьте хотя бы один вариант как правильный, чтобы создать выходы для маршрутизации.
                    </div>
                </div>
            )}

            <SettingsSection title="Экранная викторина">
                <HelperText>Эти параметры применяются только к этому экрану множественного выбора. Значение "Наследовать" берет настройку из глобального дизайна шаблона.</HelperText>
                <Select
                    label="Композиция этого экрана"
                    value={screenQuiz.layout || 'inherit'}
                    onChange={e => updateScreenQuiz({ layout: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizLayout })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто</option>
                    <option value="media-right">Медиа справа</option>
                    <option value="media-left">Медиа слева</option>
                    <option value="media-top">Медиа сверху</option>
                    <option value="image-grid">Сетка изображений</option>
                    <option value="question-only">Только вопрос</option>
                    <option value="hero-media">Большое медиа</option>
                </Select>
                <Select
                    label="Таймер на этом экране"
                    value={screenQuiz.showTimer === undefined ? 'inherit' : screenQuiz.showTimer ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ showTimer: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Показать</option>
                    <option value="hide">Скрыть</option>
                </Select>
                <Input
                    label="Длительность таймера, сек"
                    type="number"
                    min="5"
                    max="180"
                    value={screenQuiz.timerSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ timerSeconds: e.target.value === '' ? undefined : Math.max(5, Math.min(180, parseInt(e.target.value, 10) || 30)) })}
                    placeholder="Наследовать"
                />
                <Select
                    label="Показ перед таймером"
                    value={screenQuiz.introEnabled === undefined ? 'inherit' : screenQuiz.introEnabled ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ introEnabled: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Включить</option>
                    <option value="hide">Выключить</option>
                </Select>
                <Select
                    label="Темп озвучивания"
                    value={screenQuiz.introTiming || 'inherit'}
                    onChange={e => updateScreenQuiz({ introTiming: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizIntroTiming })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто</option>
                    <option value="fast">Быстро</option>
                    <option value="calm">Спокойно</option>
                    <option value="manual">Ручной</option>
                </Select>
                <Select
                    label="Режим монтажной ленты"
                    value={screenQuiz.timelineMode || 'inherit'}
                    onChange={e => updateScreenQuiz({ timelineMode: e.target.value === 'inherit' ? undefined : e.target.value as ScreenQuizTimelineMode })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="auto">Авто по шоу-ритму</option>
                    <option value="timeline">Ручная монтажная лента</option>
                </Select>
                <Input
                    label="Удержание перед таймером, сек"
                    type="number"
                    min="0"
                    max="8"
                    step="0.1"
                    value={screenQuiz.holdSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ holdSeconds: parseOptionalNumber(e.target.value, 0, 8, 1.2) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Раскрытие ответа, сек"
                    type="number"
                    min="0.3"
                    max="8"
                    step="0.1"
                    value={screenQuiz.revealSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ revealSeconds: parseOptionalNumber(e.target.value, 0.3, 8, 1.4) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Переход, мс"
                    type="number"
                    min="80"
                    max="2000"
                    step="20"
                    value={screenQuiz.transitionMs ?? ''}
                    onChange={e => updateScreenQuiz({ transitionMs: parseOptionalNumber(e.target.value, 80, 2000, 340) })}
                    placeholder="Наследовать"
                />
            </SettingsSection>

            {/* Кнопка */}
            <SettingsSection title="Кнопка">
                <Input 
                    label="Текст кнопки" 
                    value={data.buttonText || ''} 
                    onChange={e => update(id, { buttonText: e.target.value })} 
                    placeholder="По умолчанию: Подтвердить" 
                />
            </SettingsSection>

            <ImportantTalksInteractionSettings
                timer={data.timer}
                content={importantTalks}
                updateTimer={nextTimer => update(id, { timer: nextTimer })}
                updateContent={updateImportantTalks}
            />
            <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});
const ResultSettings = React.memo(({ node, update }: { node: Node<ResultNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const importantTalks = data.importantTalks || {};
    const updateImportantTalks = (patch: Partial<NonNullable<ResultNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };
    return (
        <div className="space-y-8">
            <SettingsSection title="Настройки результата">
                <Input label="Заголовок результата" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Описание" value={data.description || ''} onChange={e => update(id, { description: e.target.value })} rows={4} />
                <Checkbox label="Показать очки" checked={data.showScore || false} onChange={e => update(id, { showScore: e.target.checked })} />
                <UrlInput label="Картинка" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} />
                <VideoUrlInput label="Видео (RuTube)" value={data.videoUrl || ''} onChange={e => update(id, { videoUrl: e.target.value })} />
                <Input
                    label="Текст кнопки повторного прохождения"
                    value={data.buttonText || ''}
                    onChange={e => update(id, { buttonText: e.target.value })}
                    placeholder="Пройти ещё раз"
                />
            </SettingsSection>
            <SettingsSection title="Экран результата «Разговоров о важном»">
                <Input
                    label="Надзаголовок"
                    value={importantTalks.kicker ?? ''}
                    onChange={e => updateImportantTalks({ kicker: e.target.value })}
                    placeholder="Важный разговор завершён"
                />
                <Input
                    label="Заголовок итогового сообщения"
                    value={importantTalks.insightTitle ?? ''}
                    onChange={e => updateImportantTalks({ insightTitle: e.target.value })}
                    placeholder="Искры добра"
                />
            </SettingsSection>
            <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const InfoSettings = React.memo(({ node, update }: { node: Node<InfoNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const screenQuiz = data.screenQuiz || {};
    const importantTalks = data.importantTalks || {};
    const importantTalksAgendaItems = importantTalks.agendaItems || [
        '6 заданий',
        'проверка знаний',
        'полезные размышления',
    ];
    const updateScreenQuiz = (patch: Partial<NonNullable<InfoNodeData['screenQuiz']>>) => {
        const next = { ...screenQuiz, ...patch };
        Object.keys(next).forEach((key) => {
            if (next[key as keyof typeof next] === undefined) {
                delete next[key as keyof typeof next];
            }
        });
        update(id, { screenQuiz: Object.keys(next).length > 0 ? next : undefined });
    };
    const updateImportantTalks = (patch: Partial<NonNullable<InfoNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Настройки информационного блока">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Описание" value={data.description || ''} onChange={e => update(id, { description: e.target.value })} rows={6} />
                <MarkdownPreview text={data.description} />
                <UrlInput label="Картинка" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} />
                <UrlInput label="Видеофайл из медиатеки" value={data.videoUrl || ''} onChange={e => update(id, { videoUrl: e.target.value })} placeholder="https://.../video.mp4" />
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Далее" />
            </SettingsSection>
            <SettingsSection title="Сцена «Разговоры о важном»">
                <HelperText>Эти поля используются в правом блоке информационной сцены одноимённого шаблона.</HelperText>
                <Input
                    label="Заголовок списка"
                    value={importantTalks.agendaTitle ?? ''}
                    onChange={e => updateImportantTalks({ agendaTitle: e.target.value })}
                    placeholder="Что вас ждёт"
                />
                {importantTalksAgendaItems.map((item, index) => (
                    <Input
                        key={index}
                        label={`Пункт ${index + 1}`}
                        value={item}
                        onChange={e => {
                            const nextItems = [...importantTalksAgendaItems];
                            nextItems[index] = e.target.value;
                            updateImportantTalks({ agendaItems: nextItems });
                        }}
                    />
                ))}
            </SettingsSection>
            <SettingsSection title="Фон узла">
                <UrlInput
                    label="URL фонового изображения"
                    value={data.backgroundImageUrl || ''}
                    onChange={e => update(id, { backgroundImageUrl: e.target.value })}
                    placeholder="Переопределить глобальный фон"
                />
            </SettingsSection>
            <SettingsSection title="Экранная викторина">
                <HelperText>Локальные настройки этого информационного экрана в шаблоне "Экранная викторина".</HelperText>
                <Select
                    label="Таймер на этом экране"
                    value={screenQuiz.showTimer === undefined ? 'inherit' : screenQuiz.showTimer ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ showTimer: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Показать</option>
                    <option value="hide">Скрыть</option>
                </Select>
                <Input
                    label="Длительность таймера, сек"
                    type="number"
                    min="5"
                    max="180"
                    value={screenQuiz.timerSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ timerSeconds: parseOptionalNumber(e.target.value, 5, 180, 30) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Удержание перед таймером, сек"
                    type="number"
                    min="0"
                    max="8"
                    step="0.1"
                    value={screenQuiz.holdSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ holdSeconds: parseOptionalNumber(e.target.value, 0, 8, 1.2) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Пауза после сцены, сек"
                    type="number"
                    min="0.3"
                    max="8"
                    step="0.1"
                    value={screenQuiz.revealSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ revealSeconds: parseOptionalNumber(e.target.value, 0.3, 8, 1.4) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Переход, мс"
                    type="number"
                    min="80"
                    max="2000"
                    step="20"
                    value={screenQuiz.transitionMs ?? ''}
                    onChange={e => updateScreenQuiz({ transitionMs: parseOptionalNumber(e.target.value, 80, 2000, 340) })}
                    placeholder="Наследовать"
                />
            </SettingsSection>
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const AchievementSettings = React.memo(({ node, update }: { node: Node<AchievementNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    return (
        <SettingsSection title="Настройки достижения">
            <Input label="Название" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
            <Textarea label="Описание" value={data.description || ''} onChange={e => update(id, { description: e.target.value })} rows={4} />
            <UrlInput label="Иконка достижения" value={data.icon || ''} onChange={e => update(id, { icon: e.target.value })} placeholder="https://... (прямая ссылка на изображение)" />
        </SettingsSection>
    );
});

const ScoreSettings = React.memo(({ node, update }: { node: Node<ScoreNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    return (
        <SettingsSection title="Изменение очков">
            <Select label="Операция" value={data.operation || 'add'} onChange={e => update(id, { operation: e.target.value as ScoreNodeData['operation'] })}>
                <option value="add">Добавить</option>
                <option value="subtract">Вычесть</option>
                <option value="set">Установить</option>
            </Select>
            <Input label="Значение" type="number" value={data.value || 0} onChange={e => update(id, { value: parseInt(e.target.value, 10) })} />
        </SettingsSection>
    );
});

const VariableSettings = React.memo(({ node, update }: { node: Node<VariableNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    return (
        <SettingsSection title="Работа с переменной">
            <Input label="Имя переменной (системное)" value={data.variableName || ''} onChange={e => update(id, { variableName: e.target.value })} placeholder="например, Capital" />
            <Input label="Отображение на панели метрик" value={data.displayName || ''} onChange={e => update(id, { displayName: e.target.value })} placeholder="Капитал (необязательно)" />
            <HelperText>Если оставить поле "Отображение" пустым, система попытается перевести системное имя. Если перевод не найден, будет использовано системное имя.</HelperText>
            <Select label="Операция" value={data.operation || 'set'} onChange={e => update(id, { operation: e.target.value as VariableNodeData['operation'] })}>
                <option value="set">Установить</option>
                <option value="add">Добавить (для чисел)</option>
                <option value="subtract">Вычесть (для чисел)</option>
            </Select>
            <Input label="Значение" value={data.value || ''} onChange={e => update(id, { value: e.target.value })} />
        </SettingsSection>
    );
});

const ConditionSettings = React.memo(({ node, update }: { node: Node<ConditionNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    return (
        <SettingsSection title="Настройка условия">
            <HelperText>Выход 'True' - верхняя точка, 'False' - нижняя.</HelperText>
            <Input label="Переменная для проверки" value={data.variable || ''} onChange={e => update(id, { variable: e.target.value })} placeholder="score или имя переменной" />
            <Select label="Оператор" value={data.operator || 'eq'} onChange={e => update(id, { operator: e.target.value as ConditionNodeData['operator'] })}>
                <option value="eq">== (равно)</option>
                <option value="neq">!= (не равно)</option>
                <option value="gt">&gt; (больше)</option>
                <option value="lt">&lt; (меньше)</option>
                <option value="gte">&gt;= (больше или равно)</option>
                <option value="lte">&lt;= (меньше или равно)</option>
            </Select>
            <Input label="Значение для сравнения" value={data.value || ''} onChange={e => update(id, { value: e.target.value })} />
        </SettingsSection>
    );
});

const GoToSettings = React.memo(({ node, update }: { node: Node<GoToNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const nodeOptions = useDerivedNodes(
        (nodes) => nodes
            .filter(n => n.id !== id)
            .map(n => ({
                id: n.id,
                label: n.data.title || n.data.label || `${getNodeTypeName(n.type as CustomNodeType)} (${n.id.substring(0, 5)})`
            })),
        (a, b) => a.length === b.length && a.every((item, i) => item.id === b[i].id && item.label === b[i].label)
    );

    return (
        <SettingsSection title="Настройки перехода">
            <HelperText>Выберите узел, на который нужно совершить переход. Если оставить пустым, переход будет к следующему узлу по стандартной связи.</HelperText>
            <Select label="Целевой узел" value={data.targetNodeId || ''} onChange={e => update(id, { targetNodeId: e.target.value })}>
                <option value="">-- Не выбрано --</option>
                {nodeOptions.map(n => (
                    <option key={n.id} value={n.id}>
                        {n.label}
                    </option>
                ))}
            </Select>
            <Input label="Или введите ID вручную" value={data.targetNodeId || ''} onChange={e => update(id, { targetNodeId: e.target.value })} placeholder="Введите ID узла" />
        </SettingsSection>
    );
});

const TimerSettings = React.memo(({ node, update }: { node: Node<TimerNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const nodeOptions = useDerivedNodes(
        (nodes) => nodes
            .filter(n => n.id !== id)
            .map(n => ({
                id: n.id,
                label: n.data.title || n.data.label || `${getNodeTypeName(n.type as CustomNodeType)} (${n.id.substring(0, 5)})`
            })),
        (a, b) => a.length === b.length && a.every((item, i) => item.id === b[i].id && item.label === b[i].label)
    );

    return (
        <SettingsSection title="Настройки таймера">
            <Input
                label="Задержка (сек)"
                type="number"
                value={data.duration || 0}
                onChange={e => update(id, { duration: parseInt(e.target.value) || 0 })}
                min="0"
            />
            <Select
                label="Действие после задержки"
                value={data.action || 'goToNext'}
                onChange={e => update(id, { action: e.target.value as TimerNodeData['action'] })}
            >
                <option value="goToNext">Перейти к следующему узлу</option>
                <option value="goToNode">Перейти к конкретному узлу</option>
            </Select>
            {data.action === 'goToNode' && (
                <Select
                    label="Целевой узел"
                    value={data.targetNodeId || ''}
                    onChange={e => update(id, { targetNodeId: e.target.value })}
                >
                    <option value="">-- Не выбрано --</option>
                    {nodeOptions.map(n => (
                        <option key={n.id} value={n.id}>
                            {n.label}
                        </option>
                    ))}
                </Select>
            )}
            <Input label="Текст кнопки пропуска" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="Пропустить" />
        </SettingsSection>
    );
});

const CollectInfoSettings = React.memo(({ node, update }: { node: Node<CollectInfoNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { title = '', description = '' } = data;
    const fields: FormField[] = data.fields ?? [];

    const handleFieldChange = <T extends keyof FormField,>(index: number, prop: T, value: FormField[T]) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [prop]: value };
        update(id, { fields: newFields });
    };

    const addField = () => {
        const newField: FormField = { id: `field-${Date.now()}`, label: 'Новое поле', type: 'text', variableName: 'newVar' };
        update(id, { fields: [...fields, newField] });
    };

    const removeField = (index: number) => {
        update(id, { fields: fields.filter((_, i) => i !== index) });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Содержимое формы">
                <Input label="Заголовок" value={title} onChange={(e) => update(id, { title: e.target.value })} />
                <Textarea label="Описание" value={description} onChange={(e) => update(id, { description: e.target.value })} rows={3} />
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Продолжить" />
            </SettingsSection>
            <SettingsSection title="Поля формы">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border border-gray-200/80 bg-white rounded-xl space-y-4">
                            <Input label="Название поля" value={field.label} onChange={(e) => handleFieldChange(index, 'label', e.target.value)} />
                            <Input label="Имя переменной для сохранения" value={field.variableName} onChange={(e) => handleFieldChange(index, 'variableName', e.target.value)} />
                            <Select label="Тип поля" value={field.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value as FormField['type'])}>
                                <option value="text">Текст</option>
                                <option value="email">Email</option>
                                <option value="number">Число</option>
                                <option value="tel">Телефон</option>
                            </Select>
                            <button onClick={() => removeField(index)} className="w-full text-xs text-red-600 hover:text-red-800 font-medium pt-3 border-t border-gray-200 text-left">Удалить поле</button>
                        </div>
                    ))}
                </div>
                <button onClick={addField} className="w-full text-sm py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200/80 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Добавить поле
                </button>
            </SettingsSection>
        </div>
    );
});

const FeedbackSettings = React.memo(({ node, update }: { node: Node<FeedbackNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const screenQuiz = data.screenQuiz || {};
    const updateScreenQuiz = (patch: Partial<NonNullable<FeedbackNodeData['screenQuiz']>>) => {
        const next = { ...screenQuiz, ...patch };
        Object.keys(next).forEach((key) => {
            if (next[key as keyof typeof next] === undefined) {
                delete next[key as keyof typeof next];
            }
        });
        update(id, { screenQuiz: Object.keys(next).length > 0 ? next : undefined });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Настройки сообщения">
                <Input label="Заголовок (опционально)" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Текст сообщения" value={data.message || ''} onChange={e => update(id, { message: e.target.value })} rows={4} />
                <UrlInput label="URL изображения (необязательно)" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} placeholder="https://example.com/image.png" />
                <UrlInput label="Видеофайл из медиатеки" value={data.videoUrl || ''} onChange={e => update(id, { videoUrl: e.target.value })} placeholder="https://.../video.mp4" />
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Далее" />
            </SettingsSection>
            <SettingsSection title="Экранная викторина">
                <HelperText>Локальные настройки этого экрана обратной связи в шаблоне "Экранная викторина".</HelperText>
                <Select
                    label="Таймер на этом экране"
                    value={screenQuiz.showTimer === undefined ? 'inherit' : screenQuiz.showTimer ? 'show' : 'hide'}
                    onChange={e => updateScreenQuiz({ showTimer: e.target.value === 'inherit' ? undefined : e.target.value === 'show' })}
                >
                    <option value="inherit">Наследовать</option>
                    <option value="show">Показать</option>
                    <option value="hide">Скрыть</option>
                </Select>
                <Input
                    label="Длительность таймера, сек"
                    type="number"
                    min="5"
                    max="180"
                    value={screenQuiz.timerSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ timerSeconds: parseOptionalNumber(e.target.value, 5, 180, 30) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Удержание перед таймером, сек"
                    type="number"
                    min="0"
                    max="8"
                    step="0.1"
                    value={screenQuiz.holdSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ holdSeconds: parseOptionalNumber(e.target.value, 0, 8, 1.2) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Пауза после сцены, сек"
                    type="number"
                    min="0.3"
                    max="8"
                    step="0.1"
                    value={screenQuiz.revealSeconds ?? ''}
                    onChange={e => updateScreenQuiz({ revealSeconds: parseOptionalNumber(e.target.value, 0.3, 8, 1.4) })}
                    placeholder="Наследовать"
                />
                <Input
                    label="Переход, мс"
                    type="number"
                    min="80"
                    max="2000"
                    step="20"
                    value={screenQuiz.transitionMs ?? ''}
                    onChange={e => updateScreenQuiz({ transitionMs: parseOptionalNumber(e.target.value, 80, 2000, 340) })}
                    placeholder="Наследовать"
                />
            </SettingsSection>
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const TimelineSettings = React.memo(({ node, update }: { node: Node<TimelineNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { question = '' } = data;
    const events: TimelineEvent[] = data.events ?? [];
    const importantTalks = data.importantTalks || {};

    const updateImportantTalks = (patch: Partial<NonNullable<TimelineNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };

    const handleEventTextChange = (index: number, text: string) => {
        const newEvents = [...events];
        newEvents[index] = { ...newEvents[index], text };
        update(id, { events: newEvents });
    };

    const addEvent = () => {
        const newEvent: TimelineEvent = { id: `evt-${Date.now()}`, text: `Событие ${events.length + 1}` };
        update(id, { events: [...events, newEvent] });
    };

    const removeEvent = (index: number) => {
        update(id, { events: events.filter((_, i) => i !== index) });
    };

    const moveEvent = (index: number, direction: 'up' | 'down') => {
        const newEvents = [...events];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newEvents.length) return;

        [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]]; // Swap
        update(id, { events: newEvents });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Содержимое вопроса">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Текст вопроса" value={question} onChange={(e) => update(id, { question: e.target.value })} rows={3} />
                <UrlInput label="Картинка (необязательно)" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} />
                <Input
                    label="Подсказка для «Разговоров о важном»"
                    value={importantTalks.hint ?? ''}
                    onChange={e => updateImportantTalks({ hint: e.target.value })}
                    placeholder="Переместите карточки в правильном порядке"
                />
            </SettingsSection>
            <SettingsSection title="События (в правильном порядке)">
                <div className="space-y-2">
                    {events.map((event, index) => (
                        <div key={event.id} className="flex items-center gap-1.5 bg-white p-1.5 border border-gray-200/80 rounded-lg">
                            <div className="flex flex-col">
                                <button onClick={() => moveEvent(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
                                <button onClick={() => moveEvent(index, 'down')} disabled={index === events.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
                            </div>
                            <input
                                id={`sort-event-text-${id}-${event.id}`}
                                name={`sort-event-text-${id}-${event.id}`}
                                type="text"
                                value={event.text}
                                onChange={(e) => handleEventTextChange(index, e.target.value)}
                                className="flex-grow bg-slate-50 border border-slate-200/80 rounded-md py-2 px-2.5 text-sm"
                            />
                            <button onClick={() => removeEvent(index)} className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={addEvent} className="w-full text-sm py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200/80 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Добавить событие
                </button>
            </SettingsSection>
            <SettingsSection title="Кнопка">
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Проверить" />
            </SettingsSection>
            <ImportantTalksInteractionSettings
                timer={data.timer}
                content={importantTalks}
                updateTimer={nextTimer => update(id, { timer: nextTimer })}
                updateContent={updateImportantTalks}
            />
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const MatchingSettings = React.memo(({ node, update }: { node: Node<MatchingNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { question = '' } = data;
    const leftColumn: MatchColumnItem[] = data.leftColumn ?? [];
    const rightColumn: MatchColumnItem[] = data.rightColumn ?? [];
    const correctPairs: MatchPair[] = data.correctPairs ?? [];
    const importantTalks = data.importantTalks || {};

    const updateImportantTalks = (patch: Partial<NonNullable<MatchingNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };

    const handleColumnChange = (columnIndex: 'leftColumn' | 'rightColumn', itemIndex: number, prop: 'text' | 'imageUrl', value: string) => {
        const column = columnIndex === 'leftColumn' ? leftColumn : rightColumn;
        const newColumn = [...column];
        if (!newColumn[itemIndex]) return;
        newColumn[itemIndex] = { ...newColumn[itemIndex], [prop]: value };
        update(id, { [columnIndex]: newColumn });
    };

    const addColumnItem = (columnIndex: 'leftColumn' | 'rightColumn') => {
        const prefix = columnIndex === 'leftColumn' ? 'l' : 'r';
        const column = columnIndex === 'leftColumn' ? leftColumn : rightColumn;
        const newItem: MatchColumnItem = { id: `${prefix}-${Date.now()}`, text: `Элемент ${column.length + 1}`, imageUrl: '' };
        update(id, { [columnIndex]: [...column, newItem] });
    };

    const removeColumnItem = (columnIndex: 'leftColumn' | 'rightColumn', itemIndex: number) => {
        const column = columnIndex === 'leftColumn' ? leftColumn : rightColumn;
        const itemIdToRemove = column[itemIndex]?.id;
        if (!itemIdToRemove) return;
        const newColumn = column.filter((_: MatchColumnItem, i: number) => i !== itemIndex);
        const newPairs = correctPairs.filter(p => p.leftId !== itemIdToRemove && p.rightId !== itemIdToRemove);
        update(id, { [columnIndex]: newColumn, correctPairs: newPairs });
    };

    const addPair = () => {
        const newPair: MatchPair = { leftId: '', rightId: '' };
        update(id, { correctPairs: [...correctPairs, newPair] });
    };

    const removePair = (index: number) => {
        update(id, { correctPairs: correctPairs.filter((_, i) => i !== index) });
    };

    const handlePairChange = (index: number, side: 'leftId' | 'rightId', value: string) => {
        const newPairs = [...correctPairs];
        newPairs[index] = { ...newPairs[index], [side]: value };
        update(id, { correctPairs: newPairs });
    };

    const renderColumnEditor = (title: string, column: MatchColumnItem[], key: 'leftColumn' | 'rightColumn') => (
        <SettingsSection title={title}>
            <div className="space-y-3">
                {column.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200/80 bg-white rounded-xl space-y-4">
                        {item.imageUrl && (
                            <div className="mb-2 p-2 bg-slate-50 rounded-lg">
                                <img src={item.imageUrl} alt="Предпросмотр" className="w-full h-auto max-h-40 object-contain rounded-md" onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                }} />
                            </div>
                        )}
                        <Input
                            label={item.imageUrl ? "Метка для редактора (не видна в квизе)" : "Текст элемента"}
                            value={item.text}
                            onChange={(e) => handleColumnChange(key, index, 'text', e.target.value)}
                        />
                        <UrlInput
                            label="URL изображения (необязательно)"
                            value={item.imageUrl || ''}
                            onChange={(e) => handleColumnChange(key, index, 'imageUrl', e.target.value)}
                        />
                        <button onClick={() => removeColumnItem(key, index)} className="w-full text-xs text-red-600 hover:text-red-800 font-medium pt-3 border-t border-gray-200 text-left">Удалить элемент</button>
                    </div>
                ))}
            </div>
            <button onClick={() => addColumnItem(key)} className="w-full text-sm py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200/80 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Добавить элемент
            </button>
        </SettingsSection>
    );

    return (
        <div className="space-y-8">
            <SettingsSection title="Содержимое вопроса">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Текст вопроса" value={question} onChange={(e) => update(id, { question: e.target.value })} rows={3} />
                <Input
                    label="Подсказка для «Разговоров о важном»"
                    value={importantTalks.hint ?? ''}
                    onChange={event => updateImportantTalks({ hint: event.target.value })}
                    placeholder="Выберите ценность слева, затем подходящий пример справа"
                />
                <Input
                    label="Название левой колонки"
                    value={importantTalks.leftTitle ?? ''}
                    onChange={event => updateImportantTalks({ leftTitle: event.target.value })}
                    placeholder="Ценность"
                />
                <Input
                    label="Название правой колонки"
                    value={importantTalks.rightTitle ?? ''}
                    onChange={event => updateImportantTalks({ rightTitle: event.target.value })}
                    placeholder="Пример поведения"
                />
            </SettingsSection>
            <HelperText>Для каждого элемента укажите либо текст, либо URL изображения.</HelperText>
            {renderColumnEditor('Левая колонка', leftColumn, 'leftColumn')}
            {renderColumnEditor('Правая колонка', rightColumn, 'rightColumn')}
            <SettingsSection title="Правильные пары">
                <div className="space-y-2">
                    {correctPairs.map((pair, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white border border-gray-200/80 rounded-lg">
                            <select id={`matching-pair-left-${id}-${index}`} name={`matching-pair-left-${id}-${index}`} value={pair.leftId} onChange={(e) => handlePairChange(index, 'leftId', e.target.value)} className="w-full bg-slate-50 border-slate-200/80 rounded-md text-xs py-2 px-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                <option value="">-- Лево --</option>
                                {leftColumn.map(item => <option key={item.id} value={item.id}>{item.text || 'Изображение'}</option>)}
                            </select>
                            <span className="text-gray-400 font-bold">=</span>
                            <select id={`matching-pair-right-${id}-${index}`} name={`matching-pair-right-${id}-${index}`} value={pair.rightId} onChange={(e) => handlePairChange(index, 'rightId', e.target.value)} className="w-full bg-slate-50 border-slate-200/80 rounded-md text-xs py-2 px-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                <option value="">-- Право --</option>
                                {rightColumn.map(item => <option key={item.id} value={item.id}>{item.text || 'Изображение'}</option>)}
                            </select>
                            <button onClick={() => removePair(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50">&times;</button>
                        </div>
                    ))}
                </div>
                <button onClick={addPair} className="w-full text-sm py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200/80 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Добавить пару
                </button>
            </SettingsSection>
            <SettingsSection title="Кнопка">
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Проверить" />
            </SettingsSection>
            <ImportantTalksInteractionSettings
                timer={data.timer}
                content={importantTalks}
                updateTimer={nextTimer => update(id, { timer: nextTimer })}
                updateContent={updateImportantTalks}
            />
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const TextInputSettings = React.memo(({ node, update }: { node: Node<TextInputNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const importantTalks = data.importantTalks || {};
    const updateImportantTalks = (patch: Partial<NonNullable<TextInputNodeData['importantTalks']>>) => {
        update(id, { importantTalks: { ...importantTalks, ...patch } });
    };
    return (
        <div className="space-y-8">
            <SettingsSection title="Содержимое вопроса">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Текст вопроса" value={data.question || ''} onChange={e => update(id, { question: e.target.value })} rows={4} />
                <UrlInput label="Картинка (необязательно)" value={data.imageUrl || ''} onChange={e => update(id, { imageUrl: e.target.value })} />
                <Input label="Placeholder поля" value={data.placeholder || ''} onChange={e => update(id, { placeholder: e.target.value })} placeholder="Ваш ответ..." />
            </SettingsSection>
            <SettingsSection title="Экран «Разговоров о важном»">
                <Input
                    label="Заголовок итоговой подсказки"
                    value={importantTalks.insightTitle ?? ''}
                    onChange={e => updateImportantTalks({ insightTitle: e.target.value })}
                    placeholder="Ваше мнение важно"
                />
                <Textarea
                    label="Текст итоговой подсказки"
                    value={importantTalks.hint ?? ''}
                    onChange={e => updateImportantTalks({ hint: e.target.value })}
                    rows={3}
                    placeholder="Ваш ответ поможет понять, что действительно имеет значение..."
                />
                <Input
                    label="Максимум символов"
                    type="number"
                    min="50"
                    max="1000"
                    step="10"
                    value={importantTalks.maxLength ?? ''}
                    onChange={e => updateImportantTalks({ maxLength: parseOptionalNumber(e.target.value, 50, 1000, 300) })}
                    placeholder="300"
                />
            </SettingsSection>
            <SettingsSection title="Проверка ответа">
                <HelperText>Ответ считается верным, если он содержит ключевое слово. Проверка нечувствительна к регистру.</HelperText>
                <Input label="Ключевое слово" value={data.keyword || ''} onChange={e => update(id, { keyword: e.target.value })} />
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="По умолчанию: Проверить" />
            </SettingsSection>
            <ImportantTalksInteractionSettings
                timer={data.timer}
                content={importantTalks}
                updateTimer={nextTimer => update(id, { timer: nextTimer })}
                updateContent={updateImportantTalks}
            />
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const AllocatorSettings = React.memo(({ node, update }: { node: Node<AllocatorNodeData>, update: UpdateNodeData }) => {
    const { id, data } = node;
    const { maxTotal = 100 } = data;
    const items: AllocatorItem[] = data.items ?? [];

    const addItem = () => {
        const newItem = {
            id: `item-${Date.now()}`,
            label: `Категория ${items.length + 1}`,
            variableName: `cat_${items.length + 1}`,
            defaultValue: 0
        };
        update(id, { items: [...items, newItem] });
    };

    const removeItem = (idx: number) => update(id, { items: items.filter((_, i) => i !== idx) });

    const updateItem = (idx: number, field: keyof AllocatorItem, value: AllocatorItem[keyof AllocatorItem]) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        update(id, { items: newItems });
    };

    return (
        <div className="space-y-8">
            <SettingsSection title="Задача">
                <Input label="Заголовок" value={data.title || ''} onChange={e => update(id, { title: e.target.value })} />
                <Textarea label="Вопрос / Задание" value={data.question || ''} onChange={e => update(id, { question: e.target.value })} rows={3} />
                <Input label="Макс. сумма (Лимит)" type="number" value={maxTotal} onChange={e => update(id, { maxTotal: parseInt(e.target.value) || 100 })} />
            </SettingsSection>
            
            <SettingsSection title="Категории распределения">
                {items.map((item, i) => (
                    <div key={item.id} className="bg-white border border-gray-200/80 p-3 rounded-lg mb-2 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded">#{i+1}</span>
                            <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-red-600">✕</button>
                        </div>
                        <Input label="Название (Label)" value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} />
                        <Input label="Переменная (Variable)" value={item.variableName} onChange={e => updateItem(i, 'variableName', e.target.value)} />
                    </div>
                ))}
                <button onClick={addItem} className="w-full py-2 bg-teal-50 text-teal-600 rounded-lg text-sm font-semibold border border-teal-200 hover:bg-teal-100">+ Добавить категорию</button>
            </SettingsSection>
            
            <SettingsSection title="Кнопка">
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="Подтвердить" />
            </SettingsSection>
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const MOOD_OPTIONS = [
    { value: 'neutral', label: 'Нейтральный', emoji: '😐', color: 'bg-gray-100 text-gray-700' },
    { value: 'excited', label: 'Восторженный', emoji: '😄', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'serious', label: 'Серьёзный', emoji: '😌', color: 'bg-blue-100 text-blue-700' },
    { value: 'sad', label: 'Печальный', emoji: '😢', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'mysterious', label: 'Таинственный', emoji: '🤔', color: 'bg-purple-100 text-purple-700' },
];

const DialogueSettings: React.FC<{ node: Node<DialogueNodeData>; update: UpdateNodeData }> = React.memo(({ node, update }) => {
    const { data, id } = node;
    const currentMood = MOOD_OPTIONS.find(m => m.value === (data.mood || 'neutral')) || MOOD_OPTIONS[0];

    return (
        <div className="space-y-8">
            {/* Preview Card */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200/60 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white border-2 border-orange-200 flex items-center justify-center">
                        {data.characterAvatar ? (
                            <img
                                src={data.characterAvatar}
                                alt={data.characterName || ''}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.classList.add('fallback'); }}
                            />
                        ) : null}
                        {!data.characterAvatar && (
                            <svg className="w-7 h-7 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-orange-800 truncate">
                            {data.characterName || 'Имя персонажа'}
                        </div>
                        {data.characterRole && (
                            <div className="text-sm text-orange-500 truncate">
                                {data.characterRole}
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm">{currentMood.emoji}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${currentMood.color}`}>
                                {currentMood.label}
                            </span>
                        </div>
                    </div>
                </div>
                {data.dialogueText && (
                    <div className="mt-3 text-sm text-gray-600 italic border-l-2 border-orange-300 pl-3 line-clamp-2">
                        {data.dialogueText}
                    </div>
                )}
            </div>

            <SettingsSection title="Персонаж">
                <UrlInput
                    label="Аватар"
                    value={data.characterAvatar || ''}
                    onChange={e => update(id, { characterAvatar: e.target.value })}
                    placeholder="URL изображения персонажа"
                />
                <Input label="Имя" value={data.characterName || ''} onChange={e => update(id, { characterName: e.target.value })} placeholder="доктор Лин Чжан" />
                <Input label="Роль / Должность" value={data.characterRole || ''} onChange={e => update(id, { characterRole: e.target.value })} placeholder="Структурный микробиолог" />
            </SettingsSection>

            <SettingsSection title="Текст диалога">
                <Textarea label="Текст" value={data.dialogueText || ''} onChange={e => update(id, { dialogueText: e.target.value })} rows={8} placeholder="Текст диалога. Поддерживает Markdown..." />
                <MarkdownPreview text={data.dialogueText} />
                <HelperText>
                    Поддерживается Markdown: **жирный**, *курсив*, [ссылка](url), - списки, ## заголовки. Переменные: {'{playerName}'}, {'{score}'}
                </HelperText>
            </SettingsSection>

            <SettingsSection title="Оформление">
                <Select label="Настроение персонажа" value={data.mood || 'neutral'} onChange={e => update(id, { mood: e.target.value as NonNullable<DialogueNodeData['mood']> })}>
                    {MOOD_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>
                    ))}
                </Select>
                <Select label="Выравнивание текста" value={data.textAlign || 'left'} onChange={e => update(id, { textAlign: e.target.value as NonNullable<DialogueNodeData['textAlign']> })}>
                    <option value="left">По левому краю</option>
                    <option value="center">По центру</option>
                </Select>
            </SettingsSection>

            <SettingsSection title="Кнопка">
                <Input label="Текст кнопки" value={data.buttonText || ''} onChange={e => update(id, { buttonText: e.target.value })} placeholder="Далее" />
            </SettingsSection>
             <NodeSoundSettingsSection node={node} update={update} />
        </div>
    );
});

const SettingsPanel: React.FC = () => {
    const selectedNode = useCanvasStore(selectPrimarySelectedNode);
    const updateNodeData = useCanvasStore(s => s.updateNodeData);
    const clearSelection = useCanvasStore(s => s.clearSelection);
    const closeSettingsPanel = useUIStore(s => s.closeSettingsPanel);

    const closePanel = () => {
        clearSelection();
        closeSettingsPanel();
    };

    const settingsContent = useMemo(() => {
        if (!selectedNode) return null;
        switch (selectedNode.type) {
            case CustomNodeType.Question:
                return <QuestionSettings node={selectedNode as Node<QuestionNodeData>} update={updateNodeData} />;
            case CustomNodeType.MultipleChoice:
                return <MultipleChoiceSettings node={selectedNode as Node<MultipleChoiceNodeData>} update={updateNodeData} />;
            case CustomNodeType.Result:
                return <ResultSettings node={selectedNode as Node<ResultNodeData>} update={updateNodeData} />;
            case CustomNodeType.Info:
                return <InfoSettings node={selectedNode as Node<InfoNodeData>} update={updateNodeData} />;
            case CustomNodeType.Score:
                return <ScoreSettings node={selectedNode as Node<ScoreNodeData>} update={updateNodeData} />;
            case CustomNodeType.Variable:
                return <VariableSettings node={selectedNode as Node<VariableNodeData>} update={updateNodeData} />;
            case CustomNodeType.Condition:
                return <ConditionSettings node={selectedNode as Node<ConditionNodeData>} update={updateNodeData} />;
            case CustomNodeType.GoTo:
                return <GoToSettings node={selectedNode as Node<GoToNodeData>} update={updateNodeData} />;
            case CustomNodeType.CollectInfo:
                return <CollectInfoSettings node={selectedNode as Node<CollectInfoNodeData>} update={updateNodeData} />;
            case CustomNodeType.Feedback:
                return <FeedbackSettings node={selectedNode as Node<FeedbackNodeData>} update={updateNodeData} />;
            case CustomNodeType.Timer:
                return <TimerSettings node={selectedNode as Node<TimerNodeData>} update={updateNodeData} />;
            case CustomNodeType.Timeline:
                return <TimelineSettings node={selectedNode as Node<TimelineNodeData>} update={updateNodeData} />;
            case CustomNodeType.Matching:
                return <MatchingSettings node={selectedNode as Node<MatchingNodeData>} update={updateNodeData} />;
            case CustomNodeType.TextInput:
                return <TextInputSettings node={selectedNode as Node<TextInputNodeData>} update={updateNodeData} />;
            case CustomNodeType.Achievement:
                return <AchievementSettings node={selectedNode as Node<AchievementNodeData>} update={updateNodeData} />;
            case CustomNodeType.Allocator:
                return <AllocatorSettings node={selectedNode as Node<AllocatorNodeData>} update={updateNodeData} />;
            case CustomNodeType.Group:
                return <GroupSettings node={selectedNode as Node<GroupNodeData>} update={updateNodeData} />;
            case CustomNodeType.Formula:
                return <FormulaSettings node={selectedNode as Node<FormulaNodeData>} update={updateNodeData} />;
            case CustomNodeType.Progression:
                return <ProgressionSettings node={selectedNode as Node<ProgressionNodeData>} update={updateNodeData} />;
            case CustomNodeType.Dialogue:
                return <DialogueSettings node={selectedNode as Node<DialogueNodeData>} update={updateNodeData} />;
            default:
                return <p className="text-sm text-gray-500 p-4 text-center">Настройки для этого типа узла не найдены.</p>;
        }
    }, [selectedNode, updateNodeData]);

    return (
        <aside className="w-96 h-full bg-white border-l border-gray-200/75 shadow-sm overflow-hidden">
            <div className="w-full h-full p-6 overflow-y-auto relative">
                {!selectedNode && (
                    <button
                        type="button"
                        onClick={closePanel}
                        className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        aria-label="Закрыть панель настроек"
                        title="Закрыть панель настроек"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
                {!selectedNode ? (
                    <DesignPanel />
                ) : (
                    <>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-bold font-manrope text-gray-800">Настройки узла</h2>
                                <p className="text-sm text-gray-500">{getNodeTypeName(selectedNode.type as CustomNodeType)}</p>
                            </div>
                            <button type="button" onClick={closePanel} aria-label="Закрыть панель настроек" title="Закрыть панель настроек" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        {/* Node ID Display */}
                        <div className="mb-6 relative group">
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2">
                                <div className="flex flex-col min-w-0">
                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ID</span>
                                     <code className="text-xs font-mono text-gray-600 truncate select-all" title={selectedNode.id}>
                                        {selectedNode.id}
                                     </code>
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedNode.id);
                                        toast.success('ID скопирован');
                                    }}
                                    className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all shadow-sm"
                                    title="Копировать ID"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {settingsContent}
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};

export default SettingsPanel;

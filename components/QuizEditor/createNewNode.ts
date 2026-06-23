import type { Node } from 'reactflow';
import { CustomNodeType, NodeData } from '../../types';

type FlowNode<T = any> = Node<T>;

export interface QuickAddPos {
    screen: { x: number; y: number };
    local: { x: number; y: number };
}

function freshNodeData(type: CustomNodeType): NodeData {
    const id = () =>
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const map: Record<CustomNodeType, Partial<NodeData>> = {
        [CustomNodeType.Start]: { label: 'Старт' },
        [CustomNodeType.Question]: {
            label: 'Новый вопрос',
            question: 'Текст вопроса?',
            answers: [{ id: id(), text: 'Ответ 1' }],
        },
        [CustomNodeType.MultipleChoice]: {
            label: 'Множественный выбор',
            question: 'Выберите подходящие варианты:',
            answers: [
                { id: id(), text: 'Ответ 1' },
                { id: id(), text: 'Ответ 2' },
            ],
        },
        [CustomNodeType.Result]: {
            label: 'Результат',
            title: 'Ваш результат',
            description: 'Описание результата.',
            showScore: true,
        },
        [CustomNodeType.Info]: {
            label: 'Информация',
            title: 'Информационный блок',
            description: 'Здесь вы можете разместить правила.',
        },
        [CustomNodeType.Condition]: {
            label: 'Условие',
            variable: 'score',
            operator: 'eq',
            value: 10,
        },
        [CustomNodeType.Score]: { label: 'Изменить очки', operation: 'add', value: 10 },
        [CustomNodeType.Variable]: {
            label: 'Задать переменную',
            variableName: 'myVar',
            operation: 'set',
            value: 'someValue',
        },
        [CustomNodeType.Formula]: {
            label: 'Формула',
            variableName: 'result',
            expression: '2 + 2',
        },
        [CustomNodeType.GoTo]: { label: 'Переход', targetNodeId: '' },
        [CustomNodeType.CollectInfo]: {
            label: 'Сбор данных',
            title: 'Введите ваши данные',
            description: '',
            fields: [{ id: 'f-1', label: 'Email', type: 'email', variableName: 'userEmail' }],
        },
        [CustomNodeType.Feedback]: { label: 'Обратная связь', message: 'Правильный ответ!' },
        [CustomNodeType.Timer]: { label: 'Таймер', duration: 5, action: 'goToNext' },
        [CustomNodeType.Timeline]: {
            label: 'Хронология',
            question: 'Расположите события в правильном порядке',
            events: [
                { id: 'evt-1', text: 'Событие 1' },
                { id: 'evt-2', text: 'Событие 2' },
            ],
        },
        [CustomNodeType.Matching]: {
            label: 'Сопоставление',
            question: 'Соотнесите элементы',
            leftColumn: [{ id: 'l-1', text: 'Элемент А' }],
            rightColumn: [{ id: 'r-1', text: 'Элемент 1' }],
            correctPairs: [{ leftId: 'l-1', rightId: 'r-1' }],
        },
        [CustomNodeType.TextInput]: {
            label: 'Ввод текста',
            question: 'Введите столицу Франции:',
            keyword: 'Париж',
        },
        [CustomNodeType.Achievement]: {
            label: 'Достижение',
            title: 'Новое достижение',
            description: 'Описание достижения',
        },
        [CustomNodeType.Group]: { label: 'Новая группа' },
        [CustomNodeType.Allocator]: {
            label: 'Распределение',
            question: 'Распределите бюджет',
            maxTotal: 100,
            items: [
                { id: '1', label: 'Категория 1', variableName: 'cat1', defaultValue: 0 },
                { id: '2', label: 'Категория 2', variableName: 'cat2', defaultValue: 0 },
            ],
        },
        [CustomNodeType.Progression]: {
            label: 'Прогрессия ранга',
            levelVar: 'rankLevel',
            nameVar: 'rankName',
            lockDegrade: true,
            onLevelUpHandle: 'levelUp',
            rules: [
                {
                    id: id(),
                    level: 1,
                    name: 'Новичок',
                    requireAll: true,
                    requirements: [{ id: id(), type: 'minScore', value: 0 }],
                },
            ],
        },
        [CustomNodeType.Dialogue]: {
            label: 'Диалог',
            characterName: 'Персонаж',
            characterRole: '',
            characterAvatar: '',
            dialogueText: 'Текст диалога...',
            mood: 'neutral',
            buttonText: 'Далее',
        },
    };

    return (map[type] || { label: `Новый узел ${type}` }) as NodeData;
}

export const createNewNode = (
    type: CustomNodeType,
    position: { x: number; y: number }
): FlowNode<NodeData> => {
    const newNodeId = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const baseNodeProps = { id: newNodeId, type, position };
    const style = type === CustomNodeType.Group ? { width: 400, height: 300 } : undefined;

    return { ...baseNodeProps, data: freshNodeData(type), ...(style ? { style } : {}) };
};

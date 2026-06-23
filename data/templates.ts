
import { QuizData } from '../types.ts';

export interface Template {
    id: string;
    title: string;
    description: string;
    tags: string[];
    gradient: string;
    data: QuizData;
}

export const TEMPLATES: Template[] = [
    {
        id: 'linear-quiz',
        title: 'Быстрый старт',
        description: 'Классический линейный опрос. Идеально для сбора обратной связи или простого тестирования.',
        tags: ['Опрос', 'Линейный', 'Базовый'],
        gradient: 'from-blue-500 to-cyan-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'q1', type: 'questionNode', position: { x: 0, y: 150 }, data: { label: 'Вопрос 1', question: 'Как вы оцениваете наш сервис?', answers: [{id: 'a1', text: 'Отлично'}, {id: 'a2', text: 'Хорошо'}, {id: 'a3', text: 'Плохо'}] } },
                { id: 'q2', type: 'textInputNode', position: { x: 0, y: 450 }, data: { label: 'Вопрос 2', question: 'Что мы можем улучшить?', keyword: '' } },
                { id: 'end', type: 'resultNode', position: { x: 0, y: 750 }, data: { label: 'Финал', title: 'Спасибо!', description: 'Ваше мнение очень важно для нас.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'q1', sourceHandle: null, targetHandle: null },
                { id: 'e2', source: 'q1', target: 'q2', sourceHandle: 'a1', targetHandle: null },
                { id: 'e3', source: 'q1', target: 'q2', sourceHandle: 'a2', targetHandle: null },
                { id: 'e4', source: 'q1', target: 'q2', sourceHandle: 'a3', targetHandle: null },
                { id: 'e5', source: 'q2', target: 'end', sourceHandle: 'correct', targetHandle: null },
                { id: 'e6', source: 'q2', target: 'end', sourceHandle: 'incorrect', targetHandle: null }
            ],
            globalTimer: { enabled: false, duration: 600, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#f0f9ff', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Inter', sans-serif", headingColor: '#0c4a6e', bodyTextColor: '#334155' },
                buttons: { backgroundColor: '#0ea5e9', textColor: '#ffffff', hoverBackgroundColor: '#0284c7', hoverTextColor: '#ffffff', borderRadius: 8 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#334155', hoverBackgroundColor: '#e0f2fe', hoverTextColor: '#0369a1', selectedBackgroundColor: '#bae6fd', selectedTextColor: '#0284c7', borderRadius: 12 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Опрос пользователей'
        }
    },
    {
        id: 'branching-story',
        title: 'Сюжетный выбор',
        description: 'Нелинейная история, где выбор пользователя меняет ход событий. Подходит для обучающих кейсов.',
        tags: ['Сценарий', 'Ветвление', 'Сторителлинг'],
        gradient: 'from-purple-500 to-pink-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'intro', type: 'infoNode', position: { x: 0, y: 150 }, data: { label: 'Введение', title: 'Начало пути', description: 'Вы стоите на развилке. Куда пойдете?', buttonText: 'Выбрать' } },
                { id: 'choice', type: 'questionNode', position: { x: 0, y: 400 }, data: { label: 'Развилка', question: 'Выберите путь:', answers: [{id: 'left', text: 'Налево (Лес)'}, {id: 'right', text: 'Направо (Горы)'}] } },
                { id: 'forest', type: 'infoNode', position: { x: -200, y: 700 }, data: { label: 'Лес', title: 'Темный лес', description: 'Здесь тихо и спокойно...', buttonText: 'Идти дальше' } },
                { id: 'mountain', type: 'infoNode', position: { x: 200, y: 700 }, data: { label: 'Горы', title: 'Высокие горы', description: 'Тяжелый подъем, но вид того стоит!', buttonText: 'Идти дальше' } },
                { id: 'end', type: 'resultNode', position: { x: 0, y: 1000 }, data: { label: 'Конец', title: 'Приключение завершено', description: 'Вы отлично справились.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'intro', sourceHandle: null, targetHandle: null },
                { id: 'e2', source: 'intro', target: 'choice', sourceHandle: null, targetHandle: null },
                { id: 'e3', source: 'choice', target: 'forest', sourceHandle: 'left', targetHandle: null },
                { id: 'e4', source: 'choice', target: 'mountain', sourceHandle: 'right', targetHandle: null },
                { id: 'e5', source: 'forest', target: 'end', sourceHandle: null, targetHandle: null },
                { id: 'e6', source: 'mountain', target: 'end', sourceHandle: null, targetHandle: null }
            ],
            globalTimer: { enabled: false, duration: 600, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#faf5ff', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Merriweather', serif", headingColor: '#581c87', bodyTextColor: '#4c1d95' },
                buttons: { backgroundColor: '#9333ea', textColor: '#ffffff', hoverBackgroundColor: '#7e22ce', hoverTextColor: '#ffffff', borderRadius: 16 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#581c87', hoverBackgroundColor: '#f3e8ff', hoverTextColor: '#6b21a8', selectedBackgroundColor: '#d8b4fe', selectedTextColor: '#581c87', borderRadius: 16 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Лесная история'
        }
    },
    {
        id: 'eco-sim',
        title: 'Бизнес-симулятор',
        description: 'Сложная модель с ресурсами и формулами. Распределяйте бюджет и следите за показателями.',
        tags: ['Симуляция', 'Экономика', 'Сложный'],
        gradient: 'from-emerald-500 to-teal-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'var-budget', type: 'variableNode', position: { x: 0, y: 150 }, data: { label: 'Бюджет', variableName: 'budget', operation: 'set', value: '1000' } },
                { id: 'alloc', type: 'allocatorNode', position: { x: 0, y: 350 }, data: { label: 'Инвестиции', question: 'Распределите $1000', maxTotal: 1000, items: [{id: 'i1', label: 'Маркетинг', variableName: 'marketing', defaultValue: 0}, {id: 'i2', label: 'Продукт', variableName: 'product', defaultValue: 0}] } },
                { id: 'calc', type: 'formulaNode', position: { x: 0, y: 650 }, data: { label: 'Расчет', variableName: 'profit', expression: '(marketing * 1.5) + (product * 1.2)' } },
                { id: 'res', type: 'resultNode', position: { x: 0, y: 900 }, data: { label: 'Итог', title: 'Результаты квартала', description: 'Ваша прибыль: {{profit}}', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'var-budget', sourceHandle: null, targetHandle: null },
                { id: 'e2', source: 'var-budget', target: 'alloc', sourceHandle: null, targetHandle: null },
                { id: 'e3', source: 'alloc', target: 'calc', sourceHandle: null, targetHandle: null },
                { id: 'e4', source: 'calc', target: 'res', sourceHandle: null, targetHandle: null }
            ],
            globalTimer: { enabled: false, duration: 600, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#ecfdf5', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Roboto Mono', monospace", headingColor: '#064e3b', bodyTextColor: '#065f46' },
                buttons: { backgroundColor: '#10b981', textColor: '#ffffff', hoverBackgroundColor: '#059669', hoverTextColor: '#ffffff', borderRadius: 4 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#064e3b', hoverBackgroundColor: '#d1fae5', hoverTextColor: '#047857', selectedBackgroundColor: '#6ee7b7', selectedTextColor: '#064e3b', borderRadius: 4 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Стартап Симулятор'
        }
    },
    {
        id: 'exam-quiz',
        title: 'Экзамен / Тест',
        description: 'Строгая проверка знаний с подсчетом баллов. В конце выдается результат "Сдал" или "Не сдал".',
        tags: ['Образование', 'Оценка', 'Тест'],
        gradient: 'from-orange-500 to-red-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'reset-score', type: 'scoreNode', position: { x: 0, y: 100 }, data: { label: 'Сброс очков', operation: 'set', value: 0 } },
                { id: 'q1', type: 'multipleChoiceNode', position: { x: 0, y: 300 }, data: { label: 'Вопрос 1', question: 'Укажите столицу Австралии:', answers: [{id: 'a1', text: 'Сидней'}, {id: 'a2', text: 'Канберра'}, {id: 'a3', text: 'Мельбурн'}], correctOptions: ['a2'], scorePerCorrect: 10 } },
                { id: 'q2', type: 'questionNode', position: { x: 0, y: 600 }, data: { label: 'Вопрос 2', question: 'Сколько планет в Солнечной системе?', answers: [{id: 'a1', text: '8'}, {id: 'a2', text: '9'}] } },
                { id: 'score-calc', type: 'scoreNode', position: { x: -200, y: 800 }, data: { label: '+10 баллов', operation: 'add', value: 10 } },
                { id: 'cond', type: 'conditionNode', position: { x: 0, y: 1000 }, data: { label: 'Проверка', variable: 'score', operator: 'gte', value: 15 } },
                { id: 'pass', type: 'resultNode', position: { x: -200, y: 1200 }, data: { label: 'Сдал', title: 'Поздравляем!', description: 'Вы успешно сдали тест. Ваш результат: {{score}}', showScore: true } },
                { id: 'fail', type: 'resultNode', position: { x: 200, y: 1200 }, data: { label: 'Не сдал', title: 'Увы...', description: 'Попробуйте еще раз. Набрано: {{score}}', showScore: true } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'reset-score' },
                { id: 'e2', source: 'reset-score', target: 'q1' },
                { id: 'e3', source: 'q1', target: 'q2' },
                { id: 'e4', source: 'q2', target: 'score-calc', sourceHandle: 'a1' }, // Correct answer adds points
                { id: 'e5', source: 'q2', target: 'cond', sourceHandle: 'a2' },
                { id: 'e6', source: 'score-calc', target: 'cond' },
                { id: 'e7', source: 'cond', target: 'pass', sourceHandle: 'true' },
                { id: 'e8', source: 'cond', target: 'fail', sourceHandle: 'false' }
            ],
            globalTimer: { enabled: true, duration: 300, onTimeoutNodeId: 'fail' },
            designSettings: {
                background: { color: '#fff7ed', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Inter', sans-serif", headingColor: '#7c2d12', bodyTextColor: '#4c1d95' },
                buttons: { backgroundColor: '#ea580c', textColor: '#ffffff', hoverBackgroundColor: '#c2410c', hoverTextColor: '#ffffff', borderRadius: 6 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#7c2d12', hoverBackgroundColor: '#ffedd5', hoverTextColor: '#ea580c', selectedBackgroundColor: '#fdba74', selectedTextColor: '#7c2d12', borderRadius: 6 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Итоговый экзамен'
        }
    },
    {
        id: 'product-finder',
        title: 'Подбор продукта',
        description: 'Квиз-рекомендация. Помогает пользователю выбрать товар или услугу на основе его предпочтений.',
        tags: ['Маркетинг', 'E-commerce', 'Продажи'],
        gradient: 'from-pink-500 to-rose-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'q1', type: 'questionNode', position: { x: 0, y: 150 }, data: { label: 'Цель', question: 'Для чего вам нужен ноутбук?', answers: [{id: 'games', text: 'Игры'}, {id: 'work', text: 'Работа/Офис'}, {id: 'travel', text: 'Путешествия'}] } },
                { id: 'res-gaming', type: 'resultNode', position: { x: -300, y: 500 }, data: { label: 'Игровой', title: 'Вам подойдет BeastMaster X1', description: 'Мощная видеокарта и отличный экран.', imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', buttonText: 'Купить сейчас', showScore: false } },
                { id: 'res-work', type: 'resultNode', position: { x: 0, y: 500 }, data: { label: 'Рабочий', title: 'Вам подойдет OfficePro 15', description: 'Надежный, с долгой батареей.', imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80', buttonText: 'Купить сейчас', showScore: false } },
                { id: 'res-travel', type: 'resultNode', position: { x: 300, y: 500 }, data: { label: 'Легкий', title: 'Вам подойдет AirSlim 13', description: 'Весит всего 1кг. Идеален в дорогу.', imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3bd99?auto=format&fit=crop&w=800&q=80', buttonText: 'Купить сейчас', showScore: false } },
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'q1' },
                { id: 'e2', source: 'q1', target: 'res-gaming', sourceHandle: 'games' },
                { id: 'e3', source: 'q1', target: 'res-work', sourceHandle: 'work' },
                { id: 'e4', source: 'q1', target: 'res-travel', sourceHandle: 'travel' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#fff1f2', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Manrope', sans-serif", headingColor: '#881337', bodyTextColor: '#9f1239' },
                buttons: { backgroundColor: '#be123c', textColor: '#ffffff', hoverBackgroundColor: '#9f1239', hoverTextColor: '#ffffff', borderRadius: 24 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#881337', hoverBackgroundColor: '#ffe4e6', hoverTextColor: '#be123c', selectedBackgroundColor: '#f43f5e', selectedTextColor: '#ffffff', borderRadius: 24 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Подбор ноутбука'
        }
    },
    {
        id: 'literary-choice',
        title: 'Литературный выбор',
        description: 'Исследуйте мотивы персонажа, давая ученику сделать выбор за него. Это помогает глубже понять характер и авторский замысел.',
        tags: ['Литература', 'Психология', 'Сюжет'],
        gradient: 'from-amber-500 to-orange-600',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'intro', type: 'infoNode', position: { x: 0, y: 100 }, data: { label: 'Введение', title: 'Сцена 1: Сомнения', description: 'Родион Раскольников сидит в своей каморке. Он обдумывает свою теорию.', buttonText: 'Погрузиться' } },
                { id: 'dilemma', type: 'questionNode', position: { x: 0, y: 350 }, data: { label: 'Дилемма', question: 'Стоит ли идти к старухе-процентщице сейчас?', answers: [{id: 'go', text: 'Пойти на "пробу"'}, {id: 'stay', text: 'Остаться дома и обдумать'}] } },
                { id: 'consequence-go', type: 'feedbackNode', position: { x: -200, y: 600 }, data: { label: 'Последствие', message: 'Вы идете. Сердце бьется. Это репетиция будущего преступления.', buttonText: 'Далее' } },
                { id: 'consequence-stay', type: 'feedbackNode', position: { x: 200, y: 600 }, data: { label: 'Последствие', message: 'Мысли не дают покоя. Голод усиливает мрачные идеи.', buttonText: 'Далее' } },
                { id: 'result', type: 'resultNode', position: { x: 0, y: 900 }, data: { label: 'Финал сцены', title: 'Судьба неизбежна', description: 'Независимо от сиюминутного выбора, идея уже захватила разум героя.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'intro' },
                { id: 'e2', source: 'intro', target: 'dilemma' },
                { id: 'e3', source: 'dilemma', target: 'consequence-go', sourceHandle: 'go' },
                { id: 'e4', source: 'dilemma', target: 'consequence-stay', sourceHandle: 'stay' },
                { id: 'e5', source: 'consequence-go', target: 'result' },
                { id: 'e6', source: 'consequence-stay', target: 'result' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#fffbeb', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Lora', serif", headingColor: '#451a03', bodyTextColor: '#78350f' },
                buttons: { backgroundColor: '#92400e', textColor: '#ffffff', hoverBackgroundColor: '#78350f', hoverTextColor: '#ffffff', borderRadius: 2 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#451a03', hoverBackgroundColor: '#fef3c7', hoverTextColor: '#92400e', selectedBackgroundColor: '#fde68a', selectedTextColor: '#451a03', borderRadius: 2 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Преступление и наказание: Выбор'
        }
    },
    {
        id: 'virtual-lab',
        title: 'Виртуальный эксперимент',
        description: 'Симулируйте простую лабораторную работу, где от выбора \'реагентов\' зависит исход опыта. Это безопасно и наглядно.',
        tags: ['Химия', 'Наука', 'Симуляция'],
        gradient: 'from-teal-400 to-cyan-600',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'setup', type: 'infoNode', position: { x: 0, y: 150 }, data: { label: 'Вводная', title: 'Лабораторная работа №1', description: 'Перед вами колба с неизвестным веществом (Лакмус). Вам нужно определить среду.', buttonText: 'Начать опыт' } },
                { id: 'choice', type: 'questionNode', position: { x: 0, y: 400 }, data: { label: 'Выбор реагента', question: 'Что добавим в колбу?', answers: [{id: 'acid', text: 'Кислота (HCL)'}, {id: 'base', text: 'Щелочь (NaOH)'}, {id: 'water', text: 'Вода (H2O)'}] } },
                { id: 'res-red', type: 'resultNode', position: { x: -300, y: 700 }, data: { label: 'Красный', title: 'Раствор покраснел!', description: 'Лакмус в кислой среде становится красным.', showScore: false } },
                { id: 'res-blue', type: 'resultNode', position: { x: 0, y: 700 }, data: { label: 'Синий', title: 'Раствор посинел!', description: 'Лакмус в щелочной среде становится синим.', showScore: false } },
                { id: 'res-purple', type: 'resultNode', position: { x: 300, y: 700 }, data: { label: 'Фиолетовый', title: 'Цвет не изменился', description: 'В нейтральной среде лакмус остается фиолетовым.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'setup' },
                { id: 'e2', source: 'setup', target: 'choice' },
                { id: 'e3', source: 'choice', target: 'res-red', sourceHandle: 'acid' },
                { id: 'e4', source: 'choice', target: 'res-blue', sourceHandle: 'base' },
                { id: 'e5', source: 'choice', target: 'res-purple', sourceHandle: 'water' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#f0fdfa', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Roboto', sans-serif", headingColor: '#115e59', bodyTextColor: '#134e4a' },
                buttons: { backgroundColor: '#0d9488', textColor: '#ffffff', hoverBackgroundColor: '#0f766e', hoverTextColor: '#ffffff', borderRadius: 8 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#115e59', hoverBackgroundColor: '#ccfbf1', hoverTextColor: '#0f766e', selectedBackgroundColor: '#99f6e4', selectedTextColor: '#115e59', borderRadius: 8 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Лабораторная: Индикаторы'
        }
    },
    {
        id: 'dialogue-sim',
        title: 'Диалоговый тренажер',
        description: 'Создайте симуляцию диалога, например, в магазине или кафе. Ученик выбирает реплики, а система реагирует, как \'носитель языка\'.',
        tags: ['Языки', 'Диалог', 'Обучение'],
        gradient: 'from-pink-500 to-rose-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'greeting', type: 'infoNode', position: { x: 0, y: 150 }, data: { label: 'Официант', title: 'At the Cafe', description: 'Waiter: "Hello! Can I help you?"', buttonText: 'Reply' } },
                { id: 'reply1', type: 'questionNode', position: { x: 0, y: 400 }, data: { label: 'Ваш ответ', question: 'Выберите вежливый ответ:', answers: [{id: 'rude', text: 'I want coffee.'}, {id: 'polite', text: 'I would like a coffee, please.'}] } },
                { id: 'reaction-rude', type: 'feedbackNode', position: { x: -200, y: 650 }, data: { label: 'Грубо', message: 'Waiter looks annoyed: "Okay..." (Too direct)', buttonText: 'Try again' } },
                { id: 'reaction-polite', type: 'feedbackNode', position: { x: 200, y: 650 }, data: { label: 'Вежливо', message: 'Waiter smiles: "Sure! Anything else?"', buttonText: 'Continue' } },
                { id: 'success', type: 'resultNode', position: { x: 200, y: 900 }, data: { label: 'Успех', title: 'Great job!', description: 'You successfully ordered coffee.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'greeting' },
                { id: 'e2', source: 'greeting', target: 'reply1' },
                { id: 'e3', source: 'reply1', target: 'reaction-rude', sourceHandle: 'rude' },
                { id: 'e4', source: 'reply1', target: 'reaction-polite', sourceHandle: 'polite' },
                { id: 'e5', source: 'reaction-rude', target: 'greeting' }, // Loop back
                { id: 'e6', source: 'reaction-polite', target: 'success' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#fff1f2', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Inter', sans-serif", headingColor: '#be123c', bodyTextColor: '#881337' },
                buttons: { backgroundColor: '#e11d48', textColor: '#ffffff', hoverBackgroundColor: '#be123c', hoverTextColor: '#ffffff', borderRadius: 20 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#881337', hoverBackgroundColor: '#ffe4e6', hoverTextColor: '#e11d48', selectedBackgroundColor: '#f43f5e', selectedTextColor: '#ffffff', borderRadius: 20 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'English Cafe Dialogue'
        }
    },
    {
        id: 'hr-onboarding',
        title: 'HR Онбординг',
        description: 'Интерактивная инструкция для новых сотрудников. Знакомство с компанией и сбор данных.',
        tags: ['HR', 'Бизнес', 'Корпоративный'],
        gradient: 'from-indigo-400 to-blue-600',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'welcome', type: 'infoNode', position: { x: 0, y: 150 }, data: { label: 'Приветствие', title: 'Добро пожаловать в команду!', description: 'Мы рады видеть вас. Давайте познакомимся и заполним профиль.', buttonText: 'Начать' } },
                { id: 'collect', type: 'collectInfoNode', position: { x: 0, y: 400 }, data: { label: 'Данные', title: 'О вас', description: 'Заполните краткую информацию', fields: [{id: 'f1', label: 'ФИО', type: 'text', variableName: 'fullname'}, {id: 'f2', label: 'Telegram', type: 'text', variableName: 'telegram'}], buttonText: 'Отправить' } },
                { id: 'policy', type: 'questionNode', position: { x: 0, y: 700 }, data: { label: 'Правила', question: 'Ознакомились ли вы с кодексом этики?', answers: [{id: 'yes', text: 'Да, ознакомлен'}, {id: 'no', text: 'Нет, нужно время'}] } },
                { id: 'success', type: 'resultNode', position: { x: -200, y: 950 }, data: { label: 'Готово', title: 'Отлично, {{fullname}}!', description: 'HR свяжется с вами в Telegram: {{telegram}}', showScore: false } },
                { id: 'read-more', type: 'infoNode', position: { x: 200, y: 950 }, data: { label: 'Инфо', title: 'Пожалуйста, прочитайте', description: 'Кодекс лежит на Google Drive. Вернитесь, когда прочитаете.', buttonText: 'Я прочитал' } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'welcome' },
                { id: 'e2', source: 'welcome', target: 'collect' },
                { id: 'e3', source: 'collect', target: 'policy' },
                { id: 'e4', source: 'policy', target: 'success', sourceHandle: 'yes' },
                { id: 'e5', source: 'policy', target: 'read-more', sourceHandle: 'no' },
                { id: 'e6', source: 'read-more', target: 'success' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#f8fafc', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Inter', sans-serif", headingColor: '#1e293b', bodyTextColor: '#334155' },
                buttons: { backgroundColor: '#3b82f6', textColor: '#ffffff', hoverBackgroundColor: '#2563eb', hoverTextColor: '#ffffff', borderRadius: 8 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#1e293b', hoverBackgroundColor: '#eff6ff', hoverTextColor: '#1d4ed8', selectedBackgroundColor: '#bfdbfe', selectedTextColor: '#1e40af', borderRadius: 8 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Онбординг сотрудника'
        }
    },
    {
        id: 'personality-test',
        title: 'Тест личности',
        description: 'Узнайте свой тип личности. Используйте переменные для подсчета баллов по категориям.',
        tags: ['Психология', 'Тест', 'Личность'],
        gradient: 'from-violet-500 to-fuchsia-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'q1', type: 'questionNode', position: { x: 0, y: 150 }, data: { label: 'Вечеринка', question: 'На вечеринке вы:', answers: [{id: 'ext', text: 'Общаюсь со всеми'}, {id: 'int', text: 'Сижу в углу'}] } },
                { id: 'sc-ext', type: 'variableNode', position: { x: -200, y: 400 }, data: { label: '+Экстраверсия', variableName: 'extraversion', operation: 'add', value: 1 } },
                { id: 'sc-int', type: 'variableNode', position: { x: 200, y: 400 }, data: { label: '+Интроверсия', variableName: 'introversion', operation: 'add', value: 1 } },
                { id: 'check', type: 'conditionNode', position: { x: 0, y: 650 }, data: { label: 'Проверка', variable: 'extraversion', operator: 'gt', value: 0 } },
                { id: 'res-e', type: 'resultNode', position: { x: -200, y: 900 }, data: { label: 'Экстраверт', title: 'Вы Экстраверт!', description: 'Вы любите общение и энергию.', showScore: false } },
                { id: 'res-i', type: 'resultNode', position: { x: 200, y: 900 }, data: { label: 'Интроверт', title: 'Вы Интроверт!', description: 'Вы цените глубину и уединение.', showScore: false } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'q1' },
                { id: 'e2', source: 'q1', target: 'sc-ext', sourceHandle: 'ext' },
                { id: 'e3', source: 'q1', target: 'sc-int', sourceHandle: 'int' },
                { id: 'e4', source: 'sc-ext', target: 'check' },
                { id: 'e5', source: 'sc-int', target: 'check' },
                { id: 'e6', source: 'check', target: 'res-e', sourceHandle: 'true' },
                { id: 'e7', source: 'check', target: 'res-i', sourceHandle: 'false' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#f5f3ff', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Inter', sans-serif", headingColor: '#4c1d95', bodyTextColor: '#5b21b6' },
                buttons: { backgroundColor: '#8b5cf6', textColor: '#ffffff', hoverBackgroundColor: '#7c3aed', hoverTextColor: '#ffffff', borderRadius: 12 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#4c1d95', hoverBackgroundColor: '#ede9fe', hoverTextColor: '#6d28d9', selectedBackgroundColor: '#ddd6fe', selectedTextColor: '#4c1d95', borderRadius: 12 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Тест личности'
        }
    },
    {
        id: 'trivia-quiz',
        title: 'Викторина (Trivia)',
        description: 'Развлекательный квиз на эрудицию с таймерами на каждый вопрос.',
        tags: ['Развлечение', 'Викторина', 'Таймер'],
        gradient: 'from-yellow-400 to-orange-500',
        data: {
            nodes: [
                { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
                { id: 'q1', type: 'questionNode', position: { x: 0, y: 150 }, data: { label: 'История', question: 'В каком году основан Санкт-Петербург?', answers: [{id: '1703', text: '1703'}, {id: '1812', text: '1812'}, {id: '1147', text: '1147'}], timer: 10 } },
                { id: 'win', type: 'scoreNode', position: { x: -200, y: 400 }, data: { label: '+1 балл', operation: 'add', value: 1 } },
                { id: 'res', type: 'resultNode', position: { x: 0, y: 700 }, data: { label: 'Финиш', title: 'Результат', description: 'Вы набрали {{score}} очков.', showScore: true } }
            ],
            edges: [
                { id: 'e1', source: 'start', target: 'q1' },
                { id: 'e2', source: 'q1', target: 'win', sourceHandle: '1703' },
                { id: 'e3', source: 'q1', target: 'res', sourceHandle: '1812' },
                { id: 'e4', source: 'q1', target: 'res', sourceHandle: '1147' },
                { id: 'e5', source: 'q1', target: 'res', sourceHandle: 'timeout' }, // Timeout edge
                { id: 'e6', source: 'win', target: 'res' }
            ],
            globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
            designSettings: {
                background: { color: '#fffbeb', imageUrl: '', overlayColor: '#000000', overlayOpacity: 0 },
                typography: { fontFamily: "'Manrope', sans-serif", headingColor: '#92400e', bodyTextColor: '#b45309' },
                buttons: { backgroundColor: '#f59e0b', textColor: '#ffffff', hoverBackgroundColor: '#d97706', hoverTextColor: '#ffffff', borderRadius: 8 },
                answerCards: { backgroundColor: '#ffffff', textColor: '#92400e', hoverBackgroundColor: '#fef3c7', hoverTextColor: '#d97706', selectedBackgroundColor: '#fde68a', selectedTextColor: '#92400e', borderRadius: 8 },
                sound: { volume: 0.5 }
            },
            currentQuizName: 'Мини-Викторина'
        }
    }
];

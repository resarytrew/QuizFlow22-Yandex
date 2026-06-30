
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Quiz, ProjectPassport } from '../../types';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  readOnly?: boolean;
}

const SECTIONS = [
    { id: 'title', label: 'Титульный лист' },
    { id: 'general', label: '1. Общие сведения' },
    { id: 'concept', label: '2. Целевой блок' },
    { id: 'content', label: '3. Содержание' },
    { id: 'tech', label: '4. Технический блок' },
    { id: 'ai', label: '5. ИИ Технологии' },
    { id: 'method', label: '6. Методика' },
    { id: 'test', label: '7. Апробация' },
    { id: 'sources', label: '8. Источники' },
    { id: 'extra', label: '9. Приложения' },
];

const CheckboxGroup = ({ options, selected, onChange, readOnly }: { options: string[], selected: string[], onChange: (val: string[]) => void, readOnly?: boolean }) => (
    <div className="space-y-2">
        {options.map(opt => (
            <label key={opt} className={`flex items-center gap-2 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input name="components-modals-quizpassportmodal-33-input" 
                    type="checkbox" 
                    checked={selected.includes(opt)}
                    disabled={readOnly}
                    onChange={(e) => {
                        if (readOnly) return;
                        if (e.target.checked) onChange([...selected, opt]);
                        else onChange(selected.filter(s => s !== opt));
                    }}
                    className={`w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 ${readOnly ? 'opacity-70' : ''}`}
                />
                <span className="text-sm text-gray-700">{opt}</span>
            </label>
        ))}
    </div>
);

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 mt-6 first:mt-0">{children}</h3>
);

const FieldLabel = ({ children }: { children?: React.ReactNode }) => (
    <label className="block text-sm font-semibold text-gray-700 mb-1">{children}</label>
);

const QuizPassportModal: React.FC<Props> = ({ isOpen, onClose, quiz, readOnly = false }) => {
    const updateQuizPassport = useQuizDataStore(s => s.updateQuizPassport);
    const session = useAuthStore(s => s.session);
    const [activeTab, setActiveTab] = useState('title');
    const [isSaving, setIsSaving] = useState(false);
    
    // Initial State based on ProjectPassport interface
    const [data, setData] = useState<ProjectPassport>({
        organization: '',
        projectName: quiz.name,
        nomination: '',
        authors: '',
        year: new Date().getFullYear().toString(),
        productType: [],
        productTypeOther: '',
        subject: '',
        topic: '',
        educationLevel: [],
        classGrade: '',
        ageGroupFrom: '',
        ageGroupTo: '',
        audienceFeatures: '',
        placeInProcess: [],
        lessonStage: '',
        placeOther: '',
        relevance: '',
        goal: '',
        tasks: '',
        subjectResults: '',
        cognitiveSkills: '',
        regulatorySkills: '',
        communicativeSkills: '',
        personalResults: '',
        scenarioDescription: '',
        mechanicsInteraction: '',
        evaluationSystem: '',
        nodeCount: (quiz.quiz_data.nodes?.length || 0).toString(),
        branchCount: '0',
        endingsCount: (quiz.quiz_data.nodes?.filter(n => n.type === 'resultNode').length || 0).toString(),
        avgTime: '',
        minTime: '',
        maxTime: '',
        variablesList: [],
        nodeTypesList: [],
        formulasList: [],
        aiToolsList: [],
        aiTools: 'Встроенный ИИ-ассистент «Поток»',
        aiUsage: [],
        aiVerification: '',
        usageRecommendations: '',
        requirements: 'Современный браузер (Chrome, Yandex, Safari)',
        studentInstructions: '',
        analysisRecommendations: '',
        adaptationPossibilities: '',
        testingDate: '',
        testingCount: '',
        testingClass: '',
        testingForm: [],
        testingResults: '',
        normativeDocs: [],
        methodicalMaterials: [],
        internetResources: [],
        illustrationSources: [],
        additionalMaterials: []
    });

    useEffect(() => {
        if (isOpen && quiz.quiz_data.passport) {
            setData(prev => ({ ...prev, ...quiz.quiz_data.passport }));
        }
    }, [isOpen, quiz]);

    const updateField = (field: keyof ProjectPassport, value: any) => {
        if (readOnly) return;
        setData(prev => ({ ...prev, [field]: value }));
    };
    
    const updateListField = (
        listName: keyof ProjectPassport,
        id: string,
        field: string,
        value: any
    ) => {
        if (readOnly) return;
        setData(prev => {
            const list = prev[listName];
            if (!Array.isArray(list)) return prev;
            
            return {
                ...prev,
                [listName]: list.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
            };
        });
    };

    const addListItem = (listName: keyof ProjectPassport, newItem: any) => {
        if (readOnly) return;
        setData(prev => {
            const list = prev[listName];
            if (!Array.isArray(list)) return prev;
             return {
                ...prev,
                [listName]: [...list, newItem]
            };
        });
    };

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        await updateQuizPassport(quiz.id, data);
        setIsSaving(false);
    };

    const generateText = () => {
        const check = (arr: string[], val: string) => arr.includes(val) ? '[x]' : '[ ]';
        
         return `
ПАСПОРТ ПРОЕКТА
конкурсной работы педагогической мастерской «Технологии ИИ: новые горизонты»

ТИТУЛЬНЫЙ ЛИСТ
Министерство обороны Российской Федерации

${data.organization || '___________________________________________________________________________'}
(полное наименование довузовской образовательной организации)

ПАСПОРТ ПРОЕКТА
«${data.projectName}»

Номинация: ${data.nomination}

Авторы:
${data.authors}

${data.year} год

Раздел 1. ОБЩИЕ СВЕДЕНИЯ О ПРОЕКТЕ
1.1. Идентификационные данные
Название проекта: ${data.projectName}
Номинация: ${data.nomination}
Тип образовательного продукта:
${check(data.productType, 'Обучающий тренажёр/симулятор')} Обучающий тренажёр/симулятор
${check(data.productType, 'Диалоговый тренажёр')} Диалоговый тренажёр
${check(data.productType, 'Образовательный сценарий')} Образовательный сценарий
${check(data.productType, 'Виртуальный эксперимент')} Виртуальный эксперимент
${check(data.productType, 'Образовательный квест')} Образовательный квест
${check(data.productType, 'Викторина')} Викторина
Иное: ${data.productTypeOther}

Предметная область: ${data.subject}
Тема/раздел программы: ${data.topic}

1.2. Целевая аудитория
Уровень образования:
${check(data.educationLevel, 'Основное общее образование')} Основное общее образование
${check(data.educationLevel, 'Среднее общее образование')} Среднее общее образование

Класс (курс): ${data.classGrade}
Возрастная группа: ${data.ageGroupFrom} – ${data.ageGroupTo} лет
Особенности целевой аудитории: ${data.audienceFeatures}

1.3. Место в образовательном процессе
${check(data.placeInProcess, 'Урочная деятельность')} Урочная деятельность (этап: ${data.lessonStage})
${check(data.placeInProcess, 'Внеурочная деятельность')} Внеурочная деятельность
${check(data.placeInProcess, 'Самостоятельная работа')} Самостоятельная работа
${check(data.placeInProcess, 'Дополнительное образование')} Дополнительное образование
${check(data.placeInProcess, 'Воспитательная работа')} Воспитательная работа
${check(data.placeInProcess, 'Олимпиады')} Подготовка к олимпиадам
Иное: ${data.placeOther}

Раздел 2. КОНЦЕПТУАЛЬНО-ЦЕЛЕВОЙ БЛОК
2.1. Актуальность проекта
${data.relevance}

2.2. Цель проекта
${data.goal}

2.3. Задачи проекта
${data.tasks}

2.4. Планируемые образовательные результаты
Предметные:
${data.subjectResults}

Метапредметные (Познавательные):
${data.cognitiveSkills}

Метапредметные (Регулятивные):
${data.regulatorySkills}

Метапредметные (Коммуникативные):
${data.communicativeSkills}

Личностные результаты:
${data.personalResults}

Раздел 3. СОДЕРЖАТЕЛЬНЫЙ БЛОК
3.1. Краткое описание сценария
${data.scenarioDescription}

3.3. Механика взаимодействия
${data.mechanicsInteraction}

3.4. Система оценивания
${data.evaluationSystem}

Раздел 4. ТЕХНИЧЕСКИЙ БЛОК
Количество узлов: ${data.nodeCount}
Количество ветвлений: ${data.branchCount}
Количество концовок: ${data.endingsCount}
Время прохождения (мин): ${data.minTime} - ${data.maxTime} (Среднее: ${data.avgTime})

Раздел 5. ПРИМЕНЕНИЕ ТЕХНОЛОГИЙ ИИ
ИИ-инструменты: ${data.aiTools}

Области применения:
${check(data.aiUsage, 'Генерация структуры')} Генерация структуры
${check(data.aiUsage, 'Создание текста')} Создание текста
${check(data.aiUsage, 'Генерация вариантов')} Генерация вариантов
${check(data.aiUsage, 'Визуальный контент')} Визуальный контент
${check(data.aiUsage, 'Проверка логики')} Проверка логики

Верификация контента:
${data.aiVerification}

Раздел 6. МЕТОДИЧЕСКИЕ РЕКОМЕНДАЦИИ
6.1. Рекомендации по использованию:
${data.usageRecommendations}

6.2. Технические требования:
${data.requirements}

6.3. Инструкция для обучающегося:
${data.studentInstructions}

6.4. Анализ результатов:
${data.analysisRecommendations}

6.5. Возможности адаптации:
${data.adaptationPossibilities}

Раздел 7. АПРОБАЦИЯ
Дата: ${data.testingDate}
Количество участников: ${data.testingCount}
Класс: ${data.testingClass}
Форма: ${data.testingForm.join(', ')}

Результаты:
${data.testingResults}

Раздел 8. ИСТОЧНИКИ
Нормативные документы: ${data.normativeDocs.map(s => s.name).join('; ')}
Методические материалы: ${data.methodicalMaterials.map(s => s.name).join('; ')}
Интернет-ресурсы: ${data.internetResources.map(s => `${s.name} (${s.authorOrUrl})`).join('; ')}
Иллюстрации: ${data.illustrationSources.map(s => `${s.name} (${s.authorOrUrl})`).join('; ')}

Руководитель: ___________________
`.trim();
    };

    const handleCopy = () => {
        const text = generateText();
        navigator.clipboard.writeText(text);
        toast.success('Паспорт скопирован в буфер!');
    };

    if (!isOpen) return null;

    // Helper for inputs
    const InputProps = { readOnly, disabled: readOnly };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Sidebar Navigation */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">📜</span>
                            <h2 className="font-bold text-slate-800">Паспорт проекта</h2>
                        </div>
                        <p className="text-xs text-slate-500">Конкурс «Технологии ИИ»</p>
                        {readOnly && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded mt-1 inline-block">Режим просмотра</span>}
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2">
                        {SECTIONS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveTab(s.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                                    activeTab === s.id 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-200 bg-white">
                        {!readOnly && (
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full mb-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                            >
                                {isSaving ? 'Сохранение...' : '💾 Сохранить'}
                            </button>
                        )}
                        <button 
                            onClick={handleCopy}
                            className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                        >
                            📋 Копировать текст
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                    {activeTab === 'title' && (
                        <div className="space-y-6 max-w-3xl">
                            <SectionTitle>Титульный лист</SectionTitle>
                            <div>
                                <FieldLabel>Полное наименование образовательной организации</FieldLabel>
                                <input name="components-modals-quizpassportmodal-385-input" className="w-full p-2 border rounded" value={data.organization} onChange={e => updateField('organization', e.target.value)} placeholder="ФГКОУ ..." {...InputProps} />
                            </div>
                            <div>
                                <FieldLabel>Название проекта</FieldLabel>
                                <input name="components-modals-quizpassportmodal-389-input" className="w-full p-2 border rounded bg-gray-50" value={data.projectName} readOnly />
                            </div>
                            <div>
                                <FieldLabel>Номинация</FieldLabel>
                                <input name="components-modals-quizpassportmodal-393-input" className="w-full p-2 border rounded" value={data.nomination} onChange={e => updateField('nomination', e.target.value)} {...InputProps} />
                            </div>
                            <div>
                                <FieldLabel>Авторы (ФИО, должности)</FieldLabel>
                                <textarea name="components-modals-quizpassportmodal-397-textarea" className="w-full p-2 border rounded" rows={4} value={data.authors} onChange={e => updateField('authors', e.target.value)} {...InputProps} />
                            </div>
                            <div>
                                <FieldLabel>Год</FieldLabel>
                                <input name="components-modals-quizpassportmodal-401-input" className="w-full p-2 border rounded" value={data.year} onChange={e => updateField('year', e.target.value)} {...InputProps} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl">
                            <SectionTitle>1. Общие сведения</SectionTitle>
                            
                            <div>
                                <FieldLabel>Тип образовательного продукта</FieldLabel>
                                <CheckboxGroup 
                                    options={['Обучающий тренажёр/симулятор', 'Диалоговый тренажёр', 'Образовательный сценарий', 'Виртуальный эксперимент', 'Образовательный квест', 'Викторина']}
                                    selected={data.productType}
                                    onChange={val => updateField('productType', val)}
                                    readOnly={readOnly}
                                />
                                <input name="components-modals-quizpassportmodal-418-input" className="w-full mt-2 p-2 border rounded text-sm" placeholder="Иное..." value={data.productTypeOther} onChange={e => updateField('productTypeOther', e.target.value)} {...InputProps} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>Предметная область</FieldLabel>
                                    <input name="components-modals-quizpassportmodal-424-input" className="w-full p-2 border rounded" value={data.subject} onChange={e => updateField('subject', e.target.value)} {...InputProps} />
                                </div>
                                <div>
                                    <FieldLabel>Тема/раздел</FieldLabel>
                                    <input name="components-modals-quizpassportmodal-428-input" className="w-full p-2 border rounded" value={data.topic} onChange={e => updateField('topic', e.target.value)} {...InputProps} />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="font-bold mb-3">1.2 Целевая аудитория</h4>
                                <div className="mb-3">
                                    <span className="text-sm font-semibold">Уровень:</span>
                                    <CheckboxGroup 
                                        options={['Основное общее образование', 'Среднее общее образование']}
                                        selected={data.educationLevel}
                                        onChange={val => updateField('educationLevel', val)}
                                        readOnly={readOnly}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <input name="components-modals-quizpassportmodal-444-input" className="p-2 border rounded" placeholder="Класс/курс" value={data.classGrade} onChange={e => updateField('classGrade', e.target.value)} {...InputProps} />
                                    <div className="flex items-center gap-2">
                                        <input name="components-modals-quizpassportmodal-446-input" className="w-16 p-2 border rounded text-center" placeholder="От" value={data.ageGroupFrom} onChange={e => updateField('ageGroupFrom', e.target.value)} {...InputProps} />
                                        <span>—</span>
                                        <input name="components-modals-quizpassportmodal-448-input" className="w-16 p-2 border rounded text-center" placeholder="До" value={data.ageGroupTo} onChange={e => updateField('ageGroupTo', e.target.value)} {...InputProps} />
                                        <span>лет</span>
                                    </div>
                                </div>
                                <textarea name="components-modals-quizpassportmodal-452-textarea" className="w-full p-2 border rounded" placeholder="Особенности аудитории..." rows={2} value={data.audienceFeatures} onChange={e => updateField('audienceFeatures', e.target.value)} {...InputProps} />
                            </div>

                            <div>
                                <FieldLabel>1.3 Место в образовательном процессе</FieldLabel>
                                <CheckboxGroup 
                                    options={['Урочная деятельность', 'Внеурочная деятельность', 'Самостоятельная работа', 'Дополнительное образование', 'Воспитательная работа', 'Олимпиады']}
                                    selected={data.placeInProcess}
                                    onChange={val => updateField('placeInProcess', val)}
                                    readOnly={readOnly}
                                />
                                {data.placeInProcess.includes('Урочная деятельность') && (
                                     <input name="components-modals-quizpassportmodal-464-input" className="w-full mt-2 p-2 border rounded text-sm" placeholder="Этап урока..." value={data.lessonStage} onChange={e => updateField('lessonStage', e.target.value)} {...InputProps} />
                                )}
                                <input name="components-modals-quizpassportmodal-466-input" className="w-full mt-2 p-2 border rounded text-sm" placeholder="Иное..." value={data.placeOther} onChange={e => updateField('placeOther', e.target.value)} {...InputProps} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'concept' && (
                         <div className="space-y-6 max-w-4xl">
                            <SectionTitle>2. Концептуально-целевой блок</SectionTitle>
                            
                            <div>
                                <FieldLabel>2.1 Актуальность проекта (150-300 слов)</FieldLabel>
                                <p className="text-xs text-gray-500 mb-1">Обоснование значимости, какую проблему решает, в чем преимущество интерактивного формата.</p>
                                <textarea name="components-modals-quizpassportmodal-478-textarea" className="w-full p-3 border rounded h-32" value={data.relevance} onChange={e => updateField('relevance', e.target.value)} {...InputProps} />
                            </div>

                            <div>
                                <FieldLabel>2.2 Цель проекта</FieldLabel>
                                <p className="text-xs text-gray-500 mb-1">Конкретный результат (сформировать, развить, обеспечить).</p>
                                <textarea name="components-modals-quizpassportmodal-484-textarea" className="w-full p-3 border rounded h-20" value={data.goal} onChange={e => updateField('goal', e.target.value)} {...InputProps} />
                            </div>

                            <div>
                                <FieldLabel>2.3 Задачи проекта</FieldLabel>
                                <textarea name="components-modals-quizpassportmodal-489-textarea" className="w-full p-3 border rounded h-32" placeholder="1. ... 2. ..." value={data.tasks} onChange={e => updateField('tasks', e.target.value)} {...InputProps} />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold mb-3 text-blue-900">2.4 Планируемые результаты</h4>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-sm font-bold text-blue-800">Предметные:</span>
                                        <textarea name="components-modals-quizpassportmodal-497-textarea" className="w-full p-2 border rounded mt-1 text-sm" rows={3} value={data.subjectResults} onChange={e => updateField('subjectResults', e.target.value)} {...InputProps} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-blue-800">Познавательные УУД:</span>
                                        <textarea name="components-modals-quizpassportmodal-501-textarea" className="w-full p-2 border rounded mt-1 text-sm" rows={2} value={data.cognitiveSkills} onChange={e => updateField('cognitiveSkills', e.target.value)} {...InputProps} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-blue-800">Регулятивные УУД:</span>
                                        <textarea name="components-modals-quizpassportmodal-505-textarea" className="w-full p-2 border rounded mt-1 text-sm" rows={2} value={data.regulatorySkills} onChange={e => updateField('regulatorySkills', e.target.value)} {...InputProps} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-blue-800">Коммуникативные УУД:</span>
                                        <textarea name="components-modals-quizpassportmodal-509-textarea" className="w-full p-2 border rounded mt-1 text-sm" rows={2} value={data.communicativeSkills} onChange={e => updateField('communicativeSkills', e.target.value)} {...InputProps} />
                                    </div>
                                     <div>
                                        <span className="text-sm font-bold text-blue-800">Личностные:</span>
                                        <textarea name="components-modals-quizpassportmodal-513-textarea" className="w-full p-2 border rounded mt-1 text-sm" rows={2} value={data.personalResults} onChange={e => updateField('personalResults', e.target.value)} {...InputProps} />
                                    </div>
                                </div>
                            </div>
                         </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-6 max-w-4xl">
                             <SectionTitle>3. Содержательный блок</SectionTitle>
                             
                             <div>
                                <FieldLabel>3.1 Краткое описание сценария (300-500 слов)</FieldLabel>
                                <p className="text-xs text-gray-500 mb-1">Общая логика, исходная ситуация, ключевые точки, концовки.</p>
                                <textarea name="components-modals-quizpassportmodal-527-textarea" className="w-full p-3 border rounded h-48" value={data.scenarioDescription} onChange={e => updateField('scenarioDescription', e.target.value)} {...InputProps} />
                            </div>

                            <div>
                                <FieldLabel>3.3 Механика взаимодействия</FieldLabel>
                                <p className="text-xs text-gray-500 mb-1">Типы выборов, обратная связь, условия переходов.</p>
                                <textarea name="components-modals-quizpassportmodal-533-textarea" className="w-full p-3 border rounded h-32" value={data.mechanicsInteraction} onChange={e => updateField('mechanicsInteraction', e.target.value)} {...InputProps} />
                            </div>

                             <div>
                                <FieldLabel>3.4 Система оценивания</FieldLabel>
                                <p className="text-xs text-gray-500 mb-1">Критерии, баллы, условия победы.</p>
                                <textarea name="components-modals-quizpassportmodal-539-textarea" className="w-full p-3 border rounded h-32" value={data.evaluationSystem} onChange={e => updateField('evaluationSystem', e.target.value)} {...InputProps} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'tech' && (
                        <div className="space-y-6 max-w-2xl">
                             <SectionTitle>4. Технический блок</SectionTitle>
                             <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">Некоторые поля заполнены автоматически на основе текущего квиза.</p>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div><FieldLabel>Количество узлов</FieldLabel><input name="components-modals-quizpassportmodal-550-input" className="w-full p-2 border rounded bg-gray-50" readOnly value={data.nodeCount} /></div>
                                <div><FieldLabel>Количество концовок</FieldLabel><input name="components-modals-quizpassportmodal-551-input" className="w-full p-2 border rounded bg-gray-50" readOnly value={data.endingsCount} /></div>
                                <div><FieldLabel>Точек ветвления (примерно)</FieldLabel><input name="components-modals-quizpassportmodal-552-input" className="w-full p-2 border rounded" value={data.branchCount} onChange={e => updateField('branchCount', e.target.value)} {...InputProps} /></div>
                             </div>

                             <div>
                                <FieldLabel>Время прохождения (мин)</FieldLabel>
                                <div className="flex gap-4">
                                    <input name="components-modals-quizpassportmodal-558-input" className="w-20 p-2 border rounded text-center" placeholder="Мин" value={data.minTime} onChange={e => updateField('minTime', e.target.value)} {...InputProps} />
                                    <input name="components-modals-quizpassportmodal-559-input" className="w-20 p-2 border rounded text-center" placeholder="Макс" value={data.maxTime} onChange={e => updateField('maxTime', e.target.value)} {...InputProps} />
                                    <input name="components-modals-quizpassportmodal-560-input" className="w-20 p-2 border rounded text-center" placeholder="Среднее" value={data.avgTime} onChange={e => updateField('avgTime', e.target.value)} {...InputProps} />
                                </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-6 max-w-3xl">
                             <SectionTitle>5. Применение ИИ</SectionTitle>
                             
                             <div>
                                 <FieldLabel>5.1 ИИ-инструменты</FieldLabel>
                                 <textarea name="components-modals-quizpassportmodal-572-textarea" className="w-full p-2 border rounded" value={data.aiTools} onChange={e => updateField('aiTools', e.target.value)} {...InputProps} />
                             </div>

                             <div>
                                 <FieldLabel>5.2 Характер применения</FieldLabel>
                                 <CheckboxGroup 
                                    options={['Генерация структуры сценария', 'Создание текстового контента', 'Генерация вариантов ответов', 'Создание визуального контента', 'Проверка логики сценария', 'Редактирование и улучшение текстов']}
                                    selected={data.aiUsage}
                                    onChange={val => updateField('aiUsage', val)}
                                    readOnly={readOnly}
                                 />
                             </div>

                             <div>
                                 <FieldLabel>5.3 Верификация контента</FieldLabel>
                                 <p className="text-xs text-gray-500 mb-1">Как вы проверяли и правили то, что выдал ИИ.</p>
                                 <textarea name="components-modals-quizpassportmodal-588-textarea" className="w-full p-3 border rounded h-32" value={data.aiVerification} onChange={e => updateField('aiVerification', e.target.value)} {...InputProps} />
                             </div>
                        </div>
                    )}

                    {activeTab === 'method' && (
                         <div className="space-y-6 max-w-4xl">
                            <SectionTitle>6. Методические рекомендации</SectionTitle>
                            <div><FieldLabel>6.1 Рекомендации по использованию</FieldLabel><textarea name="components-modals-quizpassportmodal-596-textarea" className="w-full p-3 border rounded h-24" value={data.usageRecommendations} onChange={e => updateField('usageRecommendations', e.target.value)} {...InputProps} /></div>
                            <div><FieldLabel>6.2 Тех. требования</FieldLabel><textarea name="components-modals-quizpassportmodal-597-textarea" className="w-full p-3 border rounded h-20" value={data.requirements} onChange={e => updateField('requirements', e.target.value)} {...InputProps} /></div>
                            <div><FieldLabel>6.3 Инструкция ученику</FieldLabel><textarea name="components-modals-quizpassportmodal-598-textarea" className="w-full p-3 border rounded h-24" value={data.studentInstructions} onChange={e => updateField('studentInstructions', e.target.value)} {...InputProps} /></div>
                            <div><FieldLabel>6.4 Анализ результатов</FieldLabel><textarea name="components-modals-quizpassportmodal-599-textarea" className="w-full p-3 border rounded h-24" value={data.analysisRecommendations} onChange={e => updateField('analysisRecommendations', e.target.value)} {...InputProps} /></div>
                            <div><FieldLabel>6.5 Адаптация</FieldLabel><textarea name="components-modals-quizpassportmodal-600-textarea" className="w-full p-3 border rounded h-20" value={data.adaptationPossibilities} onChange={e => updateField('adaptationPossibilities', e.target.value)} {...InputProps} /></div>
                         </div>
                    )}
                    
                    {activeTab === 'test' && (
                        <div className="space-y-6 max-w-3xl">
                            <SectionTitle>7. Апробация</SectionTitle>
                            <div className="grid grid-cols-3 gap-4">
                                <div><FieldLabel>Дата</FieldLabel><input name="components-modals-quizpassportmodal-608-input" className="w-full p-2 border rounded" value={data.testingDate} onChange={e => updateField('testingDate', e.target.value)} {...InputProps} /></div>
                                <div><FieldLabel>Участников</FieldLabel><input name="components-modals-quizpassportmodal-609-input" className="w-full p-2 border rounded" value={data.testingCount} onChange={e => updateField('testingCount', e.target.value)} {...InputProps} /></div>
                                <div><FieldLabel>Класс</FieldLabel><input name="components-modals-quizpassportmodal-610-input" className="w-full p-2 border rounded" value={data.testingClass} onChange={e => updateField('testingClass', e.target.value)} {...InputProps} /></div>
                            </div>
                            <div>
                                <FieldLabel>Форма</FieldLabel>
                                <CheckboxGroup options={['Индивидуальная', 'Групповая', 'Фронтальная']} selected={data.testingForm} onChange={val => updateField('testingForm', val)} readOnly={readOnly} />
                            </div>
                            <div>
                                <FieldLabel>7.2 Результаты апробации</FieldLabel>
                                <textarea name="components-modals-quizpassportmodal-618-textarea" className="w-full p-3 border rounded h-32" value={data.testingResults} onChange={e => updateField('testingResults', e.target.value)} placeholder="Реакция, проблемы, корректировки..." {...InputProps} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'sources' && (
                         <div className="space-y-6 max-w-4xl">
                            <SectionTitle>8. Информационные источники</SectionTitle>
                            <div>
                                <FieldLabel>Нормативные документы</FieldLabel>
                                {data.normativeDocs.map((item, i) => (
                                     <div key={item.id || i} className="mb-2">
                                        <input name="components-modals-quizpassportmodal-630-input" className="w-full p-2 border rounded" value={item.name} onChange={e => updateListField('normativeDocs', item.id, 'name', e.target.value)} {...InputProps} />
                                     </div>
                                ))}
                                {!readOnly && <button className="text-sm text-indigo-600" onClick={() => addListItem('normativeDocs', {id: Date.now().toString(), name: ''})}>+ Добавить</button>}
                            </div>
                            <div>
                                <FieldLabel>Учебно-методические материалы</FieldLabel>
                                {data.methodicalMaterials.map((item, i) => (
                                     <div key={item.id || i} className="mb-2">
                                        <input name="components-modals-quizpassportmodal-639-input" className="w-full p-2 border rounded" value={item.name} onChange={e => updateListField('methodicalMaterials', item.id, 'name', e.target.value)} {...InputProps} />
                                     </div>
                                ))}
                                {!readOnly && <button className="text-sm text-indigo-600" onClick={() => addListItem('methodicalMaterials', {id: Date.now().toString(), name: ''})}>+ Добавить</button>}
                            </div>
                            <div>
                                <FieldLabel>Интернет-ресурсы</FieldLabel>
                                <div className="space-y-2">
                                    {data.internetResources.map((item) => (
                                        <div key={item.id} className="flex gap-2">
                                             <input name="components-modals-quizpassportmodal-649-input" className="w-1/2 p-2 border rounded" placeholder="Название" value={item.name} onChange={e => updateListField('internetResources', item.id, 'name', e.target.value)} {...InputProps} />
                                             <input name="components-modals-quizpassportmodal-650-input" className="w-1/2 p-2 border rounded" placeholder="URL" value={item.authorOrUrl} onChange={e => updateListField('internetResources', item.id, 'authorOrUrl', e.target.value)} {...InputProps} />
                                        </div>
                                    ))}
                                    {!readOnly && <button className="text-sm text-indigo-600" onClick={() => addListItem('internetResources', {id: Date.now().toString(), name: '', authorOrUrl: ''})}>+ Добавить</button>}
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Иллюстрации</FieldLabel>
                                <div className="space-y-2">
                                    {data.illustrationSources.map((item) => (
                                        <div key={item.id} className="flex gap-2">
                                             <input name="components-modals-quizpassportmodal-661-input" className="w-1/2 p-2 border rounded" placeholder="Описание" value={item.name} onChange={e => updateListField('illustrationSources', item.id, 'name', e.target.value)} {...InputProps} />
                                             <input name="components-modals-quizpassportmodal-662-input" className="w-1/2 p-2 border rounded" placeholder="Источник" value={item.authorOrUrl} onChange={e => updateListField('illustrationSources', item.id, 'authorOrUrl', e.target.value)} {...InputProps} />
                                        </div>
                                    ))}
                                    {!readOnly && <button className="text-sm text-indigo-600" onClick={() => addListItem('illustrationSources', {id: Date.now().toString(), name: '', authorOrUrl: ''})}>+ Добавить</button>}
                                </div>
                            </div>
                         </div>
                    )}
                    
                    {activeTab === 'extra' && (
                        <div className="space-y-6">
                            <SectionTitle>9. Дополнительные материалы</SectionTitle>
                            <p className="text-sm text-gray-500">Отметьте, что прилагается к паспорту:</p>
                             <CheckboxGroup 
                                options={['Скриншоты ключевых экранов', 'Видеозапись прохождения', 'Дидактические материалы', 'Диагностические материалы']}
                                selected={data.additionalMaterials}
                                onChange={val => updateField('additionalMaterials', val)}
                                readOnly={readOnly}
                             />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizPassportModal;

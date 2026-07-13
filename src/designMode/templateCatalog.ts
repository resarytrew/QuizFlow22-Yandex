import type { QuizTemplateId } from '../../types';

export interface DesignTemplateCatalogEntry {
  id: QuizTemplateId;
  name: string;
  purpose: string;
  supportsVisualEditing: boolean;
  incompatibleProperties: string[];
}

export const VISUAL_EDITING_TEMPLATE_IDS = new Set<QuizTemplateId>(['default', 'newyear', 'screenQuiz']);

export const DESIGN_TEMPLATE_CATALOG: DesignTemplateCatalogEntry[] = [
  {
    id: 'default',
    name: 'Базовый',
    purpose: 'Универсальный квиз, бриф, опрос или обучающий сценарий.',
    supportsVisualEditing: true,
    incompatibleProperties: [],
  },
  {
    id: 'newyear',
    name: 'Новогодний',
    purpose: 'Праздничные викторины, квизы для команд и сезонные активности.',
    supportsVisualEditing: true,
    incompatibleProperties: ['Часть декоративных эффектов задаётся шаблоном.'],
  },
  {
    id: 'screenQuiz',
    name: 'Экранная викторина',
    purpose: 'YouTube-style экранные квизы, шоу-викторины и видеоэкспорт.',
    supportsVisualEditing: true,
    incompatibleProperties: ['Логические ноды, очки и переменные не участвуют в экранном режиме.'],
  },
  {
    id: 'science',
    name: 'Научный',
    purpose: 'Образовательные тесты, лабораторные сценарии и объясняющие квизы.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Выбор элементов в Player будет добавлен отдельным проходом.'],
  },
  {
    id: 'history',
    name: 'Исторический',
    purpose: 'Хронологии, исторические квесты и тематические викторины.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Визуальный выбор элементов пока отключён для тематического шаблона.'],
  },
  {
    id: 'math',
    name: 'Математический',
    purpose: 'Задачи, расчёты, формулы и проверочные работы.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Формульная типографика может переопределять часть настроек шрифтов.'],
  },
  {
    id: 'economic',
    name: 'Экономический',
    purpose: 'Финансовая грамотность, бизнес-кейсы и продуктовые сценарии.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Некоторые акцентные элементы закреплены шаблоном.'],
  },
  {
    id: 'ww2',
    name: 'ВОВ',
    purpose: 'Исторические тесты и патриотические образовательные сценарии.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Тематический фон и декоративные элементы задаются шаблоном.'],
  },
  {
    id: 'yandex',
    name: 'Яндекс',
    purpose: 'Корпоративные демо и продуктовые квизы в узнаваемой стилистике.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Брендовая палитра шаблона может ограничивать часть цветов.'],
  },
  {
    id: 'army',
    name: 'Армия',
    purpose: 'Тактические сценарии, проверки знаний и тематические тесты.',
    supportsVisualEditing: false,
    incompatibleProperties: ['Декоративный chrome шаблона не редактируется визуальным выбором.'],
  },
];

export function getTemplateCatalogEntry(id: QuizTemplateId): DesignTemplateCatalogEntry {
  return DESIGN_TEMPLATE_CATALOG.find((entry) => entry.id === id) ?? DESIGN_TEMPLATE_CATALOG[0];
}

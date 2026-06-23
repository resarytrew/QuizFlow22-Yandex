
import defaultTemplate from './default.ts';
import ww2Template from './ww2.ts';
import economicTemplate from './economic.ts';
import yandexTemplate from './yandex.ts';
import armyTemplate from './army.ts';
import scienceTemplate from './science.ts';
import mathTemplate from './math.ts';
import historyTemplate from './history.ts';
import newyearTemplate from './newyear.ts';
import { QuizTemplateId } from '../../types.ts';

interface TemplateInfo {
    name: string;
    template: string;
}

export const templates: Record<string, TemplateInfo> = {
    default: { name: 'По умолчанию', template: defaultTemplate },
    ww2: { name: 'Великая Отечественная война', template: ww2Template },
    economic: { name: 'Экономическая симуляция', template: economicTemplate },
    yandex: { name: 'Яндекс Учебник', template: yandexTemplate },
    army: { name: 'Офицеры России', template: armyTemplate },
    science: { name: 'Виртуальная лаборатория', template: scienceTemplate },
    math: { name: 'Математический (Math OS)', template: mathTemplate },
    history: { name: 'Исторический (Иван IV)', template: historyTemplate },
    newyear: { name: 'Новогодний (Операция НГ)', template: newyearTemplate },
};

export const getTemplateById = (id: QuizTemplateId = 'default'): string => {
    // FIX: Ensure correct template is returned even if id is undefined.
    const safeId = id || 'default';
    const templateConfig = templates[safeId];
    return templateConfig ? templateConfig.template : templates.default.template;
};

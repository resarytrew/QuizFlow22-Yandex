import React from 'react';
import { useQuizDataStore } from '../store/useQuizDataStore';
import type { DesignSettings } from '../types';

type Patch = { [K in keyof DesignSettings]?: Partial<NonNullable<DesignSettings[K]>> };
type Theme = { name: string; background: string; primary: string; accent: string; ink: string; muted: string; surface: string; font: string; display: string; layout: NonNullable<DesignSettings['layout']>['preset']; radius: number; padding: number; columns: 1 | 2; answerStyle: DesignSettings['answerCards']['style'] };

const themes: Theme[] = [
  { name: 'Светлый', background: '#f6f3ee', primary: '#2f5d50', accent: '#b9852b', ink: '#1d1a16', muted: '#615d54', surface: '#fffefa', font: "'Plus Jakarta Sans', system-ui, sans-serif", display: "'Newsreader', Georgia, serif", layout: 'classic', radius: 28, padding: 32, columns: 1, answerStyle: 'card' },
  { name: 'Тёмный', background: '#18232d', primary: '#315f91', accent: '#a35f11', ink: '#172331', muted: '#445464', surface: '#ffffff', font: "'Inter', system-ui, sans-serif", display: "'Inter', system-ui, sans-serif", layout: 'focus', radius: 18, padding: 34, columns: 1, answerStyle: 'list' },
  { name: 'Редакционный', background: '#f2ede3', primary: '#8e341c', accent: '#634c28', ink: '#251e18', muted: '#62574f', surface: '#fffdf8', font: "'Inter', system-ui, sans-serif", display: "'Newsreader', Georgia, serif", layout: 'editorial', radius: 4, padding: 44, columns: 1, answerStyle: 'minimal' },
  { name: 'Игровой', background: '#edf0ff', primary: '#4338a8', accent: '#a33455', ink: '#242050', muted: '#514c70', surface: '#ffffff', font: "'Montserrat', system-ui, sans-serif", display: "'Montserrat', system-ui, sans-serif", layout: 'split', radius: 32, padding: 28, columns: 2, answerStyle: 'tiles' },
  { name: 'Строгий', background: '#eceff1', primary: '#243c52', accent: '#755518', ink: '#182532', muted: '#4e5c68', surface: '#ffffff', font: "'Roboto', system-ui, sans-serif", display: "'Roboto', system-ui, sans-serif", layout: 'compact', radius: 6, padding: 24, columns: 1, answerStyle: 'list' },
];

function themePatch(t: Theme): Patch {
  return {
    brand: { primaryColor: t.primary, accentColor: t.accent, neutralColor: t.ink },
    background: { mode: 'solid', color: t.background, gradientFrom: t.background, gradientTo: t.background, texture: 'none' },
    typography: { fontFamily: t.font, displayFontFamily: t.display, headingColor: t.ink, bodyTextColor: t.muted },
    layout: { preset: t.layout, cardRadius: t.radius, cardPadding: t.padding, density: 'balanced', surfaceStyle: 'solid' },
    questionCard: { backgroundColor: t.surface, textColor: t.ink, radius: t.radius, padding: t.padding },
    buttons: { backgroundColor: t.primary, textColor: '#ffffff', hoverBackgroundColor: t.ink, hoverTextColor: '#ffffff', borderRadius: t.radius, style: 'solid' },
    answerCards: { backgroundColor: t.surface, textColor: t.ink, hoverBackgroundColor: t.background, hoverTextColor: t.ink, selectedBackgroundColor: t.background, selectedTextColor: t.ink, selectedBorderColor: t.primary, borderRadius: Math.min(t.radius, 18), columns: t.columns, style: t.answerStyle },
    progress: { color: t.primary }, result: { accentColor: t.primary },
  };
}

const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const labelClass = 'block text-sm font-medium text-slate-700';

const DesignPanel: React.FC = () => {
  const ds = useQuizDataStore(s => s.designSettings);
  const update = useQuizDataStore(s => s.updateDesignSettings);
  const templateId = useQuizDataStore(s => s.templateId);
  const apply = (patch: Patch) => update(patch as Partial<DesignSettings>);
  if (templateId !== 'default') return <p className="text-sm text-slate-600">Оформление этого шаблона задаётся его собственным стилем.</p>;
  return <div className="space-y-7 text-slate-900">
    <section aria-labelledby="theme-title">
      <h2 id="theme-title" className="text-lg font-semibold">Тема</h2>
      <p className="mt-1 text-sm text-slate-600">Выберите основу — цвета и расположение можно изменить ниже.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {themes.map(t => <button type="button" key={t.name} onClick={() => apply(themePatch(t))} className="rounded-xl border border-slate-300 p-2 text-left hover:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
          <span aria-hidden="true" className="flex h-16 items-center justify-center rounded-lg p-2" style={{ background: t.background }}><span className="block w-full max-w-20 rounded-md p-2" style={{ background: t.surface }}><span className="mb-1 block h-1.5 w-3/4 rounded" style={{ background: t.ink }} /><span className="block h-2 w-1/2 rounded" style={{ background: t.primary }} /></span></span>
          <span className="mt-2 block text-sm font-medium">{t.name}</span>
        </button>)}
      </div>
    </section>
    <section aria-labelledby="appearance-title" className="space-y-4">
      <h2 id="appearance-title" className="text-lg font-semibold">Основные настройки</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>Основной цвет<input aria-label="Основной цвет" type="color" value={ds.buttons.backgroundColor} onChange={e => { const c = e.target.value; apply({ brand: { primaryColor: c }, buttons: { backgroundColor: c }, progress: { color: c }, answerCards: { selectedBorderColor: c }, result: { accentColor: c } }); }} className="mt-1 block h-10 w-full cursor-pointer rounded border border-slate-300" /></label>
        <label className={labelClass}>Акцент<input aria-label="Акцент" type="color" value={ds.brand?.accentColor || '#b9852b'} onChange={e => apply({ brand: { accentColor: e.target.value }, result: { accentColor: e.target.value } })} className="mt-1 block h-10 w-full cursor-pointer rounded border border-slate-300" /></label>
      </div>
      <label className={labelClass}>Фон<select className={inputClass} value={ds.background.mode || 'solid'} onChange={e => apply({ background: { mode: e.target.value as 'solid' | 'gradient' | 'image' } })}><option value="solid">Цвет</option><option value="gradient">Градиент</option><option value="image">Изображение</option></select></label>
      {ds.background.mode === 'image' ? <label className={labelClass}>Адрес изображения фона<input className={inputClass} type="url" value={ds.background.imageUrl} onChange={e => apply({ background: { imageUrl: e.target.value } })} /></label> : <div className="grid grid-cols-2 gap-4"><label className={labelClass}>Цвет фона<input className="mt-1 block h-10 w-full" type="color" value={ds.background.mode === 'gradient' ? ds.background.gradientFrom || ds.background.color : ds.background.color} onChange={e => apply({ background: ds.background.mode === 'gradient' ? { gradientFrom: e.target.value } : { color: e.target.value } })} /></label>{ds.background.mode === 'gradient' && <label className={labelClass}>Второй цвет<input className="mt-1 block h-10 w-full" type="color" value={ds.background.gradientTo || ds.background.color} onChange={e => apply({ background: { gradientTo: e.target.value } })} /></label>}</div>}
      <label className={labelClass}>Логотип — адрес изображения<input className={inputClass} type="url" value={ds.brand?.logoUrl || ''} onChange={e => apply({ brand: { logoUrl: e.target.value } })} /></label>
      <label className={labelClass}>Шрифт<select className={inputClass} value={ds.typography.fontFamily} onChange={e => apply({ typography: { fontFamily: e.target.value, displayFontFamily: e.target.value } })}>{["'Plus Jakarta Sans', system-ui, sans-serif", "'Inter', system-ui, sans-serif", "'Montserrat', system-ui, sans-serif", "'Roboto', system-ui, sans-serif", "'Newsreader', Georgia, serif", "'Lora', Georgia, serif"].map(font => <option key={font} value={font}>{font.split(',')[0].replaceAll("'", '')}</option>)}{!["'Plus Jakarta Sans', system-ui, sans-serif", "'Inter', system-ui, sans-serif", "'Montserrat', system-ui, sans-serif", "'Roboto', system-ui, sans-serif", "'Newsreader', Georgia, serif", "'Lora', Georgia, serif"].includes(ds.typography.fontFamily) && <option value={ds.typography.fontFamily}>Текущий шрифт</option>}</select></label>
      <label className={labelClass}>Композиция<select className={inputClass} value={ds.layout?.preset || 'classic'} onChange={e => apply({ layout: { preset: e.target.value as NonNullable<DesignSettings['layout']>['preset'] } })}><option value="classic">Классическая</option><option value="split">С медиа сбоку</option><option value="focus">Фокус</option><option value="editorial">Редакционная</option><option value="compact">Компактная</option>{ds.layout?.preset && !['classic','split','focus','editorial','compact'].includes(ds.layout.preset) && <option value={ds.layout.preset}>Текущая композиция</option>}</select></label>
      <label className={labelClass}>Геометрия<select className={inputClass} value={ds.questionCard?.radius === 4 ? 'square' : ds.questionCard?.radius === 28 ? 'round' : 'custom'} onChange={e => { const radius = e.target.value === 'square' ? 4 : 28; apply({ layout: { cardRadius: radius }, questionCard: { radius }, buttons: { borderRadius: radius }, answerCards: { borderRadius: Math.min(radius, 18) } }); }}><option value="custom">Текущая</option><option value="square">Строгие углы</option><option value="round">Закруглённые</option></select></label>
      <label className={labelClass}>Плотность карточки<select className={inputClass} value={ds.layout?.cardPadding === 24 ? 'compact' : ds.layout?.cardPadding === 40 ? 'spacious' : 'custom'} onChange={e => { const padding = e.target.value === 'compact' ? 24 : 40; apply({ layout: { cardPadding: padding, density: 'balanced' }, questionCard: { padding } }); }}><option value="custom">Текущая</option><option value="compact">Компактная</option><option value="spacious">Просторная</option></select></label>
      <label className={labelClass}>Расположение изображения<select className={inputClass} value={ds.questionCard?.mediaPosition || ds.layout?.mediaPosition || 'top'} onChange={e => { const mediaPosition = e.target.value as 'top' | 'left' | 'right' | 'background'; apply({ layout: { mediaPosition }, questionCard: { mediaPosition } }); }}><option value="top">Сверху</option><option value="left">Слева</option><option value="right">Справа</option><option value="background">На фоне</option></select></label>
      <label className={labelClass}>Варианты ответа<select className={inputClass} value={ds.answerCards.columns || 1} onChange={e => apply({ answerCards: { columns: Number(e.target.value) as 1 | 2 | 3 } })}><option value="1">Одна колонка</option><option value="2">Две колонки</option><option value="3">Три колонки</option></select></label>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={ds.progress?.style !== 'hidden' && ds.layout?.blocks?.progress !== false} onChange={e => apply({ progress: { style: e.target.checked ? 'bar' : 'hidden' }, layout: { blocks: { progress: e.target.checked } } })} /> Показывать прогресс</label>
    </section>
  </div>;
};

export default DesignPanel;

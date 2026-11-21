import { useEffect, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import type { ScreenQuizSettings } from '../types';
import { screenQuizDefaults } from '../utils/screenQuizDefaults';

type Key = keyof ScreenQuizSettings;
type Descriptor = { key: Key; label: string; group: string; kind: 'number' | 'text' | 'color' | 'boolean' | 'select'; min?: number; max?: number; options?: Array<[string, string]> };
const layout: Array<[string,string]> = [['auto','Автоматически'],['media-right','Медиа справа'],['media-left','Медиа слева'],['media-top','Медиа сверху'],['image-grid','Сетка изображений'],['question-only','Только вопрос'],['hero-media','Крупное медиа']];
const fields: Descriptor[] = [
  { group:'Сцена', key:'layout', label:'Композиция', kind:'select', options:layout },
  { group:'Сцена', key:'backgroundPreset', label:'Фон сцены', kind:'select', options:[['none','Без декора'],['pop','Pop'],['candy','Candy'],['aqua','Aqua'],['yellow','Yellow'],['travel','Travel']] },
  { group:'Сцена', key:'backgroundImageUrl', label:'Изображение фона', kind:'text' },
  { group:'Сцена', key:'backgroundColor', label:'Цвет фона', kind:'color' },
  { group:'Сцена', key:'accentColor', label:'Акцент', kind:'color' },
  { group:'Сцена', key:'secondaryColor', label:'Второй акцент', kind:'color' },
  { group:'Сцена', key:'panelColor', label:'Панель вопроса', kind:'color' },
  { group:'Сцена', key:'answerColor', label:'Карточки ответов', kind:'color' },
  { group:'Сцена', key:'inkColor', label:'Текст и контур', kind:'color' },
  { group:'Сцена', key:'correctColor', label:'Правильный ответ', kind:'color' },
  { group:'Сцена', key:'borderWidth', label:'Толщина контура, px', kind:'number', min:4,max:18 },
  { group:'Сцена', key:'radius', label:'Скругление, px', kind:'number', min:24,max:80 },
  { group:'Сцена', key:'decorIntensity', label:'Интенсивность декора', kind:'number', min:0,max:1.4 },
  { group:'Показ', key:'motion', label:'Движение', kind:'select', options:[['premium','Активное'],['calm','Спокойное'],['off','Выключено']] },
  { group:'Показ', key:'transitionEffect', label:'Эффект перехода', kind:'select', options:[['swipe-reveal','Сдвиг'],['pixel-dissolve','Растворение'],['zoom-in-reveal','Приближение'],['glitch-cut','Разрыв']] },
  { group:'Показ', key:'showTimer', label:'Показывать таймер', kind:'boolean' },
  { group:'Показ', key:'showStoryTimer', label:'Таймер информационных экранов', kind:'boolean' },
  { group:'Показ', key:'introEnabled', label:'Вступительная фаза', kind:'boolean' },
  { group:'Показ', key:'introTiming', label:'Темп вступления', kind:'select', options:[['auto','Автоматически'],['fast','Быстро'],['calm','Спокойно'],['manual','Вручную']] },
  { group:'Показ', key:'timelineMode', label:'Режим тайминга', kind:'select', options:[['auto','Автоматически'],['timeline','Ручной монтаж']] },
  { group:'Тайминг', key:'timerSeconds', label:'Длительность таймера', kind:'number', min:5,max:180 },
  { group:'Тайминг', key:'holdSeconds', label:'Удержание до таймера, сек', kind:'number', min:0,max:8 },
  { group:'Тайминг', key:'revealSeconds', label:'Раскрытие ответа, сек', kind:'number', min:0.3,max:8 },
  { group:'Тайминг', key:'transitionMs', label:'Переход, мс', kind:'number', min:80,max:2000 },
  { group:'Тайминг', key:'introQuestionMs', label:'Показ вопроса, мс', kind:'number', min:800,max:12000 },
  { group:'Тайминг', key:'introAnswerMs', label:'Показ ответа, мс', kind:'number', min:600,max:8000 },
  { group:'Тайминг', key:'introMediaMs', label:'Показ медиа, мс', kind:'number', min:0,max:5000 },
  { group:'Тайминг', key:'introGapMs', label:'Пауза вступления, мс', kind:'number', min:0,max:1500 },
];

type Value = string | number | boolean;
function NumberField({ id, label, value, disabled, min, max, onCommit }: { id:string; label:string; value:number; disabled:boolean; min:number; max:number; onCommit:(value:number)=>void }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState(false);
  useEffect(() => { setDraft(String(value)); setError(false); }, [value, disabled]);
  return <div><input id={id} aria-label={label} className="editor-input" type="text" inputMode="decimal" disabled={disabled} value={draft}
    aria-invalid={error} onChange={event => { setDraft(event.target.value); setError(false); }} onBlur={() => {
      if (disabled) return;
      const parsed = Number(draft.replace(',', '.'));
      if (!draft.trim() || !Number.isFinite(parsed) || parsed < min || parsed > max) { setError(true); return; }
      onCommit(parsed);
    }} />{error && <p role="alert" className="mt-1 text-xs text-red-700">Введите число от {min} до {max}.</p>}</div>;
}

export function ScreenQuizEditor({ nodeId }: { nodeId: string | null }) {
  const node = useCanvasStore(state => state.nodes.find(item => item.id === nodeId));
  const design = useQuizDataStore(state => state.designSettings);
  const updateDesign = useQuizDataStore(state => state.updateDesignSettings);
  const templateId = useQuizDataStore(state => state.templateId);
  if (templateId !== 'screenQuiz' || (nodeId && !node)) return null;
  const global = { ...screenQuizDefaults, ...design.screenQuiz };
  const local = node?.data.screenQuiz ?? {};
  const write = (key: Key, value: Value | undefined) => {
    if (node) {
      const next = { ...node.data.screenQuiz };
      if (value === undefined) delete next[key];
      else Object.assign(next, { [key]: value });
      useCanvasStore.getState().updateNodeData(node.id, { screenQuiz: Object.keys(next).length ? next : undefined });
    } else {
      updateDesign({ screenQuiz: { ...design.screenQuiz, [key]: value } });
    }
  };
  return <div className="space-y-5 text-slate-800">
    <p className="text-sm text-slate-600">{node ? 'Параметры этого экрана. Изменения наследуются из общих настроек, пока их не переопределить.' : 'Общие параметры для всех экранов викторины.'}</p>
    {['Сцена', 'Показ', 'Тайминг'].map(group => <section key={group} className="space-y-3 border-b border-slate-200 pb-5">
      <h3 className="text-base font-semibold">{group}</h3>
      {fields.filter(field => field.group === group).map(field => {
        const overridden = Boolean(node) && local[field.key] !== undefined && local[field.key] !== null;
        const effective = (overridden ? local[field.key] : global[field.key]) as Value;
        const disabled = Boolean(node) && !overridden;
        const id = `screen-${field.key}`;
        return <div key={field.key} className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-medium">{field.label}</label>
            {node && <span data-source={field.key} className="text-xs text-slate-500">{overridden ? 'Переопределено здесь' : 'Общая настройка'}</span>}
          </div>
          {field.kind === 'number' ? <NumberField id={id} label={field.label} value={effective as number} disabled={disabled} min={field.min!} max={field.max!} onCommit={value => write(field.key,value)} />
            : field.kind === 'boolean' ? <select id={id} aria-label={field.label} className="editor-input" disabled={disabled} value={effective ? 'true':'false'} onChange={event => write(field.key,event.target.value === 'true')}><option value="true">Включено</option><option value="false">Выключено</option></select>
            : field.kind === 'select' ? <select id={id} aria-label={field.label} className="editor-input" disabled={disabled} value={String(effective)} onChange={event => write(field.key,event.target.value)}>{field.options?.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
            : <input id={id} aria-label={field.label} className="editor-input" disabled={disabled} type={field.kind === 'color' ? 'color':'url'} value={String(effective)} onChange={event => write(field.key,event.target.value)} />}
          {node && <button type="button" className="text-xs font-medium text-indigo-700 underline" aria-label={`${overridden ? 'Вернуть общее' : 'Переопределить'}: ${field.label}`} onClick={() => write(field.key, overridden ? undefined : effective)}>{overridden ? 'Вернуть общее' : 'Переопределить'}</button>}
        </div>;
      })}
    </section>)}
    {!node && <section className="space-y-3"><h3 className="font-semibold">Звук</h3><p className="text-xs text-slate-500">Звуки запускаются только по вашей команде.</p>
      {([['screenQuizIntro','Вступление'],['screenQuizTick','Таймер'],['screenQuizReveal','Раскрытие'],['screenQuizTransition','Переход']] as const).map(([key,label]) => <div key={key}>
        <label className="block text-sm font-medium">{label}<input className="editor-input" type="url" value={design.sound?.[key] ?? ''} onChange={event => updateDesign({ sound: { ...design.sound, [key]: event.target.value } })} /></label>
        {design.sound?.[key] && <audio controls preload="none" src={design.sound[key]} className="mt-2 max-w-full" aria-label={`Прослушать: ${label}`} />}
      </div>)}
    </section>}
  </div>;
}

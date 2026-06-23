
import React from 'react';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { DesignSettings } from '../types.ts';

const SELECT_ARROW_SVG = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";

// --- Re-usable UI Components (Updated to new style) ---
// FIX: Made children prop optional to fix missing prop error.
const SettingsSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="space-y-4 border-t border-gray-200/75 pt-6 first:border-t-0 first:pt-0">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
        <input className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" {...props} />
    </div>
);

const UrlInput = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
    const openAssetManager = useUIStore(s => s.openAssetManager);

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
            <label className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
            <div className="flex gap-2">
                <input className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none" {...props} />
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

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function safeHex(value: unknown, fallback = '#000000'): string {
  if (typeof value !== 'string') return fallback;
  return HEX_RE.test(value) ? value : fallback;
}

const ColorInput = ({ label, value, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
        <div className="relative flex items-center">
            <input type="color" className="w-10 h-10 p-0 border-none cursor-pointer bg-transparent absolute left-1 appearance-none" style={{'WebkitAppearance': 'none'}} value={safeHex(value)} {...props} />
            <input type="text" className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 pl-12 pr-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" value={value} {...props} />
        </div>
    </div>
);

const RangeInput = ({ label, value, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <div className="flex justify-between items-center px-1 mb-1.5">
            <label className="block text-sm font-medium text-gray-600">{label}</label>
            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md">{value}</span>
        </div>
        <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" value={value} {...props} />
    </div>
);

const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }) => (
     <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5 px-1">{label}</label>
        <select 
            className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3.5 text-sm text-gray-800 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none appearance-none bg-no-repeat bg-right pr-8" 
            style={{ backgroundImage: SELECT_ARROW_SVG, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }} 
            {...props}
        >
            {children}
        </select>
    </div>
);

// --- Main Design Panel Component ---

const DesignPanel: React.FC = () => {
    const designSettings = useQuizDataStore(s => s.designSettings);
    const updateDesignSettings = useQuizDataStore(s => s.updateDesignSettings);
    const isPreviewModeActive = useUIStore(s => s.isPreviewModeActive);
    const setPreviewMode = useUIStore(s => s.setPreviewMode);

    const handleChange = <T extends keyof DesignSettings>(section: T, key: keyof DesignSettings[T], value: any) => {
        updateDesignSettings({
            [section]: {
                ...designSettings[section],
                [key]: value,
            }
        });
    };

    return (
        <div className="space-y-8">
             <div className="text-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-300"><path d="M12 2.69l.346.666L19.5 15.302A2 2 0 0 1 17.828 18H6.172a2 2 0 0 1-1.672-2.698L11.654 3.356A2 2 0 0 1 12 2.691z"/><path d="m9 10 3 6 3-6"/><path d="M10 14h4"/></svg>

                <h2 className="text-lg font-bold font-manrope text-gray-800">Настройки дизайна</h2>
                <p className="text-sm text-gray-500 mt-1">Настройте внешний вид вашего квиза</p>
            </div>

            <div className="px-1">
                <button
                    onClick={() => setPreviewMode(!isPreviewModeActive)}
                    className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ease-in-out focus:ring-2 focus:ring-offset-2 transform hover:-translate-y-0.5
                    ${isPreviewModeActive
                        ? 'bg-gray-700 text-white hover:bg-gray-800 focus:ring-gray-500'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'}`
                    }
                >
                    {isPreviewModeActive ? (
                        <>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            <span>Вернуться в редактор</span>
                        </>
                    ) : (
                        <>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <span>Предпросмотр в реальном времени</span>
                        </>
                    )}
                </button>
            </div>
            
            <SettingsSection title="Фон">
                <ColorInput label="Цвет фона" value={designSettings.background.color} onChange={e => handleChange('background', 'color', e.target.value)} />
                <UrlInput label="URL изображения" placeholder="https://..." value={designSettings.background.imageUrl} onChange={e => handleChange('background', 'imageUrl', e.target.value)} />
                <ColorInput label="Цвет наложения" value={designSettings.background.overlayColor} onChange={e => handleChange('background', 'overlayColor', e.target.value)} />
                <RangeInput label="Прозрачность наложения" min="0" max="1" step="0.05" value={designSettings.background.overlayOpacity} onChange={e => handleChange('background', 'overlayOpacity', parseFloat(e.target.value))} />
            </SettingsSection>

            <SettingsSection title="Типографика">
                 <Select label="Шрифт" value={designSettings.typography.fontFamily} onChange={e => handleChange('typography', 'fontFamily', e.target.value)}>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Manrope', sans-serif">Manrope</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Lobster', cursive">Lobster</option>
                </Select>
                <ColorInput label="Цвет заголовков" value={designSettings.typography.headingColor} onChange={e => handleChange('typography', 'headingColor', e.target.value)} />
                <ColorInput label="Цвет основного текста" value={designSettings.typography.bodyTextColor} onChange={e => handleChange('typography', 'bodyTextColor', e.target.value)} />
            </SettingsSection>
            
            <SettingsSection title="Кнопки">
                <ColorInput label="Цвет фона" value={designSettings.buttons.backgroundColor} onChange={e => handleChange('buttons', 'backgroundColor', e.target.value)} />
                <ColorInput label="Цвет текста" value={designSettings.buttons.textColor} onChange={e => handleChange('buttons', 'textColor', e.target.value)} />
                <ColorInput label="Цвет фона (наведение)" value={designSettings.buttons.hoverBackgroundColor} onChange={e => handleChange('buttons', 'hoverBackgroundColor', e.target.value)} />
                <ColorInput label="Цвет текста (наведение)" value={designSettings.buttons.hoverTextColor} onChange={e => handleChange('buttons', 'hoverTextColor', e.target.value)} />
                <RangeInput label="Скругление углов (px)" min="0" max="32" step="1" value={designSettings.buttons.borderRadius} onChange={e => handleChange('buttons', 'borderRadius', parseInt(e.target.value))} />
            </SettingsSection>

            <SettingsSection title="Карточки ответов">
                 <ColorInput label="Цвет фона" value={designSettings.answerCards.backgroundColor} onChange={e => handleChange('answerCards', 'backgroundColor', e.target.value)} />
                <ColorInput label="Цвет текста" value={designSettings.answerCards.textColor} onChange={e => handleChange('answerCards', 'textColor', e.target.value)} />
                <ColorInput label="Фон (наведение)" value={designSettings.answerCards.hoverBackgroundColor} onChange={e => handleChange('answerCards', 'hoverBackgroundColor', e.target.value)} />
                <ColorInput label="Текст (наведение)" value={designSettings.answerCards.hoverTextColor} onChange={e => handleChange('answerCards', 'hoverTextColor', e.target.value)} />
                <ColorInput label="Фон (выбрано)" value={designSettings.answerCards.selectedBackgroundColor} onChange={e => handleChange('answerCards', 'selectedBackgroundColor', e.target.value)} />
                <ColorInput label="Текст (выбрано)" value={designSettings.answerCards.selectedTextColor} onChange={e => handleChange('answerCards', 'selectedTextColor', e.target.value)} />
                <RangeInput label="Скругление углов (px)" min="0" max="32" step="1" value={designSettings.answerCards.borderRadius} onChange={e => handleChange('answerCards', 'borderRadius', parseInt(e.target.value))} />
            </SettingsSection>

        </div>
    );
};

export default DesignPanel;

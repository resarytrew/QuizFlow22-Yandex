import React from 'react';
import toast from 'react-hot-toast';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useDesignAssetsStore } from '../../store/useDesignAssetsStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { DesignSettings, QuizTemplateId } from '../../types';
import type { DeepPartial } from '../../src/design/designResolver';
import { DEFAULT_DESIGN_SETTINGS } from '../../src/design/designResolver';
import {
  LAYOUT_MEASURED_EVENT,
  REQUEST_LAYOUT_MEASUREMENT_EVENT,
} from '../LivePreview';
import {
  BUILT_IN_DESIGN_STYLES,
  type CustomDesignStyle,
  type IntegratedDesignStyle,
} from '../../src/designMode/designStyles';
import {
  createFreeLayoutDocumentFromMeasurements,
  createLayoutDocumentPatch,
  createLayoutModePatch,
  getScopedLayoutDocument,
  getLayoutMode,
  type LayoutMeasurementPayload,
  type LayoutMode,
  type LayoutScope,
} from '../../src/designMode/layoutDocument';
import { DESIGN_TEMPLATE_CATALOG, getTemplateCatalogEntry } from '../../src/designMode/templateCatalog';
import DesignThumbnail from './DesignThumbnail';

type OverviewSection = 'quick' | 'template' | 'style' | 'brand' | 'background' | 'general' | 'advanced';

const SECTION_LABELS: Record<OverviewSection, string> = {
  quick: 'Быстрый старт',
  template: 'Шаблон',
  style: 'Стиль',
  brand: 'Brand Kit',
  background: 'Фон',
  general: 'Общие параметры',
  advanced: 'Дополнительно',
};

function inputClass(extra = '') {
  return `w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${extra}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
      />
    </Field>
  );
}

function SectionButton({
  id,
  active,
  onClick,
}: {
  id: OverviewSection;
  active: boolean;
  onClick: (id: OverviewSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {SECTION_LABELS[id]}
    </button>
  );
}

function styleNameById(id: string | null, customStyles: CustomDesignStyle[]) {
  if (!id) return 'Пользовательский дизайн';
  const builtIn = BUILT_IN_DESIGN_STYLES.find((style) => style.id === id);
  if (builtIn) return builtIn.name;
  const custom = customStyles.find((style) => style.id === id);
  return custom?.name ?? id;
}

function templateBadge(supportsVisualEditing: boolean) {
  return supportsVisualEditing ? 'Visual editing' : 'Safe overview';
}

function BrandKitForm({
  onSave,
}: {
  onSave: (name: string) => void;
}) {
  const [name, setName] = React.useState('Brand Kit');
  return (
    <div className="flex gap-2">
      <input
        aria-label="Название Brand Kit"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={inputClass()}
      />
      <button
        type="button"
        onClick={() => onSave(name)}
        className="rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-700"
      >
        Сохранить
      </button>
    </div>
  );
}

function requestLayoutMeasurement(): Promise<LayoutMeasurementPayload | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener(LAYOUT_MEASURED_EVENT, onMeasured as EventListener);
      resolve(null);
    }, 900);
    const onMeasured = (event: CustomEvent<LayoutMeasurementPayload>) => {
      window.clearTimeout(timeout);
      window.removeEventListener(LAYOUT_MEASURED_EVENT, onMeasured as EventListener);
      resolve(event.detail);
    };
    window.addEventListener(LAYOUT_MEASURED_EVENT, onMeasured as EventListener, { once: true });
    window.dispatchEvent(new CustomEvent(REQUEST_LAYOUT_MEASUREMENT_EVENT));
  });
}

const DesignOverviewPanel: React.FC = () => {
  const [section, setSection] = React.useState<OverviewSection>('quick');
  const [pendingTemplateId, setPendingTemplateId] = React.useState<QuizTemplateId | null>(null);
  const [pendingStyleId, setPendingStyleId] = React.useState<string | null>(null);
  const [importJson, setImportJson] = React.useState('');
  const [customStyleName, setCustomStyleName] = React.useState('Мой стиль');
  const [customStyleDescription, setCustomStyleDescription] = React.useState('');
  const [layoutScope, setLayoutScope] = React.useState<LayoutScope>('global');

  const selectedNode = useCanvasStore((state) => state.selectedNode);
  const templateId = useQuizDataStore((state) => state.templateId);
  const setTemplateId = useQuizDataStore((state) => state.setTemplateId);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const designStatus = useQuizDataStore((state) => state.designStatus);
  const activeDesignStyleId = useQuizDataStore((state) => state.activeDesignStyleId);
  const currentQuizId = useQuizDataStore((state) => state.currentQuizId);
  const applyDesignStylePreset = useQuizDataStore((state) => state.applyDesignStylePreset);
  const applyBrandKit = useQuizDataStore((state) => state.applyBrandKit);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const resetDesignSection = useQuizDataStore((state) => state.resetDesignSection);
  const resetAllDesign = useQuizDataStore((state) => state.resetAllDesign);
  const undoDesignChange = useQuizDataStore((state) => state.undoDesignChange);
  const redoDesignChange = useQuizDataStore((state) => state.redoDesignChange);
  const canUndoDesign = useQuizDataStore((state) => state.canUndoDesign);
  const canRedoDesign = useQuizDataStore((state) => state.canRedoDesign);

  const brandKits = useDesignAssetsStore((state) => state.brandKits);
  const customStyles = useDesignAssetsStore((state) => state.customStyles);
  const activeBrandKitName = useDesignAssetsStore((state) => state.activeBrandKitName);
  const saveBrandKit = useDesignAssetsStore((state) => state.saveBrandKit);
  const renameBrandKit = useDesignAssetsStore((state) => state.renameBrandKit);
  const updateBrandKit = useDesignAssetsStore((state) => state.updateBrandKit);
  const deleteBrandKit = useDesignAssetsStore((state) => state.deleteBrandKit);
  const markBrandKitApplied = useDesignAssetsStore((state) => state.markBrandKitApplied);
  const saveCustomStyle = useDesignAssetsStore((state) => state.saveCustomStyle);
  const updateCustomStyle = useDesignAssetsStore((state) => state.updateCustomStyle);
  const duplicateCustomStyle = useDesignAssetsStore((state) => state.duplicateCustomStyle);
  const deleteCustomStyle = useDesignAssetsStore((state) => state.deleteCustomStyle);
  const importCustomStyleJson = useDesignAssetsStore((state) => state.importCustomStyleJson);
  const exportCustomStyleJson = useDesignAssetsStore((state) => state.exportCustomStyleJson);

  const brand = { ...(DEFAULT_DESIGN_SETTINGS.brand ?? {}), ...(designSettings.brand ?? {}) };
  const background = { ...DEFAULT_DESIGN_SETTINGS.background, ...(designSettings.background ?? {}) };
  const typography = { ...DEFAULT_DESIGN_SETTINGS.typography, ...(designSettings.typography ?? {}) };
  const layout = { ...(DEFAULT_DESIGN_SETTINGS.layout ?? {}), ...(designSettings.layout ?? {}) };
  const questionCard = { ...(DEFAULT_DESIGN_SETTINGS.questionCard ?? {}), ...(designSettings.questionCard ?? {}) };
  const activeTemplate = getTemplateCatalogEntry(templateId);
  const pendingTemplate = pendingTemplateId ? getTemplateCatalogEntry(pendingTemplateId) : null;
  const allStyles: Array<IntegratedDesignStyle | CustomDesignStyle> = [...BUILT_IN_DESIGN_STYLES, ...customStyles];
  const pendingStyle = pendingStyleId ? allStyles.find((style) => style.id === pendingStyleId) : null;
  const previewTemplateId = pendingTemplateId ?? templateId;
  const previewStyleSettings = pendingStyle?.settings;
  const layoutContext = {
    scope: layoutScope,
    nodeType: selectedNode?.type ?? null,
    nodeId: selectedNode?.id ?? null,
  };
  const currentLayoutMode = getLayoutMode(designSettings, {
    nodeType: layoutContext.scope === 'nodeType' ? layoutContext.nodeType : null,
    nodeId: layoutContext.scope === 'node' ? layoutContext.nodeId : null,
  });

  const designStatusLabel = designStatus === 'applied'
    ? 'Стиль применён'
    : designStatus === 'modified'
      ? `${styleNameById(activeDesignStyleId, customStyles)} · изменён`
      : 'Пользовательский дизайн';

  const applyPendingTemplate = () => {
    if (!pendingTemplateId) return;
    setTemplateId(pendingTemplateId);
    setPendingTemplateId(null);
    toast.success('Шаблон применён');
  };

  const applyPendingStyle = () => {
    if (!pendingStyle) return;
    applyDesignStylePreset(pendingStyle.id, pendingStyle.settings);
    const customCss = 'customCss' in pendingStyle && typeof pendingStyle.customCss === 'string'
      ? pendingStyle.customCss
      : '';
    if (customCss) {
      updateDesignSettings({ advanced: { customCss } }, { label: 'Apply custom style CSS', preserveStyleStatus: true });
    }
    setPendingStyleId(null);
  };

  const saveCurrentBrandKit = (name: string) => {
    const saved = saveBrandKit({
      name,
      brandName: brand.brandName,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      accentColor: brand.accentColor,
      neutralColor: brand.neutralColor,
      fontFamily: typography.fontFamily,
      displayFontFamily: typography.displayFontFamily,
    });
    toast.success(`Brand Kit сохранён: ${saved.name}`);
  };

  const applySavedBrandKit = (id: string) => {
    const kit = brandKits.find((item) => item.id === id);
    if (!kit) return;
    applyBrandKit(kit, { id: kit.id, name: kit.name, preserveLayout: true, preserveOverrides: true });
    markBrandKitApplied(kit.id);
    toast.success('Brand Kit применён без замены layout');
  };

  const saveCurrentStyle = () => {
    const saved = saveCustomStyle({
      name: customStyleName,
      description: customStyleDescription,
      settings: designSettings as DeepPartial<DesignSettings>,
    });
    toast.success(`Стиль сохранён: ${saved.name}`);
  };

  const importStyle = () => {
    try {
      const saved = importCustomStyleJson(importJson);
      setImportJson('');
      toast.success(`Стиль импортирован: ${saved.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка импорта стиля');
    }
  };

  const changeLayoutMode = async (mode: LayoutMode) => {
    if (mode === currentLayoutMode) return;
    if (mode === 'free') {
      const measurement = await requestLayoutMeasurement();
      const document = createFreeLayoutDocumentFromMeasurements(measurement ?? {
        viewport: { width: 1280, height: 720, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } },
        elements: [],
      });
      updateDesignSettings(
        createLayoutModePatch(designSettings, layoutContext, 'free', document) as DeepPartial<DesignSettings>,
        { label: 'Enable free layout' },
      );
      toast.success(measurement ? 'Свободный макет создан из размеров Preview' : 'Свободный макет создан как черновик');
      return;
    }

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Вернуться к автоматическому макету? Свободный макет будет сохранён как черновик.');
    if (!confirmed) return;
    const freeDocument = getScopedLayoutDocument(designSettings, layoutContext) ?? createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } },
      elements: [],
    }, { mode: 'free' });
    const draftPatch = createLayoutDocumentPatch(designSettings, layoutContext, freeDocument, { draft: true });
    const autoPatch = createLayoutModePatch(
      { ...designSettings, layoutDocuments: draftPatch.layoutDocuments } as DesignSettings,
      layoutContext,
      'auto',
    );
    updateDesignSettings(autoPatch as DeepPartial<DesignSettings>, { label: 'Return to auto layout' });
    toast.success('Автоматический макет восстановлен, free layout сохранён как черновик');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Дизайн квиза</h2>
        <p className="mt-1 text-sm text-slate-500">Быстрые настройки шаблона, стиля, бренда и общего вида.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(SECTION_LABELS) as OverviewSection[]).map((id) => (
          <SectionButton key={id} id={id} active={section === id} onClick={setSection} />
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Шаблон</div>
            <div className="mt-1 font-bold text-slate-900">{activeTemplate.name}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Стиль</div>
            <div className="mt-1 font-bold text-slate-900">{styleNameById(activeDesignStyleId, customStyles)}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Brand Kit</div>
            <div className="mt-1 font-bold text-slate-900">{activeBrandKitName ?? 'Не применён'}</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-slate-500">Сохранённость</div>
            <div className="mt-1 font-bold text-slate-900">{currentQuizId ? 'Сохранён' : 'Новый квиз'}</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
          {designStatusLabel}
        </div>
      </section>

      {(pendingTemplate || pendingStyle) && (
        <section className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="text-sm font-bold text-indigo-950">
            Предпросмотр: {pendingTemplate?.name ?? pendingStyle?.name}
          </div>
          <DesignThumbnail
            templateId={previewTemplateId}
            stylePreset={previewStyleSettings}
            overrides={pendingTemplate ? designSettings as DeepPartial<DesignSettings> : undefined}
            label={pendingTemplate?.name ?? pendingStyle?.name}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={pendingTemplate ? applyPendingTemplate : applyPendingStyle}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Применить
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingTemplateId(null);
                setPendingStyleId(null);
              }}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
            >
              Отмена
            </button>
          </div>
        </section>
      )}

      {section === 'quick' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setSection('template')} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300">
              <div className="text-sm font-bold text-slate-900">Выбрать шаблон</div>
              <div className="mt-1 text-xs text-slate-500">Структура экрана и режим Player.</div>
            </button>
            <button type="button" onClick={() => setSection('style')} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300">
              <div className="text-sm font-bold text-slate-900">Применить стиль</div>
              <div className="mt-1 text-xs text-slate-500">Готовая палитра, типографика и layout.</div>
            </button>
            <button type="button" onClick={() => setSection('brand')} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300">
              <div className="text-sm font-bold text-slate-900">Brand Kit</div>
              <div className="mt-1 text-xs text-slate-500">Логотип, цвета и шрифты без замены layout.</div>
            </button>
            <button type="button" onClick={() => setSection('background')} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300">
              <div className="text-sm font-bold text-slate-900">Фон и экран</div>
              <div className="mt-1 text-xs text-slate-500">Быстро настроить поверхность квиза.</div>
            </button>
          </div>
          <DesignThumbnail templateId={templateId} overrides={designSettings as DeepPartial<DesignSettings>} label="Текущий дизайн" />
        </section>
      )}

      {section === 'template' && (
        <section className="space-y-3">
          {DESIGN_TEMPLATE_CATALOG.map((template) => (
            <button
              key={template.id}
              type="button"
              onMouseEnter={() => setPendingTemplateId(template.id)}
              onClick={() => setPendingTemplateId(template.id)}
              className={`w-full rounded-xl border bg-white p-3 text-left transition hover:border-indigo-300 ${
                templateId === template.id ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <div className="grid grid-cols-[112px_1fr] gap-3">
                <DesignThumbnail templateId={template.id} overrides={designSettings as DeepPartial<DesignSettings>} label={template.name} />
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900">{template.name}</div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{templateBadge(template.supportsVisualEditing)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{template.purpose}</div>
                  {template.incompatibleProperties.length > 0 && (
                    <div className="mt-2 text-[11px] font-semibold text-amber-700">{template.incompatibleProperties[0]}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </section>
      )}

      {section === 'style' && (
        <section className="space-y-4">
          <div className="space-y-3">
            {allStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onMouseEnter={() => setPendingStyleId(style.id)}
                onClick={() => setPendingStyleId(style.id)}
                className={`w-full rounded-xl border bg-white p-3 text-left transition hover:border-indigo-300 ${
                  activeDesignStyleId === style.id ? 'border-slate-900' : 'border-slate-200'
                }`}
              >
                <div className="grid grid-cols-[112px_1fr] gap-3">
                  <DesignThumbnail templateId={templateId} stylePreset={style.settings} label={style.name} />
                  <div>
                    <div className="font-bold text-slate-900">{style.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{style.description}</div>
                    {'customCss' in style && style.customCss && (
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">Custom CSS импортирован отдельно</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-900">Сохранить дизайн как стиль</div>
            <input aria-label="Название пользовательского стиля" value={customStyleName} onChange={(event) => setCustomStyleName(event.target.value)} className={inputClass()} />
            <input aria-label="Описание пользовательского стиля" value={customStyleDescription} onChange={(event) => setCustomStyleDescription(event.target.value)} className={inputClass()} />
            <button type="button" onClick={saveCurrentStyle} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700">Сохранить дизайн как стиль</button>
          </div>

          {customStyles.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Пользовательские стили</div>
              {customStyles.map((style) => (
                <div key={style.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-bold text-slate-900">{style.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateCustomStyle(style.id, { name: `${style.name} обновлён`, settings: designSettings as DeepPartial<DesignSettings> })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">Обновить</button>
                    <button type="button" onClick={() => duplicateCustomStyle(style.id)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">Дублировать</button>
                    <button type="button" onClick={() => deleteCustomStyle(style.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-700">Удалить</button>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(exportCustomStyleJson(style.id) ?? '')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">Экспорт JSON</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Импорт JSON</div>
            <textarea aria-label="JSON пользовательского стиля" value={importJson} onChange={(event) => setImportJson(event.target.value)} className={`${inputClass()} min-h-24 font-mono`} />
            <button type="button" onClick={importStyle} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50">Импортировать стиль</button>
          </div>
        </section>
      )}

      {section === 'brand' && (
        <section className="space-y-4">
          <BrandKitForm onSave={saveCurrentBrandKit} />
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Основной цвет" value={brand.primaryColor ?? '#2f5d50'} onChange={(value) => updateDesignSettings({ brand: { primaryColor: value } }, { label: 'Update primary color' })} />
            <ColorField label="Акцент" value={brand.accentColor ?? '#b9852b'} onChange={(value) => updateDesignSettings({ brand: { accentColor: value } }, { label: 'Update accent color' })} />
            <ColorField label="Нейтральный" value={brand.neutralColor ?? '#1d1a16'} onChange={(value) => updateDesignSettings({ brand: { neutralColor: value } }, { label: 'Update neutral color' })} />
          </div>
          <Field label="Название бренда">
            <input value={brand.brandName ?? ''} onChange={(event) => updateDesignSettings({ brand: { brandName: event.target.value } }, { label: 'Update brand name' })} className={inputClass()} />
          </Field>
          <Field label="Логотип">
            <input value={brand.logoUrl ?? ''} onChange={(event) => updateDesignSettings({ brand: { logoUrl: event.target.value } }, { label: 'Update logo URL' })} className={inputClass()} />
          </Field>
          <Field label="Основной шрифт">
            <input value={typography.fontFamily} onChange={(event) => updateDesignSettings({ typography: { fontFamily: event.target.value } }, { label: 'Update font' })} className={inputClass()} />
          </Field>
          <Field label="Display-шрифт">
            <input value={typography.displayFontFamily ?? typography.fontFamily} onChange={(event) => updateDesignSettings({ typography: { displayFontFamily: event.target.value } }, { label: 'Update display font' })} className={inputClass()} />
          </Field>

          {brandKits.map((kit) => (
            <div key={kit.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <input aria-label={`Переименовать ${kit.name}`} value={kit.name} onChange={(event) => renameBrandKit(kit.id, event.target.value)} className={inputClass('mb-2')} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applySavedBrandKit(kit.id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Применить Brand Kit</button>
                <button type="button" onClick={() => updateBrandKit(kit.id, { primaryColor: brand.primaryColor, accentColor: brand.accentColor, neutralColor: brand.neutralColor })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold">Обновить</button>
                <button type="button" onClick={() => deleteBrandKit(kit.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700">Удалить</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {section === 'background' && (
        <section className="space-y-4">
          <ColorField label="Цвет фона" value={background.color} onChange={(value) => updateDesignSettings({ background: { color: value } }, { label: 'Update background color' })} />
          <ColorField label="Градиент от" value={background.gradientFrom ?? background.color} onChange={(value) => updateDesignSettings({ background: { gradientFrom: value, mode: 'gradient' } }, { label: 'Update gradient from' })} />
          <ColorField label="Градиент до" value={background.gradientTo ?? background.color} onChange={(value) => updateDesignSettings({ background: { gradientTo: value, mode: 'gradient' } }, { label: 'Update gradient to' })} />
          <Field label="Изображение фона">
            <input value={background.imageUrl} onChange={(event) => updateDesignSettings({ background: { imageUrl: event.target.value, mode: event.target.value ? 'image' : background.mode } }, { label: 'Update background image' })} className={inputClass()} />
          </Field>
          <Field label="Overlay">
            <input type="range" min={0} max={1} step={0.05} value={background.overlayOpacity} onChange={(event) => updateDesignSettings({ background: { overlayOpacity: Number(event.target.value) } }, { label: 'Update overlay', coalesceKey: 'overview-overlay' })} className="w-full" />
          </Field>
          <button type="button" onClick={() => resetDesignSection('background')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50">Сбросить фон</button>
        </section>
      )}

      {section === 'general' && (
        <section className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-bold text-slate-900">Макет</div>
              <div className="mt-1 text-xs text-slate-500">Свободный режим пока создаёт безопасную модель координат без drag и resize.</div>
            </div>
            <Field label="Применить к">
              <select
                value={layoutScope}
                onChange={(event) => setLayoutScope(event.target.value as LayoutScope)}
                className={inputClass()}
              >
                <option value="global">Всему квизу</option>
                <option value="nodeType" disabled={!selectedNode?.type}>Всем экранам этого типа</option>
                <option value="node" disabled={!selectedNode?.id}>Только текущему экрану</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Макет">
              <button
                type="button"
                aria-pressed={currentLayoutMode === 'auto'}
                onClick={() => void changeLayoutMode('auto')}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  currentLayoutMode === 'auto' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Автоматический
              </button>
              <button
                type="button"
                aria-pressed={currentLayoutMode === 'free'}
                onClick={() => void changeLayoutMode('free')}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  currentLayoutMode === 'free' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Свободный
              </button>
            </div>
          </div>
          <Field label="Ширина контента">
            <input type="range" min={320} max={1600} value={layout.contentWidth ?? 920} onChange={(event) => updateDesignSettings({ layout: { contentWidth: Number(event.target.value) } }, { label: 'Update content width', coalesceKey: 'overview-content-width' })} className="w-full" />
          </Field>
          <Field label="Радиус карточки">
            <input type="range" min={0} max={120} value={questionCard.radius ?? 28} onChange={(event) => updateDesignSettings({ questionCard: { radius: Number(event.target.value) } }, { label: 'Update card radius', coalesceKey: 'overview-card-radius' })} className="w-full" />
          </Field>
          <Field label="Padding">
            <input type="range" min={0} max={120} value={questionCard.padding ?? 32} onChange={(event) => updateDesignSettings({ questionCard: { padding: Number(event.target.value) } }, { label: 'Update card padding', coalesceKey: 'overview-card-padding' })} className="w-full" />
          </Field>
          <Field label="Плотность">
            <select value={layout.density ?? 'balanced'} onChange={(event) => updateDesignSettings({ layout: { density: event.target.value as NonNullable<DesignSettings['layout']>['density'] } }, { label: 'Update density' })} className={inputClass()}>
              <option value="compact">Компактная</option>
              <option value="balanced">Сбалансированная</option>
              <option value="relaxed">Свободная</option>
            </select>
          </Field>
        </section>
      )}

      {section === 'advanced' && (
        <section className="space-y-3">
          <button type="button" onClick={undoDesignChange} disabled={!canUndoDesign} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Undo</button>
          <button type="button" onClick={redoDesignChange} disabled={!canRedoDesign} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40">Redo</button>
          <button type="button" onClick={resetAllDesign} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">Сбросить весь дизайн</button>
          <Field label="Custom CSS">
            <textarea value={designSettings.advanced?.customCss ?? ''} onChange={(event) => updateDesignSettings({ advanced: { customCss: event.target.value } }, { label: 'Update custom CSS' })} className={`${inputClass()} min-h-24 font-mono`} />
          </Field>
        </section>
      )}
    </div>
  );
};

export default DesignOverviewPanel;

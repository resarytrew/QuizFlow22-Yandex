import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore, type PreviewDevice } from '../../store/useUIStore';
import { getAdjacentScreenIds, getDesignModeScreens } from '../../src/designMode/screens';
import { checkDesignQuality } from '../../src/designMode/designQualityChecker';
import { getPreviewOrientation, getPreviewViewport, SAFE_AREA_PRESETS } from '../../src/designMode/responsiveLayout';
import type { LayoutBreakpoint } from '../../src/designMode/layoutDocument';

const DEVICE_OPTIONS: Array<{ value: PreviewDevice; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'custom', label: 'Custom' },
  { value: 'fullscreen', label: 'Fullscreen' },
];

const SAFE_AREA_LABELS: Record<keyof typeof SAFE_AREA_PRESETS, string> = {
  browser: 'Browser',
  telegram: 'Telegram',
  max: 'MAX',
  'mobile-browser': 'Mobile Web',
  keyboard: 'Keyboard',
};

function toBreakpoint(device: PreviewDevice): LayoutBreakpoint {
  return device === 'tablet' || device === 'mobile' ? device : 'desktop';
}

const DesignModeToolbar: React.FC = () => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNode = useCanvasStore((state) => state.selectedNode);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const designInteractionMode = useUIStore((state) => state.designInteractionMode);
  const setDesignInteractionMode = useUIStore((state) => state.setDesignInteractionMode);
  const previewDevice = useUIStore((state) => state.previewDevice);
  const setPreviewDevice = useUIStore((state) => state.setPreviewDevice);
  const previewCustomSize = useUIStore((state) => state.previewCustomSize);
  const setPreviewCustomSize = useUIStore((state) => state.setPreviewCustomSize);
  const previewSafeAreaPreset = useUIStore((state) => state.previewSafeAreaPreset);
  const setPreviewSafeAreaPreset = useUIStore((state) => state.setPreviewSafeAreaPreset);
  const isDesignLayersDrawerOpen = useUIStore((state) => state.isDesignLayersDrawerOpen);
  const toggleDesignLayersDrawer = useUIStore((state) => state.toggleDesignLayersDrawer);
  const isDesignQualityPanelOpen = useUIStore((state) => state.isDesignQualityPanelOpen);
  const toggleDesignQualityPanel = useUIStore((state) => state.toggleDesignQualityPanel);
  const selectedDesignElement = useUIStore((state) => state.selectedDesignElement);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const templateId = useQuizDataStore((state) => state.templateId);
  const canUndoDesign = useQuizDataStore((state) => state.canUndoDesign);
  const canRedoDesign = useQuizDataStore((state) => state.canRedoDesign);
  const undoDesignChange = useQuizDataStore((state) => state.undoDesignChange);
  const redoDesignChange = useQuizDataStore((state) => state.redoDesignChange);
  const resetDesignSection = useQuizDataStore((state) => state.resetDesignSection);

  const screens = useMemo(() => getDesignModeScreens(nodes, edges), [nodes, edges]);
  const adjacent = useMemo(
    () => getAdjacentScreenIds(screens, selectedNode?.id ?? null),
    [screens, selectedNode?.id],
  );
  const viewport = useMemo(
    () => getPreviewViewport(previewDevice, previewCustomSize),
    [previewCustomSize, previewDevice],
  );
  const qualitySummary = useMemo(() => checkDesignQuality(designSettings, {
    breakpoint: toBreakpoint(previewDevice),
    viewport,
    nodeId: selectedNode?.id ?? null,
    nodeType: typeof selectedNode?.type === 'string' ? selectedNode.type : null,
    templateId,
  }), [designSettings, previewDevice, selectedNode?.id, selectedNode?.type, templateId, viewport]);

  const selectScreen = (nodeId: string | null) => {
    if (!nodeId) return;
    const node = nodes.find((item) => item.id === nodeId) ?? null;
    setSelectedNode(node);
  };

  const resetSelectedElement = () => {
    if (!selectedDesignElement) return;
    if (selectedDesignElement.role === 'question-card' || selectedDesignElement.role === 'question-title' || selectedDesignElement.role === 'question-description' || selectedDesignElement.role === 'media') resetDesignSection('questionCard');
    if (selectedDesignElement.role === 'answer-card' || selectedDesignElement.role === 'answers-container') resetDesignSection('answerCards');
    if (selectedDesignElement.role === 'primary-action' || selectedDesignElement.role === 'result-action') resetDesignSection('buttons');
    if (selectedDesignElement.role === 'canvas-background' || selectedDesignElement.role === 'quiz-shell' || selectedDesignElement.role === 'topbar') resetDesignSection('background');
    if (selectedDesignElement.role === 'progress') resetDesignSection('progress');
    if (selectedDesignElement.role === 'result-card' || selectedDesignElement.role === 'result-title' || selectedDesignElement.role === 'result-score') resetDesignSection('result');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
      <button
        type="button"
        disabled={!adjacent.previous}
        onClick={() => selectScreen(adjacent.previous)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Назад
      </button>

      <select
        value={adjacent.current ?? ''}
        onChange={(event) => selectScreen(event.target.value)}
        className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        aria-label="Текущий экран"
      >
        {screens.map((screen) => (
          <option key={screen.id} value={screen.id}>
            {screen.label}{screen.reachable ? '' : ' (вне основного пути)'}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={!adjacent.next}
        onClick={() => selectScreen(adjacent.next)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Далее
      </button>

      <div className="mx-1 h-7 w-px bg-slate-200" />

      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Размер устройства">
        {DEVICE_OPTIONS.map((device) => (
          <button
            key={device.value}
            type="button"
            aria-pressed={previewDevice === device.value}
            onClick={() => setPreviewDevice(device.value)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
              previewDevice === device.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white',
            ].join(' ')}
          >
            {device.label}
          </button>
        ))}
      </div>

      {previewDevice === 'custom' && (
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
          <input
            aria-label="Custom preview width"
            type="number"
            min={320}
            max={3840}
            value={previewCustomSize.width}
            onChange={(event) => setPreviewCustomSize({ ...previewCustomSize, width: Number(event.target.value) })}
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold"
          />
          <span className="text-xs font-bold text-slate-400">x</span>
          <input
            aria-label="Custom preview height"
            type="number"
            min={320}
            max={3840}
            value={previewCustomSize.height}
            onChange={(event) => setPreviewCustomSize({ ...previewCustomSize, height: Number(event.target.value) })}
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold"
          />
        </div>
      )}

      <select
        aria-label="Safe area preset"
        value={previewSafeAreaPreset}
        onChange={(event) => setPreviewSafeAreaPreset(event.target.value as keyof typeof SAFE_AREA_PRESETS)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700"
      >
        {Object.entries(SAFE_AREA_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
        {viewport.width}x{viewport.height} / 100% / {getPreviewOrientation(viewport)}
      </div>

      <div className="mx-1 h-7 w-px bg-slate-200" />

      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Режим взаимодействия">
        <button
          type="button"
          aria-pressed={designInteractionMode === 'select'}
          onClick={() => setDesignInteractionMode('select')}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
            designInteractionMode === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white',
          ].join(' ')}
        >
          Выбирать элементы
        </button>
        <button
          type="button"
          aria-pressed={designInteractionMode === 'test'}
          onClick={() => {
            setSelectedDesignElement(null);
            setDesignInteractionMode('test');
          }}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
            designInteractionMode === 'test' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white',
          ].join(' ')}
        >
          Проверять прохождение
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-pressed={isDesignQualityPanelOpen}
          onClick={toggleDesignQualityPanel}
          className={[
            'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
            qualitySummary.errors > 0
              ? 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
              : qualitySummary.warnings > 0
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : isDesignQualityPanelOpen
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          Проверка: {qualitySummary.errors}/{qualitySummary.warnings}/{qualitySummary.recommendations}
        </button>
        <button
          type="button"
          aria-pressed={isDesignLayersDrawerOpen}
          onClick={toggleDesignLayersDrawer}
          className={[
            'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
            isDesignLayersDrawerOpen
              ? 'border-indigo-500 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          Слои
        </button>
        <button
          type="button"
          disabled={!canUndoDesign}
          onClick={undoDesignChange}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedoDesign}
          onClick={redoDesignChange}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Redo
        </button>
        <button
          type="button"
          disabled={!selectedDesignElement}
          onClick={resetSelectedElement}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Сбросить элемент
        </button>
      </div>
    </div>
  );
};

export default DesignModeToolbar;

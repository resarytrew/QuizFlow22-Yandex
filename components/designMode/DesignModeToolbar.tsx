import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore, type PreviewDevice } from '../../store/useUIStore';
import { getAdjacentScreenIds, getDesignModeScreens } from '../../src/designMode/screens';

const DEVICE_OPTIONS: Array<{ value: PreviewDevice; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

const DesignModeToolbar: React.FC = () => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNode = useCanvasStore((state) => state.selectedNode);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const designInteractionMode = useUIStore((state) => state.designInteractionMode);
  const setDesignInteractionMode = useUIStore((state) => state.setDesignInteractionMode);
  const previewDevice = useUIStore((state) => state.previewDevice);
  const setPreviewDevice = useUIStore((state) => state.setPreviewDevice);
  const selectedDesignElement = useUIStore((state) => state.selectedDesignElement);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
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

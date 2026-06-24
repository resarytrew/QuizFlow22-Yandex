import React, { useState, useCallback } from 'react';
import * as ReactFlowPkg from 'reactflow';
import { useCanvasStore } from '../../store/useCanvasStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { ZOOM } from './constants';
import { Icons } from './Icons';
import { ToolbarButton } from './ToolbarButton';
import { getMotionDuration } from './performanceMode';

const { useReactFlow, useViewport } = ReactFlowPkg as any;

interface BottomControlBarProps {
    onLayout: (dir: 'TB' | 'LR') => void;
    onPreview: () => void;
    onAIAssistant: () => void;
    isAIAssistantOpen: boolean;
    isAIAssistantLocked: boolean;
    showGrid: boolean;
    onToggleGrid: () => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
    onLayout,
    onPreview,
    onAIAssistant,
    isAIAssistantOpen,
    isAIAssistantLocked,
    showGrid,
    onToggleGrid,
}) => {
    const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
    const { zoom } = useViewport();
    const [showHelp, setShowHelp] = useState(false);
    const [showPresets, setShowPresets] = useState(false);

    const undo = useCanvasStore(s => s.undo);
    const redo = useCanvasStore(s => s.redo);
    const isCanvasLocked = useCanvasStore(s => s.isCanvasLocked);
    const toggleCanvasLock = useCanvasStore(s => s.toggleCanvasLock);
    const canUndo = useCanvasStore((s) => s.history.past.length > 0);
    const canRedo = useCanvasStore((s) => s.history.future.length > 0);
    const reduceMotion = usePreferencesStore((s) => s.preferences.reduceMotion);
    const simplified = usePreferencesStore((s) => s.preferences.simplified);
    const motionPreferences = { reduceMotion, simplified };

    const zoomPercentage = Math.round(zoom * 100);
    const presetZooms = [25, 50, 75, 100, 125, 150, 200];

    const handleZoomTo = useCallback((value: number) => {
        const viewport = getViewport();
        setViewport(
            { ...viewport, zoom: value / 100 },
            { duration: getMotionDuration(300, motionPreferences) },
        );
        setShowPresets(false);
    }, [getViewport, motionPreferences.reduceMotion, motionPreferences.simplified, setViewport]);

    const handleFitView = useCallback(() => {
        fitView({
            padding: 0.2,
            duration: getMotionDuration(400, motionPreferences),
            maxZoom: ZOOM.FIT_MAX,
        });
    }, [fitView, motionPreferences.reduceMotion, motionPreferences.simplified]);

    return (
        <div className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center gap-1 px-1">
                <button
                    onClick={() => zoomOut({ duration: getMotionDuration(200, motionPreferences) })}
                    disabled={zoom <= ZOOM.MIN}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Уменьшить (⌘-)"
                >
                    <Icons.ZoomOut />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="min-w-[60px] px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        {zoomPercentage}%
                    </button>
                    {showPresets && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-white rounded-xl border border-slate-200 shadow-xl z-20 min-w-[100px] animate-fade-in">
                                {presetZooms.map((z) => (
                                    <button
                                        key={z}
                                        onClick={() => handleZoomTo(z)}
                                        className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                                            zoomPercentage === z ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-slate-700'
                                        }`}
                                    >
                                        {z}%
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={() => zoomIn({ duration: getMotionDuration(200, motionPreferences) })}
                    disabled={zoom >= ZOOM.MAX}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Увеличить (⌘+)"
                >
                    <Icons.ZoomIn />
                </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1 px-1">
                <button
                    onClick={handleFitView}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    title="По размеру экрана (⌘0)"
                >
                    <Icons.FitView />
                </button>
                <button
                    onClick={toggleCanvasLock}
                    className={`p-2 rounded-lg transition-all ${
                        isCanvasLocked
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isCanvasLocked ? 'Разблокировать холст' : 'Заблокировать холст'}
                >
                    {isCanvasLocked ? <Icons.Lock /> : <Icons.Unlock />}
                </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1 px-1">
                <ToolbarButton
                    icon={<Icons.Undo />}
                    tooltip="Отменить (⌘Z)"
                    onClick={undo}
                    disabled={!canUndo}
                />
                <ToolbarButton
                    icon={<Icons.Redo />}
                    tooltip="Повторить (⌘⇧Z)"
                    onClick={redo}
                    disabled={!canRedo}
                />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1 px-1">
                <ToolbarButton
                    icon={<Icons.LayoutVertical />}
                    tooltip="Вертикальное выравнивание"
                    onClick={() => onLayout('TB')}
                    disabled={isCanvasLocked}
                />
                <ToolbarButton
                    icon={<Icons.LayoutHorizontal />}
                    tooltip="Горизонтальное выравнивание"
                    onClick={() => onLayout('LR')}
                    disabled={isCanvasLocked}
                />
                <ToolbarButton
                    icon={<Icons.Grid />}
                    tooltip={showGrid ? 'Скрыть сетку' : 'Показать сетку'}
                    onClick={onToggleGrid}
                    active={showGrid}
                />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
                onClick={onPreview}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30 mx-1"
            >
                <Icons.Play />
                <span>Превью</span>
            </button>

            <button
                onClick={onAIAssistant}
                className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-all hover:scale-105 mx-1 ${
                    isAIAssistantOpen
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-700'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 shadow-sm'
                }`}
                title={isAIAssistantLocked ? 'AI Ассистент доступен только в PRO' : 'Открыть AI Ассистент'}
                aria-pressed={isAIAssistantOpen}
            >
                <Icons.Sparkles />
                <span>AI Ассистент</span>
                {isAIAssistantLocked && (
                    <span className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-extrabold leading-none tracking-wider text-white">
                        PRO
                    </span>
                )}
            </button>

            <div className="relative">
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className={`p-2 rounded-lg transition-all ${
                        showHelp
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Горячие клавиши"
                >
                    <Icons.Keyboard />
                </button>
                {showHelp && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowHelp(false)} />
                        <div className="absolute bottom-full right-0 mb-3 w-72 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 animate-fade-in">
                            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Icons.Keyboard />
                                Горячие клавиши
                            </h3>
                            <div className="space-y-2 text-sm">
                                {[
                                    { keys: ['⌘', 'C'], action: 'Копировать' },
                                    { keys: ['⌘', 'V'], action: 'Вставить' },
                                    { keys: ['⌘', 'Z'], action: 'Отменить' },
                                    { keys: ['⌘', '⇧', 'Z'], action: 'Повторить' },
                                    { keys: ['Delete'], action: 'Удалить' },
                                    { keys: ['⌘', '+'], action: 'Увеличить' },
                                    { keys: ['⌘', '0'], action: 'По размеру' },
                                    { keys: ['Space'], action: 'Перемещение' },
                                ].map(({ keys, action }) => (
                                    <div key={action} className="flex items-center justify-between">
                                        <span className="text-slate-600">{action}</span>
                                        <div className="flex items-center gap-1">
                                            {keys.map((key, i) => (
                                                <kbd
                                                    key={i}
                                                    className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-700"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

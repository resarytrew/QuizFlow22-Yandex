import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore } from '../../store/useUIStore';
import type { DesignElementRole } from '../../src/designMode/elementRegistry';
import {
  buildDesignLayerTree,
  createGroupLayersPatch,
  createLayerClipboard,
  createLayerDeletePatch,
  createLayerDuplicatePatch,
  createLayerLockPatch,
  createLayerOrderPatch,
  createLayerPastePatch,
  createLayerRenamePatch,
  createLayerVisibilityPatch,
  createLayerZIndexPatch,
  createUngroupLayerPatch,
  type DesignLayerItem,
  type LayerClipboard,
  type LayerContext,
} from '../../src/designMode/designLayers';
import { resolveLayoutDocument } from '../../src/designMode/layoutDocument';
import type { DesignSettings } from '../../types';

type LayerAction = 'move-up' | 'move-down' | 'bring-front' | 'send-back';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target.isContentEditable;
}

function flattenLayers(layers: DesignLayerItem[]): DesignLayerItem[] {
  return layers.flatMap((layer) => [layer, ...flattenLayers(layer.children)]);
}

function firstEditableLayer(layers: DesignLayerItem[]): DesignLayerItem | null {
  return flattenLayers(layers).find((layer) => !layer.required) ?? flattenLayers(layers)[0] ?? null;
}

interface LayerRowProps {
  layer: DesignLayerItem;
  depth: number;
  selectedIds: string[];
  onSelect: (layer: DesignLayerItem, additive: boolean) => void;
  onToggleMulti: (layer: DesignLayerItem) => void;
  onVisibility: (layer: DesignLayerItem) => void;
  onLock: (layer: DesignLayerItem) => void;
}

const LayerRow: React.FC<LayerRowProps> = ({
  layer,
  depth,
  selectedIds,
  onSelect,
  onToggleMulti,
  onVisibility,
  onLock,
}) => (
  <div>
    <div
      className={[
        'group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        layer.selected
          ? 'border-indigo-400 bg-indigo-50 text-indigo-950'
          : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
      ].join(' ')}
      style={{ paddingLeft: `${8 + depth * 18}px` }}
      data-testid={`design-layer-${layer.id}`}
    >
      <input
        type="checkbox"
        checked={selectedIds.includes(layer.id)}
        onChange={() => onToggleMulti(layer)}
        aria-label={`Выбрать слой ${layer.name}`}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
      <button
        type="button"
        onClick={(event) => onSelect(layer, event.shiftKey || event.metaKey || event.ctrlKey)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base">{layer.icon}</span>
          <span className="truncate text-xs font-bold">{layer.name}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <span>{layer.label}</span>
          <span>·</span>
          <span>{layer.scope}</span>
          {layer.required ? <span className="rounded bg-amber-100 px-1 text-amber-700">обяз.</span> : null}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onVisibility(layer)}
        className="rounded-md px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-900"
        aria-label={layer.hidden ? `Показать ${layer.name}` : `Скрыть ${layer.name}`}
      >
        {layer.hidden ? 'Скрыт' : 'Видим'}
      </button>
      <button
        type="button"
        onClick={() => onLock(layer)}
        className="rounded-md px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-900"
        aria-label={layer.locked ? `Разблокировать ${layer.name}` : `Заблокировать ${layer.name}`}
      >
        {layer.locked ? 'Lock' : 'Open'}
      </button>
    </div>
    {layer.children.map((child) => (
      <LayerRow
        key={child.id}
        layer={child}
        depth={depth + 1}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onToggleMulti={onToggleMulti}
        onVisibility={onVisibility}
        onLock={onLock}
      />
    ))}
  </div>
);

const DesignLayersDrawer: React.FC = () => {
  const nodes = useCanvasStore((state) => state.nodes);
  const selectedNode = useCanvasStore((state) => state.selectedNode);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const editorMode = useUIStore((state) => state.editorMode);
  const isOpen = useUIStore((state) => state.isDesignLayersDrawerOpen);
  const close = useUIStore((state) => state.closeDesignLayersDrawer);
  const selectedDesignElement = useUIStore((state) => state.selectedDesignElement);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<LayerClipboard | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeNodeId = selectedDesignElement?.nodeId ?? selectedNode?.id ?? null;
  const activeNode = activeNodeId ? nodes.find((node) => node.id === activeNodeId) ?? selectedNode : selectedNode;
  const layerContext: LayerContext = useMemo(() => ({
    nodeId: activeNode?.id ?? null,
    nodeType: typeof activeNode?.type === 'string' ? activeNode.type : null,
    selectedElementId: selectedDesignElement?.elementId ?? null,
  }), [activeNode?.id, activeNode?.type, selectedDesignElement?.elementId]);
  const tree = useMemo(
    () => buildDesignLayerTree(designSettings, layerContext),
    [designSettings, layerContext],
  );
  const flatLayers = useMemo(() => flattenLayers(tree.layers), [tree.layers]);
  const selectedLayer = flatLayers.find((layer) => layer.id === selectedDesignElement?.elementId) ?? null;
  const layoutDocument = useMemo(
    () => resolveLayoutDocument(designSettings, layerContext),
    [designSettings, layerContext],
  );
  const groups = Object.values(layoutDocument?.groups ?? {});

  useEffect(() => {
    setRenameValue(selectedLayer?.name ?? '');
  }, [selectedLayer?.name]);

  useEffect(() => {
    if (!isOpen) setWarning(null);
  }, [isOpen]);

  const applyPatch = useCallback((patch: Partial<DesignSettings>, label: string) => {
    updateDesignSettings(patch as never, { label });
  }, [updateDesignSettings]);

  const selectLayer = useCallback((layer: DesignLayerItem, additive: boolean) => {
    setSelectedDesignElement({
      elementId: layer.id,
      role: layer.role,
      nodeId: layerContext.nodeId,
    });
    setMultiSelection((current) => {
      if (!additive) return [layer.id];
      return current.includes(layer.id)
        ? current.filter((id) => id !== layer.id)
        : [...current, layer.id];
    });
  }, [layerContext.nodeId, setSelectedDesignElement]);

  const toggleMulti = useCallback((layer: DesignLayerItem) => {
    setMultiSelection((current) => (
      current.includes(layer.id)
        ? current.filter((id) => id !== layer.id)
        : [...current, layer.id]
    ));
    if (!selectedDesignElement) {
      setSelectedDesignElement({ elementId: layer.id, role: layer.role, nodeId: layerContext.nodeId });
    }
  }, [layerContext.nodeId, selectedDesignElement, setSelectedDesignElement]);

  const selectedIds = useMemo(() => {
    const ids = multiSelection.length > 0
      ? multiSelection
      : selectedLayer
        ? [selectedLayer.id]
        : [];
    return Array.from(new Set(ids));
  }, [multiSelection, selectedLayer]);

  const selectedRoles = useMemo(() => (
    selectedIds
      .map((id) => flatLayers.find((layer) => layer.id === id)?.role)
      .filter((role): role is DesignElementRole => Boolean(role))
  ), [flatLayers, selectedIds]);

  const performOrder = useCallback((operation: LayerAction) => {
    const target = selectedLayer ?? firstEditableLayer(tree.layers);
    if (!target) return;
    applyPatch(
      createLayerOrderPatch(designSettings, layerContext, target.id, operation) as Partial<DesignSettings>,
      `Layer ${operation}`,
    );
  }, [applyPatch, designSettings, layerContext, selectedLayer, tree.layers]);

  const toggleVisibility = useCallback((layer: DesignLayerItem) => {
    const result = createLayerVisibilityPatch(designSettings, layerContext, layer.id, !layer.hidden);
    if (result.warning) {
      setWarning(result.warning);
      return;
    }
    applyPatch(result.patch as Partial<DesignSettings>, layer.hidden ? 'Show design layer' : 'Hide design layer');
  }, [applyPatch, designSettings, layerContext]);

  const toggleLock = useCallback((layer: DesignLayerItem) => {
    applyPatch(
      createLayerLockPatch(designSettings, layerContext, layer.id, !layer.locked) as Partial<DesignSettings>,
      layer.locked ? 'Unlock design layer' : 'Lock design layer',
    );
  }, [applyPatch, designSettings, layerContext]);

  const duplicate = useCallback(() => {
    const target = selectedLayer ?? firstEditableLayer(tree.layers);
    if (!target) return;
    const result = createLayerDuplicatePatch(designSettings, layerContext, target.id);
    if (result.warning) setWarning(result.warning);
    applyPatch(result.patch as Partial<DesignSettings>, 'Duplicate design layer');
    if (result.select) setSelectedDesignElement(result.select);
  }, [applyPatch, designSettings, layerContext, selectedLayer, setSelectedDesignElement, tree.layers]);

  const remove = useCallback(() => {
    const target = selectedLayer ?? firstEditableLayer(tree.layers);
    if (!target) return;
    const result = createLayerDeletePatch(designSettings, layerContext, target.id);
    if (result.warning) {
      setWarning(result.warning);
      return;
    }
    applyPatch(result.patch as Partial<DesignSettings>, 'Delete design layer');
    setSelectedDesignElement(null);
    setMultiSelection((current) => current.filter((id) => id !== target.id));
  }, [applyPatch, designSettings, layerContext, selectedLayer, setSelectedDesignElement, tree.layers]);

  const copy = useCallback(() => {
    if (selectedIds.length === 0) return;
    setClipboard(createLayerClipboard(designSettings, layerContext, selectedIds));
    setWarning(null);
  }, [designSettings, layerContext, selectedIds]);

  const cut = useCallback(() => {
    if (selectedIds.length === 0) return;
    setClipboard(createLayerClipboard(designSettings, layerContext, selectedIds));
    const removable = selectedIds.filter((id) => {
      const layer = flatLayers.find((item) => item.id === id);
      return layer && !layer.required;
    });
    removable.forEach((id) => {
      const result = createLayerDeletePatch(designSettings, layerContext, id);
      if (!result.warning) applyPatch(result.patch as Partial<DesignSettings>, 'Cut design layer');
    });
    setSelectedDesignElement(null);
  }, [applyPatch, designSettings, flatLayers, layerContext, selectedIds, setSelectedDesignElement]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    const result = createLayerPastePatch(designSettings, layerContext, clipboard);
    applyPatch(result.patch as Partial<DesignSettings>, 'Paste design layer');
    if (result.select) setSelectedDesignElement(result.select);
  }, [applyPatch, clipboard, designSettings, layerContext, setSelectedDesignElement]);

  const group = useCallback(() => {
    const result = createGroupLayersPatch(designSettings, layerContext, selectedIds);
    if (result.warning) {
      setWarning(result.warning);
      return;
    }
    applyPatch(result.patch as Partial<DesignSettings>, 'Group design layers');
  }, [applyPatch, designSettings, layerContext, selectedIds]);

  const ungroup = useCallback(() => {
    const groupId = groups[0]?.id;
    if (!groupId) return;
    applyPatch(createUngroupLayerPatch(designSettings, layerContext, groupId) as Partial<DesignSettings>, 'Ungroup design layers');
  }, [applyPatch, designSettings, groups, layerContext]);

  const renameSelected = useCallback(() => {
    if (!selectedLayer) return;
    applyPatch(
      createLayerRenamePatch(designSettings, layerContext, selectedLayer.id, renameValue) as Partial<DesignSettings>,
      'Rename design layer',
    );
  }, [applyPatch, designSettings, layerContext, renameValue, selectedLayer]);

  const updateZIndex = useCallback((value: number) => {
    if (!selectedLayer) return;
    applyPatch(
      createLayerZIndexPatch(designSettings, layerContext, selectedLayer.id, value) as Partial<DesignSettings>,
      'Update design layer z-index',
    );
  }, [applyPatch, designSettings, layerContext, selectedLayer]);

  useEffect(() => {
    if (!isOpen || editorMode !== 'design') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const hasModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (hasModifier && key === 'c') {
        event.preventDefault();
        copy();
      } else if (hasModifier && key === 'v') {
        event.preventDefault();
        paste();
      } else if (hasModifier && key === 'x') {
        event.preventDefault();
        cut();
      } else if (hasModifier && key === 'd') {
        event.preventDefault();
        duplicate();
      } else if (hasModifier && key === 'g' && event.shiftKey) {
        event.preventDefault();
        ungroup();
      } else if (hasModifier && key === 'g') {
        event.preventDefault();
        group();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        remove();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (selectedDesignElement) setSelectedDesignElement(null);
        else close();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        performOrder(event.shiftKey ? 'bring-front' : 'move-up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        performOrder(event.shiftKey ? 'send-back' : 'move-down');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    close,
    copy,
    cut,
    duplicate,
    editorMode,
    group,
    isOpen,
    paste,
    performOrder,
    remove,
    selectedDesignElement,
    setSelectedDesignElement,
    ungroup,
  ]);

  if (editorMode !== 'design' || !isOpen) return null;

  return (
    <aside
      data-testid="design-layers-drawer"
      className="absolute left-4 top-4 bottom-4 z-40 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      aria-label="Слои дизайна"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Слои</h2>
          <p className="text-xs font-semibold text-slate-500">{tree.screenLabel} · {tree.layoutMode === 'free' ? 'Свободный макет' : 'Автоматический макет'}</p>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Закрыть
        </button>
      </div>

      {warning ? (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {warning}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <div className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
          {tree.screenLabel}
        </div>
        <div className="space-y-1">
          {tree.layers.map((layer) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              depth={0}
              selectedIds={multiSelection}
              onSelect={selectLayer}
              onToggleMulti={toggleMulti}
              onVisibility={toggleVisibility}
              onLock={toggleLock}
            />
          ))}
        </div>

        {groups.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-xs font-black text-slate-700">Группы</h3>
            {groups.map((groupItem) => (
              <div key={groupItem.id} className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
                <span className="truncate font-bold">{groupItem.name ?? groupItem.id} · {groupItem.children.length}</span>
                <button
                  type="button"
                  onClick={() => applyPatch(createUngroupLayerPatch(designSettings, layerContext, groupItem.id) as Partial<DesignSettings>, 'Ungroup design layers')}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-bold hover:bg-slate-50"
                >
                  Разгруппировать
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => performOrder('move-up')} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Выше</button>
          <button type="button" onClick={() => performOrder('move-down')} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Ниже</button>
          <button type="button" onClick={() => performOrder('bring-front')} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Перед</button>
          <button type="button" onClick={() => performOrder('send-back')} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Назад</button>
          <button type="button" onClick={copy} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Copy</button>
          <button type="button" onClick={paste} disabled={!clipboard} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-40">Paste</button>
          <button type="button" onClick={duplicate} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Дубль</button>
          <button type="button" onClick={remove} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-rose-700 shadow-sm">Удалить</button>
          <button type="button" onClick={cut} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Cut</button>
          <button type="button" onClick={group} disabled={selectedIds.length < 2} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-40">Group</button>
          <button type="button" onClick={ungroup} disabled={groups.length === 0} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm disabled:opacity-40">Ungroup</button>
          <button type="button" onClick={() => setMultiSelection([])} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm">Снять</button>
        </div>

        {selectedLayer ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800">{selectedLayer.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                {selectedLayer.scope}
              </span>
            </div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Название
              <div className="mt-1 flex gap-2">
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800"
                />
                <button type="button" onClick={renameSelected} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
                  OK
                </button>
              </div>
            </label>
            <label className="mt-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Z-index
              <input
                type="number"
                value={selectedLayer.zIndex}
                onChange={(event) => updateZIndex(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800"
              />
            </label>
            {selectedRoles.length > 0 ? (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Выбрано: {selectedRoles.length}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
};

export default DesignLayersDrawer;

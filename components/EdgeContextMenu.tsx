
import React, { useEffect, useMemo, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { Effect, EffectOp } from '../types';

// =========================
// LocalStorage keys
// =========================
const PRESETS_KEY = 'potok_effect_presets_v2';
const CLIPBOARD_KEY = 'potok_edge_effects_clipboard_v2';

type PresetCategory = 'resources' | 'progress' | 'penalty' | 'custom';

type EffectPreset = {
  id: string;
  title: string;
  category: PresetCategory;
  effect: Effect;
};
type CanvasState = ReturnType<typeof useCanvasStore.getState>;
type CanvasNode = CanvasState['nodes'][number];
type CanvasEdge = CanvasState['edges'][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPresetCategory(value: unknown): value is PresetCategory {
  return value === 'resources' || value === 'progress' || value === 'penalty' || value === 'custom';
}

const safeUUID = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const loadPresets = (): EffectPreset[] => {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // backward compat: presets without category
    return parsed.map((p) => {
      const record = isRecord(p) ? p : {};
      return {
      id: String(record.id || safeUUID()),
      title: String(record.title || 'Preset'),
      category: isPresetCategory(record.category) ? record.category : 'custom',
      effect: record.effect as Effect,
      };
    });
  } catch {
    return [];
  }
};

const savePresets = (presets: EffectPreset[]) => {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
};

const loadClipboard = (): Effect[] => {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveClipboard = (effects: Effect[]) => {
  localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(effects));
};

// =========================
// Component
// =========================
type EdgeContextMenuProps = {
  id: string;
  top: number;
  left: number;
  onClose: () => void;
  onDelete: (id: string) => void;
};

const opLabels: Record<EffectOp, string> = {
  set: 'Установить',
  add: 'Добавить',
  subtract: 'Вычесть',
};

const extractVariableSuggestions = (nodes: CanvasNode[], edges: CanvasEdge[]): string[] => {
  const vars = new Set<string>(['score', 'xp', 'correctCount', 'mistakes', 'reputation']);

  nodes.forEach((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    if (n.type === 'variableNode' && data.variableName) vars.add(String(data.variableName));
    if (n.type === 'scoreNode') vars.add('score');
    if (n.type === 'collectInfoNode' && Array.isArray(data.fields)) {
      data.fields.forEach((f) => isRecord(f) && f.variableName && vars.add(String(f.variableName)));
    }
    if (n.type === 'allocatorNode' && Array.isArray(data.items)) {
      data.items.forEach((it) => isRecord(it) && it.variableName && vars.add(String(it.variableName)));
    }
    if (n.type === 'multipleChoiceNode' && data.variableName) {
      vars.add(String(data.variableName));
    }
  });

  edges.forEach((e) => {
    const effs = e?.data?.effects;
    if (!Array.isArray(effs)) return;
    effs.forEach((eff) => isRecord(eff) && eff.variableName && vars.add(String(eff.variableName)));
  });

  return Array.from(vars).sort((a, b) => a.localeCompare(b));
};

const useVariableSuggestions = (): string[] => {
  const computeRef = React.useRef<typeof extractVariableSuggestions>(extractVariableSuggestions);
  const [suggestions, setSuggestions] = React.useState<string[]>(() =>
    extractVariableSuggestions(useCanvasStore.getState().nodes, useCanvasStore.getState().edges)
  );

  React.useEffect(() => {
    return useCanvasStore.subscribe((state) => {
      const next = computeRef.current(state.nodes, state.edges);
      setSuggestions(prev => {
        if (prev.length !== next.length) return next;
        return prev.every((v, i) => v === next[i]) ? prev : next;
      });
    });
  }, []);

  return suggestions;
};

const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({ id, top, left, onClose, onDelete }) => {
  const edge = useCanvasStore(s => s.edges.find((e) => e.id === id));
  const updateEdgeData = useCanvasStore(s => s.updateEdgeData);
  const collapseVariableChainToEffects = useCanvasStore(s => s.collapseVariableChainToEffects);

  // ----- Draft state (saved only on Save button) -----
  const [draftEffects, setDraftEffects] = useState<Effect[]>([]);
  const [draftLabel, setDraftLabel] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // ----- Presets state -----
  const [presets, setPresetsState] = useState<EffectPreset[]>(() => loadPresets());
  const [presetQuery, setPresetQuery] = useState('');
  const [presetCategory, setPresetCategory] = useState<PresetCategory | 'all'>('all');
  const [presetTitle, setPresetTitle] = useState('');
  const [presetNewCategory, setPresetNewCategory] = useState<PresetCategory>('custom');

  // ----- Clipboard state -----
  const [clipboard, setClipboard] = useState<Effect[]>(() => loadClipboard());

  // ----- Paste mode -----
  const [pasteMode, setPasteMode] = useState<'append' | 'replace'>('append');

  // ----- Variable suggestions (autocomplete) -----
  const variableSuggestions = useVariableSuggestions();

  // ----- Initialize when edge changes -----
  useEffect(() => {
    const initialEffects = ((edge?.data?.effects || []) as Effect[]) ?? [];
    const initialLabel = (edge?.data?.label || edge?.label || '') as string;
    setDraftEffects(initialEffects);
    setDraftLabel(initialLabel);
    setIsDirty(false);
  }, [edge?.id]);

  // Close on outside click, but protect unsaved changes
  useEffect(() => {
    const handleClick = () => {
      if (isDirty) return;
      onClose();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose, isDirty]);

  // ESC closes (with confirmation if dirty)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isDirty) {
        const ok = confirm('Есть несохранённые изменения. Закрыть без сохранения?');
        if (!ok) return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDirty, onClose]);

  // =========================
  // Helpers
  // =========================
  const normalizeValue = (eff: Effect): Effect => {
    // convert numeric-looking strings to numbers
    const v = eff.value;
    if (typeof v === 'number') return eff;

    const s = String(v ?? '').trim();
    if (s === '') return { ...eff, value: '' };

    const n = Number(s);
    if (Number.isFinite(n)) return { ...eff, value: n };

    return { ...eff, value: s };
  };

  const updateEffect = (index: number, patch: Partial<Effect>) => {
    const next = draftEffects.map((e, i) => (i === index ? { ...e, ...patch } : e));
    setDraftEffects(next);
    setIsDirty(true);
  };

  const addEffect = () => {
    setDraftEffects([...draftEffects, { variableName: '', op: 'add', value: 0 }]);
    setIsDirty(true);
  };

  const removeEffect = (index: number) => {
    setDraftEffects(draftEffects.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const dedupeEffects = () => {
    const map = new Map<string, Effect>();
    for (const eff of draftEffects.map(normalizeValue)) {
      const key = `${eff.variableName}::${eff.op}`;
      map.set(key, eff); // keep last
    }
    setDraftEffects(Array.from(map.values()));
    setIsDirty(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const normalized = draftEffects.map(normalizeValue);
    updateEdgeData(id, { label: draftLabel, effects: normalized });
    setIsDirty(false);
    onClose();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirty) {
      const ok = confirm('Отменить несохранённые изменения?');
      if (!ok) return;
    }
    const initialEffects = ((edge?.data?.effects || []) as Effect[]) ?? [];
    const initialLabel = (edge?.data?.label || edge?.label || '') as string;
    setDraftEffects(initialEffects);
    setDraftLabel(initialLabel);
    setIsDirty(false);
    onClose();
  };

  // ===== Presets helpers =====
  const filteredPresets = useMemo(() => {
    const q = presetQuery.trim().toLowerCase();
    return presets
      .filter((p) => (presetCategory === 'all' ? true : p.category === presetCategory))
      .filter((p) => (q ? p.title.toLowerCase().includes(q) : true));
  }, [presets, presetQuery, presetCategory]);

  if (!edge) return null;

  const addPresetToEdge = (preset: EffectPreset) => {
    const eff = { ...preset.effect };
    setDraftEffects(pasteMode === 'replace' ? [eff] : [...draftEffects, eff]);
    setIsDirty(true);
  };

  const saveEffectAsPreset = (eff: Effect) => {
    const title = presetTitle.trim() || `${eff.variableName || '(var)'} ${eff.op} ${String(eff.value ?? '')}`;
    const next: EffectPreset[] = [
      ...presets,
      { id: safeUUID(), title, category: presetNewCategory, effect: normalizeValue(eff) },
    ];
    setPresetsState(next);
    savePresets(next);
    setPresetTitle('');
  };

  const deletePreset = (presetId: string) => {
    const next = presets.filter((p) => p.id !== presetId);
    setPresetsState(next);
    savePresets(next);
  };

  // ===== Clipboard helpers =====
  const copyEffects = () => {
    const normalized = draftEffects.map(normalizeValue);
    saveClipboard(normalized);
    setClipboard(normalized);
  };

  const pasteEffects = () => {
    const clip = loadClipboard();
    if (!clip.length) return;
    setDraftEffects(pasteMode === 'replace' ? [...clip] : [...draftEffects, ...clip]);
    setIsDirty(true);
  };

  // ===== Collapse chain =====
  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDirty) {
      const ok = confirm('Есть несохранённые изменения. Сначала сохранить, затем свернуть цепочку?');
      if (!ok) return;
      updateEdgeData(id, { label: draftLabel, effects: draftEffects.map(normalizeValue) });
      setIsDirty(false);
    }

    collapseVariableChainToEffects(id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
    onClose();
  };

  // Quick presets (not stored; just convenience)
  const quickPresets: Array<{ title: string; effect: Effect }> = [
    { title: 'XP +10', effect: { variableName: 'xp', op: 'add', value: 10 } },
    { title: 'Correct +1', effect: { variableName: 'correctCount', op: 'add', value: 1 } },
    { title: 'Mistake +1', effect: { variableName: 'mistakes', op: 'add', value: 1 } },
    { title: 'Score +10', effect: { variableName: 'score', op: 'add', value: 10 } },
  ];

  return (
    <>
      <datalist id="var-suggestions">
        {variableSuggestions.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <div
        style={{ top, left }}
        className="absolute z-50 w-[460px] bg-white rounded-xl shadow-2xl border border-gray-200/75 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-sm font-semibold text-gray-800">Настройки связи</div>
            <div className="text-[11px] text-gray-400 font-mono">id: {id.slice(0, 8)}…</div>
          </div>

          <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-700 px-2">
            ✕
          </button>
        </div>

        {/* Label */}
        <div className="border-t border-gray-200/75 pt-3 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Метка связи</div>
          <input name="components-edgecontextmenu-349-input"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-3 text-sm"
            value={draftLabel}
            onChange={(e) => {
              setDraftLabel(e.target.value);
              setIsDirty(true);
            }}
            placeholder="например: Верно / Частично / Переход"
          />
        </div>

        {/* Presets */}
        <div className="border-t border-gray-200/75 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Пресеты эффектов</div>
            <div className="text-[11px] text-gray-400">{presets.length} шт.</div>
          </div>

          {/* Search + category */}
          <div className="grid grid-cols-2 gap-2">
            <input name="components-edgecontextmenu-369-input"
              className="bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-3 text-sm"
              value={presetQuery}
              onChange={(e) => setPresetQuery(e.target.value)}
              placeholder="Поиск пресета…"
            />
            <select name="components-edgecontextmenu-375-select"
              className="bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-3 text-sm"
              value={presetCategory}
              onChange={(e) => {
                const next = e.target.value;
                setPresetCategory(next === 'all' || isPresetCategory(next) ? next : 'all');
              }}
            >
              <option value="all">Все</option>
              <option value="resources">Ресурсы</option>
              <option value="progress">Прогресс</option>
              <option value="penalty">Штрафы</option>
              <option value="custom">Мои</option>
            </select>
          </div>

          {/* Paste mode */}
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-400">Режим добавления:</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPasteMode('append')}
                className={`px-2 py-1 text-xs rounded-md border ${
                  pasteMode === 'append'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Добавить
              </button>
              <button
                type="button"
                onClick={() => setPasteMode('replace')}
                className={`px-2 py-1 text-xs rounded-md border ${
                  pasteMode === 'replace'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Заменить
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((q) => (
              <button
                key={q.title}
                type="button"
                onClick={() => {
                  setDraftEffects(pasteMode === 'replace' ? [q.effect] : [...draftEffects, q.effect]);
                  setIsDirty(true);
                }}
                className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
                title="Добавить на ребро"
              >
                + {q.title}
              </button>
            ))}
          </div>

          {filteredPresets.length === 0 ? (
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200/75 p-2 rounded-lg">
              Пресеты не найдены. Сохрани любой эффект как пресет (кнопка 💾 рядом с эффектом).
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredPresets.map((p) => (
                <div key={p.id} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => addPresetToEdge(p)}
                    className="px-2 py-1 text-xs rounded-md bg-white border border-gray-200 hover:bg-gray-50"
                    title={`Добавить: ${p.title}`}
                  >
                    + {p.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePreset(p.id)}
                    className="px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                    title="Удалить пресет"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preset title + category */}
          <div className="grid grid-cols-2 gap-2">
            <input name="components-edgecontextmenu-466-input"
              className="bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-3 text-sm"
              value={presetTitle}
              onChange={(e) => setPresetTitle(e.target.value)}
              placeholder="Название для пресета (необязательно)"
            />
            <select name="components-edgecontextmenu-472-select"
              className="bg-slate-50 border border-slate-200/80 rounded-lg py-2 px-3 text-sm"
              value={presetNewCategory}
              onChange={(e) => setPresetNewCategory(e.target.value as PresetCategory)}
              title="Категория для сохранения пресета"
            >
              <option value="custom">Мои</option>
              <option value="resources">Ресурсы</option>
              <option value="progress">Прогресс</option>
              <option value="penalty">Штрафы</option>
            </select>
          </div>

          {/* Clipboard */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyEffects}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Копировать текущие эффекты в буфер"
            >
              Копировать эффекты
            </button>
            <button
              type="button"
              onClick={pasteEffects}
              disabled={clipboard.length === 0}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              title="Вставить эффекты из буфера"
            >
              Вставить эффекты
            </button>
          </div>
        </div>

        {/* Effects */}
        <div className="border-t border-gray-200/75 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Эффекты перехода</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dedupeEffects}
                className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 border border-slate-200 hover:bg-slate-200"
                title="Уберёт дубликаты по (variableName + op), оставит последний"
              >
                Убрать дубликаты
              </button>
              <button
                type="button"
                onClick={addEffect}
                className="text-xs font-semibold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
              >
                + Эффект
              </button>
            </div>
          </div>

          {draftEffects.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200/75 p-2.5 rounded-lg">
              Эффектов нет. Добавьте вручную или сверните цепочку variableNode.
            </div>
          ) : (
            <div className="space-y-2">
              {draftEffects.map((eff, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="components-edgecontextmenu-539-input"
                      className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                      value={eff.variableName}
                      onChange={(e) => updateEffect(idx, { variableName: e.target.value })}
                      placeholder="variableName (например xp)"
                      list="var-suggestions"
                    />
                    <select name="components-edgecontextmenu-546-select"
                      className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                      value={eff.op}
                      onChange={(e) => updateEffect(idx, { op: e.target.value as EffectOp })}
                    >
                      <option value="set">{opLabels.set}</option>
                      <option value="add">{opLabels.add}</option>
                      <option value="subtract">{opLabels.subtract}</option>
                    </select>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input name="components-edgecontextmenu-558-input"
                      className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                      value={String(eff.value ?? '')}
                      onChange={(e) => {
                        const s = e.target.value;
                        const n = Number(s);
                        updateEffect(idx, { value: s.trim() !== '' && Number.isFinite(n) ? n : s });
                      }}
                      placeholder="value (например 10)"
                    />

                    <button
                      type="button"
                      onClick={() => saveEffectAsPreset(eff)}
                      className="px-2 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                      title="Сохранить эффект как пресет (используй поле названия выше)"
                    >
                      💾
                    </button>

                    <button
                      type="button"
                      onClick={() => removeEffect(idx)}
                      className="px-2 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                      title="Удалить эффект"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleCollapse}
            className="w-full text-left px-3 py-2 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
          >
            Свернуть variable/score узлы → эффекты
          </button>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200/75 pt-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Отмена
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors rounded-md border border-transparent hover:border-red-200"
          >
            <span>Удалить связь</span>
          </button>

          {isDirty && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Есть несохранённые изменения. Нажми «Сохранить» или «Отмена». (Esc спросит подтверждение)
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EdgeContextMenu;

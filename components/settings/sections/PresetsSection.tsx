import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { usePreferencesStore, type Preset } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';

const PresetRow: React.FC<{
  preset: Preset;
  active: boolean;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}> = ({ preset, active, onLoad, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(preset.name);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== preset.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
        active
          ? 'border-indigo-300 bg-indigo-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            id={`preset-name-${preset.id}`}
            name={`preset-name-${preset.id}`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setName(preset.name);
                setEditing(false);
              }
            }}
            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        ) : (
          <button
            onClick={onLoad}
            className="block w-full text-left"
          >
            <div className="text-sm font-semibold text-slate-800 truncate">{preset.name}</div>
            <div className="text-xs text-slate-500">
              {new Date(preset.createdAt).toLocaleDateString('ru-RU')}
            </div>
          </button>
        )}
      </div>

      <button
        onClick={() => setEditing((e) => !e)}
        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors shrink-0"
        title="Переименовать"
        aria-label="Переименовать пресет"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>

      <button
        onClick={onDelete}
        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
        title="Удалить"
        aria-label="Удалить пресет"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
};

export const PresetsSection: React.FC = () => {
  const presets = usePreferencesStore((s) => s.presets);
  const activePresetId = usePreferencesStore((s) => s.activePresetId);
  const savePreset = usePreferencesStore((s) => s.savePreset);
  const loadPreset = usePreferencesStore((s) => s.loadPreset);
  const deletePreset = usePreferencesStore((s) => s.deletePreset);
  const renamePreset = usePreferencesStore((s) => s.renamePreset);
  const resetToDefaults = usePreferencesStore((s) => s.resetToDefaults);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Введите название пресета');
      return;
    }
    savePreset(name);
    setNewName('');
    setShowNew(false);
    toast.success('Пресет сохранён');
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все настройки кастомизации к значениям по умолчанию?')) {
      resetToDefaults();
      toast.success('Настройки сброшены');
    }
  };

  return (
    <Section
      title="Пресеты"
      description="Сохраните текущие настройки как шаблон и применяйте его в один клик."
    >
      <div className="flex flex-wrap items-center gap-2">
        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Сохранить как пресет
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <input
              id="new-preset-name"
              name="new-preset-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setShowNew(false);
                  setNewName('');
                }
              }}
              placeholder="Название пресета"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setNewName('');
              }}
              className="px-3 py-2 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
          </div>
        )}

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Сбросить к дефолту
        </button>
      </div>

      {presets.length > 0 ? (
        <div className="mt-2 space-y-2">
          {presets.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              active={activePresetId === p.id}
              onLoad={() => {
                loadPreset(p.id);
                toast.success(`Пресет «${p.name}» применён`);
              }}
              onRename={(name) => renamePreset(p.id, name)}
              onDelete={() => {
                if (window.confirm(`Удалить пресет «${p.name}»?`)) {
                  deletePreset(p.id);
                  toast.success('Пресет удалён');
                }
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">
          Пресетов пока нет. Сохраните текущие настройки, чтобы быстро переключаться между конфигурациями.
        </p>
      )}
    </Section>
  );
};

import React from 'react';
import { usePreferencesStore, type BoardPattern } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { Select } from '../ui/Select';

const PATTERN_OPTIONS = [
  { value: 'none' as BoardPattern, label: 'Нет' },
  { value: 'small' as BoardPattern, label: 'Мелкая' },
  { value: 'medium' as BoardPattern, label: 'Средняя' },
  { value: 'large' as BoardPattern, label: 'Крупная' },
];

const BG_PRESETS = [
  { label: 'Белый', value: '#ffffff' },
  { label: 'Бумага', value: '#fefce8' },
  { label: 'Светлый', value: '#f8fafc' },
  { label: 'Темный', value: '#262626' },
  { label: 'Зеленый', value: '#f0fdf4' },
];

export const EditorSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const setBoardSettings = usePreferencesStore((s) => s.setBoardSettings);

  return (
    <Section title="Редактор" description="Сетка, привязка и оформление рабочего холста.">
      <SettingRow label="Сетка холста" description="Отображать фоновую разметку доски.">
        <Toggle
          checked={prefs.showGrid}
          onChange={(v) => setPreference('showGrid', v)}
          ariaLabel="Сетка холста"
        />
      </SettingRow>

      <SettingRow label="Привязка к сетке" description="Ноды выравниваются по линиям при перетаскивании.">
        <Toggle
          checked={prefs.snapToGrid}
          onChange={(v) => setPreference('snapToGrid', v)}
          ariaLabel="Привязка к сетке"
        />
      </SettingRow>

      <SettingRow
        label="Анимация соединений"
        description="Показывать движущийся маркер на ветках между нодами."
      >
        <Toggle
          checked={prefs.edgeAnimations}
          onChange={(v) => setPreference('edgeAnimations', v)}
          ariaLabel="Анимация соединений"
        />
      </SettingRow>

      <SettingRow label="Фон доски" description="Цвет фона холста.">
        <Select
          value={prefs.boardBackgroundColor}
          onChange={(e) => setBoardSettings({ boardBackgroundColor: e.target.value })}
        >
          {BG_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </SettingRow>

      <SettingRow label="Разметка доски" description="Тип линий сетки.">
        <SegmentedControl
          options={PATTERN_OPTIONS}
          value={prefs.boardPattern}
          onChange={(v) => setBoardSettings({ boardPattern: v })}
        />
      </SettingRow>

      <SettingRow label="Цвет линий" description="Цвет линий сетки.">
        <ColorInput
          value={prefs.boardLineColor}
          onChange={(v) => setBoardSettings({ boardLineColor: v })}
        />
      </SettingRow>

      <SettingRow label="Толщина линий" description="Толщина линий сетки в пикселях.">
        <RangeInput
          min={0.5}
          max={3}
          step={0.5}
          value={prefs.boardLineWidth}
          onChange={(v) => setBoardSettings({ boardLineWidth: v })}
        />
      </SettingRow>
    </Section>
  );
};

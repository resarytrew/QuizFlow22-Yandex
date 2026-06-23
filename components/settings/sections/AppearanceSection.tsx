import React from 'react';
import {
  usePreferencesStore,
  type BorderRadius,
  type FontFamily,
  type ShadowIntensity,
} from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ColorInput } from '../ui/ColorInput';
import { Select } from '../ui/Select';

const RADIUS_OPTIONS = [
  { value: 'sharp' as BorderRadius, label: 'Острые' },
  { value: 'soft' as BorderRadius, label: 'Мягкие' },
  { value: 'rounded' as BorderRadius, label: 'Круглые' },
];

const FONT_OPTIONS = [
  { value: 'inter' as FontFamily, label: 'Inter' },
  { value: 'system' as FontFamily, label: 'Системный' },
  { value: 'mono' as FontFamily, label: 'Моноширинный' },
];

const SHADOW_OPTIONS = [
  { value: '0' as const, label: 'Нет' },
  { value: '1' as const, label: 'Лёгкая' },
  { value: '2' as const, label: 'Средняя' },
  { value: '3' as const, label: 'Сильная' },
];

const ACCENT_PRESETS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Amber', value: '#f59e0b' },
];

export const AppearanceSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);
  const hasPresetAccent = ACCENT_PRESETS.some((preset) => preset.value === prefs.accentColor);

  return (
    <Section
      title="Внешний вид"
      description="Акцентные цвета, тени, радиус скруглений и шрифты редактора."
    >
      <SettingRow label="Акцентный цвет" description="Основной цвет интерфейса.">
        <div className="flex items-center gap-2">
          <ColorInput
            value={prefs.accentColor}
            onChange={(v) => setPreference('accentColor', v)}
            ariaLabel="Акцентный цвет"
          />
        </div>
      </SettingRow>

      <SettingRow label="Пресет акцента" description="Быстрый выбор из готовых палитр.">
        <Select
          value={prefs.accentColor}
          onChange={(e) => setPreference('accentColor', e.target.value)}
        >
          {!hasPresetAccent && <option value={prefs.accentColor}>Пользовательский</option>}
          {ACCENT_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </SettingRow>

      <SettingRow label="Интенсивность теней" description="Глубина теней для карточек.">
        <SegmentedControl
          options={SHADOW_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={String(prefs.shadowIntensity) as '0' | '1' | '2' | '3'}
          onChange={(v) => setPreference('shadowIntensity', Number(v) as ShadowIntensity)}
        />
      </SettingRow>

      <SettingRow label="Радиус скруглений" description="Скругление углов карточек и кнопок.">
        <SegmentedControl
          options={RADIUS_OPTIONS}
          value={prefs.borderRadius}
          onChange={(v) => setPreference('borderRadius', v)}
        />
      </SettingRow>

      <SettingRow label="Шрифт" description="Семейство шрифта в интерфейсе.">
        <Select
          value={prefs.fontFamily}
          onChange={(e) => setPreference('fontFamily', e.target.value as FontFamily)}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </SettingRow>
    </Section>
  );
};

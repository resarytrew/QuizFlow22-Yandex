import React from 'react';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';

export const PerformanceSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <Section
      title="Производительность"
      description="Режимы снижения нагрузки на графику, процессор и операционную систему."
    >
      <SettingRow
        label="Уменьшить анимации"
        description="Отключает все анимации, плавное масштабирование, тени, размытие и свечение."
      >
        <Toggle
          checked={prefs.reduceMotion}
          onChange={(v) => setPreference('reduceMotion', v)}
          ariaLabel="Уменьшить анимации"
        />
      </SettingRow>

      <SettingRow label="Минимизировать эффекты" description="Скрывает размытие, свечения и тени.">
        <Toggle
          checked={prefs.minimizeEffects}
          onChange={(v) => setPreference('minimizeEffects', v)}
          ariaLabel="Минимизировать эффекты"
        />
      </SettingRow>

      <SettingRow
        label="Упрощённый режим"
        description="Самый лёгкий режим: отключает анимации и эффекты, скрывает сетку, миникарту, статистику и отрисовывает только видимые ноды."
      >
        <Toggle
          checked={prefs.simplified}
          onChange={(v) => setPreference('simplified', v)}
          ariaLabel="Упрощённый режим"
        />
      </SettingRow>
    </Section>
  );
};

import React from 'react';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';

export const SidebarFiltersSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <Section
      title="Фильтры панели нод"
      description="Управление отображением нод в левой палитре."
    >
      <SettingRow label="Только бесплатные" description="Скрыть все Pro-ноды из палитры.">
        <Toggle checked={prefs.onlyFree} onChange={(v) => setPreference('onlyFree', v)} />
      </SettingRow>

      <SettingRow label="Бесплатные сначала" description="Сортировать Free-ноды выше Pro внутри каждой категории.">
        <Toggle checked={prefs.freeFirst} onChange={(v) => setPreference('freeFirst', v)} />
      </SettingRow>

      <SettingRow
        label="Скрывать недоступные"
        description="Скрыть Pro-ноды, если у вас нет подписки PRO."
      >
        <Toggle
          checked={prefs.hideUnavailable}
          onChange={(v) => setPreference('hideUnavailable', v)}
        />
      </SettingRow>
    </Section>
  );
};

import React from 'react';
import { usePreferencesStore } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';

export const SidebarSortingSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <Section
      title="Сортировка в панели"
      description="Категории остаются как есть. Внутри каждой категории ноды сортируются отдельно: сначала бесплатные, затем Pro."
    >
      <SettingRow label="Бесплатные выше Pro" description="Free-ноды отображаются первыми.">
        <Toggle checked={prefs.freeFirst} onChange={(v) => setPreference('freeFirst', v)} />
      </SettingRow>
    </Section>
  );
};

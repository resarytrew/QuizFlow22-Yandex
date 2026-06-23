import React from 'react';
import { usePreferencesStore, type NodeSize } from '../../../store/usePreferencesStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';
import { SegmentedControl } from '../ui/SegmentedControl';

const SIZE_OPTIONS = [
  { value: 'sm' as NodeSize, label: 'Маленький' },
  { value: 'md' as NodeSize, label: 'Средний' },
  { value: 'lg' as NodeSize, label: 'Большой' },
];

export const NodesVisualSection: React.FC = () => {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <Section
      title="Ноды (визуал)"
      description="Параметры отображения карточек нод на холсте."
    >
      <SettingRow label="Размер" description="Ширина карточек нод.">
        <SegmentedControl
          options={SIZE_OPTIONS}
          value={prefs.nodeSize}
          onChange={(v) => setPreference('nodeSize', v)}
        />
      </SettingRow>

      <SettingRow label="Анимации" description="Плавные переходы и пульсации на нодах.">
        <Toggle
          checked={prefs.nodeAnimations}
          onChange={(v) => setPreference('nodeAnimations', v)}
        />
      </SettingRow>

      <SettingRow label="Тени" description="Глубина и тени карточек нод.">
        <Toggle checked={prefs.nodeShadows} onChange={(v) => setPreference('nodeShadows', v)} />
      </SettingRow>

      <SettingRow label="Компактность" description="Уменьшенные отступы в карточке ноды.">
        <Toggle
          checked={prefs.compactMode}
          onChange={(v) => setPreference('compactMode', v)}
        />
      </SettingRow>

      <SettingRow label="Иконки" description="Иконка типа ноды в заголовке.">
        <Toggle checked={prefs.showNodeIcons} onChange={(v) => setPreference('showNodeIcons', v)} />
      </SettingRow>

      <SettingRow label="Описания" description="Текст под заголовком ноды.">
        <Toggle
          checked={prefs.showNodeDescriptions}
          onChange={(v) => setPreference('showNodeDescriptions', v)}
        />
      </SettingRow>

      <SettingRow label="Бейджи Free / Pro" description="Маркер платной ноды прямо на карточке.">
        <Toggle
          checked={prefs.showNodeBadges}
          onChange={(v) => setPreference('showNodeBadges', v)}
        />
      </SettingRow>
    </Section>
  );
};

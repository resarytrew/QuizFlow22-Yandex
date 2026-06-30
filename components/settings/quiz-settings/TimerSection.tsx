import React from 'react';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { Section } from '../ui/Section';
import { SettingRow } from '../ui/SettingRow';
import { Toggle } from '../ui/Toggle';

export const TimerSection: React.FC = () => {
  const globalTimer = useQuizDataStore((s) => s.globalTimer);
  const setGlobalTimer = useQuizDataStore((s) => s.setGlobalTimer);
  const nodes = useCanvasStore((s) => s.nodes);

  const handleTimerChange = (field: string, value: unknown) => {
    setGlobalTimer({ ...globalTimer, [field]: value } as typeof globalTimer);
  };

  return (
    <Section
      title="Глобальный таймер"
      description="Ограничьте общее время прохождения квиза."
    >
      <SettingRow label="Включить таймер" description="Активирует обратный отсчёт для всего квиза.">
        <Toggle
          checked={globalTimer.enabled}
          onChange={(enabled) =>
            setGlobalTimer({
              enabled,
              duration: enabled ? Math.max(1, globalTimer.duration) : globalTimer.duration,
            })
          }
        />
      </SettingRow>

      {globalTimer.enabled && (
        <>
          <SettingRow label="Длительность" description="Время в секундах.">
            <input
              id="global-timer-duration"
              name="global-timer-duration"
              type="number"
              min={1}
              value={globalTimer.duration}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                handleTimerChange('duration', Number.isFinite(parsed) ? Math.max(1, parsed) : 1);
              }}
              className="w-full bg-slate-100 border border-slate-200/80 rounded-lg h-9 px-3 text-sm font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </SettingRow>

          <SettingRow
            label="Действие при истечении"
            description="Узел, на который перейдёт пользователь, когда время выйдет."
          >
            <select
              id="global-timer-timeout-node"
              name="global-timer-timeout-node"
              value={globalTimer.onTimeoutNodeId || ''}
              onChange={(e) => handleTimerChange('onTimeoutNodeId', e.target.value || null)}
              className="w-full bg-slate-100 border border-slate-200/80 rounded-lg h-9 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Выберите узел (обычно Результат) --</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {(node.data as { label?: string; title?: string }).label ||
                    (node.data as { label?: string; title?: string }).title ||
                    node.id}{' '}
                  ({node.type})
                </option>
              ))}
            </select>
          </SettingRow>
        </>
      )}
    </Section>
  );
};

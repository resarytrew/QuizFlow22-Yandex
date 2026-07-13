import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { DesignSelection } from '../../store/useUIStore';
import { useUIStore } from '../../store/useUIStore';
import type { DesignSettings } from '../../types';
import { getDesignElementEntry } from '../../src/designMode/elementRegistry';
import {
  buildDesignOverrideContext,
  createResetElementOverridePatch,
  createResetNodeOverridePatch,
  createScopedDesignPatch,
  createScopedResetPatch,
  hasScopedOverride,
  resolveDesignProperty,
  type DesignInspectorScope,
} from '../../src/designMode/designElementOverrides';
import DesignControl from './designControls';
import DesignPropertySource from './DesignPropertySource';
import DesignResetActions from './DesignResetActions';
import DesignScopeControl from './DesignScopeControl';
import { getInspectorSchema, type InspectorControlSchema } from './inspectorSchemas';

interface DesignElementInspectorProps {
  selection: DesignSelection;
}

function resetSectionForRole(role: DesignSelection['role']): keyof DesignSettings | null {
  if (role === 'question-card' || role === 'question-title' || role === 'question-description' || role === 'media') return 'questionCard';
  if (role === 'answer-card' || role === 'answers-container') return 'answerCards';
  if (role === 'primary-action' || role === 'result-action') return 'buttons';
  if (role === 'canvas-background' || role === 'quiz-shell' || role === 'topbar') return 'background';
  if (role === 'progress' || role === 'timer') return 'progress';
  if (role === 'result-card' || role === 'result-title' || role === 'result-score') return 'result';
  return null;
}

function controlHistoryLabel(control: InspectorControlSchema, scope: DesignInspectorScope): string {
  return `Update ${control.id} (${scope})`;
}

const DesignElementInspector: React.FC<DesignElementInspectorProps> = ({ selection }) => {
  const [scope, setScope] = React.useState<DesignInspectorScope>(selection.nodeId ? 'node' : 'global');
  const nodes = useCanvasStore((state) => state.nodes);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const activeDesignStyleId = useQuizDataStore((state) => state.activeDesignStyleId);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const resetDesignProperty = useQuizDataStore((state) => state.resetDesignProperty);
  const resetDesignSection = useQuizDataStore((state) => state.resetDesignSection);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
  const registryEntry = getDesignElementEntry(selection.role);
  const schema = getInspectorSchema(selection.role);
  const context = React.useMemo(
    () => buildDesignOverrideContext(selection.role, selection.nodeId, nodes),
    [nodes, selection.nodeId, selection.role],
  );
  const canUseNodeScope = Boolean(context.nodeId && context.nodeType);

  React.useEffect(() => {
    if (!canUseNodeScope && scope !== 'global') setScope('global');
  }, [canUseNodeScope, scope]);

  const handleControlChange = (control: InspectorControlSchema, value: unknown) => {
    const patch = createScopedDesignPatch(designSettings, scope, context, control.path, value, control.storage);
    updateDesignSettings(patch, {
      label: controlHistoryLabel(control, scope),
      coalesceKey: control.coalesce ? `${scope}:${selection.role}:${control.path}` : undefined,
    });
  };

  const handleControlReset = (control: InspectorControlSchema) => {
    if (scope === 'global' && control.storage === 'design') {
      resetDesignProperty(control.path);
      return;
    }
    updateDesignSettings(
      createScopedResetPatch(designSettings, scope, context, control.path),
      { label: `Reset ${control.id} (${scope})` },
    );
  };

  const handleResetElement = () => {
    if (scope === 'global') {
      const section = resetSectionForRole(selection.role);
      if (section) resetDesignSection(section);
      updateDesignSettings(
        createResetElementOverridePatch(designSettings, 'global', context),
        { label: `Reset ${selection.role} global overrides` },
      );
      return;
    }
    updateDesignSettings(
      createResetElementOverridePatch(designSettings, scope, context),
      { label: `Reset ${selection.role} scoped overrides` },
    );
  };

  const handleResetScreen = () => {
    updateDesignSettings(
      createResetNodeOverridePatch(designSettings, selection.nodeId),
      { label: 'Reset current screen design overrides' },
    );
  };

  return (
    <div className="space-y-6">
      <div className="pr-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{schema.title || registryEntry.label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Контекстные настройки выбранного элемента в Live Preview.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDesignElement(null)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
          >
            Закрыть
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-bold text-slate-900">{selection.elementId}</div>
        <div className="mt-1 text-slate-500">Экран: {selection.nodeId ?? 'общий'}</div>
        <div className="mt-1 text-slate-500">Роль: {selection.role}</div>
      </div>

      <DesignScopeControl
        value={scope}
        onChange={setScope}
        canUseNodeScope={canUseNodeScope}
      />

      {schema.sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{section.title}</h3>
          <div className="space-y-4">
            {section.controls.map((control) => {
              const property = resolveDesignProperty(
                designSettings,
                context,
                control.path,
                control.storage,
                control.defaultValue,
                activeDesignStyleId,
              );
              const scopedOverride = hasScopedOverride(designSettings, scope, context, control.path, control.storage);
              return (
                <div key={control.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <label htmlFor={`design-control-${control.id}`} className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {control.label}
                  </label>
                  <DesignControl
                    schema={control}
                    value={property.value}
                    onChange={(value) => handleControlChange(control, value)}
                  />
                  <DesignPropertySource
                    source={property.source}
                    overridden={property.isOverridden || scopedOverride}
                    onReset={(property.isOverridden || scopedOverride) ? () => handleControlReset(control) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <DesignResetActions
        onResetElement={handleResetElement}
        onResetScreen={handleResetScreen}
        canResetScreen={Boolean(selection.nodeId)}
      />
    </div>
  );
};

export default DesignElementInspector;

import React, { useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore } from '../../store/useUIStore';
import {
  checkDesignQuality,
  createDesignQualityFixPatch,
  type DesignQualityIssue,
} from '../../src/designMode/designQualityChecker';
import type { LayoutBreakpoint, LayoutScopeContext } from '../../src/designMode/layoutDocument';

function toBreakpoint(device: string): LayoutBreakpoint {
  return device === 'tablet' || device === 'mobile' ? device : 'desktop';
}

function issueTone(severity: DesignQualityIssue['severity']): string {
  if (severity === 'error') return 'border-red-200 bg-red-50 text-red-800';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

const DesignQualityPanel: React.FC = () => {
  const isOpen = useUIStore((state) => state.isDesignQualityPanelOpen);
  const close = useUIStore((state) => state.closeDesignQualityPanel);
  const setSelectedDesignElement = useUIStore((state) => state.setSelectedDesignElement);
  const setHighlightedDesignIssueId = useUIStore((state) => state.setHighlightedDesignIssueId);
  const previewDevice = useUIStore((state) => state.previewDevice);
  const selectedNode = useCanvasStore((state) => state.selectedNode);
  const nodes = useCanvasStore((state) => state.nodes);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const designSettings = useQuizDataStore((state) => state.designSettings);
  const templateId = useQuizDataStore((state) => state.templateId);
  const updateDesignSettings = useQuizDataStore((state) => state.updateDesignSettings);
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);

  const breakpoint = toBreakpoint(previewDevice);
  const summary = useMemo(() => checkDesignQuality(designSettings, {
    breakpoint,
    nodeId: selectedNode?.id ?? null,
    nodeType: typeof selectedNode?.type === 'string' ? selectedNode.type : null,
    templateId,
  }), [breakpoint, designSettings, selectedNode?.id, selectedNode?.type, templateId]);

  if (!isOpen) return null;

  const layoutContext: LayoutScopeContext = {
    scope: 'global',
    nodeId: selectedNode?.id ?? null,
    nodeType: typeof selectedNode?.type === 'string' ? selectedNode.type : null,
  };

  const selectIssue = (issue: DesignQualityIssue) => {
    setHighlightedDesignIssueId(issue.id);
    if (issue.nodeId) {
      const node = nodes.find((item) => item.id === issue.nodeId) ?? null;
      if (node) setSelectedNode(node);
    }
    if (issue.elementId && issue.role) {
      setSelectedDesignElement({
        elementId: issue.elementId,
        role: issue.role,
        nodeId: issue.nodeId ?? selectedNode?.id ?? null,
      });
    }
  };

  const applyFix = (issue: DesignQualityIssue) => {
    const patch = createDesignQualityFixPatch(designSettings, { ...layoutContext, breakpoint }, issue);
    if (!patch) return;
    updateDesignSettings(patch as never, { label: `Auto-fix ${issue.code}` });
    setPendingIssueId(null);
  };

  return (
    <aside
      className="absolute bottom-4 left-4 z-40 flex max-h-[70vh] w-[24rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      aria-label="Проверка качества дизайна"
      data-testid="design-quality-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Проверка дизайна</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {summary.errors} ошибок · {summary.warnings} предупреждений · {summary.recommendations} советов
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
        >
          Закрыть
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {summary.issues.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Критичных проблем на текущем breakpoint не найдено.
          </div>
        ) : (
          <div className="space-y-2">
            {summary.issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-xl border p-3 ${issueTone(issue.severity)}`}
              >
                <button
                  type="button"
                  onClick={() => selectIssue(issue)}
                  className="block w-full text-left"
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                    {issue.breakpoint} · {issue.code}
                  </span>
                  <span className="mt-1 block text-sm font-bold leading-snug">{issue.message}</span>
                  {issue.propertyPath && (
                    <span className="mt-1 block text-xs font-semibold opacity-70">{issue.propertyPath}</span>
                  )}
                </button>
                {issue.fixable && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingIssueId(issue.id)}
                      className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-white"
                    >
                      Предпросмотр
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFix(issue)}
                      disabled={pendingIssueId !== issue.id}
                      className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Исправить автоматически
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesignQualityPanel;

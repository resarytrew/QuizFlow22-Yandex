import { useEffect, useMemo, useRef } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useUIStore } from '../../store/useUIStore';
import { nodeTitle, validateEditorGraph } from '../../utils/editorValidation';

export function ValidationDialog({ onClose, onLocate }: { onClose: () => void; onLocate?: (id: string) => void }) {
  const nodes = useCanvasStore(s => s.nodes);
  const edges = useCanvasStore(s => s.edges);
  const issues = useMemo(() => validateEditorGraph(nodes, edges), [nodes, edges]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, []);

  const openNode = (id: string) => {
    const node = nodes.find(item => item.id === id);
    if (!node) return;
    useUIStore.getState().setCurrentGroup(node.data.parentId || null);
    useCanvasStore.getState().selectSingleNode(id);
    useUIStore.getState().openSettingsPanel();
    onClose();
    onLocate?.(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="validation-title"
        className="w-full max-w-xl max-h-[min(80vh,40rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (event.key !== 'Tab') return;
          const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
          if (!buttons.length) return;
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="validation-title" className="text-lg font-semibold text-slate-900">Проверка схемы</h2>
            <p className="mt-1 text-sm text-slate-600">Проверьте замечания и пройдите ветки в предпросмотре.</p></div>
          <button type="button" onClick={onClose} aria-label="Закрыть проверку" className="rounded p-2 text-slate-600 hover:bg-slate-100">✕</button>
        </div>
        <div className="mt-4">
          {issues.length === 0 && <p role="status" className="text-sm text-emerald-700">Структурных ошибок не найдено.</p>}
          {issues.map((issue, index) => {
            const node = nodes.find(item => item.id === issue.nodeId);
            const content = <><span className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-800'}>{issue.severity === 'error' ? 'Ошибка' : 'Рекомендация'}</span> · {issue.message}{node && <small className="block text-slate-500">{nodeTitle(node)}</small>}</>;
            return node ? <button key={index} type="button" onClick={() => openNode(node.id)} className="block w-full border-b border-slate-100 py-3 text-left text-sm hover:bg-slate-50">{content}</button>
              : <div key={index} className="border-b border-slate-100 py-3 text-sm">{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import { useUIStore } from '../store/useUIStore';
import { nodeTitle } from '../utils/editorValidation';
import LivePreview from './LivePreview';
import { ScreenQuizEditor } from './ScreenQuizEditor';

const utility = new Set(['startNode', 'scoreNode', 'variableNode', 'conditionNode', 'formulaNode', 'goToNode', 'progressionNode', 'achievementNode']);
export function ScreenQuizWorkspace() {
  const nodes = useCanvasStore(state => state.nodes);
  const selected = useCanvasStore(state => state.selection.primarySelectedNodeId);
  const close = useUIStore(state => state.setScreenQuizMode);
  const visible = useMemo(() => nodes.filter(node => !utility.has(String(node.type))), [nodes]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<string>('shared');
  const [previewId, setPreviewId] = useState<string>(() => visible.some(node => node.id === selected) ? selected! : visible[0]?.id ?? '');
  useEffect(() => {
    if (scope !== 'shared' && !visible.some(node => node.id === scope)) setScope('shared');
    if (previewId && !visible.some(node => node.id === previewId)) setPreviewId(visible[0]?.id ?? '');
  }, [visible, scope, previewId]);
  return <section aria-label="Редактор экранной викторины" className="absolute inset-0 z-40 flex min-h-0 flex-col bg-slate-100">
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <h2 className="font-semibold text-slate-900">Экранная викторина</h2>
      <button type="button" onClick={() => close(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Вернуться к схеме</button>
    </div>
    <button type="button" className="screen-preview-jump border-b border-slate-200 bg-white px-4 py-2 text-left text-sm font-medium text-indigo-700" onClick={() => previewRef.current?.scrollIntoView({ block: 'start' })}>Показать предпросмотр</button>
    <div className="design-workspace flex min-h-0 flex-1">
      <div className="design-workspace-controls w-[min(42%,36rem)] min-w-0 overflow-y-auto bg-white p-4">
        <label className="block text-sm font-semibold">Область настроек<select aria-label="Область настроек" className="editor-input" value={scope} onChange={event => {
          setScope(event.target.value); if (event.target.value !== 'shared') setPreviewId(event.target.value);
        }}><option value="shared">Общие настройки</option>{visible.map(node => <option key={node.id} value={node.id}>{nodeTitle(node)}</option>)}</select></label>
        <div className="mt-4"><ScreenQuizEditor nodeId={scope === 'shared' ? null : scope} /></div>
      </div>
      <div ref={previewRef} className="design-workspace-preview flex min-w-0 flex-1 flex-col">
        <label className="mx-4 mt-3 block text-sm font-medium">Экран предпросмотра<select aria-label="Экран предпросмотра" className="editor-input" value={previewId} onChange={event => setPreviewId(event.target.value)}>
          {!visible.length && <option value="">Нет экранов</option>}{visible.map(node => <option key={node.id} value={node.id}>{nodeTitle(node)}</option>)}
        </select></label>
        {previewId ? <div className="min-h-0 flex-1"><LivePreview embedded startNodeId={previewId} /></div> : <p className="p-4 text-sm text-slate-600">Добавьте экран, чтобы увидеть предпросмотр.</p>}
      </div>
    </div>
  </section>;
}

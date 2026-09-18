
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { generateQuizHtml } from '../services/quizGenerator';

const DEBOUNCE_MS = 400;

function htmlKey(html: string): string {
  let hash = 0;
  for (let i = 0; i < html.length; i += 1) {
    hash = (hash * 31 + html.charCodeAt(i)) | 0;
  }
  return `${html.length}-${hash}`;
}

const LivePreview: React.FC = () => {
  const nodes = useCanvasStore(s => s.nodes);
  const edges = useCanvasStore(s => s.edges);
  const globalTimer = useQuizDataStore(s => s.globalTimer);
  const designSettings = useQuizDataStore(s => s.designSettings);
  const previewStartNodeId = useUIStore(s => s.previewStartNodeId);
  const templateId = useQuizDataStore(s => s.templateId);
  const currentQuizName = useQuizDataStore(s => s.currentQuizName);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [trace,setTrace] = useState<{nodeId:string;score:number|null;variables:Record<string,unknown>;path:string[]} | null>(null);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow || event.origin!==window.location.origin || event.data?.type!=='potok-preview-state')return;
      const data=event.data;
      if(typeof data.nodeId!=='string' || (data.score!==null && typeof data.score!=='number') || !Array.isArray(data.path))return;
      setTrace({nodeId:data.nodeId,score:data.score,variables:data.variables&&typeof data.variables==='object'?data.variables:{},path:data.path.filter((id:unknown)=>typeof id==='string').slice(-100)});
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[]);
  const editCurrent=()=>{if(!trace)return;const node=useCanvasStore.getState().nodes.find(n=>n.id===trace.nodeId);useUIStore.getState().setPreviewMode(false);useUIStore.getState().setCurrentGroup(node?.data.parentId||null);useCanvasStore.getState().selectSingleNode(trace.nodeId);useUIStore.getState().openSettingsPanel();};
  const [htmlContent, setHtmlContent] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewInputs = useMemo(() => ({
    nodes, edges, globalTimer, designSettings, previewStartNodeId, templateId, currentQuizName
  }), [nodes, edges, globalTimer, designSettings, previewStartNodeId, templateId, currentQuizName]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // preview=true: рендерим для srcdoc iframe в редакторе.
      // Движок подключается как external `<script type="module">`
      // (same-origin через Vite middleware), данные — как
      // `<script type="application/json">`. Никаких inline-скриптов,
      // поэтому строгий родительский CSP не блокирует.
      const html = generateQuizHtml(
        {
          nodes: previewInputs.nodes,
          edges: previewInputs.edges,
          globalTimer: previewInputs.globalTimer,
          designSettings: previewInputs.designSettings as unknown as Record<string, unknown>,
          quizId: null,
          templateId: previewInputs.templateId,
          currentQuizName: previewInputs.currentQuizName,
          startNodeId: previewInputs.previewStartNodeId ?? undefined,
        },
        { preview: true }
      );
      setTrace(null);
      setHtmlContent(html);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [previewInputs]);

  return (
    <div className="w-full h-full p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl text-center mb-4">
             <h2 className="text-lg font-bold text-gray-700">Предпросмотр в реальном времени</h2>
             <p className="text-sm text-gray-500">Изменения в панели настроек отразятся здесь мгновенно.</p>
        </div>
      <div className="flex flex-wrap gap-3 text-sm mb-3 max-w-full">
       <button className="underline" onClick={()=>useUIStore.getState().setPreviewMode(false)}>Вернуться к схеме</button>
       {trace&&<><span>{trace.score === null ? 'Автоматический показ без подсчёта баллов' : `Баллы: ${trace.score}`}</span><button className="underline" onClick={editCurrent}>Редактировать текущий блок</button><details><summary>Маршрут и переменные</summary><ol className="max-h-32 overflow-auto">{trace.path.map((id,i)=><li key={i}>{nodes.find(n=>n.id===id)?.data.label||id}</li>)}</ol><pre className="max-h-32 overflow-auto text-xs">{JSON.stringify(trace.variables,null,2)}</pre></details></>}
      </div>
      <div className="w-full h-full min-h-0 border-8 border-gray-800 bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <iframe
          ref={iframeRef}
          key={htmlKey(htmlContent)}
          srcDoc={htmlContent}
          title="Live Quiz Preview"
          className="w-full h-full border-0 bg-white"
          // allow-same-origin lets the iframe share the parent origin
          // for postMessage + auth cookies. Same rationale as
          // QuizPlayer.tsx — user text is DOMPurify-sanitized before
          // injection, so the engine code is the only attack surface
          // and it's trusted.
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default LivePreview;

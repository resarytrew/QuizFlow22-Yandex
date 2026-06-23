
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCanvasStore } from '../store/useCanvasStore.ts';
import { useUIStore } from '../store/useUIStore.ts';
import { useQuizDataStore } from '../store/useQuizDataStore.ts';
import { generateQuizHtml } from '../services/quizGenerator';

const DEBOUNCE_MS = 400;

const LivePreview: React.FC = () => {
  const nodes = useCanvasStore(s => s.nodes);
  const edges = useCanvasStore(s => s.edges);
  const globalTimer = useQuizDataStore(s => s.globalTimer);
  const designSettings = useQuizDataStore(s => s.designSettings);
  const previewStartNodeId = useUIStore(s => s.previewStartNodeId);
  const templateId = useQuizDataStore(s => s.templateId);
  const currentQuizName = useQuizDataStore(s => s.currentQuizName);
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
          nodes: previewInputs.nodes as any,
          edges: previewInputs.edges as any,
          globalTimer: previewInputs.globalTimer,
          designSettings: previewInputs.designSettings as any,
          quizId: null,
          templateId: previewInputs.templateId as any,
          currentQuizName: previewInputs.currentQuizName,
          startNodeId: previewInputs.previewStartNodeId ?? undefined,
        },
        { preview: true }
      );
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
      <div className="w-full h-full border-8 border-gray-800 bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <iframe
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

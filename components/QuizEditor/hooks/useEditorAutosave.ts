import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { buildCurrentQuizData, useQuizDataStore } from '../../../store/useQuizDataStore';
import { useAutosaveStore } from '../../../store/useAutosaveStore';
import { useAuthStore } from '../../../store/useAuthStore';

export function useEditorAutosave() {
 const navigate = useNavigate();
 const session = useAuthStore(s => s.session);
 const nodes = useCanvasStore(s => s.nodes); const edges = useCanvasStore(s => s.edges);
 const key = useQuizDataStore(s => s.editorKey);
 const name = useQuizDataStore(s => s.currentQuizName);
 const timer = useQuizDataStore(s => s.globalTimer);
 const design = useQuizDataStore(s => s.designSettings);
 const template = useQuizDataStore(s => s.templateId);
 const base = useQuizDataStore(s => s.quizDataBase);
 const signature = useMemo(() => JSON.stringify(buildCurrentQuizData()), [nodes, edges, name, timer, design, template, base]);
 const previous = useRef<{key:string;signature:string} | null>(null);
 useEffect(() => {
  if ((!previous.current || previous.current.key !== key) && useQuizDataStore.getState().saveStatus !== 'dirty') { previous.current = { key, signature }; return; }
  if (previous.current?.signature === signature) return;
  previous.current = {key,signature};
  useAutosaveStore.getState().autosaveCurrentQuiz();
  if (useQuizDataStore.getState().saveStatus === 'conflict') return;
  useQuizDataStore.setState({ saveStatus: session ? 'dirty' : 'local' });
  const save = async () => {
   if (useQuizDataStore.getState().editorKey !== key) return;
   const wasNew = !useQuizDataStore.getState().currentQuizId;
   const id = await useQuizDataStore.getState().autosaveQuiz();
   if (id && wasNew && useQuizDataStore.getState().editorKey === key && window.location.hash === '#/editor')
    await navigate({ to: '/editor/$quizId', params: { quizId: id }, replace: true });
  };
  const timeout = window.setTimeout(() => { if (session) void save(); }, 1400);
  return () => window.clearTimeout(timeout);
 }, [signature, key, session, navigate]);
 useEffect(() => {
  const flush = () => {
   const status = useQuizDataStore.getState().saveStatus;
   if (['dirty','error','local','conflict','saving'].includes(status)) useAutosaveStore.getState().autosaveCurrentQuiz();
  };
  const beforeUnload = (e: BeforeUnloadEvent) => {
   flush();
   if (['dirty','error','conflict','saving'].includes(useQuizDataStore.getState().saveStatus)) { e.preventDefault(); e.returnValue = ''; }
  };
  const retry = () => {
   if (['error','dirty','local'].includes(useQuizDataStore.getState().saveStatus)) void useQuizDataStore.getState().autosaveQuiz();
  };
  window.addEventListener('online', retry); window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', beforeUnload);
  return () => { flush(); window.removeEventListener('online', retry); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', beforeUnload); };
 }, []);
}

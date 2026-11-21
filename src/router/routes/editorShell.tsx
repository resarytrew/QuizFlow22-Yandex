import { useEffect, useState } from 'react';
import { useEditorAutosave } from '../../../components/QuizEditor/hooks/useEditorAutosave';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { createRoute, Outlet } from '@tanstack/react-router';
import { ReactFlowProvider } from 'reactflow';
import { Route as appShellRoute } from './appShell';
import Sidebar from '../../../components/Sidebar';
import SettingsPanel from '../../../components/SettingsPanel';
import DesignPanel from '../../../components/DesignPanel';
import { ScreenQuizWorkspace } from '../../../components/ScreenQuizWorkspace';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import AIAssistantPanel from '../../../components/AIAssistantPanel';
import AssetManagerModal from '../../../components/modals/AssetManagerModal';
import { AIQuizWizard } from '../../../components/AIQuizWizard';
import { CanvasErrorBoundary } from '../../../components/CanvasErrorBoundary';
import RestoreAutosavePrompt from '../../../components/RestoreAutosavePrompt';
import LivePreview from '../../../components/LivePreview';
import Header from '../../../components/Header';
import { useUIStore } from '../../../store/useUIStore';
import { CustomNodeType } from '../../../types';
import { downloadQuizFile } from '../../../components/header/quizFile';

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  id: '__editorShell',
  component: EditorShellLayout,
});

function EditorShellLayout() {
  useEditorAutosave();
  const [pane,setPane]=useState('canvas');
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const migrationCandidate = useQuizDataStore(s => s.quizDataBase.legacyThemeMigration);
  const migration = migrationCandidate?.version === 1 && Array.isArray(migrationCandidate.unsupportedPaths) && migrationCandidate.unsupportedPaths.every(path => typeof path === 'string') ? migrationCandidate : undefined;
  const editorKey = useQuizDataStore(s => s.editorKey);
  useEffect(() => setMigrationDismissed(false), [editorKey]);
  const [designPreviewNode, setDesignPreviewNode] = useState('');
  const [designPreviewWidth, setDesignPreviewWidth] = useState('desktop');
  const previewNodes = useCanvasStore(s => s.nodes).filter(n => [CustomNodeType.Start, CustomNodeType.Question, CustomNodeType.MultipleChoice, CustomNodeType.Info, CustomNodeType.Result].includes(n.type as CustomNodeType));
  const selected=useCanvasStore(s=>s.selection.primarySelectedNodeId);
  const history = useCanvasStore(s => s.history);

  const isSidebarVisible = useUIStore((s) => s.isSidebarVisible);
  const isAIAssistantPanelVisible = useUIStore((s) => s.isAIAssistantPanelVisible);
  const isSettingsPanelVisible = useUIStore((s) => s.isSettingsPanelVisible);
  const isPreviewModeActive = useUIStore((s) => s.isPreviewModeActive);
  const isDesignModeActive = useUIStore((s) => s.isDesignModeActive);
  const setDesignMode = useUIStore((s) => s.setDesignMode);
  const isScreenQuizModeActive = useUIStore((s) => s.isScreenQuizModeActive);
  const setScreenQuizMode = useUIStore((s) => s.setScreenQuizMode);
  const templateId = useQuizDataStore((s) => s.templateId);
  const workspaceOpen = isDesignModeActive || isScreenQuizModeActive;
  useEffect(() => {
    if (!isDesignModeActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || !(event.ctrlKey || event.metaKey) || target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) useCanvasStore.getState().redo();
      else useCanvasStore.getState().undo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDesignModeActive]);
  useEffect(() => { if (templateId !== 'screenQuiz' && isScreenQuizModeActive) setScreenQuizMode(false); }, [templateId, isScreenQuizModeActive, setScreenQuizMode]);
  useEffect(() => { if (templateId === 'screenQuiz' && isDesignModeActive) setDesignMode(false); }, [templateId, isDesignModeActive, setDesignMode]);
  const showSettings = isSettingsPanelVisible && Boolean(selected);
  useEffect(() => {
    if (!selected) useUIStore.getState().closeSettingsPanel();
    if (window.matchMedia('(max-width:1100px)').matches) {
      if (showSettings) setPane('settings');
      else setPane(current => current === 'settings' ? 'canvas' : current);
    }
  }, [selected, showSettings]);

  return (
    <ReactFlowProvider>
      <div data-editor-pane={isPreviewModeActive ? "canvas" : pane} className="editor-shell w-screen bg-[#f0f2f5] text-gray-800 font-inter flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="relative flex-grow w-full h-full overflow-hidden bg-slate-50">
          <CanvasErrorBoundary>
            <div className="absolute inset-0 z-0" inert={workspaceOpen && !isPreviewModeActive} aria-hidden={workspaceOpen && !isPreviewModeActive}>
              {isPreviewModeActive ? <LivePreview /> : <Outlet />}
            </div>
          </CanvasErrorBoundary>
          <RestoreAutosavePrompt />
          {migration && !migrationDismissed && <aside role="alert" className="absolute bottom-4 left-4 z-50 max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
            <p className="font-semibold">Проект перенесён на базовый шаблон</p>
            <p className="mt-1">Специальные сцены и обратная связь могут отличаться. Исходный проект сохранён в резервной копии; проверьте прохождение перед публикацией.</p>
            {migration.unsupportedPaths.length > 0 && <details className="mt-2"><summary>Неперенесённые поля: {migration.unsupportedPaths.length}</summary><ul className="max-h-32 overflow-auto break-all">{migration.unsupportedPaths.map(path => <li key={path}>{path}</li>)}</ul></details>}
            <div className="mt-2 flex gap-3"><button type="button" className="underline" onClick={() => downloadQuizFile(JSON.stringify(migration.original, null, 2), 'original-quiz-backup')}>Скачать исходный JSON</button><button type="button" className="underline" onClick={() => setMigrationDismissed(true)}>Закрыть</button></div>
          </aside>}
          {!workspaceOpen && !isPreviewModeActive && <nav className="editor-mobile-nav" aria-label="Панели редактора">
            {([['canvas','Холст'],['palette','Блоки'],['settings','Настройки'],['ai','AI']] as const).map(([id,label]) =>
              <button key={id} type="button" disabled={id === 'settings' && !selected} aria-pressed={pane === id}
                onClick={() => { setPane(id); if (id === 'settings') useUIStore.getState().openSettingsPanel(); if (id === 'palette') useUIStore.setState({isSidebarVisible:true}); if (id === 'ai') useUIStore.setState({isAIAssistantPanelVisible:true}); }}>{label}</button>)}
          </nav>}
          {isDesignModeActive && !isPreviewModeActive && <section aria-label="Оформление квиза" className="absolute inset-0 z-40 flex min-h-0 flex-col bg-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <h2 className="font-semibold text-slate-900">Оформление квиза</h2>
              <div className="flex items-center gap-1"><button type="button" disabled={!history.past.length} onClick={() => useCanvasStore.getState().undo()} className="rounded-lg px-2 py-2 text-sm disabled:opacity-40">Отменить</button><button type="button" disabled={!history.future.length} onClick={() => useCanvasStore.getState().redo()} className="rounded-lg px-2 py-2 text-sm disabled:opacity-40">Повторить</button><button type="button" onClick={() => setDesignMode(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Вернуться к схеме</button></div>
            </div>
            <div className="design-workspace flex min-h-0 flex-1">
              <div className="design-workspace-controls w-[min(42%,36rem)] min-w-0 overflow-y-auto bg-white p-4"><DesignPanel /></div>
              <div className="design-workspace-preview min-w-0 flex-1 flex flex-col" id="design-preview">
                <div className="flex flex-wrap gap-3 px-4 pt-3">
                  <label className="text-sm text-slate-700">Экран <select aria-label="Экран предпросмотра" className="rounded border border-slate-300 bg-white p-1" value={designPreviewNode} onChange={e => setDesignPreviewNode(e.target.value)}><option value="">Начало квиза</option>{previewNodes.map(node => <option key={node.id} value={node.id}>{node.data.label || node.type}</option>)}</select></label>
                  <label className="text-sm text-slate-700">Размер <select aria-label="Размер предпросмотра" className="rounded border border-slate-300 bg-white p-1" value={designPreviewWidth} onChange={e => setDesignPreviewWidth(e.target.value)}><option value="desktop">На всю ширину</option><option value="tablet">Планшет</option><option value="mobile">Телефон</option></select></label>
                </div>
                <div className="mx-auto min-h-0 w-full flex-1" style={{ maxWidth: designPreviewWidth === 'mobile' ? 438 : designPreviewWidth === 'tablet' ? 816 : undefined }}><LivePreview embedded startNodeId={designPreviewNode || null} /></div>
              </div>
            </div>
          </section>}
          {isScreenQuizModeActive && !isPreviewModeActive && <ScreenQuizWorkspace />}
          <div
            data-testid="editor-sidebar-container"
            aria-hidden={isPreviewModeActive || workspaceOpen || !isSidebarVisible}
            inert={isPreviewModeActive || workspaceOpen || !isSidebarVisible}
            className={`editor-palette absolute top-16 left-4 bottom-4 w-72 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              !isPreviewModeActive && !workspaceOpen && isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transform: isSidebarVisible ? 'translateX(0)' : 'translateX(calc(-100% - 2rem))',
            }}
          >
            <Sidebar />
          </div>
          <div
            inert={isPreviewModeActive || workspaceOpen || !isAIAssistantPanelVisible}
            className={`editor-ai absolute top-16 left-80 bottom-4 w-80 transition-transform duration-300 ease-in-out z-30 ${
              !isPreviewModeActive && !workspaceOpen && isAIAssistantPanelVisible
                ? 'translate-x-0'
                : '-translate-x-[200%] opacity-0 pointer-events-none'
            }`}
          >
            <AIAssistantPanel />
          </div>
          <div
            data-testid="editor-settings-container"
            aria-hidden={isPreviewModeActive || workspaceOpen || !showSettings}
            inert={isPreviewModeActive || workspaceOpen || !showSettings}
            className={`editor-properties absolute top-16 right-4 bottom-4 w-96 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              !isPreviewModeActive && !workspaceOpen && showSettings ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transform: showSettings ? 'translateX(0)' : 'translateX(calc(100% + 2rem))',
            }}
          >
            <SettingsPanel />
          </div>
        </main>
      </div>
      <AssetManagerModal />
      <AIQuizWizard />
    </ReactFlowProvider>
  );
}

import { useEffect, useState } from 'react';
import { useEditorAutosave } from '../../../components/QuizEditor/hooks/useEditorAutosave';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { createRoute, Outlet } from '@tanstack/react-router';
import { ReactFlowProvider } from 'reactflow';
import { Route as appShellRoute } from './appShell';
import Sidebar from '../../../components/Sidebar';
import SettingsPanel from '../../../components/SettingsPanel';
import AIAssistantPanel from '../../../components/AIAssistantPanel';
import AssetManagerModal from '../../../components/modals/AssetManagerModal';
import { AIQuizWizard } from '../../../components/AIQuizWizard';
import { CanvasErrorBoundary } from '../../../components/CanvasErrorBoundary';
import RestoreAutosavePrompt from '../../../components/RestoreAutosavePrompt';
import LivePreview from '../../../components/LivePreview';
import Header from '../../../components/Header';
import { useUIStore } from '../../../store/useUIStore';

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  id: '__editorShell',
  component: EditorShellLayout,
});

function EditorShellLayout() {
  useEditorAutosave();
  const [pane,setPane]=useState('canvas');
  const selected=useCanvasStore(s=>s.selection.primarySelectedNodeId);
  useEffect(()=>{if(selected && window.matchMedia('(max-width:1100px)').matches) setPane('settings');},[selected]);
  const isSidebarVisible = useUIStore((s) => s.isSidebarVisible);
  const isAIAssistantPanelVisible = useUIStore((s) => s.isAIAssistantPanelVisible);
  const isSettingsPanelVisible = useUIStore((s) => s.isSettingsPanelVisible);
  const isPreviewModeActive = useUIStore((s) => s.isPreviewModeActive);

  return (
    <ReactFlowProvider>
      <div data-editor-pane={isPreviewModeActive ? "canvas" : pane} className="editor-shell w-screen bg-[#f0f2f5] text-gray-800 font-inter flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="relative flex-grow w-full h-full overflow-hidden bg-slate-50">
          <CanvasErrorBoundary>
            <div className="absolute inset-0 z-0">
              {isPreviewModeActive ? <LivePreview /> : <Outlet />}
            </div>
          </CanvasErrorBoundary>
          <RestoreAutosavePrompt />
          <nav className="editor-mobile-nav" aria-label="Панели редактора">{[['canvas','Холст'],['palette','Блоки'],['settings','Настройки'],['ai','AI']].map(([id,label])=><button key={id} aria-pressed={pane===id} onClick={()=>{setPane(id);if(id==='settings')useUIStore.getState().openSettingsPanel();if(id==='palette')useUIStore.setState({isSidebarVisible:true});if(id==='ai')useUIStore.setState({isAIAssistantPanelVisible:true});}}>{label}</button>)}</nav>
          <div
            data-testid="editor-sidebar-container"
            aria-hidden={isPreviewModeActive || !isSidebarVisible}
            inert={isPreviewModeActive || !isSidebarVisible}
            className={`editor-palette absolute top-16 left-4 bottom-4 w-72 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              !isPreviewModeActive && isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transform: isSidebarVisible ? 'translateX(0)' : 'translateX(calc(-100% - 2rem))',
            }}
          >
            <Sidebar />
          </div>
          <div
            inert={isPreviewModeActive || !isAIAssistantPanelVisible}
            className={`editor-ai absolute top-16 left-80 bottom-4 w-80 transition-transform duration-300 ease-in-out z-30 ${
              !isPreviewModeActive && isAIAssistantPanelVisible
                ? 'translate-x-0'
                : '-translate-x-[200%] opacity-0 pointer-events-none'
            }`}
          >
            <AIAssistantPanel />
          </div>
          <div
            data-testid="editor-settings-container"
            aria-hidden={isPreviewModeActive || !isSettingsPanelVisible}
            inert={isPreviewModeActive || !isSettingsPanelVisible}
            className={`editor-properties absolute top-16 right-4 bottom-4 w-96 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              !isPreviewModeActive && isSettingsPanelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transform: isSettingsPanelVisible ? 'translateX(0)' : 'translateX(calc(100% + 2rem))',
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

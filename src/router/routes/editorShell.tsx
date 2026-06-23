import { createRoute, Outlet } from '@tanstack/react-router';
import * as ReactFlow from 'reactflow';
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
import { useEntitlementStore } from '../../../store/useEntitlementStore';
import { useAppNavigation } from '../useAppNavigation';
import { hasFeature } from '../../../components/Paywall';
import toast from 'react-hot-toast';

const { ReactFlowProvider } = ReactFlow as any;

// ─── Pathless layout: editor surface ──────────────────────────────────────────
// Вложен в __appShell. Добавляет:
// - ReactFlowProvider
// - Sidebar / AIAssistantPanel / SettingsPanel (overlay с translate-X)
// - CanvasErrorBoundary, RestoreAutosavePrompt
// - AssetManagerModal, AIQuizWizard
//
// Применяется к: /editor, /editor/$quizId
//
// Dashboard НЕ использует этот layout (рендерится через __appShell напрямую).

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  id: '__editorShell',
  component: EditorShellLayout,
});

function EditorShellLayout() {
  const isSidebarVisible = useUIStore((s) => s.isSidebarVisible);
  const isAIAssistantPanelVisible = useUIStore(
    (s) => s.isAIAssistantPanelVisible
  );
  const isSettingsPanelVisible = useUIStore((s) => s.isSettingsPanelVisible);
  const isPreviewModeActive = useUIStore((s) => s.isPreviewModeActive);

  return (
    <ReactFlowProvider>
      <div className="w-screen bg-[#f0f2f5] text-gray-800 font-inter flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="relative flex-grow w-full h-full overflow-hidden bg-slate-50">
          <CanvasErrorBoundary>
            <div className="absolute inset-0 z-0">
              {isPreviewModeActive ? <LivePreview /> : <Outlet />}
            </div>
          </CanvasErrorBoundary>
          <RestoreAutosavePrompt />
          <div
            data-testid="editor-sidebar-container"
            aria-hidden={!isSidebarVisible}
            className={`absolute top-4 left-4 bottom-4 w-72 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transform: isSidebarVisible ? 'translateX(0)' : 'translateX(calc(-100% - 2rem))',
            }}
          >
            <Sidebar />
          </div>
          <FloatingAIAssistantButton sidebarVisible={isSidebarVisible} />
          <div
            className={`absolute top-4 left-80 bottom-4 w-80 transition-transform duration-300 ease-in-out z-30 ${
              isAIAssistantPanelVisible
                ? 'translate-x-0'
                : '-translate-x-[200%] opacity-0 pointer-events-none'
            }`}
          >
            <AIAssistantPanel />
          </div>
          <div
            data-testid="editor-settings-container"
            aria-hidden={!isSettingsPanelVisible}
            className={`absolute top-4 right-4 bottom-4 w-96 transition-[transform,opacity] duration-300 ease-in-out z-20 ${
              isSettingsPanelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
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

function FloatingAIAssistantButton({ sidebarVisible }: { sidebarVisible: boolean }) {
  const toggleAIAssistantPanel = useUIStore((s) => s.toggleAIAssistantPanel);
  const isAIAssistantPanelVisible = useUIStore((s) => s.isAIAssistantPanelVisible);
  const ent = useEntitlementStore((s) => s.entitlement);
  const nav = useAppNavigation();
  const aiLocked = !hasFeature(ent.plan, ent.features, 'ai_assistant_advanced');

  if (isAIAssistantPanelVisible) return null;

  const handleClick = () => {
    if (aiLocked) {
      toast.error('AI Ассистент доступен только в PRO');
      void nav.goToBilling();
      return;
    }
    toggleAIAssistantPanel();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute top-4 z-30 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-sm font-bold text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-indigo-500/15 ${
        sidebarVisible ? 'left-80' : 'left-4'
      }`}
      title={aiLocked ? 'AI Ассистент · доступно в PRO' : 'Открыть AI Ассистент'}
      aria-label={aiLocked ? 'AI Ассистент доступен только в PRO' : 'Открыть AI Ассистент'}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </span>
      <span className="hidden xl:inline">AI Ассистент</span>
      {aiLocked && (
        <span className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[9px] font-extrabold leading-none tracking-wider text-white">
          PRO
        </span>
      )}
    </button>
  );
}

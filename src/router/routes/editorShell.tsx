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
import DesignModeToolbar from '../../../components/designMode/DesignModeToolbar';
import DesignLayersDrawer from '../../../components/designMode/DesignLayersDrawer';
import DesignQualityPanel from '../../../components/designMode/DesignQualityPanel';
import Header from '../../../components/Header';
import { useUIStore } from '../../../store/useUIStore';

export const Route = createRoute({
  getParentRoute: () => appShellRoute,
  id: '__editorShell',
  component: EditorShellLayout,
});

function EditorShellLayout() {
  const isSidebarVisible = useUIStore((s) => s.isSidebarVisible);
  const isAIAssistantPanelVisible = useUIStore((s) => s.isAIAssistantPanelVisible);
  const isSettingsPanelVisible = useUIStore((s) => s.isSettingsPanelVisible);
  const isPreviewModeActive = useUIStore((s) => s.isPreviewModeActive);
  const editorMode = useUIStore((s) => s.editorMode);
  const previewDevice = useUIStore((s) => s.previewDevice);
  const previewCustomSize = useUIStore((s) => s.previewCustomSize);
  const previewSafeAreaPreset = useUIStore((s) => s.previewSafeAreaPreset);
  const setPreviewDevice = useUIStore((s) => s.setPreviewDevice);
  const isDesignMode = editorMode === 'design';
  const livePreviewDevice = previewDevice === 'custom' ? 'desktop' : previewDevice;

  return (
    <ReactFlowProvider>
      <div className="w-screen bg-[#f0f2f5] text-gray-800 font-inter flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="relative flex-grow w-full h-full overflow-hidden bg-slate-50">
          <CanvasErrorBoundary>
            <div className="absolute inset-0 z-0">
              {isDesignMode ? (
                <div
                  className={[
                    'flex h-full w-full flex-col transition-[padding] duration-200',
                    isSettingsPanelVisible ? 'pr-0 lg:pr-[25rem]' : '',
                    isSidebarVisible ? 'pl-0 xl:pl-72' : '',
                  ].join(' ')}
                >
                  <DesignModeToolbar />
                  <LivePreview
                    showHeader={false}
                    deviceMode={livePreviewDevice}
                    customViewport={previewDevice === 'custom' ? previewCustomSize : undefined}
                    safeAreaPreset={previewSafeAreaPreset}
                    onDeviceModeChange={(mode) => {
                      setPreviewDevice(mode);
                    }}
                    allowedDeviceModes={['desktop', 'tablet', 'mobile', 'fullscreen']}
                  />
                </div>
              ) : isPreviewModeActive ? (
                <LivePreview />
              ) : (
                <Outlet />
              )}
            </div>
          </CanvasErrorBoundary>
          <RestoreAutosavePrompt />
          <DesignLayersDrawer />
          <DesignQualityPanel />
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

import { create } from 'zustand';
import type { DesignElementRole } from '../src/designMode/elementRegistry';

export type EditorMode = 'flow' | 'design';
export type { DesignElementRole };

export interface DesignSelection {
  elementId: string;
  role: DesignElementRole;
  nodeId: string | null;
}

export type DesignInteractionMode = 'select' | 'test';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile' | 'custom' | 'fullscreen';
export type PreviewSafeAreaPreset = 'browser' | 'telegram' | 'max' | 'mobile-browser' | 'keyboard';

export interface FlowViewportSnapshot {
  x: number;
  y: number;
  zoom: number;
}

interface FlowModeSnapshot {
  isSidebarVisible: boolean;
  isSettingsPanelVisible: boolean;
  isDesignPanelOpen: boolean;
  isAIAssistantPanelVisible: boolean;
}

interface UIStoreState {
  // Sidebar
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Settings Panel
  isSettingsPanelVisible: boolean;
  isDesignPanelOpen: boolean;
  toggleSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  openDesignPanel: () => void;
  closeDesignPanel: () => void;
  toggleDesignPanel: () => void;

  // AI Assistant Panel
  isAIAssistantPanelVisible: boolean;
  toggleAIAssistantPanel: () => void;
  closeAIAssistantPanel: () => void;

  // Dashboard
  isDashboardVisible: boolean;
  setDashboardVisible: (visible: boolean) => void;

  // Guide
  isGuideVisible: boolean;
  setGuideVisible: (visible: boolean) => void;

  // Modals
  isAuthModalOpen: boolean;
  setAuthModalOpen: (isOpen: boolean) => void;
  isAssetManagerOpen: boolean;
  openAssetManager: (onSelect?: (url: string) => void) => void;
  closeAssetManager: () => void;
  onAssetSelect: ((url: string) => void) | null;
  isWizardOpen: boolean;
  setWizardOpen: (isOpen: boolean) => void;
  resetWizard: () => void;

  // Preview
  isPreviewModeActive: boolean;
  previewStartNodeId: string | null;
  setPreviewMode: (active: boolean, startNodeId?: string) => void;

  // Integrated visual design mode
  editorMode: EditorMode;
  selectedDesignElement: DesignSelection | null;
  designInteractionMode: DesignInteractionMode;
  previewDevice: PreviewDevice;
  previewCustomSize: { width: number; height: number };
  previewSafeAreaPreset: PreviewSafeAreaPreset;
  isDesignLayersDrawerOpen: boolean;
  isDesignQualityPanelOpen: boolean;
  highlightedDesignIssueId: string | null;
  flowViewportSnapshot: FlowViewportSnapshot | null;
  flowModeSnapshot: FlowModeSnapshot | null;
  setEditorMode: (mode: EditorMode, opts?: { previewStartNodeId?: string | null }) => void;
  setSelectedDesignElement: (selection: DesignSelection | null) => void;
  setDesignInteractionMode: (mode: DesignInteractionMode) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  setPreviewCustomSize: (size: { width: number; height: number }) => void;
  setPreviewSafeAreaPreset: (preset: PreviewSafeAreaPreset) => void;
  openDesignLayersDrawer: () => void;
  closeDesignLayersDrawer: () => void;
  toggleDesignLayersDrawer: () => void;
  openDesignQualityPanel: () => void;
  closeDesignQualityPanel: () => void;
  toggleDesignQualityPanel: () => void;
  setHighlightedDesignIssueId: (issueId: string | null) => void;
  setFlowViewportSnapshot: (viewport: FlowViewportSnapshot) => void;

  // Grouping
  currentGroup: string | null;
  setCurrentGroup: (groupId: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isSidebarVisible: true,
  isSettingsPanelVisible: true,
  isDesignPanelOpen: false,
  isAIAssistantPanelVisible: false,
  isDashboardVisible: true,
  isGuideVisible: false,
  isAuthModalOpen: false,
  isAssetManagerOpen: false,
  isWizardOpen: false,
  onAssetSelect: null as ((url: string) => void) | null,
  isPreviewModeActive: false,
  previewStartNodeId: null as string | null,
  editorMode: 'flow' as EditorMode,
  selectedDesignElement: null as DesignSelection | null,
  designInteractionMode: 'select' as DesignInteractionMode,
  previewDevice: 'desktop' as PreviewDevice,
  previewCustomSize: { width: 1024, height: 720 },
  previewSafeAreaPreset: 'browser' as PreviewSafeAreaPreset,
  isDesignLayersDrawerOpen: false,
  isDesignQualityPanelOpen: false,
  highlightedDesignIssueId: null as string | null,
  flowViewportSnapshot: null as FlowViewportSnapshot | null,
  flowModeSnapshot: null as FlowModeSnapshot | null,
  currentGroup: null as string | null,
};

export const useUIStore = create<UIStoreState>((set) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
  closeSidebar: () => set({ isSidebarVisible: false }),
  toggleSettingsPanel: () => set((state) => {
    const isSettingsPanelVisible = !state.isSettingsPanelVisible;
    return {
      isSettingsPanelVisible,
      isDesignPanelOpen: isSettingsPanelVisible ? state.isDesignPanelOpen : false,
    };
  }),
  closeSettingsPanel: () => set({ isSettingsPanelVisible: false, isDesignPanelOpen: false }),
  openDesignPanel: () => set({ isSettingsPanelVisible: true, isDesignPanelOpen: true }),
  closeDesignPanel: () => set({ isDesignPanelOpen: false }),
  toggleDesignPanel: () => set((state) => ({
    isSettingsPanelVisible: true,
    isDesignPanelOpen: !state.isDesignPanelOpen,
  })),
  toggleAIAssistantPanel: () => set((state) => ({ isAIAssistantPanelVisible: !state.isAIAssistantPanelVisible })),
  closeAIAssistantPanel: () => set({ isAIAssistantPanelVisible: false }),
  setDashboardVisible: (visible) => set({ isDashboardVisible: visible }),
  setGuideVisible: (visible) => set({ isGuideVisible: visible }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  openAssetManager: (onSelect) => set({ isAssetManagerOpen: true, onAssetSelect: onSelect || null }),
  closeAssetManager: () => set({ isAssetManagerOpen: false, onAssetSelect: null }),
  setWizardOpen: (isOpen) => set({ isWizardOpen: isOpen }),
  resetWizard: () => set({ isWizardOpen: false }),
  setPreviewMode: (active, startNodeId) => set((state) => {
    if (active) {
      const snapshot = state.flowModeSnapshot ?? {
        isSidebarVisible: state.isSidebarVisible,
        isSettingsPanelVisible: state.isSettingsPanelVisible,
        isDesignPanelOpen: state.isDesignPanelOpen,
        isAIAssistantPanelVisible: state.isAIAssistantPanelVisible,
      };
      return {
        editorMode: 'design',
        designInteractionMode: 'test',
        isPreviewModeActive: false,
        previewStartNodeId: startNodeId || null,
        flowModeSnapshot: snapshot,
        isDesignLayersDrawerOpen: false,
        isDesignQualityPanelOpen: false,
        highlightedDesignIssueId: null,
        isSidebarVisible: false,
        isSettingsPanelVisible: true,
        isDesignPanelOpen: false,
        isAIAssistantPanelVisible: false,
      };
    }

    const snapshot = state.flowModeSnapshot;
    return {
      editorMode: 'flow',
      isPreviewModeActive: false,
      previewStartNodeId: null,
      selectedDesignElement: null,
      flowModeSnapshot: null,
      isDesignLayersDrawerOpen: false,
      isDesignQualityPanelOpen: false,
      highlightedDesignIssueId: null,
      ...(snapshot ?? {}),
    };
  }),
  setEditorMode: (mode, opts) => set((state) => {
    if (mode === state.editorMode) {
      return {
        previewStartNodeId: opts?.previewStartNodeId ?? state.previewStartNodeId,
      };
    }

    if (mode === 'design') {
      const snapshot = {
        isSidebarVisible: state.isSidebarVisible,
        isSettingsPanelVisible: state.isSettingsPanelVisible,
        isDesignPanelOpen: state.isDesignPanelOpen,
        isAIAssistantPanelVisible: state.isAIAssistantPanelVisible,
      };
      return {
        editorMode: 'design',
        isPreviewModeActive: false,
        previewStartNodeId: opts?.previewStartNodeId ?? state.previewStartNodeId,
        selectedDesignElement: null,
        flowModeSnapshot: snapshot,
        isDesignLayersDrawerOpen: false,
        isDesignQualityPanelOpen: false,
        highlightedDesignIssueId: null,
        isSidebarVisible: false,
        isSettingsPanelVisible: true,
        isDesignPanelOpen: false,
        isAIAssistantPanelVisible: false,
      };
    }

    const snapshot = state.flowModeSnapshot;
    return {
      editorMode: 'flow',
      isPreviewModeActive: false,
      previewStartNodeId: null,
      selectedDesignElement: null,
      flowModeSnapshot: null,
      isDesignLayersDrawerOpen: false,
      isDesignQualityPanelOpen: false,
      highlightedDesignIssueId: null,
      ...(snapshot ?? {}),
    };
  }),
  setSelectedDesignElement: (selection) => set(selection
    ? { selectedDesignElement: selection, isSettingsPanelVisible: true, isDesignPanelOpen: false }
    : { selectedDesignElement: null, highlightedDesignIssueId: null }),
  setDesignInteractionMode: (mode) => set({ designInteractionMode: mode }),
  setPreviewDevice: (device) => set({ previewDevice: device }),
  setPreviewCustomSize: (size) => set({
    previewCustomSize: {
      width: Math.min(3840, Math.max(320, Math.round(size.width))),
      height: Math.min(3840, Math.max(320, Math.round(size.height))),
    },
  }),
  setPreviewSafeAreaPreset: (preset) => set({ previewSafeAreaPreset: preset }),
  openDesignLayersDrawer: () => set({ isDesignLayersDrawerOpen: true }),
  closeDesignLayersDrawer: () => set({ isDesignLayersDrawerOpen: false }),
  toggleDesignLayersDrawer: () => set((state) => ({ isDesignLayersDrawerOpen: !state.isDesignLayersDrawerOpen })),
  openDesignQualityPanel: () => set({ isDesignQualityPanelOpen: true }),
  closeDesignQualityPanel: () => set({ isDesignQualityPanelOpen: false, highlightedDesignIssueId: null }),
  toggleDesignQualityPanel: () => set((state) => ({ isDesignQualityPanelOpen: !state.isDesignQualityPanelOpen })),
  setHighlightedDesignIssueId: (issueId) => set({ highlightedDesignIssueId: issueId }),
  setFlowViewportSnapshot: (viewport) => set({ flowViewportSnapshot: viewport }),
  setCurrentGroup: (groupId) => set({ currentGroup: groupId }),

  reset: () => set(initialState),
}));

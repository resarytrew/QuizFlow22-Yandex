import { create } from 'zustand';

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
  setPreviewMode: (active, startNodeId) => set({ isPreviewModeActive: active, previewStartNodeId: startNodeId || null }),
  setCurrentGroup: (groupId) => set({ currentGroup: groupId }),

  reset: () => set(initialState),
}));

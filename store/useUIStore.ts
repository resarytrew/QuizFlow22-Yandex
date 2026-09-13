import { create } from 'zustand';
import { storeEvents } from './storeEvents';

interface UIStoreState {
  // Sidebar
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Settings Panel
  isSettingsPanelVisible: boolean;
  toggleSettingsPanel: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;

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

export const useUIStore = create<UIStoreState>((set, get) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
  closeSidebar: () => set({ isSidebarVisible: false }),
  toggleSettingsPanel: () => set((state) => ({ isSettingsPanelVisible: !state.isSettingsPanelVisible })),
  openSettingsPanel: () => set({ isSettingsPanelVisible: true }),
  closeSettingsPanel: () => set({ isSettingsPanelVisible: false }),
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
  setCurrentGroup: (groupId) => {
    if (get().currentGroup === groupId) return;
    set({ currentGroup: groupId });
    storeEvents.emit('GROUP_CHANGED', { groupId });
  },

  reset: () => {
    const groupChanged = get().currentGroup !== null;
    set(initialState);
    if (groupChanged) storeEvents.emit('GROUP_CHANGED', { groupId: null });
  },
}));

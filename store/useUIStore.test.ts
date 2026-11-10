import { beforeEach, describe, expect, it } from "vitest";
import { storeEvents } from './storeEvents';
import { useUIStore } from "./useUIStore";

describe("useUIStore panel controls", () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it("closes the elements sidebar explicitly", () => {
    expect(useUIStore.getState().isSidebarVisible).toBe(true);
    useUIStore.getState().closeSidebar();
    expect(useUIStore.getState().isSidebarVisible).toBe(false);
  });

  it("closes the settings panel explicitly", () => {
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    useUIStore.getState().openSettingsPanel();
    useUIStore.getState().closeSettingsPanel();
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
  });

  it("toggles the elements sidebar from the header action", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarVisible).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarVisible).toBe(true);
  });

  it("toggles the settings panel from the header action", () => {
    useUIStore.getState().toggleSettingsPanel();
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    useUIStore.getState().toggleSettingsPanel();
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
  });
  it('keeps design mode independent of the node panel and resets both', () => {
    useUIStore.getState().openSettingsPanel();
    useUIStore.getState().setDesignMode(true);
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    expect(useUIStore.getState().isDesignModeActive).toBe(true);
    useUIStore.getState().setDesignMode(false);
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    useUIStore.getState().reset();
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    expect(useUIStore.getState().isDesignModeActive).toBe(false);
  });
  it('closes editor panels when loading a different quiz', () => {
    useUIStore.getState().openSettingsPanel();
    useUIStore.getState().setDesignMode(true);
    storeEvents.emit('QUIZ_LOADED', { nodes: [], edges: [] });
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    expect(useUIStore.getState().isDesignModeActive).toBe(false);
  });

  it('keeps screen quiz and design modes mutually exclusive', () => {
    useUIStore.getState().setDesignMode(true);
    useUIStore.getState().setScreenQuizMode(true);
    expect(useUIStore.getState().isDesignModeActive).toBe(false);
    expect(useUIStore.getState().isScreenQuizModeActive).toBe(true);
    useUIStore.getState().setDesignMode(true);
    expect(useUIStore.getState().isScreenQuizModeActive).toBe(false);
    useUIStore.getState().reset();
    expect(useUIStore.getState().isScreenQuizModeActive).toBe(false);
  });

});

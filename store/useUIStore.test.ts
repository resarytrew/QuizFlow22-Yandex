import { beforeEach, describe, expect, it } from "vitest";
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
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
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
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    useUIStore.getState().toggleSettingsPanel();
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
  });
});

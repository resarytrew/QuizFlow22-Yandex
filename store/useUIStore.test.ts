import { beforeEach, describe, expect, it } from "vitest";
import { useCanvasStore } from "./useCanvasStore";
import { useUIStore } from "./useUIStore";
import { CustomNodeType } from "../types";

describe("useUIStore panel controls", () => {
  beforeEach(() => {
    useUIStore.getState().reset();
    useCanvasStore.getState().reset();
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

  it("opens the design panel without hiding the settings panel", () => {
    useUIStore.getState().closeSettingsPanel();

    useUIStore.getState().openDesignPanel();

    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    expect(useUIStore.getState().isDesignPanelOpen).toBe(true);
  });

  it("preserves the selected node when design is opened and closed", () => {
    const selectedNode = {
      id: "question-1",
      type: CustomNodeType.Question,
      position: { x: 0, y: 0 },
      data: { label: "Вопрос", question: "Текст вопроса", answers: [] },
    };
    useCanvasStore.getState().setSelectedNode(selectedNode);

    useUIStore.getState().openDesignPanel();
    useUIStore.getState().closeDesignPanel();

    expect(useCanvasStore.getState().selectedNode?.id).toBe("question-1");
    expect(useUIStore.getState().isDesignPanelOpen).toBe(false);
  });

  it("closes the design mode when the settings panel is closed", () => {
    useUIStore.getState().openDesignPanel();

    useUIStore.getState().closeSettingsPanel();

    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    expect(useUIStore.getState().isDesignPanelOpen).toBe(false);
  });
});

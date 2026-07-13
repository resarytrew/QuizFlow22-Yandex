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

  it("switches flow to design while preserving flow panel state", () => {
    useUIStore.setState({
      isSidebarVisible: true,
      isSettingsPanelVisible: false,
      isAIAssistantPanelVisible: true,
      flowViewportSnapshot: { x: 12, y: 24, zoom: 0.75 },
    });

    useUIStore.getState().setEditorMode("design", { previewStartNodeId: "question-1" });

    expect(useUIStore.getState().editorMode).toBe("design");
    expect(useUIStore.getState().previewStartNodeId).toBe("question-1");
    expect(useUIStore.getState().isSidebarVisible).toBe(false);
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    expect(useUIStore.getState().flowViewportSnapshot).toEqual({ x: 12, y: 24, zoom: 0.75 });
  });

  it("restores flow side panels when returning from design", () => {
    useUIStore.setState({
      isSidebarVisible: true,
      isSettingsPanelVisible: false,
      isAIAssistantPanelVisible: true,
    });

    useUIStore.getState().setEditorMode("design");
    useUIStore.getState().toggleSidebar();
    useUIStore.getState().setEditorMode("flow");

    expect(useUIStore.getState().editorMode).toBe("flow");
    expect(useUIStore.getState().isSidebarVisible).toBe(true);
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(false);
    expect(useUIStore.getState().isAIAssistantPanelVisible).toBe(true);
  });

  it("does not clear the selected node when switching visual design mode", () => {
    const selectedNode = {
      id: "question-1",
      type: CustomNodeType.Question,
      position: { x: 0, y: 0 },
      data: { label: "Question", question: "Text", answers: [] },
    };
    useCanvasStore.getState().setSelectedNode(selectedNode);

    useUIStore.getState().setEditorMode("design", { previewStartNodeId: selectedNode.id });
    useUIStore.getState().setEditorMode("flow");

    expect(useCanvasStore.getState().selectedNode?.id).toBe("question-1");
  });

  it("stores design interaction mode, selected element and preview device", () => {
    useUIStore.getState().setDesignInteractionMode("test");
    useUIStore.getState().setPreviewDevice("mobile");
    useUIStore.getState().setPreviewCustomSize({ width: 300, height: 5000 });
    useUIStore.getState().setPreviewSafeAreaPreset("keyboard");
    useUIStore.getState().setSelectedDesignElement({
      elementId: "question-card",
      role: "question-card",
      nodeId: "question-1",
    });

    expect(useUIStore.getState().designInteractionMode).toBe("test");
    expect(useUIStore.getState().previewDevice).toBe("mobile");
    expect(useUIStore.getState().previewCustomSize).toEqual({ width: 320, height: 3840 });
    expect(useUIStore.getState().previewSafeAreaPreset).toBe("keyboard");
    expect(useUIStore.getState().selectedDesignElement?.role).toBe("question-card");
  });

  it("opens and closes the design layers drawer only inside design workflow", () => {
    useUIStore.getState().setEditorMode("design");
    useUIStore.getState().openDesignLayersDrawer();

    expect(useUIStore.getState().isDesignLayersDrawerOpen).toBe(true);

    useUIStore.getState().toggleDesignLayersDrawer();
    expect(useUIStore.getState().isDesignLayersDrawerOpen).toBe(false);

    useUIStore.getState().openDesignLayersDrawer();
    useUIStore.getState().setEditorMode("flow");

    expect(useUIStore.getState().isDesignLayersDrawerOpen).toBe(false);
  });

  it("opens and closes the design quality panel with issue highlight state", () => {
    useUIStore.getState().openDesignQualityPanel();
    useUIStore.getState().setHighlightedDesignIssueId("mobile-touch-target-small-primary-action");

    expect(useUIStore.getState().isDesignQualityPanelOpen).toBe(true);
    expect(useUIStore.getState().highlightedDesignIssueId).toBe("mobile-touch-target-small-primary-action");

    useUIStore.getState().closeDesignQualityPanel();

    expect(useUIStore.getState().isDesignQualityPanelOpen).toBe(false);
    expect(useUIStore.getState().highlightedDesignIssueId).toBeNull();
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LivePreview from "./LivePreview";
import { useCanvasStore } from "../store/useCanvasStore";
import { useQuizDataStore } from "../store/useQuizDataStore";
import { useUIStore } from "../store/useUIStore";
import { createPlayerPreviewMessage } from "../src/previewBridge/protocol";

function flushPreviewDebounce() {
  act(() => {
    vi.advanceTimersByTime(450);
  });
}

function getPreviewFrame(): HTMLIFrameElement {
  return screen.getByTitle("Live Quiz Preview") as HTMLIFrameElement;
}

function dispatchPlayerMessage(frame: HTMLIFrameElement, data: unknown, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", {
      data,
      origin,
      source: frame.contentWindow,
    }));
  });
}

describe("LivePreview bridge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not remount or regenerate iframe srcdoc for design patches", () => {
    render(<LivePreview />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    const initialSrcdoc = frame.getAttribute("srcdoc");

    act(() => {
      useQuizDataStore.getState().updateDesignSettings({
        background: { color: "#101010" },
      });
    });

    const nextFrame = getPreviewFrame();
    expect(nextFrame).toBe(frame);
    expect(nextFrame.getAttribute("srcdoc")).toBe(initialSrcdoc);
  });

  it("regenerates srcdoc in place when template changes", () => {
    render(<LivePreview />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    const initialSrcdoc = frame.getAttribute("srcdoc");

    act(() => {
      useQuizDataStore.getState().setTemplateId("science");
    });
    flushPreviewDebounce();

    const nextFrame = getPreviewFrame();
    expect(nextFrame).toBe(frame);
    expect(nextFrame.getAttribute("srcdoc")).not.toBe(initialSrcdoc);
  });

  it("ignores wrong origin and damaged bridge messages", () => {
    render(<LivePreview />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    const postMessage = vi.spyOn(frame.contentWindow!, "postMessage");

    dispatchPlayerMessage(frame, createPlayerPreviewMessage("PREVIEW_READY"), "https://evil.example");
    dispatchPlayerMessage(frame, { source: "quizflow-player-preview", type: "PREVIEW_READY" });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("sends init and selected-node navigation after PREVIEW_READY", () => {
    render(<LivePreview />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    const postMessage = vi.spyOn(frame.contentWindow!, "postMessage");

    dispatchPlayerMessage(frame, createPlayerPreviewMessage("PREVIEW_READY"));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PREVIEW_INIT" }),
      window.location.origin,
    );

    act(() => {
      useCanvasStore.getState().setSelectedNode({
        id: "start",
        type: "startNode",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      });
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "NAVIGATE_TO_NODE",
        payload: { nodeId: "start" },
      }),
      window.location.origin,
    );
  });

  it("stores valid design element selections and ignores invalid selection payloads", () => {
    useUIStore.getState().setEditorMode("design", { previewStartNodeId: "question-1" });
    useCanvasStore.getState().setSelectedNode({
      id: "question-1",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: { label: "Question", question: "Question?", answers: [] },
    });

    render(<LivePreview showHeader={false} />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    dispatchPlayerMessage(frame, createPlayerPreviewMessage("PREVIEW_NODE_CHANGED", { currentNodeId: "question-1" }));
    dispatchPlayerMessage(frame, createPlayerPreviewMessage("DESIGN_ELEMENT_SELECTED", {
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "question-1",
    }));

    expect(useUIStore.getState().selectedDesignElement).toEqual({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "question-1",
    });
    expect(useUIStore.getState().isSettingsPanelVisible).toBe(true);
    expect(useCanvasStore.getState().selectedNode?.id).toBe("question-1");

    dispatchPlayerMessage(frame, createPlayerPreviewMessage("DESIGN_ELEMENT_SELECTED", {
      elementId: "<script>",
      role: "answer-card",
      nodeId: "question-1",
    }));
    expect(useUIStore.getState().selectedDesignElement?.elementId).toBe("answer-card-a1");

    dispatchPlayerMessage(frame, createPlayerPreviewMessage("DESIGN_ELEMENT_SELECTED", {
      elementId: "answer-card-a2",
      role: "answer-card",
      nodeId: "question-2",
    }));
    expect(useUIStore.getState().selectedDesignElement?.elementId).toBe("answer-card-a1");
  });

  it("clears design element selection when player sends clear message", () => {
    useUIStore.getState().setSelectedDesignElement({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "question-1",
    });

    render(<LivePreview showHeader={false} />);
    flushPreviewDebounce();

    dispatchPlayerMessage(getPreviewFrame(), createPlayerPreviewMessage("DESIGN_ELEMENT_SELECTION_CLEARED"));

    expect(useUIStore.getState().selectedDesignElement).toBeNull();
  });

  it("changes device mode without remounting iframe", () => {
    render(<LivePreview />);
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));

    expect(getPreviewFrame()).toBe(frame);
    expect(frame.closest("[data-device-mode]")?.getAttribute("data-device-mode")).toBe("mobile");
  });

  it("supports controlled desktop tablet and mobile modes without remounting iframe", () => {
    const { rerender } = render(
      <LivePreview showHeader={false} deviceMode="desktop" allowedDeviceModes={["desktop", "tablet", "mobile"]} />,
    );
    flushPreviewDebounce();

    const frame = getPreviewFrame();
    rerender(<LivePreview showHeader={false} deviceMode="tablet" allowedDeviceModes={["desktop", "tablet", "mobile"]} />);
    expect(getPreviewFrame()).toBe(frame);
    expect(frame.closest("[data-device-mode]")?.getAttribute("data-device-mode")).toBe("tablet");

    rerender(<LivePreview showHeader={false} deviceMode="mobile" allowedDeviceModes={["desktop", "tablet", "mobile"]} />);
    expect(getPreviewFrame()).toBe(frame);
    expect(frame.closest("[data-device-mode]")?.getAttribute("data-device-mode")).toBe("mobile");
  });

  it("opens supported visual design templates without creating another player", () => {
    for (const templateId of ["default", "newyear", "screenQuiz"] as const) {
      useQuizDataStore.getState().setTemplateId(templateId);
      const { unmount } = render(<LivePreview showHeader={false} />);
      flushPreviewDebounce();

      expect(screen.getAllByTitle("Live Quiz Preview")).toHaveLength(1);
      expect(getPreviewFrame().getAttribute("srcdoc")).toContain("<html");
      unmount();
    }
  });
});

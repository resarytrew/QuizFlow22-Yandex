import { afterEach, describe, expect, it, vi } from "vitest";
import { setupPreviewBridge } from "../previewBridge";

describe("engine preview bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not install a bridge listener without explicit editor preview flag", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");

    const stop = setupPreviewBridge({
      quizData: {
        nodes: [],
        edges: [],
        templateId: "default",
      },
      navigateTo: vi.fn(),
      initialNodeId: "start",
    });

    stop();

    expect(addEventListener).not.toHaveBeenCalledWith("message", expect.any(Function));
  });
});

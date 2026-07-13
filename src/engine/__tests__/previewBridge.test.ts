import { afterEach, describe, expect, it, vi } from "vitest";
import { measureLayoutElements, setupPreviewBridge } from "../previewBridge";

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

  it("measures annotated DOM elements for free layout capture", () => {
    document.body.innerHTML = `
      <main>
        <section data-design-role="question-card" data-design-element-id="question-card" data-design-node-id="q1"></section>
        <script data-design-role="media" data-design-element-id="<script>"></script>
      </main>
    `;
    const element = document.querySelector<HTMLElement>('[data-design-element-id="question-card"]');
    if (!element) throw new Error("Expected question-card element");
    element.getBoundingClientRect = () => ({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 310,
      bottom: 220,
      width: 300,
      height: 200,
      toJSON: () => ({}),
    } as DOMRect);

    const measurement = measureLayoutElements();

    expect(measurement.viewport.width).toBeGreaterThan(0);
    expect(measurement.elements).toEqual([
      {
        id: "question-card",
        role: "question-card",
        nodeId: "q1",
        rect: { x: 10, y: 20, width: 300, height: 200 },
        order: 0,
      },
    ]);
  });
});

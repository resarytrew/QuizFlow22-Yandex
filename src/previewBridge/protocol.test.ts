import { describe, expect, it } from "vitest";
import {
  createParentPreviewMessage,
  createPlayerPreviewMessage,
  isAllowedPreviewOrigin,
  isPreviewParentMessage,
  isPreviewPlayerMessage,
  toDesignElementSelectedPayload,
  toLayoutMeasurementPayload,
  toSafeNodeId,
} from "./protocol";

describe("preview bridge protocol", () => {
  it("validates parent and player envelopes", () => {
    expect(isPreviewParentMessage(createParentPreviewMessage("DESIGN_PATCH", { designSettings: {} }))).toBe(true);
    expect(isPreviewPlayerMessage(createPlayerPreviewMessage("PREVIEW_READY"))).toBe(true);
  });

  it("ignores damaged or unknown messages", () => {
    expect(isPreviewParentMessage({ type: "DESIGN_PATCH" })).toBe(false);
    expect(isPreviewParentMessage(createPlayerPreviewMessage("PREVIEW_READY"))).toBe(false);
    expect(isPreviewPlayerMessage({ source: "quizflow-player-preview", version: 1, type: "RUN_SCRIPT" })).toBe(false);
  });

  it("requires exact origin", () => {
    expect(isAllowedPreviewOrigin("https://mykviz.ru", "https://mykviz.ru")).toBe(true);
    expect(isAllowedPreviewOrigin("https://evil.example", "https://mykviz.ru")).toBe(false);
  });

  it("accepts only safe node ids", () => {
    expect(toSafeNodeId("node-1:answer_a")).toBe("node-1:answer_a");
    expect(toSafeNodeId("<script>")).toBeNull();
    expect(toSafeNodeId("node id with spaces")).toBeNull();
  });

  it("accepts only safe design element selection payloads", () => {
    expect(toDesignElementSelectedPayload({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "question-1",
    })).toEqual({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "question-1",
    });

    expect(toDesignElementSelectedPayload({
      elementId: "<script>",
      role: "answer-card",
      nodeId: "question-1",
    })).toBeNull();
    expect(toDesignElementSelectedPayload({
      elementId: "answer-card-a1",
      role: "run-script",
      nodeId: "question-1",
    })).toBeNull();
    expect(toDesignElementSelectedPayload({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: "node id",
      html: "<b>bad</b>",
    })).toEqual({
      elementId: "answer-card-a1",
      role: "answer-card",
      nodeId: null,
    });
  });

  it("validates layout measurement messages without accepting executable data", () => {
    expect(isPreviewParentMessage(createParentPreviewMessage("MEASURE_LAYOUT_ELEMENTS"))).toBe(true);
    expect(isPreviewPlayerMessage(createPlayerPreviewMessage("LAYOUT_ELEMENTS_MEASURED", {
      viewport: { width: 1000, height: 500 },
      elements: [],
    }))).toBe(true);

    expect(toLayoutMeasurementPayload({
      viewport: { width: 1000, height: 500, devicePixelRatio: 2 },
      html: "<script>bad()</script>",
      elements: [
        {
          id: "media",
          role: "media",
          nodeId: "q1",
          rect: { x: 10, y: 20, width: 300, height: 200 },
          selector: "body",
        },
        {
          id: "<script>",
          role: "media",
          nodeId: "q1",
          rect: { x: 0, y: 0, width: 10, height: 10 },
        },
      ],
    })).toEqual({
      viewport: {
        width: 1000,
        height: 500,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 2,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      elements: [
        {
          id: "media",
          role: "media",
          nodeId: "q1",
          rect: { x: 10, y: 20, width: 300, height: 200 },
        },
      ],
    });

    expect(toLayoutMeasurementPayload({
      viewport: { width: 0, height: 500 },
      elements: [],
    })).toBeNull();
  });
});

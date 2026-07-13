import { describe, expect, it } from "vitest";
import {
  createParentPreviewMessage,
  createPlayerPreviewMessage,
  isAllowedPreviewOrigin,
  isPreviewParentMessage,
  isPreviewPlayerMessage,
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
});

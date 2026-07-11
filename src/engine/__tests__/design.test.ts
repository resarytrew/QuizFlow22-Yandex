import { beforeEach, describe, expect, it } from "vitest";
import { applyDesign } from "../design";

describe("applyDesign", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.className = "";
    document.body.innerHTML = '<div id="quiz-view"><div class="node-frame"></div></div>';
  });

  it("keeps node-frame as a transparent layout layer", () => {
    applyDesign({
      layout: { surfaceStyle: "paper" },
      questionCard: {
        backgroundColor: "#fffefa",
        borderColor: "#dfd8cc",
        textColor: "#24211c",
        radius: 28,
        padding: 32,
        shadow: "soft",
      },
    });

    const css = document.getElementById("quiz-dynamic-styles")?.textContent ?? "";

    expect(css).toMatch(/#quiz-view\s*{[\s\S]*?border-color:\s*var\(--question-card-border/);
    expect(css).toMatch(/\.node-frame\s*{[\s\S]*?border:\s*0;/);
    expect(css).toMatch(/\.node-frame\s*{[\s\S]*?background:\s*transparent;/);
    expect(css).not.toContain("body.design-surface-paper .node-frame");
    expect(css).not.toContain("body.design-question-shadow-soft .node-frame");
  });
});

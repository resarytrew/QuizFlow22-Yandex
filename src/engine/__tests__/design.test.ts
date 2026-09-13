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

  it("applies editable avatar and score label to template HUD", () => {
    document.body.innerHTML = `
      <img id="hud-avatar-image" class="hidden" alt="" />
      <span id="hud-avatar-fallback">Г</span>
      <span id="hud-score-label">Очки</span>
    `;

    applyDesign({
      brand: {
        avatarUrl: "https://example.com/avatar.png",
        scoreLabel: "Искры добра",
      },
    });

    const image = document.querySelector<HTMLImageElement>("#hud-avatar-image");
    expect(image?.src).toBe("https://example.com/avatar.png");
    expect(image?.classList.contains("hidden")).toBe(false);
    expect(document.querySelector("#hud-avatar-fallback")?.classList.contains("hidden")).toBe(true);
    expect(document.querySelector("#hud-score-label")?.textContent).toBe("Искры добра");
  });

  it("splits the editable Important Talks brand into two display lines", () => {
    document.body.innerHTML = `
      <div id="header-logo" data-logo-mark="talks">РВ</div>
      <span id="talks-brand-primary"></span>
      <span id="talks-brand-secondary"></span>
    `;

    applyDesign({ brand: { brandName: "Разговоры о важном" } });

    expect(document.querySelector("#header-logo")?.textContent).toBe("");
    expect(document.querySelector("#talks-brand-primary")?.textContent).toBe("РАЗГОВОРЫ");
    expect(document.querySelector("#talks-brand-secondary")?.textContent).toBe("О ВАЖНОМ");
  });
});

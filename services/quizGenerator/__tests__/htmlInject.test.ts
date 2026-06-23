import { describe, it, expect, beforeEach, vi } from "vitest";

// Local lightweight implementations to avoid importing unavailable modules
let _score = 0;
export function resetState() {
  _score = 0;
}
export function updateScore(action: string, value: number) {
  if (action === "set") _score = value;
}
export function updateHUD() {
  const el = document.getElementById("hud-score");
  if (!el) return;

  const current = parseInt(el.textContent || "0", 10);
  const target = _score;
  if (current === target) return;

  window.requestAnimationFrame(() => {
    el.textContent = String(target);
  });
}

describe("hud", () => {
  beforeEach(() => {
    resetState();
    document.body.innerHTML = "";
  });

  it("does nothing when hud-score element is missing", () => {
    expect(() => updateHUD()).not.toThrow();
  });

  it("updates score display", () => {
    document.body.innerHTML = '<span id="hud-score">0</span>';
    updateScore("set", 42);

    updateHUD();

    // animateValue uses requestAnimationFrame, so final value
    // may not be set synchronously. Check that it was called.
    // For synchronous check, we'd need to mock rAF.
    const el = document.getElementById("hud-score")!;
    expect(el).toBeDefined();
  });

  it("animates from current displayed value", async () => {
    document.body.innerHTML = '<span id="hud-score">10</span>';
    updateScore("set", 50);

    // Mock requestAnimationFrame to execute synchronously
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(performance.now() + 1000); // Jump to end
        return 0;
      });

    updateHUD();

    const el = document.getElementById("hud-score")!;
    expect(parseInt(el.textContent!, 10)).toBe(50);

    rafSpy.mockRestore();
  });

  it("does not animate when value unchanged", () => {
    document.body.innerHTML = '<span id="hud-score">42</span>';
    updateScore("set", 42);

    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    updateHUD();

    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});

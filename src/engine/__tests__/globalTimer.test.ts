import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupGlobalTimer } from "../globalTimer";

describe("setupGlobalTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<div id="global-timer-container" class="hidden"></div><div id="quiz-view"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates to timeout node", () => {
    const navigate = vi.fn();
    setupGlobalTimer({
      enabled: true,
      duration: 1,
      onTimeoutNodeId: "timeout",
    }, navigate);

    vi.advanceTimersByTime(1000);
    expect(navigate).toHaveBeenCalledWith("timeout");
  });

  it("exposes accessible progress and warning states", () => {
    setupGlobalTimer({ enabled: true, duration: 40 }, vi.fn());
    const timer = document.getElementById("global-timer-container");

    expect(timer?.getAttribute("role")).toBe("timer");
    expect(timer?.getAttribute("aria-label")).toBe("Осталось 40 секунд");
    expect(timer?.style.getPropertyValue("--talks-global-timer-progress")).toBe("360deg");

    vi.advanceTimersByTime(10000);
    expect(timer?.classList.contains("is-warning")).toBe(true);
    expect(timer?.textContent).toBe("00:30");

    vi.advanceTimersByTime(20000);
    expect(timer?.classList.contains("is-urgent")).toBe(true);
  });
});

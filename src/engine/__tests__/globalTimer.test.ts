import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupGlobalTimer } from "../globalTimer";

describe("setupGlobalTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<div id="global-timer-container" class="hidden"></div><div id="quiz-view"></div>';
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
});

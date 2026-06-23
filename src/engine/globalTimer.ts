import type { QuizData } from "./types";

export function setupGlobalTimer(
  config: QuizData["globalTimer"],
  navigateTo: (nodeId: string) => void,
): () => void {
  if (!config?.enabled || !config.duration || config.duration <= 0) {
    return () => {};
  }

  let remaining = config.duration;
  const container = document.getElementById("global-timer-container");
  container?.classList.remove("hidden");

  const render = () => {
    if (!container) return;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    container.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    container.classList.toggle("is-urgent", remaining <= 10);
    container.classList.toggle("text-red-600", remaining <= 10);
  };

  render();
  const interval = window.setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    render();
    if (remaining > 0) return;
    window.clearInterval(interval);
    if (config.onTimeoutNodeId) {
      navigateTo(config.onTimeoutNodeId);
      return;
    }
    const view = document.getElementById("quiz-view");
    if (view) view.textContent = "Время вышло.";
  }, 1000);

  return () => window.clearInterval(interval);
}

import type { QuizData } from "./types";

export function setupGlobalTimer(
  config: QuizData["globalTimer"],
  navigateTo: (nodeId: string) => void,
): () => void {
  if (!config?.enabled || !config.duration || config.duration <= 0) {
    return () => {};
  }

  const duration = Math.max(1, Math.round(config.duration));
  let remaining = duration;
  const container = document.getElementById("global-timer-container");
  container?.classList.remove("hidden");
  container?.setAttribute("role", "timer");
  container?.setAttribute("aria-live", "polite");

  const render = () => {
    if (!container) return;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    container.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    container.setAttribute("aria-label", `Осталось ${remaining} секунд`);
    container.style.setProperty("--talks-global-timer-progress", `${(remaining / duration) * 360}deg`);
    container.classList.toggle("is-warning", remaining <= Math.max(30, Math.ceil(duration / 4)));
    container.classList.toggle("is-urgent", remaining <= 10);
    container.classList.toggle("text-red-600", remaining <= 10);
    container.classList.toggle("is-expired", remaining === 0);
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

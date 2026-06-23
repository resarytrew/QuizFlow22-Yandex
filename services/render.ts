// services/render.ts
/**
 * Рендеринг нод квиза в DOM.
 * Экспортируется для мокирования в тестах.
 * Реальная реализация встроена в quizEngine.ts (IIFE).
 */

export function renderNode(_node: unknown): void {
  // Реализация в quizEngine.ts
}

export function renderError(message: string): void {
  const view =
    typeof document !== "undefined"
      ? document.getElementById("quiz-view")
      : null;

  if (!view) {
    console.error("[Quiz] renderError:", message);
    return;
  }

  const div = document.createElement("div");
  const h = document.createElement("h2");
  h.style.color = "#dc2626";
  h.textContent = "⚠️ Ошибка";
  div.appendChild(h);

  const p = document.createElement("p");
  p.textContent = message;
  div.appendChild(p);

  view.replaceChildren(div);
}

export function setDesignSettings(_ds: unknown): void {
  // Реализация в quizEngine.ts
}
/**
 * @module quizGenerator/fallbackHtml
 *
 * Генерирует минимальный HTML для отображения ошибки,
 * если основная генерация квиза провалилась.
 *
 * Требования:
 * - Работает без CSS-фреймворков, шрифтов и JS.
 * - Безопасно экранирует пользовательский ввод.
 * - Не содержит внешних зависимостей.
 */

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Возвращает standalone HTML-страницу с сообщением об ошибке.
 *
 * @param title — заголовок ошибки (экранируется).
 * @param detail — подробности (экранируется, может быть пустым).
 */
export function buildFallbackHtml(
  title = "Ошибка генерации квиза",
  detail = "",
): string {
  const safeTitle = escapeForHtml(title);
  const safeDetail = detail ? `<p>${escapeForHtml(detail)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #374151;
    }
    .error-card {
      max-width: 480px;
      padding: 2rem;
      text-align: center;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .error-card h1 {
      font-size: 1.25rem;
      color: #dc2626;
      margin: 0 0 0.75rem;
    }
    .error-card p {
      font-size: 0.95rem;
      color: #6b7280;
      margin: 0 0 1rem;
      line-height: 1.5;
    }
    .error-card button {
      padding: 0.5rem 1.25rem;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .error-card button:hover {
      background: #4338ca;
    }
  </style>
</head>
<body>
  <div class="error-card">
    <h1>⚠️ ${safeTitle}</h1>
    ${safeDetail}
    <p>Попробуйте перезагрузить страницу или обратиться к автору квиза.</p>
    <button onclick="location.reload()">Перезагрузить</button>
  </div>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
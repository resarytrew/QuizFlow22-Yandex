/**
 * @module quizGenerator/htmlInject
 *
 * Утилиты для безопасной вставки контента в HTML-строку.
 *
 * Все функции:
 * - case-insensitive (работают с `<HEAD>`, `<Head>`, `<head lang="ru">`)
 * - idempotent (вставляют в первое вхождение)
 * - fail-safe (при отсутствии тега — вставляют в начало/конец)
 */

/**
 * Вставляет контент сразу после открывающего `<head>`.
 * Если `<head>` отсутствует — вставляет в начало документа.
 */
export function injectAfterHeadOpen(html: string, content: string): string {
  const headOpenRe = /(<head[^>]*>)/i;

  if (headOpenRe.test(html)) {
    return html.replace(headOpenRe, `$1\n${content}`);
  }

  // Fallback: перед <body> или в самое начало
  return `${content}\n${html}`;
}

/**
 * Вставляет контент непосредственно перед `</head>`.
 * Полезно для стилей — они должны быть последними в каскаде.
 */
export function injectBeforeHeadClose(html: string, content: string): string {
  const headCloseRe = /<\/head>/i;

  if (headCloseRe.test(html)) {
    return html.replace(headCloseRe, `${content}\n</head>`);
  }

  return injectAfterHeadOpen(html, content);
}

/**
 * Вставляет контент непосредственно перед `</body>`.
 * Стандартное место для скриптов.
 */
export function injectBeforeBodyClose(html: string, content: string): string {
  const bodyCloseRe = /<\/body>/i;

  if (bodyCloseRe.test(html)) {
    return html.replace(bodyCloseRe, `${content}\n</body>`);
  }

  // Fallback: перед </html> или в конец
  const htmlCloseRe = /<\/html>/i;

  if (htmlCloseRe.test(html)) {
    return html.replace(htmlCloseRe, `${content}\n</html>`);
  }

  return `${html}\n${content}`;
}
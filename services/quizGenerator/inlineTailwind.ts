/**
 * @module quizGenerator/inlineTailwind
 *
 * Заменяет CDN-подключение Tailwind на инлайн-стили,
 * скомпилированные Vite из quizTheme.css.
 *
 * Это устраняет:
 * - зависимость от cdn.tailwindcss.com в опубликованных квизах
 * - необходимость разрешать CDN Tailwind в CSP
 * - задержку загрузки и FOUC (flash of unstyled content)
 *
 * Стили вставляются перед </head>, чтобы утилитарные классы
 * были последними в каскаде — как это делал runtime CDN.
 */

import { injectBeforeHeadClose } from "./htmlInject";

// Vite ?inline импорт — содержимое CSS как строка, без side effects.
import quizThemeCss from "../quizTheme.css?inline";

/** Маркер, предотвращающий повторную инъекцию. */
const MARKER_ATTR = "data-quiz-tailwind";

/** Regex для удаления CDN-подключения Tailwind (любая версия). */
const TAILWIND_CDN_RE =
  /<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>\s*/gi;

/**
 * Удаляет CDN Tailwind и инлайнит скомпилированные стили.
 * Идемпотентна — не дублирует при повторном вызове.
 */
export function inlineTailwind(html: string): string {
  // 1. Удаляем CDN
  let result = html.replace(TAILWIND_CDN_RE, "");

  // 2. Идемпотентность
  if (result.includes(MARKER_ATTR)) {
    return result;
  }

  // 3. Инжектим скомпилированные стили
  const styleTag = `<style ${MARKER_ATTR}>${quizThemeCss}</style>`;
  result = injectBeforeHeadClose(result, `    ${styleTag}`);

  return result;
}
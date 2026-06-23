/**
 * @module quizGenerator/csp
 *
 * Content-Security-Policy для standalone HTML квизов.
 *
 * Ограничения текущей версии:
 * - `unsafe-inline` в script-src: движок встраивается inline-скриптом.
 *   Убирается при переходе на внешний bundle + nonce (см. Roadmap Phase 6).
 * - `unsafe-eval` в script-src: используется MathJS / MathJax.
 *   Убирается при переходе на предкомпиляцию формул.
 * - CSP через <meta> слабее HTTP-header CSP (нет report-uri, нет frame-ancestors).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */

import { injectAfterHeadOpen } from "./htmlInject";

// ─── Allowlists ──────────────────────────────────────────────────────

/** CDN-домены для функциональных библиотек (confetti, mathjax, mathjs, gsap). */
const SCRIPT_CDNS = [
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
] as const;

/** Домены для Google Fonts. */
const FONT_STYLE_ORIGINS = ["https://fonts.googleapis.com"] as const;
const FONT_FILE_ORIGINS = ["https://fonts.gstatic.com"] as const;

/** Домены для iframe-встраивания видео. */
const FRAME_ORIGINS = [
  "https://rutube.ru",
  "https://www.rutube.ru",
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
] as const;

// ─── Builder ─────────────────────────────────────────────────────────

/**
 * Строит CSP-строку с минимально необходимыми разрешениями.
 *
 * @param apiOrigin — origin Yandex API Gateway для connect-src.
 *   Если не передан, connect-src ограничен `'self'`.
 */
export function buildCsp(apiOrigin?: string): string {
  const connectSrc = ["'self'", apiOrigin].filter(Boolean).join(" ");

  const directives: string[] = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SCRIPT_CDNS.join(" ")}`,
    `style-src 'self' 'unsafe-inline' ${FONT_STYLE_ORIGINS.join(" ")}`,
    `font-src 'self' data: ${FONT_FILE_ORIGINS.join(" ")}`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self' blob: https:`,
    `connect-src ${connectSrc}`,
    `frame-src ${FRAME_ORIGINS.join(" ")}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  return directives.join("; ");
}

/**
 * Вставляет `<meta http-equiv="Content-Security-Policy">` в `<head>`.
 * Если CSP-мета уже присутствует — не дублирует.
 */
export function injectCsp(html: string, apiOrigin?: string): string {
  // Идемпотентность: не дублируем CSP
  if (/http-equiv=["']Content-Security-Policy/i.test(html)) {
    return html;
  }

  const csp = buildCsp(apiOrigin);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  return injectAfterHeadOpen(html, `    ${meta}`);
}

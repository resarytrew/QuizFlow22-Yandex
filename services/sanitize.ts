/**
 * Утилиты санитизации текста и URL.
 *
 * Дублирование с quizEngine.ts намеренное — движок встраивается
 * как IIFE в standalone HTML без ESM. Этот файл — тестируемая копия.
 * При изменении — менять оба места.
 *
 * Порядок операций в parseText намеренный (C-05):
 * 1. Плейсхолдеры → escapeHtml значения
 * 2. Ссылки [label](url) → sanitizeAssetUrl
 * 3. Markdown → строки с тегами
 * 4. Списки
 * 5. Переносы строк
 * 6. DOMPurify финальная санитизация
 */

import { getState } from "./state";

// ─── HTML escape ─────────────────────────────────────────

export function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── URL sanitize ────────────────────────────────────────

const SAFE_RASTER = /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i;
const MAX_DATA_URI = 700_000; // ~512 KB

export function sanitizeAssetUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "";

  try {
    // Только абсолютные URL — отклоняем относительные и protocol-relative
    const p = new URL(url);

    if (p.protocol === "https:" || p.protocol === "http:") {
      return p.href;
    }

    if (p.protocol === "data:") {
      if (!SAFE_RASTER.test(url)) return ""; // SVG и прочее — блокируем
      if (url.length > MAX_DATA_URI) return "";
      return url; // Не p.href — для data: URI href может отличаться
    }
  } catch {
    // Невалидный URL
  }

  return "";
}

// ─── HTML sanitize ───────────────────────────────────────

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "a",
  "ul", "ol", "li", "h2", "h3", "h4", "pre", "code",
  "span", "div", "img",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "class", "title", "src", "alt",
];

export function sanitizeHtml(html: string): string {
  // В тестовой среде DOMPurify недоступен — fallback к escapeHtml
  const dp =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>).DOMPurify
      : undefined;

  if (dp && typeof (dp as { sanitize?: unknown }).sanitize === "function") {
    return (dp as { sanitize: (h: string, opts: object) => string }).sanitize(
      html,
      {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
      },
    );
  }

  // Fallback: strip all tags
  return html.replace(/<[^>]*>/g, "");
}

// ─── Text parser ─────────────────────────────────────────

export function parseText(raw: unknown): string {
  if (!raw) return "";
  let text = String(raw);

  const state = getState();

  // 1. Плейсхолдеры {{var}} — значения экранируются
  text = text.replace(/\{\{(.*?)\}\}/g, (_m, key: string) => {
    const k = key.trim();
    if (k === "score") return escapeHtml(state.score);
    const v = state.variables[k];
    return v !== undefined ? escapeHtml(v) : `{{${k}}}`;
  });

  // 2. Ссылки [label](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, lbl: string, url: string) => {
      const safe = sanitizeAssetUrl(url);
      if (!safe) return escapeHtml(lbl);
      return (
        `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener">` +
        `${escapeHtml(lbl)}</a>`
      );
    },
  );

  // 3. Markdown — порядок важен: *** перед ** перед *
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>",
  );

  // 4. Списки
  text = text.replace(/^- (.*?)$/gm, "<li>$1</li>");
  text = text.replace(
    /(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs,
    "<ul>$1</ul>",
  );

  // 5. Переносы строк
  text = text.replace(/\n/g, "<br>");

  // 6. Финальная санитизация
  return sanitizeHtml(text);
}
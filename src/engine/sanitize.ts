import { ALLOWED_HTML_TAGS, ALLOWED_HTML_ATTRS } from "./constants";
import { getState } from "./state";

// ===== HTML ESCAPING =====

export function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ===== URL SANITIZATION =====

const SAFE_IMAGE_TYPES = /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i;
const MAX_DATA_URI_LENGTH = 700_000; // ~512KB decoded

export function sanitizeAssetUrl(url: unknown): string {
  if (!url || typeof url !== "string") return "";

  try {
    const parsed = new URL(url);

    if (parsed.protocol === "https:") return parsed.href;
    if (parsed.protocol === "http:") return parsed.href;

    if (parsed.protocol === "data:") {
      if (!SAFE_IMAGE_TYPES.test(url)) return "";
      if (url.length > MAX_DATA_URI_LENGTH) return "";
      return url; // НЕ parsed.href — для data URI href может отличаться
    }
  } catch {
    // Невалидный URL
  }
  return "";
}

export function safeCssUrl(input: unknown, base?: string): string | null {
  if (typeof input !== "string" || !input) return null;
  if (input.length > 2048) return null;

  let parsed: URL;
  try {
    parsed = new URL(input, base);
  } catch {
    return null;
  }

  const proto = parsed.protocol.toLowerCase();
  if (proto === "https:" || proto === "http:") {
    // fall through
  } else if (proto === "data:") {
    if (!/^data:(image|audio|video)\/[a-z0-9.+\-]+/i.test(input)) {
      return null;
    }
    return parsed.href;
  } else {
    return null;
  }

  return parsed.href.replace(/['"()\\\r\n\t]/g, "");
}

// ===== HTML SANITIZATION =====

export function sanitizeHtml(html: string): string {
  const dp = typeof window !== "undefined"
    ? (window as Window & { DOMPurify?: { sanitize: (html: string, options: Record<string, unknown>) => string } }).DOMPurify
    : null;

  if (dp && typeof dp.sanitize === "function") {
    return dp.sanitize(html, {
      ALLOWED_TAGS: [...ALLOWED_HTML_TAGS],
      ALLOWED_ATTR: [...ALLOWED_HTML_ATTRS],
      ALLOW_DATA_ATTR: false,
    });
  }

  // Fallback — allow only markdown-generated tags, escape everything else.
  const escaped = escapeHtml(html);
  return escaped
    .replace(/&lt;(\/)?(strong|em|ul|li|br)&gt;/gi, "<$1$2>")
    .replace(/&lt;a\s+href=&quot;([^&]*)&quot;&gt;/gi, (_match, href) => {
      const safeUrl = sanitizeAssetUrl(href);
      if (!safeUrl) return escapeHtml(_match);
      return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">`;
    })
    .replace(/&lt;\/a&gt;/gi, "</a>");
}

// ===== MARKDOWN-ISH PARSER =====

export function parseText(raw: unknown): string {
  if (!raw) return "";
  let text = String(raw);

  // 1. Подстановка переменных {{var}}
  const state = getState();
  text = text.replace(/\{\{(.*?)\}\}/g, (_match, key: string) => {
    const k = key.trim();
    if (k === "score") return escapeHtml(state.score);
    const v = state.variables[k];
    return v !== undefined ? escapeHtml(v) : `{{${k}}}`;
  });

  // 2. Markdown (порядок важен: *** перед ** перед *)
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // 3. Ссылки [label](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, url: string) => {
      const safeUrl = sanitizeAssetUrl(url);
      if (!safeUrl) return escapeHtml(label);
      return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
    },
  );

  // 4. Списки
  text = text.replace(/^- (.*?)$/gm, "<li>$1</li>");
  // Use [\s\S] instead of dot with 's' flag for wider compatibility
  text = text.replace(
    /(<li>[\s\S]*?<\/li>(?:\s*<li>[\s\S]*?<\/li>)*)/g,
    "<ul>$1</ul>",
  );

  // 5. Переносы
  text = text.replace(/\n/g, "<br>");

  return sanitizeHtml(text);
}

// services/parseQuizText.ts
//
// Pure text-rendering helpers used inside the published quiz HTML.
// These were originally inlined inside services/quizEngine.ts but
// have been extracted here so they can be unit-tested without
// spinning up a full jsdom + quiz engine eval.
//
// The two functions below MUST stay order-stable — the C-05 audit
// fix in Phase 3.5 requires that placeholder VALUES, link LABELS,
// and link URLS are escapeHtml'd before they ever reach the DOM
// as an attribute or text node.

/**
 * Escape user-supplied text for safe inclusion in HTML.
 * Covers all 5 chars that have meaning inside an HTML attribute
 * or text node (& < > " ').
 */
export function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allow only safe URL protocols. Returns '' for anything else.
 * Used for both <a href="..."> and <img src="..."> contexts.
 */
export function sanitizeAssetUrl(url: unknown): string {
  if (!url) return '';
  try {
    const p = new URL(String(url), 'http://localhost/');
    if (p.protocol === 'http:' || p.protocol === 'https:') return p.href;
    if (p.protocol === 'data:') {
      // Only image data: URLs are safe (and they only make sense
      // for <img>, not for <a>). Other data: schemes (text/html,
      // application/javascript) are stripped to prevent exfil.
      if (/^data:image\//i.test(String(url))) return String(url);
    }
  } catch (e) {
    // fall through
  }
  return '';
}

export interface ParseState {
  score: number;
  variables: Record<string, unknown>;
}

/**
 * Render a quiz content string into safe HTML.
 *
 * Order (do NOT change without re-running the parse-order tests):
 *   1. {{var}} placeholders — the value is escapeHtml'd before
 *      being inserted. If the variable is unknown, the raw {{var}}
 *      marker is kept verbatim so the author can see the bug.
 *   2. [label](url) links — the URL is sanitized (protocol allow-
 *      list), then both URL and label are escapeHtml'd.
 *   3. **bold** / *italic* / - lists — raw text replacement, no
 *      escape. The output is run through sanitizeHtml() at the end
 *      so any injected <script>/<iframe> is stripped by DOMPurify.
 *   4. \n → <br>
 *   5. Final DOMPurify sanitizeHtml() is the safety net.
 *
 * NOTE: the *italic* / **bold** / list transforms intentionally
 * run AFTER placeholder replacement so that a value containing
 * a literal `*` is still rendered as text inside the placeholder,
 * not reinterpreted as a markdown marker.
 */
export function parseText(
  text: string | null | undefined,
  state: ParseState,
  sanitizeHtml: (html: string) => string,
): string {
  if (!text) return '';
  let t = String(text);

  // 1. {{var}} placeholders
  t = t.replace(/\{\{(.*?)\}\}/g, (m, key) => {
    const k = key.trim();
    const v =
      k === 'score'
        ? state.score
        : state.variables[k] !== undefined
          ? state.variables[k]
          : null;
    return v !== null ? escapeHtml(v) : m;
  });

  // 2. [label](url) — sanitize URL, escape both
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, lbl, url) => {
    const sUrl = sanitizeAssetUrl(url);
    return sUrl
      ? '<a href="' + escapeHtml(sUrl) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(lbl) + '</a>'
      : escapeHtml(lbl);
  });

  // 3. bold / italic / lists
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
  t = t.replace(/^- (.*?)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>.*<\/li>)/gs, (m) => '<ul>' + m + '</ul>');

  // 4. newlines
  t = t.replace(/\n/g, '<br>');

  // 5. final sanitiser
  return sanitizeHtml(t);
}

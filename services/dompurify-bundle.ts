// Inlined DOMPurify source for the quiz player iframe.
//
// The quiz engine runs in a sandboxed iframe (`sandbox="allow-scripts"`,
// no `allow-same-origin`), so `window.parent.DOMPurify` is NOT accessible.
// The iframe is loaded with `<script>%%QUIZ_SCRIPT%%</script>` inside
// the template HTML; DOMPurify must therefore be embedded as a string
// inside the engine script so it runs in the iframe's own window scope.
//
// Vite resolves `?raw` to the file contents as a string at build time.
// `dompurify.min.js` is 26.8 KB; this is acceptable for the player route
// and only adds ~3% to the existing 934 KB `quizGenerator` bundle.
//
// History: before this inlining, quizEngine.ts:289 used a regex fallback
// that did not match real `<script>` tags (double backslash in the
// character class), allowing XSS via quiz title/description in the
// sandboxed iframe. With this inlining the fallback becomes dead code
// in the iframe path, and we keep a hardened HTML-escape fallback as
// defense in depth.
import dompurifySource from 'dompurify/dist/purify.min.js?raw';

export const DOMPURIFY_SOURCE: string = dompurifySource;

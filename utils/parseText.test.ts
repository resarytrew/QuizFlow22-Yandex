// utils/parseText.test.ts
//
// Unit tests for parseMarkdown in utils/parseText.ts. The function
// takes user-supplied text and returns sanitized HTML. A bug here
// would either let an XSS payload through (e.g. <script>, javascript:
// links) or strip legitimate Markdown.
//
// Run with: `npm test parseText`

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './parseText';

describe('parseMarkdown — happy paths', () => {
  it('returns empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('');
  });

  it('returns empty string for null-like input (empty string is OK)', () => {
    // Falsy → ''. We don't accept null/undefined at the type level.
    expect(parseMarkdown('')).toBe('');
  });

  it('escapes raw HTML tags', () => {
    // The user can write `<script>` but it MUST come out as text, not
    // as a script tag. escapeHtml runs first, then DOMPurify.
    const out = parseMarkdown('Hello <script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('renders **bold** as <strong>', () => {
    const out = parseMarkdown('this is **bold** text');
    expect(out).toMatch(/<strong>bold<\/strong>/);
  });

  it('renders *italic* as <em>', () => {
    const out = parseMarkdown('this is *italic* text');
    expect(out).toMatch(/<em>italic<\/em>/);
  });

  it('renders # / ## / ### headings as h2/h3/h4', () => {
    // Single # is H1, but the ALLOWED_TAGS list doesn't include h1,
    // so DOMPurify would strip it. The function does the regex for
    // ####, ###, ##. There is no regex for #, so single # falls
    // through to DOMPurify as raw text.
    const h2 = parseMarkdown('## Title');
    expect(h2).toMatch(/<h2>Title<\/h2>/);

    const h3 = parseMarkdown('### Subtitle');
    expect(h3).toMatch(/<h3>Subtitle<\/h3>/);

    const h4 = parseMarkdown('#### Minor');
    expect(h4).toMatch(/<h4>Minor<\/h4>/);
  });

  it('renders - list items as <li> (no <ul> wrapper in P0)', () => {
    // The regex just wraps each - line in <li>. There's no <ul>
    // generation in this P0 version — that's a known limitation.
    const out = parseMarkdown('- first\n- second');
    expect(out).toMatch(/<li>first<\/li>/);
    expect(out).toMatch(/<li>second<\/li>/);
  });

  it('renders [label](url) as a link with target=_blank rel=noopener', () => {
    const out = parseMarkdown('[click](https://example.com)');
    expect(out).toMatch(/<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">click<\/a>/);
  });

  it('converts newlines to <br>', () => {
    const out = parseMarkdown('line 1\nline 2');
    expect(out).toMatch(/line 1<br>line 2/);
  });

  it('renders code blocks', () => {
    // The regex is ` ```(\w*)\n([\s\S]*?)``` ` — language label + body.
    // DOMPurify then allows <pre>, <code>, and the class= attribute.
    const out = parseMarkdown('```js\nconsole.log(1)\n```');
    expect(out).toMatch(/<pre><code class="language-js">/);
    expect(out).toContain('console.log(1)');
    expect(out).toMatch(/<\/code><\/pre>/);
  });
});

describe('parseMarkdown — XSS / security', () => {
  it('strips <script> tags after escape + sanitize', () => {
    // The escape-then-DOMPurify pipeline means <script> never
    // makes it to the DOM as a tag.
    const out = parseMarkdown('<script>alert("xss")</script>');
    expect(out.toLowerCase()).not.toContain('<script');
  });

  it('strips javascript: URLs in [link](url) syntax', () => {
    // DOMPurify's ALLOWED_URI_REGEXP rejects javascript: schemes.
    // The [label](url) regex is what generates the <a> in the first
    // place, but DOMPurify then drops the href.
    const out = parseMarkdown('[click](javascript:alert(1))');
    // The link text should survive; the href should be stripped.
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('escapes on* event handlers (the < is escaped, so on* becomes text)', () => {
    // The pipeline is escape-then-DOMPurify, so any raw < becomes
    // &lt; and the tag+attrs are pure text — no event handler can
    // ever reach the DOM as an attribute.
    const out = parseMarkdown('<img src="x" onerror="alert(1)">');
    // The unescaped form MUST NOT survive.
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<img src');
    // The onerror attribute is escaped text.
    expect(out).toContain('&lt;img');
    expect(out).toContain('onerror=');
  });

  it('strips <iframe> tags', () => {
    const out = parseMarkdown('<iframe src="https://evil.com"></iframe>');
    expect(out.toLowerCase()).not.toContain('<iframe');
  });

  it('strips <style> tags', () => {
    const out = parseMarkdown('<style>body { display:none }</style>');
    expect(out.toLowerCase()).not.toContain('<style');
  });

  it('strips data: URLs (CSS exfil vector)', () => {
    const out = parseMarkdown('[click](data:text/html,<script>alert(1)</script>)');
    expect(out.toLowerCase()).not.toContain('data:text/html');
  });

  it('strips nested <sc<script>ript> bypass attempt (C-03)', () => {
    // Naive filter that does a single-pass str.replace('<script>')
    // is bypassed by nesting. Our pipeline escapes ALL '<' first
    // (escapeHtml), so the inner tag is neutralised as text.
    const out = parseMarkdown('<sc<script>ript>alert(1)</script>');
    expect(out.toLowerCase()).not.toMatch(/<script[^>]*>alert/);
    // The original payload survives only as escaped text.
    expect(out.toLowerCase()).toContain('&lt;sc');
    expect(out.toLowerCase()).toContain('&lt;script&gt;');
  });

  it('strips <svg onload=...> (C-03 SVG XSS bypass)', () => {
    // SVG is a valid HTML element that fires onload without user
    // interaction. escapeHtml() turns the '<' into '&lt;' BEFORE
    // DOMPurify runs, so the literal `<svg` tag never reaches the
    // DOM. The 'onload=' substring survives in the output only as
    // escaped text inside the escaped <svg> tag.
    const out = parseMarkdown('<svg onload="alert(1)"></svg>');
    // No real <svg> opening tag must exist (only &lt;svg which is
    // a text run, not an element).
    expect(out).not.toMatch(/<svg\b/);
    // The 'onload=' appears only as part of escaped text.
    expect(out.toLowerCase()).toContain('&lt;svg');
    expect(out).toContain('onload=');
    // The '"' is escaped, so the attribute is structurally broken.
    expect(out).toContain('&quot;alert(1)&quot;');
  });

  it('does NOT decode HTML entities into executable tags (C-03)', () => {
    // User-supplied '&lt;script&gt;...' is double-escaped by our
    // pipeline: escapeHtml() sees the '&' and turns it into '&amp;',
    // producing '&amp;lt;script&amp;gt;...'. This is STILL safe —
    // browsers render that as the literal text '<script>...',
    // not as a tag, because the '&' was escaped.
    const out = parseMarkdown('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).not.toMatch(/<script[^>]*>alert/);
    // The double-escaped form is what survives in the output.
    expect(out).toContain('&amp;lt;script&amp;gt;');
  });

  it('strips mixed-case <ScRiPt> tag (C-03 case-bypass)', () => {
    // Tag names are case-insensitive in HTML5. escapeHtml() lower-
    // cases nothing — it just escapes '<'. The literal '<ScRiPt>'
    // becomes '&lt;ScRiPt&gt;' which is pure text.
    const out = parseMarkdown('<ScRiPt>alert(1)</ScRiPt>');
    expect(out.toLowerCase()).not.toMatch(/<script[^>]*>alert/);
    expect(out).toContain('&lt;ScRiPt&gt;');
  });
});

// @vitest-environment node
// Regression test for C-05 (AUDIT_REPORT.md):
// The order of operations inside services/parseQuizText.ts matters:
// placeholder VALUES, link LABELS, and link URLS MUST be escaped
// before they reach the DOM. A regression here would let a quiz
// author's XSS payload execute inside the published quiz iframe.
//
// Run with: `npm test parseQuizText`

import { describe, expect, it } from 'vitest';
import { parseText, escapeHtml, sanitizeAssetUrl, type ParseState } from './parseQuizText';

const state: ParseState = { score: 42, variables: { name: 'Vasya', xss: '<img src=x onerror=alert(1)>' } };

const sanitizeHtml = (html: string): string => {
  // Tiny in-test DOMPurify stand-in: strip <script>/<iframe>/<style>
  // and any on* event handlers. The real sanitizeHtml is a thin
  // wrapper around DOMPurify (services/quizEngine.ts) but the
  // security contract for the parseText() pipeline is the SAME —
  // placeholder/link transforms must be safe BEFORE this final
  // pass.
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
};

describe('parseQuizText — escapeHtml (C-05 helper)', () => {
  it('escapes all 5 dangerous chars', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;',
    );
  });

  it('escapes non-string input by String() coercion', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
  });
});

describe('parseQuizText — sanitizeAssetUrl (C-05 helper)', () => {
  it('accepts http(s) URLs and returns normalized href', () => {
    expect(sanitizeAssetUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(sanitizeAssetUrl('//example.com/x')).toMatch(/^https?:\/\/example\.com\/x$/);
  });

  it('strips javascript: URLs', () => {
    expect(sanitizeAssetUrl('javascript:alert(1)')).toBe('');
  });

  it('strips non-image data: URLs', () => {
    expect(sanitizeAssetUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('accepts data:image/* URLs', () => {
    expect(sanitizeAssetUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo=',
    );
  });

  it('returns "" for empty / non-string', () => {
    expect(sanitizeAssetUrl('')).toBe('');
    expect(sanitizeAssetUrl(null)).toBe('');
  });
});

describe('parseQuizText — order of operations (C-05)', () => {
  it('escapes placeholder VALUES (1st in pipeline)', () => {
    // XSS payload inside a variable MUST be escaped, not injected
    // as HTML. {{xss}} has value '<img src=x onerror=alert(1)>'.
    const out = parseText('Hello {{xss}}!', state, sanitizeHtml);
    // The literal '<' is escaped, so the browser never sees a tag.
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    // No raw <img tag survives — the '<' is now an entity.
    expect(out).not.toMatch(/<img\b/);
  });

  it('preserves unknown placeholder marker verbatim', () => {
    // {{unknown}} → not in state, MUST stay as '{{unknown}}'
    // so the author can see the bug, not be silently swallowed.
    const out = parseText('Your score: {{score}}, foo: {{missing}}', state, sanitizeHtml);
    expect(out).toContain('42');
    expect(out).toContain('{{missing}}');
  });

  it('escapes link LABELS and sanitizes link URLS (2nd in pipeline)', () => {
    // The XSS in the label is escaped, and the javascript: URL is
    // stripped → the result is just the escaped label text, with
    // no <a> tag wrapping it.
    const out = parseText(
      '[<script>alert(1)</script>](javascript:alert(1))',
      state,
      sanitizeHtml,
    );
    // The label is escaped.
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // The URL was sanitized to '' so the regex replacement returns
    // just the (escaped) label, with NO <a href="...">.
    expect(out).not.toMatch(/<a\s/);
    expect(out).not.toMatch(/href=/);
  });

  it('renders a safe link with target=_blank rel=noopener', () => {
    const out = parseText(
      '[Click](https://example.com/path)',
      state,
      sanitizeHtml,
    );
    expect(out).toContain('<a href="https://example.com/path"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('>Click</a>');
  });

  it('bold/italic transforms run AFTER placeholder (interleaved)', () => {
    // The value of {{name}} is 'Vasya' — no asterisks. So the
    // *...* wrapper around it should render as <em>Vasya</em>.
    // This confirms placeholders are substituted BEFORE markdown.
    const out = parseText('Hi *{{name}}*!', state, sanitizeHtml);
    expect(out).toMatch(/<em>Vasya<\/em>/);
  });

  it('does not let a placeholder VALUE inject raw HTML (escapes first)', () => {
    // The value is a string that LOOKS like markdown + a link with
    // a dangerous URL. After placeholder substitution, the value
    // is then re-parsed as markdown. The XSS-relevant part is the
    // javascript: URL — it MUST be stripped to ''. The '*click*'
    // WILL be turned into <em>click</em> (that's expected: the
    // value is text, then the markdown layer treats it as text).
    const xss: ParseState = { score: 0, variables: { x: '*click* [x](javascript:alert(1))' } };
    const out = parseText('{{x}}', xss, sanitizeHtml);
    // No <a> tag — the javascript: URL was sanitized away.
    expect(out).not.toMatch(/<a\s/);
    expect(out).not.toContain('javascript:');
    // The surrounding text still appears.
    expect(out).toContain('click');
  });

  it('newlines convert to <br> after all other transforms', () => {
    const out = parseText('line1\nline2', state, sanitizeHtml);
    expect(out).toMatch(/line1<br>line2/);
  });

  it('lists wrap consecutive <li> in a single <ul>', () => {
    // After the list transform, the '\n' between <li>s gets
    // converted to <br>. We just need to verify the <ul> wrapper
    // exists and both <li> items are inside.
    const out = parseText('- a\n- b', state, sanitizeHtml);
    expect(out).toMatch(/<ul>[\s\S]*<li>a<\/li>[\s\S]*<li>b<\/li>[\s\S]*<\/ul>/);
  });
});

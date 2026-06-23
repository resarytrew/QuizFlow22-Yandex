import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  getInlineScriptCspSources,
  replaceInlineScriptCspMarker,
} from './viteCsp';

describe('vite CSP helpers', () => {
  it('hashes the exact content of inline scripts', () => {
    const script = 'console.log("dev refresh");';
    const expected = createHash('sha256').update(script).digest('base64');

    expect(
      getInlineScriptCspSources(`<script type="module">${script}</script>`),
    ).toEqual([`'sha256-${expected}'`]);
  });

  it('ignores external scripts', () => {
    expect(
      getInlineScriptCspSources(
        '<script type="module" src="/index.tsx"></script>',
      ),
    ).toEqual([]);
  });

  it('replaces the marker with every inline script hash', () => {
    const html =
      '<meta content="script-src __CSP__"><script>one()</script><script type="module">two()</script>';
    const result = replaceInlineScriptCspMarker(html, '__CSP__');

    expect(result).not.toContain('__CSP__');
    expect(result.match(/'sha256-/g)).toHaveLength(2);
  });
});

// @vitest-environment node
// Regression test for C-04 (AUDIT_REPORT.md):
// Every <iframe srcDoc={...}> in the app must use
// sandbox="allow-scripts allow-same-origin" — NOT just
// "allow-scripts". Without allow-same-origin, the iframe is in a
// "unique origin" sandbox and:
//   - browser APIs that depend on the document origin are unavailable
//   - window.parent.postMessage between iframe and parent fails
//     the same-origin check
//   - QuizPlayer / LivePreview / modals render as completely
//     non-functional
//
// The fix was Phase 3.5 C-04 (4 files). If any future PR drops
// the `allow-same-origin` token, this test will catch it.
//
// Run with: `npm test sandbox-attrs`

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TargetFile {
  path: string;
  expected: string;
}

const FILES: TargetFile[] = [
  {
    path: 'components/QuizPlayer.tsx',
    expected: 'allow-scripts allow-same-origin',
  },
  {
    path: 'components/LivePreview.tsx',
    expected: 'allow-scripts allow-same-origin',
  },
  {
    path: 'components/modals/HtmlPreviewModal.tsx',
    expected: 'allow-scripts allow-same-origin',
  },
  {
    path: 'components/modals/PreviewModal.tsx',
    expected: 'allow-scripts allow-same-origin',
  },
];

// Pull the first `sandbox="..."` attribute on an <iframe ...>
// opening tag (multi-line via [\s\S]).
const SANDBOX_RE = /<iframe\b[\s\S]*?\bsandbox="([^"]+)"/;

describe('C-04: every quiz <iframe> has sandbox=allow-scripts allow-same-origin', () => {
  for (const f of FILES) {
    it(`${f.path}: sandbox attribute equals "${f.expected}"`, () => {
      const src = readFileSync(join(process.cwd(), f.path), 'utf8');
      const m = src.match(SANDBOX_RE);
      expect(m, `${f.path} has no <iframe sandbox="..."> tag`).not.toBeNull();
      expect(m![1]).toBe(f.expected);
    });

    it(`${f.path}: sandbox is NOT just "allow-scripts" (the C-04 regression)`, () => {
      const src = readFileSync(join(process.cwd(), f.path), 'utf8');
      // The dangerous form is `sandbox="allow-scripts"` (no
      // allow-same-origin). Make sure we never regress to that.
      expect(
        src,
        `${f.path} still uses sandbox="allow-scripts" without allow-same-origin`,
      ).not.toMatch(/sandbox="allow-scripts"(?!\s+allow-same-origin)/);
    });
  }
});

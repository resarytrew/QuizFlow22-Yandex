// @vitest-environment node
// Regression test for C-06 (AUDIT_REPORT.md):
// Every <script src="https://cdn.jsdelivr.net/..."> or
// <script src="https://cdnjs.cloudflare.com/..."> in a published
// template MUST carry an `integrity` attribute with a valid
// sha384-base64 hash AND `crossorigin="anonymous"`. Otherwise the
// browser will execute whatever the CDN serves, including a
// hijacked version of a third-party JS file.
//
// Updating a dependency = re-running the hash command documented
// in README §18 and updating the EXPECTED map below.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATES_DIR = join(process.cwd(), 'services', 'templates');

const EXPECTED: Record<string, string> = {
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js':
    'sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js':
    'sha384-D1EB0F6891FE17D7AFA7696C258377E925BB5E445B698BE2BB217E3E99DB8C35C10BD8B50961A22721AB5C2CA2C86A99',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js':
    'sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js':
    'sha384-77EBF24347587329A83FC9DDAB6856EC5182E749EA19D5D4120A0E506C5B6E4009C19A8BEE1FA328DD061A09FD8450D2',
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js':
    'sha384-5AE8B1E81BA1AD66E30C1B36E1B5EB8DFE19439685785581B8A9057A43B6B7CC4553488D68B41FA762BAFF5371BDE7A2',
};

// Match both <script ...></script> and <script ...><\/script> forms
// (army.ts uses the escaped close tag inside a template literal).
const SCRIPT_RE = /<script\b([^>]*?)\bsrc="(https:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\/[^"]+)"([^>]*)>/g;
const SHA384_RE = /^sha384-[A-Za-z0-9+/=]{96}$/;

describe('C-06: CDN <script> tags in templates have SRI integrity', () => {
  const templateFiles = readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => join(TEMPLATES_DIR, f));

  for (const file of templateFiles) {
    const shortName = file.split(/[\\/]/).pop()!;
    it(`${shortName}: every CDN <script> has integrity + crossorigin`, () => {
      const src = readFileSync(file, 'utf8');
      const matches = [...src.matchAll(SCRIPT_RE)];
      expect(matches.length, `${shortName} has no CDN scripts (or all stripped)`).toBeGreaterThanOrEqual(0);
      for (const m of matches) {
        const before = m[1];
        const url = m[2];
        const after = m[3];
        const fullTag = m[0];

        // 1) URL must be in the EXPECTED map
        expect(EXPECTED, `${shortName}: unknown CDN URL ${url}`).toHaveProperty(url);
        const expectedHash = EXPECTED[url];

        // 2) integrity attribute must be present on the same tag
        const allAttrs = before + after;
        const integrityMatch = allAttrs.match(/integrity="([^"]+)"/);
        expect(integrityMatch, `${shortName}: missing integrity on <script src="${url}">`).not.toBeNull();
        const integrity = integrityMatch![1];

        // 3) Hash must match expected exactly
        expect(integrity, `${shortName}: integrity mismatch for ${url}`).toBe(expectedHash);

        // 4) Hash format must be sha384-<96 base64 chars>
        expect(integrity, `${shortName}: bad hash format on ${url}`).toMatch(SHA384_RE);

        // 5) crossorigin="anonymous" is required for SRI to work
        const crossoriginMatch = allAttrs.match(/crossorigin="([^"]+)"/);
        expect(crossoriginMatch, `${shortName}: missing crossorigin on <script src="${url}">`).not.toBeNull();
        expect(crossoriginMatch![1]).toBe('anonymous');

        // 6) No leftover single-quote escape from old sanitizeAssetUrl
        expect(fullTag, `${shortName}: stray quote-escape`).not.toContain("\\'");
      }
    });
  }
});

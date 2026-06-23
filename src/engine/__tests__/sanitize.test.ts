// src/engine/__tests__/sanitize.test.ts
import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeAssetUrl, parseText } from '../sanitize';

describe('escapeHtml', () => {
  it('should escape all dangerous characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});

describe('sanitizeAssetUrl', () => {
  it('should allow https URLs', () => {
    expect(sanitizeAssetUrl('https://example.com/img.png'))
      .toBe('https://example.com/img.png');
  });

  it('should block SVG data URIs', () => {
    expect(sanitizeAssetUrl('data:image/svg+xml,<svg onload=alert(1)>'))
      .toBe('');
  });

  it('should block javascript: protocol', () => {
    expect(sanitizeAssetUrl('javascript:alert(1)')).toBe('');
  });

  it('should block protocol-relative URLs', () => {
    expect(sanitizeAssetUrl('//evil.com/img.png')).toBe('');
  });
});

describe('parseText', () => {
  it('should handle nested bold+italic', () => {
    const result = parseText('***bold italic***');
    expect(result).toContain('<strong><em>');
  });
});
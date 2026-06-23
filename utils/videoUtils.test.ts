// utils/videoUtils.test.ts
//
// Unit tests for RuTube URL extraction in utils/videoUtils.ts. The
// regex is a single hand-rolled pattern; edge cases (trailing
// slashes, query params, mixed casing, non-RuTube hosts) are the
// failure modes most likely to slip through.
//
// Run with: `npm test videoUtils`

import { describe, expect, it } from 'vitest';
import { getRutubeEmbedUrl, getRutubeId } from './videoUtils';

describe('getRutubeId — supported URL formats', () => {
  it('extracts id from /video/{id}/ canonical URL', () => {
    const id = '1234567890abcdef1234567890abcdef';
    expect(getRutubeId(`https://rutube.ru/video/${id}/`)).toBe(id);
  });

  it('extracts id from /video/{id} without trailing slash', () => {
    const id = 'abcdef1234567890abcdef1234567890';
    expect(getRutubeId(`https://rutube.ru/video/${id}`)).toBe(id);
  });

  it('extracts id from /play/embed/{id} (player embed URL)', () => {
    const id = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
    expect(getRutubeId(`https://rutube.ru/play/embed/${id}`)).toBe(id);
  });

  it('extracts id with query params after /video/{id}', () => {
    // RuTube sometimes appends `?t=...` (timecode start) or `?p=...`
    const id = '1234567890abcdef1234567890abcdef';
    expect(getRutubeId(`https://rutube.ru/video/${id}?t=42`)).toBe(id);
  });

  it('handles http:// (not just https://)', () => {
    const id = '1234567890abcdef1234567890abcdef';
    expect(getRutubeId(`http://rutube.ru/video/${id}/`)).toBe(id);
  });

  it('handles www. subdomain', () => {
    const id = '1234567890abcdef1234567890abcdef';
    expect(getRutubeId(`https://www.rutube.ru/video/${id}/`)).toBe(id);
  });
});

describe('getRutubeId — rejection cases', () => {
  it('returns null for empty string', () => {
    expect(getRutubeId('')).toBe(null);
  });

  it('returns null for YouTube URL', () => {
    expect(getRutubeId('https://www.youtube.com/watch?v=abc123')).toBe(null);
  });

  it('returns null for Vimeo URL', () => {
    expect(getRutubeId('https://vimeo.com/123456')).toBe(null);
  });

  it('returns null for plain text without URL', () => {
    expect(getRutubeId('hello world')).toBe(null);
  });

  it('returns null for rutube.ru root (no path)', () => {
    expect(getRutubeId('https://rutube.ru/')).toBe(null);
  });

  it('returns null for rutube.ru /video/ without id', () => {
    expect(getRutubeId('https://rutube.ru/video/')).toBe(null);
  });

  it('rejects a RuTube-looking path on a different hostname', () => {
    expect(getRutubeId('https://evil.com/rutube.ru/video/abc123')).toBe(null);
  });

  it('returns null for non-string-ish input (number coerced to string)', () => {
    // Defensive: numbers get coerced to string. The regex won't
    // match a bare number.
    expect(getRutubeId('12345' as unknown as string)).toBe(null);
  });
});

describe('getRutubeEmbedUrl', () => {
  it('builds the canonical embed URL', () => {
    const id = '1234567890abcdef1234567890abcdef';
    expect(getRutubeEmbedUrl(id)).toBe(
      `https://rutube.ru/play/embed/${id}`,
    );
  });

  it('does not encode or transform the id', () => {
    // The function does not URL-encode the id — that's by design
    // because RuTube IDs are alphanumeric. If a caller passes a
    // non-alphanumeric id, the result is still passed through.
    expect(getRutubeEmbedUrl('abc-123')).toBe(
      'https://rutube.ru/play/embed/abc-123',
    );
  });
});

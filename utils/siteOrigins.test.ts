import { describe, expect, it } from 'vitest';
import {
  createSiteOriginConfig,
  normalizeSiteOrigin,
  resolveSiteOrigin,
} from './siteOrigins';

describe('siteOrigins', () => {
  it('normalizes valid HTTP origins', () => {
    expect(normalizeSiteOrigin(' https://mykviz.ru/ ')).toBe('https://mykviz.ru');
    expect(normalizeSiteOrigin('http://127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000',
    );
  });

  it('rejects URLs that are not plain origins', () => {
    expect(normalizeSiteOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeSiteOrigin('https://mykviz.ru/path')).toBeNull();
    expect(normalizeSiteOrigin('https://user:pass@mykviz.ru')).toBeNull();
  });

  it('builds a deduplicated configuration for both production domains', () => {
    expect(
      createSiteOriginConfig(
        'https://mykviz.ru',
        'https://mykviz.online, https://mykviz.online,invalid',
      ),
    ).toEqual({
      primaryOrigin: 'https://mykviz.ru',
      additionalOrigins: ['https://mykviz.online'],
    });
  });

  it('keeps authentication on either configured domain', () => {
    const config = createSiteOriginConfig(
      'https://mykviz.ru',
      'https://mykviz.online',
    );

    expect(resolveSiteOrigin('https://mykviz.ru', config)).toBe(
      'https://mykviz.ru',
    );
    expect(resolveSiteOrigin('https://mykviz.online', config)).toBe(
      'https://mykviz.online',
    );
  });

  it('falls back to the primary domain for an unknown production origin', () => {
    const config = createSiteOriginConfig(
      'https://mykviz.ru',
      'https://mykviz.online',
    );

    expect(resolveSiteOrigin('https://evil.example', config)).toBe(
      'https://mykviz.ru',
    );
  });

  it('allows localhost only when local development is enabled', () => {
    const config = createSiteOriginConfig(
      'https://mykviz.ru',
      'https://mykviz.online',
    );

    expect(resolveSiteOrigin('http://127.0.0.1:3000', config, true)).toBe(
      'http://127.0.0.1:3000',
    );
    expect(resolveSiteOrigin('http://127.0.0.1:3000', config, false)).toBe(
      'https://mykviz.ru',
    );
  });
});

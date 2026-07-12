import { describe, expect, it } from 'vitest';
import {
  buildStructuredData,
  canonicalUrl,
  getSeoPage,
  seoPages,
  solutionPages,
} from './seoCatalog';

describe('SEO catalog', () => {
  it('contains unique canonical paths', () => {
    const paths = seoPages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path === '/' || path.endsWith('/'))).toBe(true);
  });

  it('provides substantial solution pages', () => {
    expect(solutionPages.length).toBeGreaterThanOrEqual(8);
    for (const page of solutionPages) {
      expect(page.title.length).toBeGreaterThan(30);
      expect(page.description.length).toBeGreaterThan(80);
      expect(page.benefits?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('exposes every documentation article as an indexable page', () => {
    const docs = seoPages.filter((page) => page.path.startsWith('/docs/') && page.path !== '/docs/');
    expect(docs).toHaveLength(17);
    expect(docs.some((page) => page.path === '/docs/variables/')).toBe(true);
    expect(docs.every((page) => page.description.length > 70)).toBe(true);
  });

  it('normalizes paths and builds absolute canonicals', () => {
    expect(getSeoPage('/docs')?.path).toBe('/docs/');
    expect(canonicalUrl('/docs')).toBe('https://mykviz.ru/docs/');
  });

  it('emits schema.org structured data', () => {
    const home = getSeoPage('/');
    expect(home).toBeDefined();
    const data = buildStructuredData(home!);
    expect(data['@context']).toBe('https://schema.org');
    expect(JSON.stringify(data)).toContain('SoftwareApplication');
    expect(JSON.stringify(data)).toContain('Organization');
  });
});

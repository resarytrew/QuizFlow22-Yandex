import { describe, expect, it } from 'vitest';
import { classifyReferrer } from './SeoAnalytics';

describe('SEO acquisition classification', () => {
  it('detects AI referrals', () => {
    expect(classifyReferrer('https://chatgpt.com/c/123')).toBe('ai');
    expect(classifyReferrer('https://www.perplexity.ai/search/test')).toBe('ai');
  });

  it('detects classic search and direct traffic', () => {
    expect(classifyReferrer('https://yandex.ru/search/?text=quiz')).toBe('search');
    expect(classifyReferrer('https://www.google.com/search?q=quiz')).toBe('search');
    expect(classifyReferrer('')).toBe('direct');
  });

  it('keeps ordinary links as referrals', () => {
    expect(classifyReferrer('https://example.com/article')).toBe('referral');
  });
});

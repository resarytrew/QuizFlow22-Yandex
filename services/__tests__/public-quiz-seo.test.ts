// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
vi.mock('../../yc-functions/_shared/db', () => ({ query: vi.fn() }));
import { query } from '../../yc-functions/_shared/db';
import { handler, PUBLIC_ONLY } from '../../yc-functions/public-quiz-seo';

const db = vi.mocked(query);
const id = '12345678-1234-1234-1234-123456789abc';
const get = (path: string) => handler({ httpMethod: 'GET', path });
beforeEach(() => { db.mockReset(); });
describe('public quiz search pages', () => {
  it('resolves the API Gateway path parameter instead of its route template', async () => {
    db.mockResolvedValue([{ count: '0' }]);
    const res = await handler({ httpMethod: 'GET', path: '/quizzes/{path+}', pathParameters: { path: 'sitemap.xml' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<sitemapindex');
    expect((await get('/quizzes/')).headers.Location).toBe('https://mykviz.ru/quizzes/index.html');
  });
  it('renders metadata and play link without exposing executable HTML or answer data', async () => {
    db.mockResolvedValue([{ id, name: 'Тест " & <b>тема</b>', description: '<img src=x onerror=alert(1)>Описание & текст', keywords: ['<script>alert(1)</script>', 'История'] }]);
    const res = await get(`/quizzes/${id}.html`);
    const doc = new JSDOM(res.body).window.document;
    expect(res.statusCode).toBe(200);
    expect(doc.querySelector('h1')?.textContent).toBe('Тест " & тема');
    expect(doc.querySelectorAll('script,img')).toHaveLength(0);
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`https://mykviz.ru/quizzes/${id}.html`);
    expect(doc.querySelector('.start')?.getAttribute('href')).toBe(`https://mykviz.ru/#/play/${id}`);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(db.mock.calls[0][0]).toContain(PUBLIC_ONLY);
    expect(db.mock.calls[0][0]).not.toContain('SELECT *');
    expect(db.mock.calls[0][1]).toEqual([id]);
  });
  it('revokes a previously public page as soon as it is no longer eligible', async () => {
    db.mockResolvedValueOnce([{ id, name: 'Public' }]).mockResolvedValueOnce([]);
    expect((await get(`/quizzes/${id}.html`)).statusCode).toBe(200);
    const res = await get(`/quizzes/${id}.html`);
    expect(res.statusCode).toBe(404);
    expect(res.headers['X-Robots-Tag']).toBe('noindex');
    expect(res.body).not.toContain('Public');
    expect(PUBLIC_ONLY).toContain("q.visibility = 'public'");
    expect(PUBLIC_ONLY).toContain('q.deleted_at IS NULL');
    expect(PUBLIC_ONLY).toContain("= 'approved'");
  });
  it('uses the same eligibility filter and pagination for the entire catalog and sitemap', async () => {
    db.mockResolvedValueOnce([{ count: '1001' }]);
    const index = await get('/quizzes/sitemap.xml');
    expect(index.body).toContain('sitemap-2.xml');
    db.mockResolvedValueOnce([{ count: '1001' }]).mockResolvedValueOnce([{ id, updated_at: '2026-09-12T00:00:00Z' }]);
    const shard = await get('/quizzes/sitemap-2.xml');
    const doc = new JSDOM(shard.body, { contentType: 'text/xml' }).window.document;
    expect(doc.querySelector('loc')?.textContent).toBe(`https://mykviz.ru/quizzes/${id}.html`);
    expect(db.mock.calls[2][1]).toEqual([1000, 1000]);
    db.mockResolvedValueOnce([{ count: '25' }]).mockResolvedValueOnce([{ id, name: 'Last quiz' }]);
    const page = await get('/quizzes/page-2.html');
    expect(page.body).toContain('Last quiz');
    expect(page.body).toContain('Предыдущая страница');
    expect(page.body).not.toContain('Следующая страница');
    expect(db.mock.calls[4][1]).toEqual([24, 24]);
    for (const call of db.mock.calls) expect(call[0]).toContain(PUBLIC_ONLY);
  });
  it('rejects malformed paths and out-of-range pages', async () => {
    expect((await get('/quizzes/not-a-uuid.html')).statusCode).toBe(404);
    expect(db).not.toHaveBeenCalled();
    db.mockResolvedValueOnce([{ count: '2' }]);
    expect((await get('/quizzes/page-999999.html')).statusCode).toBe(404);
    expect(db).toHaveBeenCalledTimes(1);
  });
  it('returns retryable errors instead of empty or stale index data on DB failure', async () => {
    db.mockRejectedValue(new Error('database unavailable'));
    for (const path of ['/quizzes/sitemap.xml', '/quizzes/index.html', `/quizzes/${id}.html`]) {
      const res = await get(path);
      expect(res.statusCode).toBe(503);
      expect(res.headers['Cache-Control']).toBe('no-store');
      expect(res.headers['Retry-After']).toBe('300');
    }
  });
  it('supports HEAD and disallows writes', async () => {
    db.mockResolvedValue([{ id }]);
    const res = await handler({ httpMethod: 'HEAD', path: `/quizzes/${id}.html` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('');
    db.mockClear();
    expect((await handler({ httpMethod: 'POST', path: '/quizzes/index.html' })).statusCode).toBe(405);
    expect(db).not.toHaveBeenCalled();
  });
});

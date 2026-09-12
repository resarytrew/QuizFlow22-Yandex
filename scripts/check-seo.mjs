import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

// With a URL argument this also catches CDN rewrites, wrong MIME types and TLS errors.
const origin = process.argv[2]?.replace(/\/$/, '');
async function read(path, mime) {
  if (!origin) return readFile(new URL(`../dist${path}`, import.meta.url), 'utf8');
  const response = await fetch(`${origin}${path}`, { redirect: 'error' });
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get('content-type')?.includes(mime), `${path}: expected ${mime}`);
  return response.text();
}
const robots = await read('/robots.txt', 'text/plain');
assert.match(robots, /^User-agent: \*/m);
assert.match(robots, /^Sitemap: https:\/\/mykviz.ru\/sitemap.xml$/m);
const sitemap = await read('/sitemap.xml', 'xml');
const xml = new JSDOM(sitemap, { contentType: 'text/xml' }).window.document;
const urls = [...xml.querySelectorAll('loc')].map((loc) => loc.textContent);
assert.ok(urls.length >= 4);
assert.equal(new Set(urls).size, urls.length);
for (const url of urls) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://mykviz.ru');
  assert.equal(parsed.hash, '');
  const path = parsed.pathname;
  const html = await read(path === '/' && !origin ? '/index.html' : path, 'text/html');
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, url);
  assert.equal(doc.querySelectorAll('h1').length, 1, `${path}: one visible main heading`);
  assert.ok(doc.querySelector('main')?.textContent.length > 500, `${path}: content without JS`);
  assert.ok(!doc.querySelector('meta[name="robots"]')?.content.includes('noindex'));
  for (const link of doc.querySelectorAll('a[href$=".html"]')) {
    assert.ok(urls.includes(new URL(link.getAttribute('href'), url).href));
  }
}
console.log(`SEO checks passed: robots, sitemap and ${urls.length} HTML pages${origin ? ` on ${origin}` : ''}.`);

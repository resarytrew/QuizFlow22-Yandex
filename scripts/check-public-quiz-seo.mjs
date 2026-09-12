import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const origin = (process.argv[2] || 'https://mykviz.ru').replace(/\/$/, '');
async function fetchPage(path, mime, status = 200) {
  const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, path);
  assert.ok(response.headers.get('content-type')?.includes(mime), path);
  assert.equal(response.headers.get('cache-control'), 'no-store', `${path}: visibility must not be cached`);
  return { response, text: await response.text() };
}
const index = await fetchPage('/quizzes/sitemap.xml', 'xml');
const sitemapDoc = new JSDOM(index.text, { contentType: 'text/xml' }).window.document;
assert.equal(sitemapDoc.documentElement.localName, 'sitemapindex');
const maps = [...sitemapDoc.querySelectorAll('loc')].map((node) => node.textContent);
assert.ok(maps.length >= 1);
let checked = 0;
for (const map of maps.slice(0, 3)) {
  assert.ok(map.startsWith('https://mykviz.ru/quizzes/'));
  const { text } = await fetchPage(new URL(map).pathname, 'xml');
  const xml = new JSDOM(text, { contentType: 'text/xml' }).window.document;
  assert.equal(xml.documentElement.localName, 'urlset');
  for (const node of [...xml.querySelectorAll('loc')].slice(0, 25)) {
    const canonical = node.textContent;
    assert.ok(canonical.startsWith('https://mykviz.ru/quizzes/'));
    const { text: html } = await fetchPage(new URL(canonical).pathname, 'text/html');
    const doc = new JSDOM(html).window.document;
    assert.equal(doc.querySelectorAll('h1').length, 1);
    assert.equal(doc.querySelector('link[rel=canonical]')?.href, canonical);
    assert.ok(doc.querySelector('meta[name=description]')?.content.length > 0);
    assert.ok(!doc.querySelector('script'), 'Summary pages work without scripts');
    if (doc.querySelector('.start')) {
      const id = new URL(canonical).pathname.split('/').pop().replace('.html', '');
      assert.equal(doc.querySelector('.start').href, `https://mykviz.ru/#/play/${id}`);
    }
    checked++;
  }
}
const missing = await fetchPage('/quizzes/00000000-0000-0000-0000-000000000000.html', 'text/html', 404);
assert.equal(missing.response.headers.get('x-robots-tag'), 'noindex');
console.log(`Public quiz SEO verified on ${origin}: ${maps.length} sitemaps, ${checked} sampled pages, missing-quiz 404 and no-store.`);

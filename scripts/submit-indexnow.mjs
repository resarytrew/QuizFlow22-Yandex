import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = 'https://mykviz.ru';
const key = '9f6c3a8e71b24d50a4c893e12f7b6d41';

try {
  const sitemap = await readFile(join(root, 'dist', 'sitemap.xml'), 'utf8');
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith(`${siteUrl}/`));

  if (urlList.length === 0) {
    console.warn('IndexNow: no URLs found in dist/sitemap.xml');
    process.exit(0);
  }

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key,
      keyLocation: `${siteUrl}/${key}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok && response.status !== 202) {
    console.warn(`IndexNow: endpoint returned HTTP ${response.status}`);
  } else {
    console.log(`IndexNow: submitted ${urlList.length} deployed URLs`);
  }
} catch (error) {
  // Search notification must never roll back an otherwise healthy deploy.
  console.warn(`IndexNow: skipped (${error instanceof Error ? error.message : error})`);
}

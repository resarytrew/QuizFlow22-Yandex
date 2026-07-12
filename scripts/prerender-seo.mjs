import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const siteUrl = 'https://mykviz.ru';
const ogImage = `${siteUrl}/og-image.svg`;
const basePages = JSON.parse(await readFile(join(root, 'src/seo/seoPages.json'), 'utf8'));
const docSeoPages = JSON.parse(await readFile(join(root, 'src/seo/docSeoPages.json'), 'utf8'));
let pages = [
  ...basePages,
  ...docSeoPages.map((page) => ({
    path: `/docs/${page.id}/`,
    kind: 'article',
    title: `${page.title} — документация Поток`,
    description: page.description,
    heading: page.title,
    intro: page.description,
    docId: page.id,
  })),
];

const documentationSource = await readFile(join(root, 'data/documentationData.ts'), 'utf8');
const documentationJs = ts.transpileModule(documentationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const documentationModule = await import(`data:text/javascript;base64,${Buffer.from(documentationJs).toString('base64')}`);
const documentationPages = new Map(
  documentationModule.DOCUMENTATION.flatMap((category) => category.pages).map((page) => [page.id, page]),
);

async function resolveApiBase() {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL.replace(/\/$/, '');
  try {
    const envFile = await readFile(join(root, '.env'), 'utf8');
    const value = envFile.match(/^VITE_API_URL\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
    return value?.replace(/\/$/, '') ?? '';
  } catch {
    return '';
  }
}

const apiBase = await resolveApiBase();
if (apiBase) {
  try {
    const response = await fetch(`${apiBase}/quizzes?public=true`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quizzes = await response.json();
    const scenarioPages = quizzes
      .filter((quiz) => {
        const nodes = quiz.quiz_data?.nodes ?? [];
        const description = quiz.quiz_data?.description?.trim()
          || quiz.quiz_data?.passport?.scenarioDescription?.trim()
          || '';
        return quiz.visibility === 'public' && nodes.length >= 3 && description.length >= 40;
      })
      .map((quiz) => {
        const description = quiz.quiz_data.description?.trim()
          || quiz.quiz_data.passport?.scenarioDescription?.trim();
        const nodes = quiz.quiz_data?.nodes ?? [];
        const questionCount = nodes.filter((node) => /question|choice|matching|timeline|input|allocator/i.test(node.type ?? '')).length;
        return {
          path: `/scenarios/${quiz.id}/`,
          kind: 'scenario',
          title: `${quiz.name} — интерактивный сценарий в Потоке`,
          description,
          heading: quiz.name,
          intro: description,
          audience: quiz.quiz_data?.passport?.authors ? `Автор: ${quiz.quiz_data.passport.authors}` : undefined,
          benefits: [`${nodes.length} этапов сценария`, `${questionCount} интерактивных заданий`, 'Ветвления и персональный результат'],
          publishedAt: quiz.published_at,
        };
      });
    pages = [...pages, ...scenarioPages];
    console.log(`SEO prerender: loaded ${scenarioPages.length} public scenarios`);
  } catch (error) {
    console.warn(`SEO prerender: public scenarios skipped (${error instanceof Error ? error.message : error})`);
  }
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const canonicalUrl = (path) => path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`;

function stripManagedHead(html) {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name="(?:description|keywords|robots|googlebot|yandex)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+|vk:[^"]+)"[^>]*>/gi, '')
    .replace(/\s*<script\s+id="potok-seo-jsonld"[\s\S]*?<\/script>/gi, '');
}

function structuredData(page) {
  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Поток',
    url: `${siteUrl}/`,
    logo: `${siteUrl}/og-image.svg`,
    email: 'mykviz@yandex.ru',
  };
  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: 'Поток',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${siteUrl}/`,
    description: pages[0].description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    publisher: { '@id': `${siteUrl}/#organization` },
  };
  const product = {
    '@type': 'Product',
    '@id': `${siteUrl}/#product`,
    name: 'Поток',
    description: page.description,
    brand: { '@id': `${siteUrl}/#organization` },
    category: 'No-code software',
    url: `${siteUrl}/`,
  };
  const faq = page.faq?.length
    ? {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl(page.path)}#faq`,
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  if (page.kind === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        software,
        product,
        ...(faq ? [faq] : []),
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: `${siteUrl}/`,
          name: 'Поток',
          description: page.description,
          inLanguage: 'ru-RU',
          publisher: { '@id': `${siteUrl}/#organization` },
        },
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      software,
      product,
      {
        '@type': page.kind === 'article' ? 'TechArticle' : page.kind === 'scenario' ? 'CreativeWork' : 'WebPage',
        url: canonicalUrl(page.path),
        name: page.heading,
        description: page.description,
        ...(page.kind === 'article' && { headline: page.heading, author: { '@id': `${siteUrl}/#organization` } }),
        ...(page.kind === 'scenario' && { genre: 'Интерактивный сценарий', isAccessibleForFree: true }),
        inLanguage: 'ru-RU',
        about: { '@id': `${siteUrl}/#software` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Поток', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: page.heading, item: canonicalUrl(page.path) },
        ],
      },
      ...(faq ? [faq] : []),
    ],
  };
}

function buildHead(page) {
  const canonical = canonicalUrl(page.path);
  const ogTitle = page.ogTitle ?? page.title;
  const jsonLd = JSON.stringify(structuredData(page)).replaceAll('<', '\\u003c');
  return `
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta name="googlebot" content="index,follow,max-image-preview:large">
    <meta name="yandex" content="index,follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="twitter:image" content="${ogImage}">
    <script id="potok-seo-jsonld" type="application/ld+json">${jsonLd}</script>`;
}

function fallbackContent(page) {
  const benefits = (page.benefits ?? [])
    .map((benefit) => `<li>${escapeHtml(benefit)}</li>`)
    .join('');
  const useCases = (page.useCases ?? [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const templates = (page.templates ?? [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const faq = (page.faq ?? [])
    .map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`)
    .join('');
  const documentationPage = page.docId ? documentationPages.get(page.docId) : null;
  const documentationContent = documentationPage
    ? documentationPage.blocks.map((block) => {
        const content = Array.isArray(block.content) ? block.content.join(' ') : block.content;
        if (!content || block.type === 'image' || block.type === 'video') return '';
        if (block.type === 'heading') return `<h2>${escapeHtml(content)}</h2>`;
        if (block.type === 'subheading') return `<h3>${escapeHtml(content)}</h3>`;
        if (block.type === 'list') return `<p>${escapeHtml(content)}</p>`;
        if (block.type === 'code') return `<pre>${escapeHtml(content)}</pre>`;
        return `<p>${escapeHtml(content)}</p>`;
      }).join('')
    : '';
  return `<main aria-label="${escapeHtml(page.heading)}" style="max-width:1120px;margin:0 auto;padding:96px 24px;color:#1c1917;background:#f5efe3">
    <p style="font-weight:700;color:#92400e">Поток · конструктор интерактивных сценариев</p>
    <h1 style="max-width:900px;font-size:clamp(40px,7vw,76px);line-height:1.02">${escapeHtml(page.heading)}</h1>
    <p style="max-width:760px;font-size:20px;line-height:1.65">${escapeHtml(page.intro)}</p>
    ${page.audience ? `<p><strong>Подходит:</strong> ${escapeHtml(page.audience)}</p>` : ''}
    ${useCases ? `<h2>Use cases</h2><ul>${useCases}</ul>` : ''}
    ${templates ? `<h2>Шаблоны</h2><ul>${templates}</ul>` : ''}
    ${benefits ? `<h2>Возможности</h2><ul>${benefits}</ul>` : ''}
    ${faq ? `<h2>FAQ</h2>${faq}` : ''}
    ${documentationContent}
    <p><a href="/?authModal=open">Создать сценарий</a> · <a href="/templates/">Шаблоны</a> · <a href="/docs/">Документация</a></p>
  </main>`;
}

function renderPage(template, page) {
  let html = stripManagedHead(template);
  html = html.replace('</head>', `${buildHead(page)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${fallbackContent(page)}</div>`);
  return html;
}

const template = await readFile(join(distDir, 'index.html'), 'utf8');
for (const page of pages) {
  const outputPath = page.path === '/'
    ? join(distDir, 'index.html')
    : join(distDir, page.path.slice(1), 'index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderPage(template, page));
}

const noIndexHead = `
    <title>Поток</title>
    <meta name="robots" content="noindex,nofollow">
    <meta name="googlebot" content="noindex,nofollow">
    <meta name="yandex" content="noindex,nofollow">`;
let fallback = stripManagedHead(template).replace('</head>', `${noIndexHead}\n  </head>`);
await writeFile(join(distDir, '404.html'), fallback);

const today = new Date().toISOString().slice(0, 10);
const legalPages = [
  '/legal/privacy-policy.html',
  '/legal/public-offer.html',
  '/legal/project-rules.html',
];
const urls = [...pages.map((page) => page.path), ...legalPages];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url>\n    <loc>${canonicalUrl(path)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n')}
</urlset>\n`;
await writeFile(join(distDir, 'sitemap.xml'), sitemap);

console.log(`SEO prerender: generated ${pages.length} HTML pages and sitemap.xml`);

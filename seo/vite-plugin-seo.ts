import type { Plugin } from 'vite';
import { editorialCss, guideHtml, guides, overviewHtml, siteOrigin } from './content';

export function seoPlugin(): Plugin {
  return {
    name: 'potok-static-seo',
    transformIndexHtml(html, context) {
      if (context.path !== '/index.html' && context.path !== '/') return html;
      return html.replace('<div id="root"></div>', `<div id="root"><main>${overviewHtml('h1')}</main></div>`)
        .replace('</head>', `<style>${editorialCss}</style></head>`);
    },
    generateBundle() {
      for (const guide of guides) {
        const url = `${siteOrigin}/${guide.slug}.html`;
        this.emitFile({ type: 'asset', fileName: `${guide.slug}.html`, source: `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${guide.title} — Поток</title><meta name="description" content="${guide.description}"><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:type" content="article"><meta property="og:title" content="${guide.title} — Поток"><meta property="og:description" content="${guide.description}"><style>body{margin:0;background:#f3f3ef;color:#292524}${editorialCss}</style></head><body>${guideHtml(guide)}</body></html>` });
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...guides.map((guide) => `/${guide.slug}.html`)].map((path) => `<url><loc>${siteOrigin}${path}</loc></url>`).join('')}</urlset>\n` });
    },
  };
}

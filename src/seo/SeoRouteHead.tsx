import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import {
  buildStructuredData,
  canonicalUrl,
  DEFAULT_OG_IMAGE,
  getSeoPage,
} from './seoCatalog';

const JSON_LD_ID = 'potok-seo-jsonld';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
}

export function applySeoMetadata(page: ReturnType<typeof getSeoPage>) {
  if (!page) return;
  const canonical = canonicalUrl(page.path);
  document.title = page.title;
  upsertCanonical(canonical);
  upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index,follow,max-image-preview:large' });
  upsertMeta('meta[name="googlebot"]', { name: 'googlebot', content: 'index,follow,max-image-preview:large' });
  upsertMeta('meta[name="yandex"]', { name: 'yandex', content: 'index,follow' });
  upsertMeta('meta[name="description"]', { name: 'description', content: page.description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'ru_RU' });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: page.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: page.description });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_OG_IMAGE });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_OG_IMAGE });

  const existingJsonLd = document.getElementById(JSON_LD_ID);
  const jsonLd = existingJsonLd ?? document.createElement('script');
  jsonLd.id = JSON_LD_ID;
  jsonLd.setAttribute('type', 'application/ld+json');
  jsonLd.textContent = JSON.stringify(buildStructuredData(page));
  if (!jsonLd.parentNode) document.head.appendChild(jsonLd);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

export default function SeoRouteHead() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const staticPage = getSeoPage(pathname);
    const page = staticPage ?? (pathname.match(/^\/scenarios\/([0-9a-f-]{36})\/?$/i)
      ? {
          path: `${pathname.replace(/\/+$/, '')}/`,
          kind: 'scenario' as const,
          title: 'Интерактивный сценарий — Поток',
          description: 'Публичный интерактивный сценарий, созданный в визуальном конструкторе Поток.',
          heading: 'Интерактивный сценарий',
          intro: 'Откройте описание и запустите прохождение сценария.',
        }
      : undefined);
    const robots = page ? 'index,follow,max-image-preview:large' : 'noindex,nofollow';

    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMeta('meta[name="googlebot"]', { name: 'googlebot', content: robots });
    upsertMeta('meta[name="yandex"]', { name: 'yandex', content: robots });

    const existingJsonLd = document.getElementById(JSON_LD_ID);
    if (!page) {
      document.title = 'Поток';
      existingJsonLd?.remove();
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }

    applySeoMetadata(page);
  }, [pathname]);

  return null;
}

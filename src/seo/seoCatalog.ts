import rawPages from './seoPages.json';
import rawDocPages from './docSeoPages.json';

export interface SeoPage {
  path: string;
  kind: 'home' | 'solution' | 'page' | 'article' | 'scenario';
  slug?: string;
  eyebrow?: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  audience?: string;
  benefits?: string[];
}

export const SITE_URL = 'https://mykviz.ru';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;
const docPages: SeoPage[] = rawDocPages.map((page) => ({
  path: `/docs/${page.id}/`,
  kind: 'article',
  title: `${page.title} — документация Поток`,
  description: page.description,
  heading: page.title,
  intro: page.description,
}));

export const seoPages = [...(rawPages as SeoPage[]), ...docPages];
export const solutionPages = seoPages.filter(
  (page): page is SeoPage & { kind: 'solution'; slug: string } =>
    page.kind === 'solution' && Boolean(page.slug),
);

export function normalizeSeoPath(pathname: string): string {
  if (pathname === '/') return '/';
  return `${pathname.replace(/\/+$/, '')}/`;
}

export function getSeoPage(pathname: string): SeoPage | undefined {
  const normalized = normalizeSeoPath(pathname);
  return seoPages.find((page) => page.path === normalized);
}

export function getSolutionPage(slug: string): SeoPage | undefined {
  return solutionPages.find((page) => page.slug === slug);
}

export function canonicalUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalizeSeoPath(path)}`;
}

export function buildStructuredData(page: SeoPage): Record<string, unknown> {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Поток',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/og-image.svg`,
    email: 'mykviz@yandex.ru',
  };
  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: 'Поток',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Конструктор интерактивных сценариев',
    operatingSystem: 'Web',
    url: `${SITE_URL}/`,
    description: seoPages[0].description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      description: 'Бесплатный план для создания первых сценариев',
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  if (page.kind === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        software,
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: 'Поток',
          description: page.description,
          publisher: { '@id': `${SITE_URL}/#organization` },
          inLanguage: 'ru-RU',
        },
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': page.kind === 'article' ? 'TechArticle' : page.kind === 'scenario' ? 'CreativeWork' : 'WebPage',
        '@id': `${canonicalUrl(page.path)}#webpage`,
        url: canonicalUrl(page.path),
        name: page.heading,
        description: page.description,
        ...(page.kind === 'article' && { headline: page.heading, author: { '@id': `${SITE_URL}/#organization` } }),
        ...(page.kind === 'scenario' && { genre: 'Интерактивный сценарий', isAccessibleForFree: true }),
        inLanguage: 'ru-RU',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#software` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Поток',
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: page.heading,
            item: canonicalUrl(page.path),
          },
        ],
      },
    ],
  };
}

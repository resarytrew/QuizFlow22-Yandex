import { query } from '../_shared/db';

const ORIGIN = 'https://mykviz.ru';
const PAGE_SIZE = 24;
const SITEMAP_SIZE = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Older databases lack moderation_status. Unknown/pending values fail closed.
export const PUBLIC_ONLY = `q.visibility = 'public' AND q.deleted_at IS NULL
  AND COALESCE(to_jsonb(q)->>'moderation_status', 'approved') = 'approved'`;
const SUMMARY = `q.id, q.name, q.updated_at,
  q.quiz_data->>'description' AS description, q.quiz_data->'keywords' AS keywords`;
type Summary = { id: string; name?: string; description?: string; keywords?: unknown; updated_at?: string | Date };
type Event = { httpMethod?: string; path?: string; rawPath?: string; pathParameters?: Record<string, string>; params?: { path?: Record<string, string> } };
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const plain = (value: unknown, limit: number) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
const titleOf = (q: Summary) => plain(q.name, 200) || 'Квиз без названия';
const descriptionOf = (q: Summary) => plain(q.description, 3000) || `Пройдите интерактивный квиз «${titleOf(q)}» на платформе Поток.`;
const quizPath = (id: string) => `/quizzes/${id}.html`;
const catalogPath = (page: number) => page === 1 ? '/quizzes/index.html' : `/quizzes/page-${page}.html`;

function response(statusCode: number, body: string, mime = 'text/html; charset=utf-8', extra: Record<string, string> = {}): {statusCode: number; headers: Record<string, string>; body: string; isBase64Encoded: boolean} {
  return { statusCode, headers: {
    'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    ...(statusCode >= 400 ? { 'X-Robots-Tag': 'noindex' } : {}), ...extra,
  }, body, isBase64Encoded: false };
}
function html(title: string, description: string, path: string, content: string) {
  const url = escape(ORIGIN + path);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Поток</title><meta name="description" content="${escape(description.slice(0, 240))}"><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description.slice(0, 240))}"><meta property="og:type" content="website"><meta property="og:site_name" content="Поток"><style>body{margin:0;background:#f3f3ef;color:#292524;font:18px/1.7 system-ui,sans-serif}main{max-width:900px;padding:40px 24px;margin:auto}h1{font-size:clamp(28px,5vw,44px);line-height:1.2}h2{font-size:24px;line-height:1.3}a{color:inherit;text-underline-offset:4px}article{border-bottom:1px solid #d6d3d1;padding:20px 0}p{white-space:pre-line;overflow-wrap:anywhere}.start{display:inline-block;background:#292524;color:white;padding:12px 24px;border-radius:8px;text-decoration:none}nav{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}</style></head><body><main><nav aria-label="Навигация"><a href="${ORIGIN}/">Поток</a><a href="${ORIGIN}/quizzes/">Публичные квизы</a></nav><h1>${escape(title)}</h1>${content}</main></body></html>`;
}
function xml(kind: 'urlset' | 'sitemapindex', body: string) {
  return response(200, `<?xml version="1.0" encoding="UTF-8"?><${kind} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</${kind}>`, 'application/xml; charset=utf-8');
}
function urlEntry(path: string, updated?: string | Date) {
  const date = updated ? new Date(updated) : null;
  const lastmod = date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : '';
  return `<url><loc>${ORIGIN}${path}</loc>${lastmod}</url>`;
}
function missing() { return response(404, html('Квиз не найден', 'Эта страница недоступна.', '/quizzes/index.html', '<p>Квиз недоступен или снят с публикации. Выберите другой проект в каталоге.</p>')); }
async function serve(event: Event) {
  const suffix = event.pathParameters?.path || event.pathParameters?.['path+'] || event.params?.path?.path || event.params?.path?.['path+'];
  const path = (suffix ? `/quizzes/${suffix}` : event.rawPath || event.path || '').split('?')[0];
  if (path === '/quizzes' || path === '/quizzes/') return response(301, '', 'text/plain', { Location: `${ORIGIN}/quizzes/index.html` });
  const detail = /^\/quizzes\/([^/]+)\.html$/.exec(path);
  if (detail && UUID.test(detail[1])) {
    const [quiz] = await query<Summary>(`SELECT ${SUMMARY} FROM public.quizzes q WHERE ${PUBLIC_ONLY} AND q.id = $1`, [detail[1]]);
    if (!quiz) return missing();
    const title = titleOf(quiz), description = descriptionOf(quiz);
    const keywords = Array.isArray(quiz.keywords) ? quiz.keywords.filter((v) => typeof v === 'string').slice(0, 12).map((v) => plain(v, 80)).filter(Boolean) : [];
    return response(200, html(title, description, quizPath(quiz.id), `<p>${escape(description)}</p>${keywords.length ? `<p>Темы: ${keywords.map(escape).join(', ')}</p>` : ''}<p><a class="start" href="${ORIGIN}/#/play/${quiz.id}">Пройти квиз</a></p><p>Интерактивный квиз опубликован в общем доступе. Для прохождения откройте его в браузере с включённым JavaScript.</p>`));
  }
  const pageMatch = /^\/quizzes\/page-([1-9]\d*)\.html$/.exec(path);
  const shardMatch = /^\/quizzes\/sitemap-([1-9]\d*)\.xml$/.exec(path);
  if (path !== '/quizzes/index.html' && path !== '/quizzes/sitemap.xml' && path !== '/quizzes/catalog-sitemap.xml' && !pageMatch && !shardMatch) return missing();
  const [{ count }] = await query<{ count: string }>(`SELECT count(*)::text AS count FROM public.quizzes q WHERE ${PUBLIC_ONLY}`);
  const total = Number(count), pages = Math.max(1, Math.ceil(total / PAGE_SIZE)), shards = Math.ceil(total / SITEMAP_SIZE);
  if (!Number.isSafeInteger(total) || total < 0 || pages > 50000) throw new Error('Unsupported catalog size');
  if (path === '/quizzes/sitemap.xml') return xml('sitemapindex', ['catalog-sitemap.xml', ...Array.from({ length: shards }, (_, i) => `sitemap-${i + 1}.xml`)].map((file) => `<sitemap><loc>${ORIGIN}/quizzes/${file}</loc></sitemap>`).join(''));
  if (path === '/quizzes/catalog-sitemap.xml') return xml('urlset', Array.from({ length: pages }, (_, i) => urlEntry(catalogPath(i + 1))).join(''));
  if (shardMatch) {
    const shard = Number(shardMatch[1]);
    if (!Number.isSafeInteger(shard) || shard > shards) return missing();
    const rows = await query<Summary>(`SELECT q.id, q.updated_at FROM public.quizzes q WHERE ${PUBLIC_ONLY} ORDER BY q.id LIMIT $1 OFFSET $2`, [SITEMAP_SIZE, (shard - 1) * SITEMAP_SIZE]);
    return xml('urlset', rows.map((q) => urlEntry(quizPath(q.id), q.updated_at)).join(''));
  }
  const page = pageMatch ? Number(pageMatch[1]) : 1;
  if (!Number.isSafeInteger(page) || page > pages) return missing();
  if (pageMatch && page === 1) return response(301, '', 'text/plain', { Location: `${ORIGIN}/quizzes/index.html` });
  const rows = await query<Summary>(`SELECT ${SUMMARY} FROM public.quizzes q WHERE ${PUBLIC_ONLY} ORDER BY q.id LIMIT $1 OFFSET $2`, [PAGE_SIZE, (page - 1) * PAGE_SIZE]);
  const title = `Публичные квизы и викторины${page > 1 ? ` — страница ${page}` : ''}`;
  const content = `<p>Выберите опубликованный квиз, познакомьтесь с описанием и перейдите к прохождению.</p>${rows.length ? rows.map((q) => `<article><h2><a href="${ORIGIN}${quizPath(q.id)}">${escape(titleOf(q))}</a></h2><p>${escape(descriptionOf(q).slice(0, 360))}</p></article>`).join('') : '<p>Публичных квизов пока нет.</p>'}<nav aria-label="Страницы каталога">${page > 1 ? `<a href="${ORIGIN}${catalogPath(page - 1)}">Предыдущая страница</a>` : ''}${page < pages ? `<a href="${ORIGIN}${catalogPath(page + 1)}">Следующая страница</a>` : ''}</nav>`;
  return response(200, html(title, 'Общедоступные квизы, тесты и викторины на платформе Поток. Выберите тему и пройдите квиз онлайн.', catalogPath(page), content));
}
export async function handler(event: Event) {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') return response(405, '', 'text/plain', { Allow: 'GET, HEAD' });
  try {
    const result = await serve(event);
    return event.httpMethod === 'HEAD' ? { ...result, body: '' } : result;
  } catch {
    // DB failure must never serve stale private data or an empty successful map.
    return response(503, event.httpMethod === 'HEAD' ? '' : 'Сервис временно недоступен', 'text/plain; charset=utf-8', { 'Retry-After': '300' });
  }
}

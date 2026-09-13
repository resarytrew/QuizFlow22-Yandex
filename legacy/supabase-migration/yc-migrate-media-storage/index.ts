import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type SourceRow = { source: 'quiz_data' | 'cover_image_url' | 'results_data'; id: string; value: unknown };

const targetBucket = process.env.S3_BUCKET || 'quizflow22-prod';
const targetBase = (process.env.YANDEX_MEDIA_PUBLIC_BASE || `https://storage.yandexcloud.net/${targetBucket}`).replace(/\/$/, '');
const sourceOrigin = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const sourceHost = sourceOrigin ? new URL(sourceOrigin).host : '';
const urlPattern = sourceHost
  ? new RegExp(`https://${sourceHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/storage/v1/(?:object|render/image)/(?:public|sign|authenticated)/[^"'\\s)]+`, 'g')
  : null;

function ssl() {
  return process.env.PG_CA_CERT ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT } : { rejectUnauthorized: false };
}

function extract(value: unknown, urls = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (!urlPattern) return urls;
    for (const match of value.matchAll(urlPattern)) urls.add(match[0].replace(/[),.;]+$/, ''));
  } else if (Array.isArray(value)) value.forEach((item) => extract(item, urls));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => extract(item, urls));
  return urls;
}

function replaceDeep(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const [from, to] of replacements) result = result.split(from).join(to);
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => replaceDeep(item, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceDeep(item, replacements)]));
  return value;
}

function targetKey(url: string): string {
  const parsed = new URL(url);
  const basename = decodeURIComponent(parsed.pathname.split('/').pop() || 'asset').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'asset';
  return `migrated/media/${createHash('sha256').update(url.split('?')[0]).digest('hex').slice(0, 32)}/${basename}`;
}

async function exists(s3: S3Client, key: string): Promise<boolean> {
  try { await s3.send(new HeadObjectCommand({ Bucket: targetBucket, Key: key })); return true; }
  catch (error: any) { if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false; throw error; }
}

function missingAssetFallback(url: string): string {
  return /\.(png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(url) ? 'https://mykviz.ru/og-image.svg' : '';
}

async function copy(s3: S3Client, url: string): Promise<{ url: string; missing: boolean }> {
  const key = targetKey(url);
  if (!await exists(s3, key)) {
    const headers: Record<string, string> = {};
    if (process.env.SUPABASE_ANON_KEY) headers.apikey = process.env.SUPABASE_ANON_KEY;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) {
      const body = await response.text();
      if ((response.status === 400 || response.status === 404) && /NoSuchKey|Object not found/i.test(body)) {
        return { url: missingAssetFallback(url), missing: true };
      }
      throw new Error(`source returned HTTP ${response.status}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > 50 * 1024 * 1024) throw new Error('asset exceeds 50 MB migration limit');
    await s3.send(new PutObjectCommand({
      Bucket: targetBucket, Key: key, Body: body,
      ContentType: response.headers.get('content-type') || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { source: 'legacy-media', sha256: createHash('sha256').update(body).digest('hex') },
    }));
  }
  return { url: `${targetBase}/${key.split('/').map(encodeURIComponent).join('/')}`, missing: false };
}

async function sourceRows(client: Client): Promise<SourceRow[]> {
  const pattern = `%${sourceHost}/storage/v1/%`;
  const result = await client.query<SourceRow>(`
    (SELECT 'quiz_data'::text AS source, id::text, quiz_data AS value
       FROM public.quizzes WHERE quiz_data::text LIKE $1 ORDER BY id LIMIT 15)
    UNION ALL
    (SELECT 'cover_image_url'::text AS source, id::text, to_jsonb(cover_image_url) AS value
       FROM public.quizzes WHERE COALESCE(cover_image_url, '') LIKE $1 ORDER BY id LIMIT 15)
    UNION ALL
    (SELECT 'results_data'::text AS source, id::text, results_data AS value
       FROM public.quiz_results WHERE results_data::text LIKE $1 ORDER BY id LIMIT 15)`, [pattern]);
  return result.rows;
}

export async function handler() {
  if (!sourceHost) return { statusCode: 500, body: JSON.stringify({ error: 'Source storage origin is not configured' }) };
  const client = new Client({ host: process.env.PG_HOST, port: Number(process.env.PG_PORT || 6432), database: process.env.PG_DATABASE, user: process.env.PG_USER, password: process.env.PG_PASSWORD, ssl: ssl(), connectionTimeoutMillis: 15_000 });
  const s3 = new S3Client({ region: 'ru-central1', endpoint: 'https://storage.yandexcloud.net', credentials: { accessKeyId: process.env.YC_ACCESS_KEY_ID || '', secretAccessKey: process.env.YC_SECRET_ACCESS_KEY || '' } });
  await client.connect();
  const report = { processed: 0, copied: 0, missing: 0, remaining: 0, failed: [] as Array<{ source: string; id: string; reason: string }> };
  try {
    const rows = await sourceRows(client);
    for (const row of rows) {
      try {
        const replacements = new Map<string, string>();
        for (const url of extract(row.value)) {
          try {
            const migrated = await copy(s3, url);
            replacements.set(url, migrated.url);
            if (migrated.missing) report.missing += 1;
            else report.copied += 1;
          } catch (error) {
            const safeSource = url.split('?')[0].slice(0, 500);
            throw new Error(`${safeSource}: ${error instanceof Error ? error.message : 'copy failed'}`);
          }
        }
        if (!replacements.size) throw new Error('no supported storage URL found');
        const next = replaceDeep(row.value, replacements);
        if (row.source === 'quiz_data') await client.query('UPDATE public.quizzes SET quiz_data = $2::jsonb, updated_at = now() WHERE id = $1', [row.id, JSON.stringify(next)]);
        if (row.source === 'cover_image_url') await client.query('UPDATE public.quizzes SET cover_image_url = $2, updated_at = now() WHERE id = $1', [row.id, next]);
        if (row.source === 'results_data') await client.query('UPDATE public.quiz_results SET results_data = $2::jsonb WHERE id = $1', [row.id, JSON.stringify(next)]);
        report.processed += 1;
      } catch (error) {
        report.failed.push({ source: row.source, id: row.id, reason: error instanceof Error ? error.message : 'unknown error' });
      }
    }
    const remaining = await client.query<{ count: string }>(`SELECT
      (SELECT count(*) FROM public.quizzes WHERE quiz_data::text LIKE $1 OR COALESCE(cover_image_url, '') LIKE $1)
      + (SELECT count(*) FROM public.quiz_results WHERE results_data::text LIKE $1) AS count`, [`%${sourceHost}/storage/v1/%`]);
    report.remaining = Number(remaining.rows[0]?.count || 0);
    return { statusCode: report.failed.length ? 207 : 200, body: JSON.stringify(report) };
  } finally { await client.end(); }
}

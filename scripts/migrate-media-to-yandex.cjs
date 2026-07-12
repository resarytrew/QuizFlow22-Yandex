const crypto = require('crypto');
const { Client } = require('../yc-functions/node_modules/pg');
const {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('../yc-functions/node_modules/@aws-sdk/client-s3');

const SUPABASE_URL = trimSlash(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'quiz-assets';
const TARGET_BUCKET = process.env.S3_BUCKET || process.env.YC_BUCKET || 'quizflow22-prod';
const TARGET_PREFIX = cleanPrefix(process.env.YANDEX_MEDIA_PREFIX || '');
const TARGET_PUBLIC_BASE = trimSlash(
  process.env.YANDEX_MEDIA_PUBLIC_BASE ||
  `https://storage.yandexcloud.net/${TARGET_BUCKET}`,
);
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const LIMIT = Number(process.env.MEDIA_MIGRATION_LIMIT || 0);

if (!SUPABASE_URL) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required');
if (!process.env.YC_ACCESS_KEY_ID || !process.env.YC_SECRET_ACCESS_KEY) {
  throw new Error('YC_ACCESS_KEY_ID and YC_SECRET_ACCESS_KEY are required');
}

const pg = new Client(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: postgresSsl(),
      }
    : {
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT || 6432),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        ssl: postgresSsl(),
      },
);

const s3 = new S3Client({
  region: process.env.YC_REGION || 'ru-central1',
  endpoint: process.env.YC_S3_ENDPOINT || 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YC_ACCESS_KEY_ID,
    secretAccessKey: process.env.YC_SECRET_ACCESS_KEY,
  },
});

const supabaseHost = new URL(SUPABASE_URL).host;
const storageUrlPattern = new RegExp(
  `https://${escapeRegExp(supabaseHost)}/storage/v1/(?:object|render/image)/(?:public|sign|authenticated)/([^"'\\s)]+)`,
  'g',
);

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function cleanPrefix(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function postgresSsl() {
  if (process.env.PGSSLMODE === 'disable') return false;
  if (process.env.PG_CA_CERT) {
    return { ca: process.env.PG_CA_CERT, rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeObjectPath(rawPath) {
  const withoutQuery = rawPath.split('?')[0];
  const decoded = decodeURIComponent(withoutQuery);
  const parts = decoded.split('/').filter(Boolean);
  const bucket = parts.shift();
  if (!bucket) return null;
  return {
    bucket,
    path: parts.join('/'),
  };
}

function isSupabaseStorageUrl(value) {
  return typeof value === 'string' && value.includes(`${supabaseHost}/storage/v1/`);
}

function extractStorageUrls(value, found = new Set()) {
  if (!value) return found;

  if (typeof value === 'string') {
    storageUrlPattern.lastIndex = 0;
    let match;
    while ((match = storageUrlPattern.exec(value))) {
      const url = match[0].replace(/[),.;]+$/, '');
      const object = normalizeObjectPath(match[1]);
      if (object?.path && object.bucket === SUPABASE_BUCKET) found.add(url);
    }
    return found;
  }

  if (Array.isArray(value)) {
    for (const item of value) extractStorageUrls(item, found);
    return found;
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value)) extractStorageUrls(item, found);
  }

  return found;
}

function mapToYandexKey(url) {
  storageUrlPattern.lastIndex = 0;
  const match = storageUrlPattern.exec(url);
  if (!match) return null;

  const object = normalizeObjectPath(match[1]);
  if (!object?.path || object.bucket !== SUPABASE_BUCKET) return null;

  const safePath = object.path
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[\u0000-\u001f\u007f]/g, '').trim())
    .filter(Boolean)
    .join('/');

  if (!safePath) return null;
  return TARGET_PREFIX ? `${TARGET_PREFIX}/${safePath}` : safePath;
}

function publicYandexUrl(key) {
  return `${TARGET_PUBLIC_BASE}/${encodeURI(key).replace(/%2F/g, '/')}`;
}

function replaceUrlsDeep(value, replacements) {
  if (!value) return value;
  if (typeof value === 'string') {
    let next = value;
    for (const [from, to] of replacements.entries()) next = next.split(from).join(to);
    return next;
  }
  if (Array.isArray(value)) return value.map((item) => replaceUrlsDeep(item, replacements));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceUrlsDeep(item, replacements)]),
    );
  }
  return value;
}

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: TARGET_BUCKET, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
}

function filenameContentType(url, fallback = 'application/octet-stream') {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return fallback;
}

async function downloadSupabaseObject(url) {
  const headers = {};
  if (SUPABASE_SERVICE_ROLE_KEY) {
    headers.apikey = SUPABASE_SERVICE_ROLE_KEY;
    headers.authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`download failed ${response.status} for ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    bytes,
    contentType: response.headers.get('content-type') || filenameContentType(url),
  };
}

async function uploadToYandex(url, key) {
  if (await objectExists(key)) return { skipped: true };

  const { bytes, contentType } = await downloadSupabaseObject(url);
  const checksum = crypto.createHash('sha256').update(bytes).digest('hex');

  if (!DRY_RUN) {
    await s3.send(new PutObjectCommand({
      Bucket: TARGET_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType || filenameContentType(url),
      Metadata: {
        source: 'supabase-storage',
        sha256: checksum,
      },
    }));
  }

  return { skipped: false, bytes: bytes.length, checksum };
}

async function getQuizColumns() {
  const { rows } = await pg.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'quizzes'`,
  );
  return new Set(rows.map((row) => row.column_name));
}

async function fetchQuizzes(columns) {
  const limitSql = LIMIT > 0 ? ` limit ${LIMIT}` : '';
  const hasCoverImageUrl = columns.has('cover_image_url');
  const hasUpdatedAt = columns.has('updated_at');
  const selectCover = hasCoverImageUrl ? 'cover_image_url' : `null::text as cover_image_url`;
  const coverWhere = hasCoverImageUrl ? `or coalesce(cover_image_url, '') like $1` : '';
  const orderBy = hasUpdatedAt
    ? 'updated_at desc nulls last, created_at desc'
    : 'created_at desc';

  const { rows } = await pg.query(
    `select id, quiz_data, ${selectCover}
       from public.quizzes
      where quiz_data::text like $1
         ${coverWhere}
      order by ${orderBy}${limitSql}`,
    [`%${supabaseHost}/storage/v1/%`],
  );
  return rows;
}

async function migrate() {
  await pg.connect();
  const report = {
    dryRun: DRY_RUN,
    targetBucket: TARGET_BUCKET,
    targetPrefix: TARGET_PREFIX,
    scannedQuizzes: 0,
    changedQuizzes: 0,
    urlsFound: 0,
    uploaded: 0,
    alreadyUploaded: 0,
    failed: [],
  };

  try {
    const quizColumns = await getQuizColumns();
    const hasCoverImageUrl = quizColumns.has('cover_image_url');
    const hasUpdatedAt = quizColumns.has('updated_at');
    const quizzes = await fetchQuizzes(quizColumns);
    report.scannedQuizzes = quizzes.length;

    for (const quiz of quizzes) {
      const urls = extractStorageUrls({
        quiz_data: quiz.quiz_data,
        cover_image_url: quiz.cover_image_url,
      });
      report.urlsFound += urls.size;
      if (urls.size === 0) continue;

      const replacements = new Map();
      for (const url of urls) {
        const key = mapToYandexKey(url);
        if (!key) continue;

        try {
          const result = await uploadToYandex(url, key);
          replacements.set(url, publicYandexUrl(key));
          if (result.skipped) {
            report.alreadyUploaded += 1;
            console.log(`exists ${key}`);
          } else {
            report.uploaded += 1;
            console.log(`${DRY_RUN ? 'would upload' : 'uploaded'} ${key}`);
          }
        } catch (error) {
          report.failed.push({ quizId: quiz.id, url, error: error.message });
          console.error(`failed ${url}: ${error.message}`);
        }
      }

      if (replacements.size === 0) continue;

      const nextQuizData = replaceUrlsDeep(quiz.quiz_data, replacements);
      const nextCover = isSupabaseStorageUrl(quiz.cover_image_url)
        ? replaceUrlsDeep(quiz.cover_image_url, replacements)
        : quiz.cover_image_url;

      const quizChanged =
        JSON.stringify(nextQuizData) !== JSON.stringify(quiz.quiz_data) ||
        nextCover !== quiz.cover_image_url;

      if (!quizChanged) continue;
      report.changedQuizzes += 1;

      if (!DRY_RUN) {
        const setParts = ['quiz_data = $2::jsonb'];
        const values = [quiz.id, JSON.stringify(nextQuizData)];
        if (hasCoverImageUrl) {
          values.push(nextCover);
          setParts.push(`cover_image_url = $${values.length}`);
        }
        if (hasUpdatedAt) setParts.push('updated_at = now()');

        await pg.query(
          `update public.quizzes
              set ${setParts.join(', ')}
            where id = $1`,
          values,
        );
      }
      console.log(`${DRY_RUN ? 'would update' : 'updated'} quiz ${quiz.id}`);
    }
  } finally {
    await pg.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});

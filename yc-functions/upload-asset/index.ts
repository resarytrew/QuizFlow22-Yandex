import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAuth, ensureUser } from '../_shared/auth';
import { corsHeaders, handleCors } from '../_shared/cors';

const s3 = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YC_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
  },
});

const configuredBucket = process.env.S3_BUCKET?.trim();
const BUCKET = !configuredBucket || configuredBucket === 'potok-quiz-assets'
  ? 'quizflow22-prod'
  : configuredBucket;
const PUBLIC_BASE_URL = (process.env.YANDEX_MEDIA_PUBLIC_BASE || `https://storage.yandexcloud.net/${BUCKET}`).replace(/\/+$/, '');

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;

  if (httpMethod === 'OPTIONS') return handleCors(event);

  if (httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  try {
    const user = await verifyAuth(headers.authorization);
    if (!user) return unauthorized();

    await ensureUser(user.id, user.email);

    const parsed = JSON.parse(body || '{}');
    const action = parsed.action || 'upload-url';

    switch (action) {
      case 'upload-url':
        return await createUploadUrl(user.id, parsed.filename, parsed.contentType);
      case 'list':
        return await listAssets(user.id, parsed.path || '');
      case 'delete':
        return await deleteAsset(user.id, parsed.key);
      case 'move':
        return await moveAsset(user.id, parsed.sourceKey, parsed.targetPath || '');
      case 'create-folder':
        return await createFolder(user.id, parsed.path || '');
      default:
        return badRequest('unknown action');
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

function sanitizeSegment(value: string): string {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).join('/');
}

function ensureUserKey(userId: string, key: string): string | null {
  const normalized = sanitizeSegment(key);
  return normalized.startsWith(`${userId}/`) ? normalized : null;
}

function publicUrl(key: string): string {
  return `${PUBLIC_BASE_URL}/${encodeURI(key).replace(/%2F/g, '/')}`;
}

function detectType(key: string, contentType?: string): 'image' | 'audio' {
  const lower = key.toLowerCase();
  if (contentType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(lower)) return 'audio';
  return 'image';
}

async function createUploadUrl(userId: string, filename: string, contentType?: string) {
  if (!filename) return badRequest('filename is required');

  const normalizedFilename = sanitizeSegment(filename);
  const parts = normalizedFilename.split('/').filter(Boolean);
  const cleanFilename = parts.pop();
  if (!cleanFilename) return badRequest('filename is required');

  const folderPath = parts.join('/');
  const key = folderPath
    ? `${userId}/${folderPath}/${Date.now()}_${cleanFilename}`
    : `${userId}/${Date.now()}_${cleanFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return ok({
    uploadUrl: signedUrl,
    publicUrl: publicUrl(key),
    key,
  });
}

async function listAssets(userId: string, path: string) {
  const normalizedPath = sanitizeSegment(path);
  const prefix = normalizedPath ? `${userId}/${normalizedPath}/` : `${userId}/`;
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    MaxKeys: 1000,
  }));

  const assets = (res.Contents ?? [])
    .filter((item) => item.Key && !item.Key.endsWith('/.folder') && item.Size !== 0)
    .map((item) => {
      const key = item.Key!;
      const relative = key.slice(`${userId}/`.length);
      const parts = relative.split('/');
      return {
        name: parts[parts.length - 1],
        key,
        url: publicUrl(key),
        type: detectType(key),
        created_at: item.LastModified?.toISOString() ?? '',
        folder: parts.slice(0, -1).join('/'),
      };
    });

  return ok({ assets });
}

async function deleteAsset(userId: string, key: string) {
  const normalized = ensureUserKey(userId, key);
  if (!normalized) return badRequest('invalid key');
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: normalized }));
  return ok({ deleted: true });
}

async function moveAsset(userId: string, sourceKey: string, targetPath: string) {
  const normalizedSource = ensureUserKey(userId, sourceKey);
  if (!normalizedSource) return badRequest('invalid sourceKey');
  const filename = normalizedSource.split('/').pop();
  if (!filename) return badRequest('invalid sourceKey');
  const normalizedTargetPath = sanitizeSegment(targetPath);
  const targetKey = normalizedTargetPath
    ? `${userId}/${normalizedTargetPath}/${filename}`
    : `${userId}/${filename}`;

  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${encodeURIComponent(normalizedSource).replace(/%2F/g, '/')}`,
    Key: targetKey,
  }));
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: normalizedSource }));

  return ok({
    moved: true,
    asset: {
      name: filename,
      key: targetKey,
      url: publicUrl(targetKey),
      type: detectType(targetKey),
      created_at: new Date().toISOString(),
      folder: normalizedTargetPath,
    },
  });
}

async function createFolder(userId: string, path: string) {
  const normalized = sanitizeSegment(path);
  if (!normalized) return badRequest('path is required');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${userId}/${normalized}/.folder`,
    Body: '',
    ContentType: 'text/plain',
  }));
  return ok({ created: true });
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return { statusCode: 401, headers: corsHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) };
}

function badRequest(message: string) {
  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: message }) };
}

# Миграция с Supabase на Yandex Cloud — Полная инструкция

## Что переносим и куда

| СЕЙЧАС (Supabase) | → | ПОСЛЕ (Yandex Cloud) |
|---|---|---|
| PostgreSQL (managed) | → | Yandex Managed PostgreSQL |
| Supabase Storage (S3) | → | Yandex Object Storage |
| Edge Functions (Deno) | → | Yandex Cloud Functions (Node.js/Go) или Yandex Serverless Containers |
| Row Level Security (RLS) | → | Middleware авторизации в Cloud Functions |
| Realtime (websockets) | → | Yandex Message Queue + WebSocket API |
| pg_cron (cron задачи) | → | Yandex Cloud Functions + Trigger по таймеру |

## ОСТАЁТСЯ НА SUPABASE

**Supabase Auth** (регистрация, логин, OAuth, MFA)

Почему оставить Auth на Supabase:

Supabase Auth — это полноценный identity provider:
- Email/password с OTP
- OAuth (Яндекс, Google)
- MFA (TOTP)
- PKCE flow
- JWT токены
- Session management

Переписывать это с нуля на Yandex Cloud — месяцы работы. Supabase Auth можно использовать как standalone сервис — он выдаёт JWT, который backend верифицирует.

---

## Этап 0. Подготовка инфраструктуры Yandex Cloud

### 0.1 Создать каталог (folder)

```bash
yc resource-manager folder create \
  --name potok-prod \
  --description "Поток production environment"
```

### 0.2 Создать сервисные аккаунты

```bash
# Для Cloud Functions
yc iam service-account create \
  --name potok-functions \
  --description "Service account for Cloud Functions"

# Для Object Storage
yc iam service-account create \
  --name potok-storage \
  --description "Service account for Object Storage"

# Для Managed PostgreSQL
yc iam service-account create \
  --name potok-db \
  --description "Service account for database access"
```

### 0.3 Назначить роли

```bash
# Functions — вызов функций и доступ к секретам
yc resource-manager folder add-access-binding potok-prod \
  --role functions.functionInvoker \
  --service-account-name potok-functions

yc resource-manager folder add-access-binding potok-prod \
  --role lockbox.payloadViewer \
  --service-account-name potok-functions

# Storage — чтение и запись
yc resource-manager folder add-access-binding potok-prod \
  --role storage.editor \
  --service-account-name potok-storage
```

### 0.4 Создать VPC сеть

```bash
yc vpc network create --name potok-net

yc vpc subnet create \
  --name potok-subnet-a \
  --zone ru-central1-a \
  --network-name potok-net \
  --range 10.1.0.0/24

yc vpc subnet create \
  --name potok-subnet-b \
  --zone ru-central1-b \
  --network-name potok-net \
  --range 10.2.0.0/24
```

---

## Этап 1. Перенос базы данных

### 1.1 Создать Yandex Managed PostgreSQL

```bash
yc managed-postgresql cluster create \
  --name potok-db \
  --environment production \
  --network-name potok-net \
  --host zone-id=ru-central1-a,subnet-name=potok-subnet-a \
  --host zone-id=ru-central1-b,subnet-name=potok-subnet-b \
  --resource-preset s2.micro \
  --disk-type network-ssd \
  --disk-size 20 \
  --postgresql-version 16 \
  --user name=potok_app,password=<STRONG_PASSWORD> \
  --database name=potok,owner=potok_app
```

**Конфигурация:**

| Параметр | Значение |
|---|---|
| Версия PostgreSQL | 16 (совместимо с Supabase) |
| Ресурсы | s2.micro (2 vCPU, 8 GB RAM) |
| Диск | 20 GB SSD (расширяемый) |
| Зоны | 2 (ru-central1-a + ru-central1-b) — HA |

### 1.2 Экспортировать данные из Supabase

```bash
# Подключиться к Supabase и сделать дамп
pg_dump \
  --host=db.<ref>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-owner \
  --no-acl \
  --schema=public \
  --format=custom \
  --file=supabase_dump.pgdump

# Отдельно экспортировать данные без структуры (если нужно)
pg_dump \
  --host=db.<ref>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --data-only \
  --schema=public \
  --format=custom \
  --file=supabase_data.pgdump
```

### 1.3 Адаптировать схему для Yandex Cloud

Supabase использует специфичные конструкции, которых нет в обычном PostgreSQL.

Создать файл миграции `yc_migration.sql`:

```sql
-- ═══════════════════════════════════════════════════════════
-- 1. Убрать зависимости от Supabase-специфичных схем
-- ═══════════════════════════════════════════════════════════

-- В Supabase: auth.users, auth.uid()
-- В Yandex Cloud: своя таблица users + middleware

CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Функция для получения user_id из JWT (замена auth.uid())
-- Будет вызываться через SET LOCAL в начале каждой транзакции
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.current_user_id', true)::uuid;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Перенести таблицы без RLS (RLS будет через middleware)
-- ═══════════════════════════════════════════════════════════

-- Таблица quizzes — убрать ссылку на auth.users
CREATE TABLE IF NOT EXISTS public.quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  quiz_data     jsonb NOT NULL DEFAULT '{}',
  visibility    text NOT NULL DEFAULT 'private'
                CHECK (visibility IN ('private', 'unlisted', 'public')),
  is_favorite   boolean DEFAULT false,
  published_at  timestamptz,
  
  -- Модерация
  moderation_status text DEFAULT 'unreviewed'
    CHECK (moderation_status IN (
      'unreviewed','reviewing','approved','rejected',
      'blocked','hidden','deleted'
    )),
  moderation_reason text,
  moderated_by  uuid REFERENCES public.users(id),
  moderated_at  timestamptz,
  deleted_at    timestamptz,
  
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_quizzes_user ON quizzes(user_id);
CREATE INDEX idx_quizzes_visibility ON quizzes(visibility) WHERE deleted_at IS NULL;

-- Таблица quiz_results
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  session_id         text NOT NULL,
  user_id            uuid REFERENCES public.users(id),
  score              integer DEFAULT 0 CHECK (score >= 0 AND score <= 10000000),
  final_node_title   text,
  participant_name   text CHECK (char_length(participant_name) <= 200),
  participant_email  text CHECK (char_length(participant_email) <= 320),
  results_data       jsonb,
  path_data          jsonb,
  time_spent_seconds integer CHECK (time_spent_seconds >= 0 AND time_spent_seconds <= 604800),
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX idx_results_quiz ON quiz_results(quiz_id);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_code text UNIQUE NOT NULL,
  display_name text,
  avatar_url   text,
  status       text DEFAULT 'active'
               CHECK (status IN ('active', 'temporarily_blocked', 'blocked')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Биллинг
CREATE TABLE IF NOT EXISTS public.plans (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  price_kopecks integer NOT NULL CHECK (price_kopecks >= 0),
  period        text NOT NULL CHECK (period IN ('monthly', 'yearly')),
  features      jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.users(id),
  plan_id                text NOT NULL REFERENCES public.plans(id),
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','canceled','expired','past_due')),
  current_period_start   timestamptz NOT NULL,
  current_period_end     timestamptz NOT NULL
                         CHECK (current_period_end > current_period_start),
  cancel_at_period_end   boolean DEFAULT false,
  created_at             timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id),
  plan_id              text NOT NULL REFERENCES public.plans(id),
  amount_kopecks       integer NOT NULL CHECK (amount_kopecks >= 0),
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','succeeded','canceled','refunded')),
  provider_payment_id  text UNIQUE,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);

-- Admin
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES public.users(id),
  role       text NOT NULL CHECK (role IN ('owner','admin','moderator','support')),
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES public.users(id),
  action          text NOT NULL,
  target_type     text,
  target_id       text,
  payload         jsonb,
  outcome         text DEFAULT 'success',
  request_id      text,
  ip_address      text,
  created_at      timestamptz DEFAULT now()
);

-- Support
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id),
  subject     text NOT NULL,
  status      text DEFAULT 'open'
              CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.users(id),
  body        text NOT NULL,
  is_staff    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id),
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer DEFAULT 1
);

CREATE INDEX idx_ai_rate_limits_user ON ai_rate_limits(user_id, window_start);

-- ═══════════════════════════════════════════════════════════
-- 3. Stored procedures (адаптированные)
-- ═══════════════════════════════════════════════════════════

-- Атомарное сохранение результата
CREATE OR REPLACE FUNCTION save_quiz_result_atomic(
  p_quiz_id uuid,
  p_session_id text,
  p_score integer,
  p_participant_name text,
  p_final_node_title text,
  p_results_data jsonb,
  p_path_data jsonb,
  p_time_spent integer
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  INSERT INTO quiz_results (
    quiz_id, session_id, score, participant_name,
    final_node_title, results_data, path_data, time_spent_seconds
  ) VALUES (
    p_quiz_id, p_session_id,
    LEAST(GREATEST(p_score, 0), 10000000),
    LEFT(p_participant_name, 200),
    LEFT(p_final_node_title, 300),
    p_results_data,
    CASE WHEN jsonb_array_length(COALESCE(p_path_data, '[]'::jsonb)) > 1000
         THEN (SELECT jsonb_agg(elem) FROM (
                SELECT elem FROM jsonb_array_elements(p_path_data) AS elem
                ORDER BY ordinality DESC LIMIT 1000
              ) sub)
         ELSE p_path_data
    END,
    LEAST(GREATEST(p_time_spent, 0), 604800)
  )
  RETURNING id INTO v_result_id;
  
  RETURN v_result_id;
END;
$$;

-- Получение entitlement
CREATE OR REPLACE FUNCTION get_effective_entitlement(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sub record;
  v_plan record;
BEGIN
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > now()
  ORDER BY current_period_end DESC
  LIMIT 1;
  
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'plan', 'free',
      'features', jsonb_build_object(
        'max_quizzes', 3,
        'ai_tier', 'basic',
        'hide_branding', false,
        'premium_templates', false,
        'unlimited_logic', false
      )
    );
  END IF;
  
  SELECT * INTO v_plan FROM plans WHERE id = v_sub.plan_id;
  
  RETURN jsonb_build_object(
    'plan', v_sub.plan_id,
    'features', v_plan.features,
    'valid_until', v_sub.current_period_end,
    'cancel_at_period_end', v_sub.cancel_at_period_end
  );
END;
$$;

-- Начальные данные
INSERT INTO plans (id, name, price_kopecks, period, features) VALUES
  ('pro_monthly', 'PRO Monthly', 39900, 'monthly', 
   '{"max_quizzes": null, "ai_tier": "advanced", "hide_branding": true, "premium_templates": true, "unlimited_logic": true}'),
  ('pro_yearly', 'PRO Yearly', 349000, 'yearly',
   '{"max_quizzes": null, "ai_tier": "advanced", "hide_branding": true, "premium_templates": true, "unlimited_logic": true}')
ON CONFLICT (id) DO NOTHING;
```

### 1.4 Импортировать в Yandex Managed PostgreSQL

```bash
# Получить хост кластера
YC_PG_HOST=$(yc managed-postgresql cluster list-hosts potok-db --format json | jq -r '.[0].name')

# Применить схему
psql \
  "host=${YC_PG_HOST} port=6432 dbname=potok user=potok_app sslmode=verify-full" \
  -f yc_migration.sql

# Импортировать данные (если есть)
pg_restore \
  --host=${YC_PG_HOST} \
  --port=6432 \
  --username=potok_app \
  --dbname=potok \
  --data-only \
  --no-owner \
  supabase_data.pgdump
```

### 1.5 Настроить SSL

```bash
# Скачать корневой сертификат Yandex Cloud
wget "https://storage.yandexcloud.net/cloud-certs/CA.pem" \
  -O ~/.postgresql/root.crt
```

---

## Этап 2. Перенос файлового хранилища

### 2.1 Создать бакет для ассетов

```bash
# Бакет для пользовательских файлов (изображения квизов)
yc storage bucket create \
  --name potok-quiz-assets \
  --default-storage-class standard \
  --max-size 10737418240
```

### 2.2 Настроить CORS

```bash
cat > cors.json << 'EOF'
{
  "corsRules": [
    {
      "allowedOrigins": ["https://mykviz.ru", "https://mykviz.online", "http://localhost:5173"],
      "allowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "allowedHeaders": ["*"],
      "maxAgeSeconds": 3600
    }
  ]
}
EOF

# Применить CORS через AWS CLI (S3-совместимый)
aws s3api put-bucket-cors \
  --bucket potok-quiz-assets \
  --cors-configuration file://cors.json \
  --endpoint-url https://storage.yandexcloud.net
```

### 2.3 Настроить публичный доступ для чтения

```bash
cat > public-read-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::potok-quiz-assets/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket potok-quiz-assets \
  --policy file://public-read-policy.json \
  --endpoint-url https://storage.yandexcloud.net
```

### 2.4 Перенести файлы из Supabase Storage

```bash
# Скачать все файлы из Supabase Storage
supabase storage ls quiz-assets --recursive > file_list.txt

# Скачать каждый файл
while read -r file; do
  supabase storage cp "quiz-assets/${file}" "./backup/${file}"
done < file_list.txt

# Загрузить в Yandex Object Storage
aws s3 sync ./backup/ s3://potok-quiz-assets/ \
  --endpoint-url https://storage.yandexcloud.net
```

### 2.5 Создать сервис загрузки файлов

```typescript
// yc-functions/upload-asset/index.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YC_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
  },
});

export async function handler(event: any) {
  const { httpMethod, headers, body } = event;
  
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  
  const userId = await verifySupabaseJWT(headers.authorization);
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  
  const { filename, contentType } = JSON.parse(body);
  
  const key = `${userId}/${Date.now()}_${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: 'potok-quiz-assets',
    Key: key,
    ContentType: contentType,
  });
  
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      uploadUrl: signedUrl,
      publicUrl: `https://storage.yandexcloud.net/potok-quiz-assets/${key}`,
      key,
    }),
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
}

async function verifySupabaseJWT(authHeader: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
    );
    const jwks = await response.json();
    
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );
    
    const { payload } = await jwtVerify(token, JWKS);
    return payload.sub as string;
  } catch {
    return null;
  }
}
```

---

## Этап 3. Перенос Edge Functions → Yandex Cloud Functions

### 3.1 Структура проекта

```
yc-functions/
├── _shared/
│   ├── db.ts              ← PostgreSQL клиент
│   ├── auth.ts            ← JWT верификация (Supabase Auth)
│   ├── cors.ts            ← CORS headers
│   ├── crypto.ts          ← timing-safe compare, SHA-256
│   └── validators.ts      ← UUID, clamp, sanitize
│
├── api-quizzes/           ← CRUD квизов
│   └── index.ts
├── api-results/           ← Сохранение результатов
│   └── index.ts
├── api-billing/           ← Биллинг (checkout, webhook, entitlement)
│   └── index.ts
├── api-admin/             ← Admin API
│   └── index.ts
├── api-ai-proxy/          ← AI proxy
│   └── index.ts
├── upload-asset/          ← Загрузка файлов
│   └── index.ts
└── cron-cleanup/          ← Очистка rate limits
    └── index.ts
```

### 3.2 Shared: подключение к PostgreSQL

```typescript
// yc-functions/_shared/db.ts

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT || '6432'),
      database: process.env.PG_DATABASE || 'potok',
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.PG_CA_CERT,
      },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function queryAsUser<T = any>(
  userId: string,
  sql: string,
  params?: any[],
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("SET LOCAL app.current_user_id = $1", [userId]);
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}
```

### 3.3 Shared: верификация JWT от Supabase Auth

```typescript
// yc-functions/_shared/auth.ts

import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set');
    
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    );
  }
  return jwks;
}

export interface AuthUser {
  id: string;
  email: string;
  aal: string;
}

export async function verifyAuth(
  authHeader: string | undefined,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });
    
    if (!payload.sub || !payload.email) return null;
    
    return {
      id: payload.sub,
      email: payload.email as string,
      aal: (payload.aal as string) ?? 'aal1',
    };
  } catch {
    return null;
  }
}

export async function ensureUser(userId: string, email: string): Promise<void> {
  const { query } = await import('./db');
  
  await query(
    `INSERT INTO users (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [userId, email],
  );
}
```

### 3.4 API: CRUD квизов

```typescript
// yc-functions/api-quizzes/index.ts

import { verifyAuth, ensureUser } from '../_shared/auth';
import { query, queryOne } from '../_shared/db';
import { corsHeaders } from '../_shared/cors';

export async function handler(event: any) {
  const { httpMethod, headers, body, pathParameters, queryStringParameters } = event;
  
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  
  try {
    switch (httpMethod) {
      case 'GET':
        return pathParameters?.id
          ? await getQuiz(headers, pathParameters.id)
          : await listQuizzes(headers, queryStringParameters);
      case 'POST':
        return await createQuiz(headers, body);
      case 'PUT':
        return await updateQuiz(headers, pathParameters?.id, body);
      case 'DELETE':
        return await deleteQuiz(headers, pathParameters?.id);
      default:
        return { statusCode: 405, headers: corsHeaders() };
    }
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

async function listQuizzes(headers: any, params: any) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();
  
  await ensureUser(user.id, user.email);
  
  const rows = await query(
    `SELECT id, name, visibility, is_favorite, created_at, updated_at,
            quiz_data->'description' as description,
            quiz_data->'cover_image_url' as cover_image_url
     FROM quizzes
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 100`,
    [user.id],
  );
  
  return ok(rows);
}

async function getQuiz(headers: any, quizId: string) {
  const quiz = await queryOne(
    `SELECT * FROM quizzes WHERE id = $1 AND deleted_at IS NULL`,
    [quizId],
  );
  
  if (!quiz) return notFound();
  
  if (quiz.visibility === 'public') return ok(quiz);
  
  const user = await verifyAuth(headers.authorization);
  if (!user || user.id !== quiz.user_id) return unauthorized();
  
  return ok(quiz);
}

async function createQuiz(headers: any, body: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();
  
  await ensureUser(user.id, user.email);
  
  const { name, quiz_data, visibility } = JSON.parse(body);
  
  const [quiz] = await query(
    `INSERT INTO quizzes (user_id, name, quiz_data, visibility)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user.id, name || 'Без названия', quiz_data || {}, visibility || 'private'],
  );
  
  return ok(quiz, 201);
}

async function updateQuiz(headers: any, quizId: string, body: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();
  
  const updates = JSON.parse(body);
  
  const [quiz] = await query(
    `UPDATE quizzes
     SET name = COALESCE($3, name),
         quiz_data = COALESCE($4, quiz_data),
         visibility = COALESCE($5, visibility),
         is_favorite = COALESCE($6, is_favorite),
         updated_at = now()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      quizId, user.id,
      updates.name, updates.quiz_data,
      updates.visibility, updates.is_favorite,
    ],
  );
  
  if (!quiz) return notFound();
  return ok(quiz);
}

async function deleteQuiz(headers: any, quizId: string) {
  const user = await verifyAuth(headers.authorization);
  if (!user) return unauthorized();
  
  await query(
    `UPDATE quizzes SET deleted_at = now() WHERE id = $1 AND user_id = $2`,
    [quizId, user.id],
  );
  
  return ok({ deleted: true });
}

function ok(data: any, status = 200) {
  return {
    statusCode: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function unauthorized() {
  return {
    statusCode: 401,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

function notFound() {
  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Not found' }),
  };
}
```

### 3.5 Деплой Cloud Functions

```bash
# Создать секреты в Yandex Lockbox
yc lockbox secret create \
  --name potok-secrets \
  --payload '[
    {"key": "PG_HOST", "text_value": "<host>"},
    {"key": "PG_USER", "text_value": "potok_app"},
    {"key": "PG_PASSWORD", "text_value": "<password>"},
    {"key": "PG_DATABASE", "text_value": "potok"},
    {"key": "SUPABASE_URL", "text_value": "https://<ref>.supabase.co"},
    {"key": "YOOKASSA_SHOP_ID", "text_value": "<shop_id>"},
    {"key": "YOOKASSA_SECRET_KEY", "text_value": "<secret>"},
    {"key": "BILLING_WEBHOOK_SECRET", "text_value": "<32+ chars>"}
  ]'

# Деплой функции
cd yc-functions/api-quizzes
zip -r function.zip .

yc serverless function create --name potok-api-quizzes

yc serverless function version create \
  --function-name potok-api-quizzes \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 256m \
  --execution-timeout 10s \
  --source-path function.zip \
  --service-account-id <potok-functions-id> \
  --secret environment-variable=PG_HOST,name=potok-secrets,key=PG_HOST \
  --secret environment-variable=PG_USER,name=potok-secrets,key=PG_USER \
  --secret environment-variable=PG_PASSWORD,name=potok-secrets,key=PG_PASSWORD \
  --secret environment-variable=SUPABASE_URL,name=potok-secrets,key=SUPABASE_URL
```

### 3.6 Настроить API Gateway

```bash
# Создать API Gateway
cat > api-gateway.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Potok API
  version: 1.0.0

paths:
  /api/quizzes:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-quizzes-function-id>
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-quizzes-function-id>
        
  /api/quizzes/{id}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-quizzes-function-id>
    put:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-quizzes-function-id>
    delete:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-quizzes-function-id>
        
  /api/results:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-results-function-id>
        
  /api/billing/{action}:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-billing-function-id>
        
  /api/admin/{action}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-admin-function-id>
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-admin-function-id>
        
  /api/ai-proxy:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <api-ai-proxy-function-id>
        
  /api/upload:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <upload-asset-function-id>
EOF

yc serverless api-gateway create \
  --name potok-api \
  --spec api-gateway.yaml \
  --description "Potok API Gateway"
```

---

## Этап 4. Обновить фронтенд

### 4.1 Новый API-клиент

```typescript
// services/apiClient.ts

const API_BASE = import.meta.env.VITE_API_URL;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { supabase } = await import('./supabaseClient');
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  listQuizzes: () => apiRequest<Quiz[]>('/quizzes'),
  getQuiz: (id: string) => apiRequest<Quiz>(`/quizzes/${id}`),
  createQuiz: (data: any) => apiRequest<Quiz>('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateQuiz: (id: string, data: any) => apiRequest<Quiz>(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteQuiz: (id: string) => apiRequest(`/quizzes/${id}`, {
    method: 'DELETE',
  }),
  
  saveResult: (data: any) => apiRequest('/results', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  createCheckout: (plan: string) => apiRequest('/billing/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  }),
  getEntitlement: () => apiRequest('/billing/get-entitlement'),
  cancelSubscription: () => apiRequest('/billing/cancel-subscription', {
    method: 'POST',
  }),
  
  aiProxy: (payload: any) => apiRequest('/ai-proxy', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  
  getUploadUrl: (filename: string, contentType: string) =>
    apiRequest<{ uploadUrl: string; publicUrl: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),
};
```

### 4.2 Обновить .env

```bash
# .env
VITE_SUPABASE_URL=https://<ref>.supabase.co          # Только для Auth!
VITE_SUPABASE_ANON_KEY=eyJ...                         # Только для Auth!
VITE_API_URL=https://d5d...apigw.yandexcloud.net/api  # Yandex Cloud API
VITE_STORAGE_URL=https://storage.yandexcloud.net/potok-quiz-assets
```

### 4.3 Обновить Zustand сторы

В каждом сторе заменить прямые вызовы `supabase.from(...)` на `api.*`:

```typescript
// store/useQuizDataStore.ts — ДО
const { data, error } = await supabase
  .from('quizzes')
  .select('*')
  .eq('user_id', session.user.id);

// store/useQuizDataStore.ts — ПОСЛЕ
const data = await api.listQuizzes();
```

---

## Этап 5. Cron-задачи

### 5.1 Создать функцию очистки

```typescript
// yc-functions/cron-cleanup/index.ts

import { query } from '../_shared/db';

export async function handler() {
  await query(
    `DELETE FROM ai_rate_limits WHERE window_start < now() - interval '2 hours'`
  );
  
  return { statusCode: 200, body: 'OK' };
}
```

### 5.2 Настроить триггер по таймеру

```bash
yc serverless trigger create timer \
  --name potok-cron-cleanup \
  --cron-expression "0 * * * ? *" \
  --invoke-function-name potok-cron-cleanup \
  --invoke-function-service-account-name potok-functions
```

---

## Этап 6. Переключение

### 6.1 Чеклист перед переключением

- [ ] Yandex Managed PostgreSQL работает
- [ ] Все таблицы и данные перенесены
- [ ] Cloud Functions задеплоены и работают
- [ ] API Gateway настроен
- [ ] Storage работает (загрузка + чтение)
- [ ] JWT верификация от Supabase Auth работает
- [ ] Биллинг (ЮKassa webhook) работает через новый endpoint
- [ ] Admin API работает
- [ ] Cron-задачи настроены
- [ ] Фронтенд обновлён на новый API_URL
- [ ] Тесты проходят
- [ ] CI/CD обновлён

### 6.2 Порядок переключения

1. **Деплой фронтенда** с `VITE_API_URL` → Yandex Cloud, НО оставить `VITE_SUPABASE_URL` для Auth
2. **Проверить всё в production**: регистрация/логин (Supabase Auth), CRUD квизов (Yandex Cloud), загрузка файлов (Yandex Object Storage), биллинг (Yandex Cloud → ЮKassa), admin (Yandex Cloud)
3. **Обновить ЮKassa webhook URL** на Yandex Cloud endpoint
4. **Мониторинг 48 часов**
5. **Отключить Supabase Edge Functions** (но НЕ Auth и НЕ DB)
6. **Через месяц**: отключить Supabase DB (если всё работает стабильно)

---

## Стоимость на Yandex Cloud

| Сервис | Стоимость |
|---|---|
| Managed PostgreSQL (s2.micro) | ~3,500 ₽/мес |
| Object Storage (20 GB) | ~40 ₽/мес |
| Cloud Functions (100K вызовов) | ~0 ₽ (free tier) |
| API Gateway | ~0 ₽ (free tier до 100K) |
| CDN (фронтенд) | ~0 ₽ (free tier) |
| Lockbox (секреты) | ~0 ₽ (free tier) |
| **ИТОГО** | **~3,500 ₽/мес** |

Для сравнения: Supabase Pro — $25/мес ≈ 2,500 ₽/мес. На старте стоимость сопоставима. При росте Yandex Cloud может быть дешевле за счёт гибкой тарификации.

---

## Что остаётся на Supabase

| Компонент | Остаётся? |
|---|---|
| Auth (регистрация, логин, OAuth, MFA, JWT) | ✅ — Supabase Auth как standalone identity provider; JWT верифицируется через JWKS endpoint; Yandex Cloud Functions получают user_id из JWT |
| PostgreSQL | ❌ → Yandex Managed PostgreSQL |
| Storage | ❌ → Yandex Object Storage |
| Edge Functions | ❌ → Yandex Cloud Functions |
| Realtime | ❌ → Yandex Message Queue (если нужен) |
| pg_cron | ❌ → Yandex Triggers |

---

## Риски

### Риск 1: Supabase Auth перестаёт работать / дорожает
**Митигация:** JWT — стандартный формат. Можно мигрировать на Keycloak / Ory / собственный auth за 1-2 недели.

### Риск 2: Задержки Cloud Functions (cold start)
**Митигация:** Использовать provisioned concurrency или Serverless Containers вместо Functions.

### Риск 3: Потеря данных при миграции
**Митигация:** pg_dump/pg_restore с проверкой row count. Параллельная работа обоих систем 1 месяц.

### Риск 4: RLS не работает без Supabase
**Митигация:** Middleware авторизации в каждой Cloud Function. Все запросы проходят через verifyAuth().

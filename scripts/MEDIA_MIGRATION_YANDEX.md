# Media Migration To Yandex Object Storage

New media uploads use `/api/upload` and Yandex Object Storage. The production
bucket is `quizflow22-prod`.

Use this script to migrate old Supabase Storage URLs stored in
`public.quizzes.quiz_data` and `public.quizzes.cover_image_url`.

## Dry Run

```powershell
$env:SUPABASE_URL="https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
$env:SUPABASE_STORAGE_BUCKET="quiz-assets"

$env:PG_HOST="<yandex-postgres-host>"
$env:PG_PORT="6432"
$env:PG_DATABASE="<database>"
$env:PG_USER="<user>"
$env:PG_PASSWORD="<password>"
$env:PG_CA_CERT="<optional-ca-cert>"

$env:YC_ACCESS_KEY_ID="<object-storage-key-id>"
$env:YC_SECRET_ACCESS_KEY="<object-storage-secret>"
$env:S3_BUCKET="quizflow22-prod"

$env:DRY_RUN="1"
npm run migrate:media:yandex
```

## Apply

```powershell
$env:DRY_RUN="0"
npm run migrate:media:yandex
```

## Optional Variables

- `MEDIA_MIGRATION_LIMIT=10` limits the number of quizzes for a test run.
- `YANDEX_MEDIA_PREFIX=media-migrated` stores migrated files under a prefix.
- `YANDEX_MEDIA_PUBLIC_BASE=https://cdn.example.com` uses a CDN URL instead of
  the raw Object Storage URL.
- `PGSSLMODE=disable` disables PostgreSQL SSL for local testing only.

The script is idempotent: existing Yandex objects are skipped, and database URLs
are only rewritten when matching Supabase Storage URLs are found.

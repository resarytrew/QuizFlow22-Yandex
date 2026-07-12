#!/usr/bin/env bash
# Deploy QuizFlow22 build to Yandex Object Storage.
#
# Requirements:
#   - aws CLI (configured separately or via AWS_* env vars)
#   - yc CLI (optional, only for CDN cache invalidation)
#   - .env file with YC_BUCKET, YC_S3_ENDPOINT (and optional YC_CDN_RESOURCE_ID)
#
# Usage:
#   ./deploy/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${YC_BUCKET:?YC_BUCKET is not set. Add it to .env or export it.}"
: "${YC_S3_ENDPOINT:=https://storage.yandexcloud.net}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is not set (Yandex static access key).}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is not set (Yandex static secret key).}"

echo "==> Installing dependencies"
npm ci

echo "==> Building production bundle"
npm run build

DIST_DIR="$PROJECT_ROOT/dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "Error: $DIST_DIR not found. Build step failed." >&2
  exit 1
fi

echo "==> Syncing immutable assets (cache 1y) to s3://$YC_BUCKET"
aws --endpoint-url="$YC_S3_ENDPOINT" s3 sync "$DIST_DIR" "s3://$YC_BUCKET" \
  --delete \
  --exclude "*" \
  --include "assets/*" \
  --include "*.js" \
  --include "*.css" \
  --include "*.woff" \
  --include "*.woff2" \
  --include "*.png" \
  --include "*.jpg" \
  --include "*.svg" \
  --cache-control "public, max-age=31536000, immutable"

echo "==> Syncing HTML and root files (no-cache)"
aws --endpoint-url="$YC_S3_ENDPOINT" s3 sync "$DIST_DIR" "s3://$YC_BUCKET" \
  --delete \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate"

echo "==> Applying website configuration"
aws --endpoint-url="$YC_S3_ENDPOINT" s3api put-bucket-website \
  --bucket "$YC_BUCKET" \
  --website-configuration "file://$SCRIPT_DIR/yandex-cloud/website-config.json"

echo "==> Applying CORS configuration"
aws --endpoint-url="$YC_S3_ENDPOINT" s3api put-bucket-cors \
  --bucket "$YC_BUCKET" \
  --cors-configuration "file://$SCRIPT_DIR/yandex-cloud/cors-config.json"

if [ -n "${YC_CDN_RESOURCE_ID:-}" ] && command -v yc >/dev/null 2>&1; then
  echo "==> Purging Yandex CDN cache for resource $YC_CDN_RESOURCE_ID"
  yc cdn cache purge --resource-id "$YC_CDN_RESOURCE_ID" --path '/*'
fi

echo "==> Notifying IndexNow about deployed SEO pages"
node scripts/submit-indexnow.mjs

echo "==> Done. Site URL: https://$YC_BUCKET.website.yandexcloud.net"

#!/bin/bash
set -euo pipefail

# Deploy all Cloud Functions to Yandex Cloud
# Required env vars: YC_FOLDER_ID, YC_OAUTH_TOKEN

FUNCTIONS=(
  "api-quizzes"
  "api-auth"
  "api-results"
  "api-billing"
  "api-admin"
  "api-support"
  "api-ai-proxy"
  "upload-asset"
  "cron-cleanup"
  "billing-redeem-promo"
  "billing-admin-grant-pro"
  "save-quiz-session"
)

# Lockbox secrets to inject as environment variables
SECRETS=(
  "PG_HOST"
  "PG_PORT"
  "PG_DATABASE"
  "PG_USER"
  "PG_PASSWORD"
  "PG_CA_CERT"
  "OTP_PEPPER"
  "SESSION_PEPPER"
  "MFA_ENCRYPTION_KEY"
  "YANDEX_OAUTH_CLIENT_ID"
  "YANDEX_OAUTH_CLIENT_SECRET"
  "POSTBOX_SMTP_USER"
  "POSTBOX_SMTP_PASSWORD"
  "POSTBOX_FROM_EMAIL"
  "POSTBOX_FROM_NAME"
  "YC_ACCESS_KEY_ID"
  "YC_SECRET_ACCESS_KEY"
  "S3_BUCKET"
  "YOOKASSA_SHOP_ID"
  "YOOKASSA_SECRET_KEY"
  "FRONTEND_URL"
  "ALLOWED_ORIGINS"
  "BILLING_WEBHOOK_SECRET"
  "BILLING_ADMIN_SECRET"
  "OPENROUTER_API_KEY"
  "AI_PROXY_ALLOWED_MODELS"
  "AI_PROXY_DEFAULT_MODEL"
  "AI_PROXY_MAX_TOKENS"
  "AI_PROXY_MAX_PROMPT_CHARS"
  "AI_PROXY_REFERER"
  "YC_CATALOG_ID"
  "YC_OAUTH_TOKEN"
)

# Get or create Lockbox secret
echo "Ensuring Lockbox secret exists..."
if ! yc lockbox secret list --folder-id "$YC_FOLDER_ID" --format json | jq -e '.[] | select(.name == "potok-secrets")' > /dev/null 2>&1; then
  echo "Creating Lockbox secret potok-secrets..."
  yc lockbox secret create --name potok-secrets --description "QuizFlow22 production secrets"
fi

LOCKBOX_SECRET_ID=$(yc lockbox secret list --folder-id "$YC_FOLDER_ID" --format json | jq -r '.[] | select(.name == "potok-secrets") | .id')
echo "Lockbox secret ID: $LOCKBOX_SECRET_ID"

# Get or create service account
echo "Ensuring service account exists..."
if ! yc iam service-account list --folder-id "$YC_FOLDER_ID" --format json | jq -e '.[] | select(.name == "quizflow-functions")' > /dev/null 2>&1; then
  echo "Creating service account quizflow-functions..."
  yc iam service-account create --name quizflow-functions --description "For Cloud Functions"
fi

SA_ID=$(yc iam service-account list --folder-id "$YC_FOLDER_ID" --format json | jq -r '.[] | select(.name == "quizflow-functions") | .id')
echo "Service account ID: $SA_ID"

# Grant roles
echo "Granting roles to service account..."
yc resource-manager folder add-access-binding --role functions.functionInvoker --service-account-id "$SA_ID" --folder-id "$YC_FOLDER_ID" 2>/dev/null || true
yc resource-manager folder add-access-binding --role lockbox.payloadViewer --service-account-id "$SA_ID" --folder-id "$YC_FOLDER_ID" 2>/dev/null || true
yc resource-manager folder add-access-binding --role storage.editor --service-account-id "$SA_ID" --folder-id "$YC_FOLDER_ID" 2>/dev/null || true

# Deploy each function
for FN in "${FUNCTIONS[@]}"; do
  echo ""
  echo "=========================================="
  echo "Deploying: $FN"
  echo "=========================================="

  FUNCTION_NAME="potok-$FN"

  # Create function if it doesn't exist
  if ! yc serverless function get --name "$FUNCTION_NAME" --format json > /dev/null 2>&1; then
    echo "Creating function $FUNCTION_NAME..."
    yc serverless function create --name "$FUNCTION_NAME" --description "QuizFlow22 $FN"
  fi

  # Build zip
  DIST_DIR="dist/$FN"
  if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: dist/$FN not found. Run npm run build first."
    exit 1
  fi

  ZIP_FILE="/tmp/$FN.zip"
  rm -f "$ZIP_FILE"
  cd "$DIST_DIR"
  zip -r "$ZIP_FILE" .
  cd ../..

  # Build secret flags
  SECRET_FLAGS=""
  for SECRET_KEY in "${SECRETS[@]}"; do
    SECRET_FLAGS="$SECRET_FLAGS --secret environment-variable=$SECRET_KEY,id=$LOCKBOX_SECRET_ID,key=$SECRET_KEY"
  done

  # Deploy new version
  echo "Deploying version..."
  eval yc serverless function version create \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22 \
    --entrypoint handler \
    --memory 256m \
    --execution-timeout 30s \
    --service-account-id "$SA_ID" \
    --source-path "$ZIP_FILE" \
    $SECRET_FLAGS

  # Get function ID for gateway
  FN_ID=$(yc serverless function get --name "$FUNCTION_NAME" --format json | jq -r '.id')
  echo "$FUNCTION_NAME -> $FN_ID"

  rm -f "$ZIP_FILE"
done

echo ""
echo "=========================================="
echo "All functions deployed!"
echo "=========================================="

# Save function IDs to file for gateway deployment
echo "Saving function IDs..."
for FN in "${FUNCTIONS[@]}"; do
  FN_ID=$(yc serverless function get --name "potok-$FN" --format json | jq -r '.id')
  echo "potok-$FN=$FN_ID"
done > /tmp/function-ids.txt

cat /tmp/function-ids.txt

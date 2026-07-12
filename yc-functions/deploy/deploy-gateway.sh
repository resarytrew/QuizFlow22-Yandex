#!/bin/bash
set -euo pipefail

# Deploy API Gateway to Yandex Cloud
# Required env vars: YC_FOLDER_ID

GATEWAY_NAME="potok-api"

API_ROUTER_FUNCTION_ID=$(yc serverless function get --name "potok-api-quizzes" --format json | jq -r '.id')
SERVICE_ACCOUNT_ID=$(yc iam service-account list --folder-id "$YC_FOLDER_ID" --format json | jq -r '.[] | select(.name == "quizflow-functions") | .id')
echo "potok-api-quizzes (unified api-router) -> $API_ROUTER_FUNCTION_ID"

# Generate gateway spec with real function IDs
cat > /tmp/gateway-spec.yaml << EOF
openapi: 3.0.0
info:
  title: Potok API
  version: 2.0.0
x-yc-apigateway:
  cors:
    origin: "*"
    methods: ["GET","POST","PUT","DELETE","OPTIONS"]
    headers: ["authorization","content-type","x-request-id","x-admin-secret","x-cron-secret"]

paths:
  /api/{proxy+}:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: $API_ROUTER_FUNCTION_ID
        service_account_id: $SERVICE_ACCOUNT_ID
      parameters:
        - in: path
          name: proxy
          schema: {type: string}
          required: true
EOF

echo ""
echo "Generated gateway spec:"
cat /tmp/gateway-spec.yaml

# Create or update gateway
echo ""
echo "Deploying API Gateway..."

if yc serverless api-gateway get --name "$GATEWAY_NAME" --format json > /dev/null 2>&1; then
  echo "Updating existing gateway $GATEWAY_NAME..."
  yc serverless api-gateway update \
    --name "$GATEWAY_NAME" \
    --spec /tmp/gateway-spec.yaml
else
  echo "Creating new gateway $GATEWAY_NAME..."
  yc serverless api-gateway create \
    --name "$GATEWAY_NAME" \
    --spec /tmp/gateway-spec.yaml \
    --description "QuizFlow22 API Gateway"
fi

# Get gateway domain
GATEWAY_DOMAIN=$(yc serverless api-gateway get --name "$GATEWAY_NAME" --format json | jq -r '.domain')
echo ""
echo "=========================================="
echo "API Gateway deployed!"
echo "Domain: $GATEWAY_DOMAIN"
echo "=========================================="
echo ""
echo "Update VITE_API_URL in .env.production:"
echo "  VITE_API_URL=https://$GATEWAY_DOMAIN/api"

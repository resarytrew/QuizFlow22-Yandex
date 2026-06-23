#!/bin/bash
set -euo pipefail

# Deploy API Gateway to Yandex Cloud
# Required env vars: YC_FOLDER_ID

GATEWAY_NAME="potok-api"

# Function names to IDs mapping
declare -A FUNCTION_IDS

for FN in api-quizzes api-results api-billing api-admin api-support api-ai-proxy upload-asset cron-cleanup billing-redeem-promo billing-admin-grant-pro save-quiz-session; do
  FUNCTION_IDS[$FN]=$(yc serverless function get --name "potok-$FN" --format json | jq -r '.id')
  echo "potok-$FN -> ${FUNCTION_IDS[$FN]}"
done

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
  /api/quizzes:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-quizzes]}
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-quizzes]}

  /api/quizzes/{id}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-quizzes]}
      parameters:
        - in: path
          name: id
          schema: {type: string}
          required: true
    put:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-quizzes]}
      parameters:
        - in: path
          name: id
          schema: {type: string}
          required: true
    delete:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-quizzes]}
      parameters:
        - in: path
          name: id
          schema: {type: string}
          required: true

  /api/results:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-results]}
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-results]}

  /api/billing/{action}:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-billing]}
      parameters:
        - in: path
          name: action
          schema: {type: string}
          required: true

  /api/admin/{action}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-admin]}
      parameters:
        - in: path
          name: action
          schema: {type: string}
          required: true

  /api/support/tickets:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-support]}
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-support]}

  /api/support/tickets/{ticketId}/messages:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-support]}
      parameters:
        - in: path
          name: ticketId
          schema: {type: string}
          required: true
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-support]}
      parameters:
        - in: path
          name: ticketId
          schema: {type: string}
          required: true
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-admin]}
      parameters:
        - in: path
          name: action
          schema: {type: string}
          required: true

  /api/ai-proxy:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[api-ai-proxy]}

  /api/upload:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[upload-asset]}

  /api/billing/redeem-promo:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[billing-redeem-promo]}

  /api/billing/grant-pro:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[billing-admin-grant-pro]}

  /api/sessions/{action}:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${FUNCTION_IDS[save-quiz-session]}
      parameters:
        - in: path
          name: action
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

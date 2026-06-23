# Ручные шаги по миграции на Yandex Cloud

## Предварительные требования

Убедитесь, что установлено:
- **yc CLI** — [инструкция](https://yandex.cloud/ru/docs/cli/quickstart)
- **AWS CLI v2** — должно быть уже установлено (использовали для S3)
- **psql** — клиент PostgreSQL
- **pg_dump/pg_restore** — для миграции данных
- **tar/zip** — для упаковки функций
- **jq** — для парсинга JSON (опционально)
- **nvm** — Node.js 18+ (уже есть)

Проверка:
```powershell
yc --version
aws --version
psql --version
pg_dump --version
```

---

## Этап 0. Инфраструктура Yandex Cloud

### 0.1 Авторизация yc CLI

```powershell
# Создать OAuth-токен: https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb
yc init
# Выберите каталог (folder). Если нет — создайте новый:
yc resource-manager folder create --name quizflow-prod --description "QuizFlow22 production"
yc config set folder-id <FOLDER_ID>
```

### 0.2 Создать сервисные аккаунты

```powershell
yc iam service-account create --name quizflow-functions --description "For Cloud Functions"
yc iam service-account create --name quizflow-storage --description "For Object Storage"
yc iam service-account create --name quizflow-db --description "For Managed PostgreSQL"

# Сохранить ID
$SA_FUNCTIONS_ID = yc iam service-account get --name quizflow-functions --format json | ConvertFrom-Json | Select-Object -ExpandProperty id
$SA_STORAGE_ID = yc iam service-account get --name quizflow-storage --format json | ConvertFrom-Json | Select-Object -ExpandProperty id
$SA_DB_ID = yc iam service-account get --name quizflow-db --format json | ConvertFrom-Json | Select-Object -ExpandProperty id
```

### 0.3 Назначить роли

```powershell
yc resource-manager folder add-access-binding --role functions.functionInvoker --service-account-id $SA_FUNCTIONS_ID
yc resource-manager folder add-access-binding --role lockbox.payloadViewer --service-account-id $SA_FUNCTIONS_ID
yc resource-manager folder add-access-binding --role storage.editor --service-account-id $SA_STORAGE_ID
yc resource-manager folder add-access-binding --role storage.editor --service-account-id $SA_FUNCTIONS_ID
yc resource-manager folder add-access-binding --role postgresql.editor --service-account-id $SA_DB_ID
```

### 0.4 Создать VPC сеть

```powershell
yc vpc network create --name quizflow-net

yc vpc subnet create --name quizflow-subnet-a --zone ru-central1-a --network-name quizflow-net --range 10.1.0.0/24
yc vpc subnet create --name quizflow-subnet-b --zone ru-central1-b --network-name quizflow-net --range 10.2.0.0/24
```

---

## Этап 1. База данных

### 1.1 Создать Managed PostgreSQL

```powershell
yc managed-postgresql cluster create `
  --name quizflow-db --environment production --network-name quizflow-net `
  --host zone-id=ru-central1-a,subnet-name=quizflow-subnet-a `
  --host zone-id=ru-central1-b,subnet-name=quizflow-subnet-b `
  --resource-preset s2.micro --disk-type network-ssd --disk-size 20 `
  --postgresql-version 16 `
  --user name=quizflow_app,password=<ПРИДУМАЙТЕ_ПАРОЛЬ> `
  --database name=quizflow,owner=quizflow_app
```

**Запишите в блокнот:** пароль, хост (получите ниже).

```powershell
yc managed-postgresql cluster list-hosts quizflow-db --format json | ConvertFrom-Json | Select-Object -ExpandProperty name
# Пример: rc1a-<hash>.mdb.yandexcloud.net
```

### 1.2 Применить схему

```powershell
# Скачать сертификат
wget "https://storage.yandexcloud.net/cloud-certs/CA.pem" -O "$env:USERPROFILE\.postgresql\root.crt"

# Применить схему (файл yc_migration.sql из корня проекта)
psql "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full" -f yc_migration.sql
```

Проверка:
```powershell
psql "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full" -c "\dt public.*"
# Должны увидеть все таблицы: users, quizzes, quiz_results, subscriptions, payments, plans, entitlements, profiles, admin_staff, admin_audit_log, support_tickets, support_ticket_messages, quiz_reports, ai_rate_limits
```

### 1.3 Экспорт данных из Supabase

```powershell
# Получить строку подключения к Supabase из настроек проекта
# Supabase > Project Settings > Database > Connection string (URI)

pg_dump `
  --host=<SUPABASE_DB_HOST> --port=5432 --username=postgres --dbname=postgres `
  --no-owner --no-acl --data-only `
  --exclude-schema 'auth' --exclude-schema 'storage' --exclude-schema 'realtime' `
  --exclude-schema 'vault' --exclude-schema 'extensions' --exclude-schema 'pgbouncer' `
  --schema 'public' `
  --format=custom --file=supabase_data.pgdump
```

### 1.4 Трансформация и импорт данных

Схемы отличаются, поэтому прямой pg_restore не сработает. Нужен скрипт трансформации.

**Создайте файл `transform_and_import.ps1`:**

```powershell
param(
  [Parameter(Mandatory=$true)] [string]$SupabaseDump,
  [Parameter(Mandatory=$true)] [string]$PG_DSN
)

# 1. Восстановить дамп во временную схему
$TEMP_DSN = $PG_DSN -replace 'dbname=quizflow', 'dbname=temp_restore'
psql $PG_DSN -c "CREATE DATABASE temp_restore;"
pg_restore --no-owner --no-acl --dbname=$TEMP_DSN $SupabaseDump

# 2. Перенести пользователей из auth.users
psql $PG_DSN -c @"
INSERT INTO public.users (id, email, role)
SELECT id, email,
  CASE WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'user' END
FROM temp_restore.auth.users
ON CONFLICT (id) DO NOTHING;
"@

# 3. Перенести квизы (quizzes → quizzes)
# В Supabase: id uuid, user_id uuid, name, quiz_data jsonb, visibility text, is_favorite bool, published_at, created_at, updated_at
# В YC:        id uuid, user_id uuid, name, quiz_data jsonb, visibility text, is_favorite bool, published_at, created_at, updated_at
psql $PG_DSN -c @"
INSERT INTO public.quizzes (id, user_id, name, description, quiz_data, visibility, is_favorite, published_at, created_at, updated_at)
SELECT q.id, q.user_id, q.name, q.description, q.quiz_data, COALESCE(q.visibility, CASE WHEN q.is_published THEN 'public' ELSE 'private' END), q.is_favorite, q.published_at, q.created_at, q.updated_at
FROM temp_restore.public.quizzes q
WHERE q.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
"@

# 4. Перенести подписки
psql $PG_DSN -c @"
INSERT INTO public.subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, provider, created_at, updated_at)
SELECT s.id, s.user_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end, s.canceled_at, COALESCE(s.provider, 'yookassa'), s.created_at, s.updated_at
FROM temp_restore.public.subscriptions s
ON CONFLICT (id) DO NOTHING;
"@

# 5. Перенести платежи
psql $PG_DSN -c @"
INSERT INTO public.payments (id, user_id, plan_id, amount_kopecks, currency, status, provider, provider_payment_id, description, created_at)
SELECT p.id, p.user_id, p.plan_id, p.amount_kopecks, COALESCE(p.currency, 'RUB'), p.status, COALESCE(p.provider, 'yookassa'), p.external_id, p.description, p.created_at
FROM temp_restore.public.payments p
ON CONFLICT (id) DO NOTHING;
"@

# 6. Перенести результаты
psql $PG_DSN -c @"
INSERT INTO public.quiz_results (id, quiz_id, session_id, user_id, score, final_node_title, participant_name, participant_email, results_data, path_data, time_spent_seconds, created_at)
SELECT r.id, r.quiz_id, r.session_id::text, r.user_id, r.score, r.final_node_title, r.participant_name, r.participant_email, r.results_data, r.path_data, r.time_spent_seconds, r.created_at
FROM temp_restore.public.quiz_results r
ON CONFLICT (id) DO NOTHING;
"@

# 7. Перенести тикеты поддержки
psql $PG_DSN -c @"
INSERT INTO public.support_tickets (id, user_id, subject, category, priority, status, created_at, updated_at)
SELECT st.id, st.user_id, st.subject, COALESCE(st.category, 'general'), COALESCE(st.priority, 'normal'), st.status, st.created_at, st.updated_at
FROM temp_restore.public.support_tickets st
ON CONFLICT (id) DO NOTHING;
"@

# 8. Удалить временную БД
psql $PG_DSN -c "DROP DATABASE IF EXISTS temp_restore;"

Write-Host "Импорт завершён. Проверьте количество строк:"
psql $PG_DSN -c "SELECT 'users' as tbl, COUNT(*) FROM public.users UNION ALL SELECT 'quizzes', COUNT(*) FROM public.quizzes UNION ALL SELECT 'subscriptions', COUNT(*) FROM public.subscriptions UNION ALL SELECT 'payments', COUNT(*) FROM public.payments UNION ALL SELECT 'quiz_results', COUNT(*) FROM public.quiz_results;"
```

Запустите:
```powershell
.\transform_and_import.ps1 -SupabaseDump supabase_data.pgdump -PG_DSN "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full"
```

---

## Этап 2. Файловое хранилище

### 2.1 Создать бакет

```powershell
yc storage bucket create --name potok-quiz-assets --default-storage-class standard --max-size 10737418240
```

### 2.2 Настроить CORS

Создайте `cors.json`:
```json
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
```

Примените:
```powershell
aws s3api put-bucket-cors --bucket potok-quiz-assets --cors-configuration file://cors.json --endpoint-url https://storage.yandexcloud.net
```

### 2.3 Настроить публичный доступ

Создайте `public-read-policy.json`:
```json
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
```

Примените:
```powershell
aws s3api put-bucket-policy --bucket potok-quiz-assets --policy file://public-read-policy.json --endpoint-url https://storage.yandexcloud.net
```

### 2.4 Получить ключи для сервисного аккаунта

```powershell
yc iam access-key create --service-account-name quizflow-storage --format json
# Сохраните: access_key (key_id) и secret_key
```

### 2.5 Перенести файлы из Supabase

```powershell
# Настроить AWS CLI для Supabase Storage (S3-совместимый)
aws configure set aws_access_key_id $SUPABASE_S3_KEY --profile supabase
aws configure set aws_secret_access_key $SUPABASE_S3_SECRET --profile supabase

# Скачать все файлы
aws s3 sync s3://quiz-assets ./backup/supabase-storage --endpoint-url https://<ref>.supabase.co/storage/v1/s3 --profile supabase

# Загрузить в Yandex Object Storage
aws s3 sync ./backup/supabase-storage s3://potok-quiz-assets/ --endpoint-url https://storage.yandexcloud.net
```

---

## Этап 3. Cloud Functions

### 3.1 Создать Lockbox для секретов

```powershell
# Получить мастер-ключ для шифрования
$LOCKBOX_SECRET_ID = yc lockbox secret create --name potok-secrets `
  --payload '[
    {"key": "PG_HOST", "text_value": "ХОСТ_ИЗ_ШАГА_1.1"},
    {"key": "PG_PORT", "text_value": "6432"},
    {"key": "PG_DATABASE", "text_value": "quizflow"},
    {"key": "PG_USER", "text_value": "quizflow_app"},
    {"key": "PG_PASSWORD", "text_value": "ПАРОЛЬ_ИЗ_ШАГА_1.1"},
    {"key": "PG_CA_CERT", "text_value": "-----BEGIN CERTIFICATE-----(вставьте содержимое CA.pem)-----END CERTIFICATE-----"},
    {"key": "SUPABASE_URL", "text_value": "https://lntsyybfbunajmzbahrq.supabase.co"},
    {"key": "YC_ACCESS_KEY_ID", "text_value": "ACCESS_KEY_ИЗ_ШАГА_2.4"},
    {"key": "YC_SECRET_ACCESS_KEY", "text_value": "SECRET_KEY_ИЗ_ШАГА_2.4"},
    {"key": "S3_BUCKET", "text_value": "potok-quiz-assets"},
    {"key": "YOOKASSA_SHOP_ID", "text_value": "ВАШ_YOOKASSA_SHOP_ID"},
    {"key": "YOOKASSA_SECRET_KEY", "text_value": "ВАШ_YOOKASSA_SECRET_KEY"},
    {"key": "FRONTEND_URL", "text_value": "https://mykviz.ru"},
    {"key": "ALLOWED_ORIGINS", "text_value": "https://mykviz.ru,http://localhost:5173"}
  ]' --format json | ConvertFrom-Json | Select-Object -ExpandProperty id

Write-Host "Lockbox secret ID: $LOCKBOX_SECRET_ID"
```

Чтобы вставить многострочный сертификат в payload, используйте:
```powershell
$CERT = Get-Content "$env:USERPROFILE\.postgresql\root.crt" -Raw
yc lockbox secret add-version --id $LOCKBOX_SECRET_ID --payload "[]"
# Эта команда добавит PG_CA_CERT отдельно:
yc lockbox secret add-version --id $LOCKBOX_SECRET_ID --payload "{\"key\":\"PG_CA_CERT\",\"text_value\":\"$CERT\"}"
```

### 3.2 Создать Cloud Functions

Для каждой функции нужно выполнить один раз:
```powershell
yc serverless function create --name potok-api-quizzes
yc serverless function create --name potok-api-results
yc serverless function create --name potok-api-billing
yc serverless function create --name potok-api-admin
yc serverless function create --name potok-api-ai-proxy
yc serverless function create --name potok-upload-asset
yc serverless function create --name potok-cron-cleanup
```

Сохраните ID каждой функции (нужны для API Gateway):
```powershell
yc serverless function list --format json | ConvertFrom-Json | Select-Object name, id
```

### 3.3 Задеплоить функции

**Способ 1 — автоматический (рекомендуется):**
```powershell
cd yc-functions
.\deploy\deploy-all.ps1 -FolderId <FOLDER_ID> -ServiceAccountId $SA_FUNCTIONS_ID -LockboxSecretId $LOCKBOX_SECRET_ID
```

**Способ 2 — вручную, функция за функцией:**
```powershell
cd yc-functions

# 1. api-quizzes
npm run build:api-quizzes
Compress-Archive -Path .\dist\api-quizzes\* -DestinationPath .\dist\api-quizzes.zip -Force
yc serverless function version create --function-name potok-api-quizzes --runtime nodejs18 --entrypoint handler --memory 256m --execution-timeout 30s --service-account-id $SA_FUNCTIONS_ID --source-path .\dist\api-quizzes.zip $(@(
  "PG_HOST","PG_PORT","PG_DATABASE","PG_USER","PG_PASSWORD","PG_CA_CERT",
  "SUPABASE_URL","YC_ACCESS_KEY_ID","YC_SECRET_ACCESS_KEY","S3_BUCKET",
  "YOOKASSA_SHOP_ID","YOOKASSA_SECRET_KEY","FRONTEND_URL","ALLOWED_ORIGINS"
) | ForEach-Object { "--secret","environment-variable=$_,name=$LOCKBOX_SECRET_ID,key=$_" })

# Повторить для остальных: api-results, api-billing, api-admin, api-ai-proxy, upload-asset
# Для cron-cleanup:
yc serverless function version create --function-name potok-cron-cleanup --runtime nodejs18 --entrypoint handler --memory 128m --execution-timeout 60s --service-account-id $SA_FUNCTIONS_ID --source-path .\dist\cron-cleanup.zip $(@("PG_HOST","PG_PORT","PG_DATABASE","PG_USER","PG_PASSWORD") | ForEach-Object { "--secret","environment-variable=$_,name=$LOCKBOX_SECRET_ID,key=$_" })
```

### 3.4 Создать API Gateway

Создайте файл `api-gateway.yaml` на основе `yc-functions/deploy/gateway-spec.yaml`, подставив реальные ID функций:

```yaml
# api-gateway.yaml
openapi: 3.0.0
info:
  title: QuizFlow22 API
  version: 1.0.0
x-yc-apigateway:
  cors:
    origin: "*"
    methods: ["GET","POST","PUT","DELETE","OPTIONS"]
    headers: ["authorization","content-type","x-request-id"]

paths:
  /api/quizzes:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-quizzes>
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-quizzes>

  /api/quizzes/{id}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-quizzes>
      parameters:
        - in: path
          name: id
          schema: { type: string }
          required: true
    put:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-quizzes>
      parameters:
        - in: path
          name: id
          schema: { type: string }
          required: true
    delete:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-quizzes>
      parameters:
        - in: path
          name: id
          schema: { type: string }
          required: true

  /api/results:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-results>

  /api/billing/{action}:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-billing>
      parameters:
        - in: path
          name: action
          schema: { type: string }
          required: true

  /api/admin/{action}:
    get:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-admin>
      parameters:
        - in: path
          name: action
          schema: { type: string }
          required: true
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-admin>
      parameters:
        - in: path
          name: action
          schema: { type: string }
          required: true

  /api/ai-proxy:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-api-ai-proxy>

  /api/upload:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: <ID_ФУНКЦИИ_potok-upload-asset>
```

Создайте шлюз:
```powershell
yc serverless api-gateway create --name potok-api --spec api-gateway.yaml --description "QuizFlow22 API Gateway"
```

**Сохраните домен шлюза:**
```powershell
yc serverless api-gateway get --name potok-api --format json | ConvertFrom-Json | Select-Object -ExpandProperty domain
# Пример: d5dxxxx.apigw.yandexcloud.net
```

---

## Этап 4. Фронтенд

### 4.1 Обновить .env.production

```env
# .env.production (в корне проекта)
VITE_SUPABASE_URL=https://lntsyybfbunajmzbahrq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://d5dxxxx.apigw.yandexcloud.net/api
VITE_STORAGE_URL=https://storage.yandexcloud.net/potok-quiz-assets
```

### 4.2 Собрать и задеплоить фронтенд

```powershell
npm run build
aws s3 sync dist/ s3://quizflow22-prod/ --endpoint-url https://storage.yandexcloud.net
```

### 4.3 Сбросить кеш CDN (если используется)

В веб-консоли Yandex Cloud: **Cloud CDN** → ваш ресурс → **Очистить кеш** → указать `/*`

---

## Этап 5. Cron-задачи

### 5.1 Создать timer trigger

```powershell
yc serverless trigger create timer --name potok-cron-cleanup `
  --cron-expression "0 * * * ? *" `
  --invoke-function-name potok-cron-cleanup `
  --invoke-function-service-account-id $SA_FUNCTIONS_ID
```

---

## Этап 6. Настройка биллинга

### 6.1 Обновить webhook URL в ЮKassa

1. Зайдите в [личный кабинет ЮKassa](https://yookassa.ru/my/)
2. Настройки → Webhooks
3. Измените URL уведомлений на:
   `https://d5dxxxx.apigw.yandexcloud.net/api/billing/yookassa-webhook`
4. Убедитесь, что событие `payment.succeeded` и `payment.canceled` включены

---

## Проверка работоспособности

После каждого шага проверяйте:

### Проверка 1: БД
```powershell
psql "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=verify-full" -c "SELECT count(*) FROM public.users; SELECT count(*) FROM public.quizzes; SELECT count(*) FROM public.subscriptions;"
```

### Проверка 2: Cloud Functions
```powershell
# Протестировать функцию напрямую (выдаст ошибку 401 — это нормально, значит функция жива)
yc serverless function invoke potok-api-quizzes --data '{"httpMethod":"GET","headers":{},"body":""}'
```

### Проверка 3: API Gateway
```powershell
# Проверить, что шлюз отвечает
curl -s -o /dev/null -w "%{http_code}" https://d5dxxxx.apigw.yandexcloud.net/api/quizzes
# Должен вернуть 401 (нет токена) — значит шлюз работает
```

### Проверка 4: Эндпоинты
```powershell
# Получить токен из Supabase Auth (через браузер, F12 → Application → Local Storage → potok-auth-token)
$TOKEN = "..."

# Список квизов
curl -H "Authorization: Bearer $TOKEN" https://d5dxxxx.apigw.yandexcloud.net/api/quizzes

# Featured квизы (публичный, без токена)
curl https://d5dxxxx.apigw.yandexcloud.net/api/quizzes/featured

# Entitlement
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" https://d5dxxxx.apigw.yandexcloud.net/api/billing/get-entitlement
```

### Проверка 5: Фронтенд в браузере
1. Откройте `https://quizflow22-prod.storage.yandexcloud.net/` (или ваш домен)
2. Откройте **Network** в DevTools
3. Залогиньтесь — должен быть запрос к `VITE_SUPABASE_URL` (Auth)
4. Откройте Dashboard — должен быть запрос к `VITE_API_URL/quizzes`
5. Создайте квиз — POST к `VITE_API_URL/quizzes`
6. Сохраните — PUT к `VITE_API_URL/quizzes/{id}`
7. Удалите — DELETE к `VITE_API_URL/quizzes/{id}`

---

## Что делать, если что-то пошло не так

### Функция не собирается
```powershell
cd yc-functions
npm install
npx esbuild api-quizzes/index.ts --bundle --platform=node --target=node18 --outfile=dist/api-quizzes/index.js
# Смотрите на ошибки в консоли
```

### Lockbox не подключается
```powershell
# Проверьте, что секрет существует:
yc lockbox secret list
yc lockbox secret get --id <LOCKBOX_SECRET_ID>
yc lockbox secret list-versions --id <LOCKBOX_SECRET_ID>
```

### API Gateway возвращает 500
```powershell
# Проверьте, что функция существует и у неё правильный entrypoint
yc serverless function version list --function-name potok-api-quizzes

# Проверьте, что сервисный аккаунт имеет права functions.functionInvoker
yc resource-manager folder list-access-bindings --folder-id <FOLDER_ID>
```

### Не подключается к БД
```powershell
# Проверьте доступность хоста
psql "host=<ХОСТ> port=6432 dbname=quizflow user=quizflow_app sslmode=require" -c "SELECT 1"
# Если не подключается: проверьте, что сервисный аккаунт БД добавлен в кластер
yc managed-postgresql cluster update --name quizflow-db --user name=quizflow_app,permission=quizflow
```

### JWT не верифицируется
```powershell
# Проверьте SUPABASE_URL в Lockbox
yc lockbox secret get --id <LOCKBOX_SECRET_ID>
# URL должен заканчиваться на .supabase.co (без косой черты в конце)
```

---

## Финальный чеклист

- [ ] **Этап 0**: yc CLI настроен, каталог создан, сервисные аккаунты есть
- [ ] **Этап 0.4**: VPC сеть и 2 подсети созданы
- [ ] **Этап 1.1**: Managed PostgreSQL кластер работает
- [ ] **Этап 1.2**: Схема `yc_migration.sql` применена
- [ ] **Этап 1.3**: Данные перенесены из Supabase (`transform_and_import.ps1`)
- [ ] **Этап 2.1**: Бакет `potok-quiz-assets` создан
- [ ] **Этап 2.2**: CORS настроен
- [ ] **Этап 2.3**: Публичный доступ настроен
- [ ] **Этап 2.4**: Ключи доступа созданы и записаны
- [ ] **Этап 2.5**: Файлы перенесены из Supabase Storage
- [ ] **Этап 3.1**: Lockbox `potok-secrets` создан со всеми секретами
- [ ] **Этап 3.2**: 8 Cloud Functions созданы
- [ ] **Этап 3.3**: Все функции задеплоены
- [ ] **Этап 3.4**: API Gateway создан, домен записан
- [ ] **Этап 4.1**: `.env.production` обновлён
- [ ] **Этап 4.2**: Фронтенд собран и задеплоен
- [ ] **Этап 4.3**: Кеш CDN сброшен
- [ ] **Этап 5.1**: Timer trigger для cron-cleanup создан
- [ ] **Этап 6.1**: Webhook URL в ЮKassa обновлён
- [ ] **Все проверки работоспособности пройдены**

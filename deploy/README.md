# Развёртывание в Яндекс Облаке

Поток разворачивается как статический SPA в **Yandex Object Storage** с раздачей через **Yandex CDN**. Supabase используется только для регистрации, входа и выпуска JWT; база данных, Storage assets, AI/admin/billing/support API и сохранение результатов работают через **Yandex Cloud Functions + API Gateway + Managed PostgreSQL/Object Storage**.

```
┌────────────────┐   HTTPS    ┌────────────────────┐  S3 API   ┌──────────────────────┐
│  Пользователь  │ ─────────► │     Yandex CDN     │ ────────► │ Yandex Object Storage│
└────────────────┘            └────────────────────┘           │      (bucket)        │
                                                               └──────────┬───────────┘
                                                                          │ статика
                                                                          ▼
                                                              ┌─────────────────────────┐
                                                              │   SPA в браузере        │
                                                              │   ───────────────────   │
                                                              │   Supabase Auth/DB ◄─── │
                                                              │   ai-proxy (Edge Fn) ◄──│
                                                              └─────────────────────────┘
```

## 1. Подготовка Яндекс Облака

### 1.1. Создать сервисный аккаунт

```bash
yc iam service-account create --name potok-deploy
yc resource-manager folder add-access-binding <FOLDER_ID> \
    --role storage.editor \
    --service-account-id <SERVICE_ACCOUNT_ID>
```

### 1.2. Создать статический ключ доступа (S3)

```bash
yc iam access-key create --service-account-name potok-deploy
```

Сохраните `key_id` и `secret` — это `AWS_ACCESS_KEY_ID` и `AWS_SECRET_ACCESS_KEY`.

### 1.3. Создать бакет

В веб-консоли Object Storage или через CLI:

```bash
yc storage bucket create --name potok-prod \
    --default-storage-class standard \
    --max-size 5368709120 \
    --public-read
```

### 1.4. (Опционально) Подключить CDN-ресурс

Через веб-консоль Yandex Cloud:
1. Создать CDN-ресурс с origin = `potok-prod.website.yandexcloud.net`.
2. Привязать свой домен (если есть) и SSL-сертификат (Let's Encrypt автовыпуск).
3. Скопировать `Resource ID` → в `YC_CDN_RESOURCE_ID`.

## 2. Настройки Supabase

### 2.1. Разрешить CORS для нового домена

В переменных окружения Edge Function `ai-proxy` обновить:

```
AI_PROXY_ALLOWED_ORIGINS=https://<bucket>.website.yandexcloud.net,https://<your-cdn-domain>
```

### 2.2. Auth: добавить redirect URL

Supabase Dashboard → Authentication → URL Configuration → Site URL и Redirect URLs:

```
https://<bucket>.website.yandexcloud.net
https://<your-cdn-domain>
```

## 3. Локальный деплой

### 3.1. Установить инструменты

```bash
# AWS CLI (для работы с S3-совместимым API)
brew install awscli           # macOS
choco install awscli          # Windows

# Yandex Cloud CLI (только если нужна инвалидация CDN)
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash
```

### 3.2. Заполнить `.env`

Скопируйте `.env.example` → `.env` и заполните значения:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
YC_BUCKET=potok-prod
YC_S3_ENDPOINT=https://storage.yandexcloud.net
YC_CDN_RESOURCE_ID=                       # опционально
AWS_ACCESS_KEY_ID=<key_id из шага 1.2>
AWS_SECRET_ACCESS_KEY=<secret из шага 1.2>
```

### 3.3. Запустить деплой

**Linux / macOS:**

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

**Windows (PowerShell):**

```powershell
./deploy/deploy.ps1
```

Скрипт сделает: `npm ci` → `npm run build` → `aws s3 sync ./dist` → применит website + CORS конфиги → опционально сбросит CDN-кэш.

## 4. CI/CD через GitHub Actions

Workflow `.github/workflows/deploy.yml` запускается на каждый push в `main`.

### Секреты в репозитории (Settings → Secrets and variables → Actions)

| Имя | Значение |
|---|---|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon-ключ Supabase |
| `VITE_API_URL` | URL Yandex API Gateway, например `https://<id>.apigw.yandexcloud.net/api` |
| `YC_BUCKET` | имя бакета |
| `YC_S3_ACCESS_KEY_ID` | static access key (см. 1.2) |
| `YC_S3_SECRET_ACCESS_KEY` | static secret key (см. 1.2) |
| `YC_CDN_RESOURCE_ID` | (опц.) ID CDN-ресурса для purge |
| `YC_OAUTH_TOKEN` | (опц.) OAuth-токен для `yc` CLI |
| `YC_CLOUD_ID` | (опц.) Cloud ID |
| `YC_FOLDER_ID` | (опц.) Folder ID |

OAuth-токен для `yc` создаётся через https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb

## 5. Проверка деплоя

- **Прямой URL бакета:** `https://<bucket>.website.yandexcloud.net`
- **Через CDN:** `https://<cdn-domain>`
- **Health-check:** открыть DevTools → Network → убедиться что:
  - `index.html` приходит с `Cache-Control: max-age=0`
  - `assets/*.js` приходит с `Cache-Control: max-age=31536000, immutable`
  - Запросы к Supabase возвращают `200 OK`

## 6. Откат

Так как бакет хранит только последнюю версию, откат делается через redeploy предыдущего коммита:

```bash
git checkout <previous-commit>
./deploy/deploy.sh
git checkout main
```

Для бэкапов рекомендуется включить **версионирование** на бакете:

```bash
aws --endpoint-url=https://storage.yandexcloud.net s3api put-bucket-versioning \
    --bucket potok-prod \
    --versioning-configuration Status=Enabled
```

## 7. Структура `deploy/`

```
deploy/
├── README.md                       # этот файл
├── deploy.sh                       # ручной деплой (Linux/macOS)
├── deploy.ps1                      # ручной деплой (Windows)
└── yandex-cloud/
    ├── website-config.json         # IndexDocument / ErrorDocument
    ├── cors-config.json            # CORS-политика бакета
    └── bucket-policy.json          # пример публичной read-only политики
```

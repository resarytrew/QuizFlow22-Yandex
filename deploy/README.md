# Развёртывание «Потока» в Yandex Cloud

Production состоит из Yandex CDN/Object Storage, API Gateway/Cloud Functions, Managed PostgreSQL, Object Storage для media, Lockbox и Postbox. Frontend обращается к API по same-origin пути `/api`, поэтому session-cookie работает на обоих доменах без передачи токена JavaScript-коду.

```text
Браузер → mykviz.ru (Yandex CDN)
                 ├─ /*    → Object Storage со статикой
                 └─ /api  → API Gateway → Cloud Function → PostgreSQL/Postbox/Object Storage
```

## Frontend

Скопируйте `.env.production.example` в `.env.production` и укажите deployment-значения Object Storage/CDN. `VITE_API_URL` должен оставаться `/api`.

```powershell
./deploy/deploy.ps1
```

```bash
./deploy/deploy.sh
```

Скрипты собирают SPA, синхронизируют `dist` с Object Storage и очищают CDN cache при наличии `YC_CDN_RESOURCE_ID`.

## API и авторизация

1. Добавьте реальные backend-секреты в Lockbox secret `potok-secrets`.
2. Примените `yc-functions/migrations/003_quizflow_auth.sql` командой `./deploy/apply-auth-migration.ps1`.
3. Запустите workflow `Deploy to Yandex Cloud` вручную с `deploy_functions=true` либо `yc-functions/deploy/deploy.ps1`.
4. Выполните `./deploy/configure-api-cdn.ps1`, чтобы `/api` шёл к API Gateway без кеширования.

Полный список значений и внешних настроек: [AUTH_CUTOVER.md](./AUTH_CUTOVER.md).

## GitHub Actions secrets

Workflow использует только deployment credentials:

| Secret | Назначение |
|---|---|
| `YC_OAUTH_TOKEN` | доступ `yc` для deployment |
| `YC_CLOUD_ID` | ID облака |
| `YC_FOLDER_ID` | ID каталога |
| `YC_BUCKET` | бакет со статикой |
| `S3_BUCKET` | бакет media; может совпадать с `YC_BUCKET` |
| `YC_S3_ACCESS_KEY_ID` | S3 key ID для публикации |
| `YC_S3_SECRET_ACCESS_KEY` | S3 secret для публикации |
| `YC_CDN_RESOURCE_ID` | CDN resource для purge |

Runtime-секреты авторизации, базы, billing, AI и Postbox GitHub не получает: Cloud Function читает их из Yandex Lockbox через secret bindings.

## Проверка

- `GET https://mykviz.ru/api/auth/me` без cookie возвращает `401` и `Cache-Control: no-store`.
- После входа ответ содержит `Set-Cookie: qf_session=…; HttpOnly; Secure; SameSite=Lax; Path=/`.
- `POST` с чужим `Origin` возвращает `403`.
- `index.html` не кешируется постоянно, а hashed assets имеют immutable cache.
- В Network нет запросов за пределы Yandex Cloud, кроме прямого OAuth flow на `oauth.yandex.com` и `login.yandex.ru`.

Для отката разверните предыдущий commit. Включённое версионирование Object Storage упрощает восстановление статики.

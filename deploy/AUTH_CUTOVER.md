# Переключение production на QuizFlow Auth

Код не содержит фиктивных production credentials. До deployment новой версии создайте реальные Postbox/Yandex ID значения и сохраните их в Yandex Lockbox secret `potok-secrets`.

## Уже выполнено в production 12.09.2026

- SQL-схема `003_quizflow_auth.sql` применена к текущей Yandex Managed PostgreSQL.
- UUID и существующие строки `public.users` не изменялись.
- Media URL перенесены в Yandex Object Storage; недоступные старые изображения заменены на `https://mykviz.ru/og-image.svg`, недоступные audio/video очищены.
- Повторный просмотр всех text/json/jsonb полей `public` показал `0` ссылок прежнего Storage.
- Временные migration Cloud Functions удалены после проверки.

Миграция идемпотентна, поэтому её можно безопасно повторить перед cutover.

## Обязательные Lockbox keys

```text
PG_HOST
PG_PORT
PG_DATABASE
PG_USER
PG_PASSWORD
PG_CA_CERT

OTP_PEPPER
SESSION_PEPPER
MFA_ENCRYPTION_KEY

YANDEX_OAUTH_CLIENT_ID
YANDEX_OAUTH_CLIENT_SECRET

POSTBOX_SMTP_USER
POSTBOX_SMTP_PASSWORD
POSTBOX_FROM_EMAIL
POSTBOX_FROM_NAME

FRONTEND_URL
ALLOWED_ORIGINS
```

- `OTP_PEPPER` и `SESSION_PEPPER`: независимые случайные значения не менее 32 байт.
- `MFA_ENCRYPTION_KEY`: ровно 32 случайных байта в Base64 или 64 hex-символа.
- `POSTBOX_FROM_EMAIL`: подтверждённый sender, например `no-reply@mykviz.ru`.
- `POSTBOX_FROM_NAME`: `Поток`.
- `FRONTEND_URL`: `https://mykviz.ru`.
- `ALLOWED_ORIGINS`: `https://mykviz.ru,https://mykviz.online`.

Остальные существующие keys billing, AI и Object Storage сохраняются. Секреты не должны иметь префикс `VITE_`.

## Yandex Cloud Postbox

1. Создайте отдельный service account, например `quizflow-mailer`, и дайте ему минимальную роль отправителя Postbox.
2. Создайте SMTP credentials Postbox и сохраните ID/secret как `POSTBOX_SMTP_USER` и `POSTBOX_SMTP_PASSWORD`.
3. Добавьте доменный sender из `POSTBOX_FROM_EMAIL` и подтвердите его.
4. В DNS домена добавьте выданные Postbox записи подтверждения владения и DKIM. Точные имена и значения берутся из карточки sender: их нельзя заранее подставить в репозиторий.
5. Дождитесь статуса sender `Verified`, затем выполните тест регистрации и восстановления.

Runtime отправляет письма только через `postbox.cloud.yandex.net:587` с STARTTLS. Шаблоны имеют plain text и HTML версии.

## Yandex ID

1. Создайте OAuth-приложение для web-сервиса.
2. Разрешите доступ к email и базовой информации профиля.
3. Добавьте единственный production callback:

```text
https://mykviz.ru/api/auth/yandex/callback
```

4. Сохраните application ID и secret в `YANDEX_OAUTH_CLIENT_ID` и `YANDEX_OAUTH_CLIENT_SECRET`.

Backend использует Authorization Code, `state` и PKCE S256. Access token применяется только для запроса профиля и не сохраняется.

## Порядок переключения

1. Сделайте snapshot Managed PostgreSQL.
2. Примените auth schema:

```powershell
./deploy/apply-auth-migration.ps1
```

3. Убедитесь, что все keys присутствуют в `potok-secrets`.
4. Разверните unified API Function с Node.js 22.
5. Обновите API Gateway из `yc-functions/deploy/gateway-spec.yaml`.
6. Настройте same-origin CDN route:

```powershell
./deploy/configure-api-cdn.ps1
```

7. Проверьте `/api/auth/me`, регистрацию/OTP, reset, Yandex OAuth и admin TOTP.
8. Разверните frontend.
9. Проверьте старого пользователя через `forgot-password`: новый credential связывается с прежним `public.users.id`, поэтому квизы, PRO, платежи и подписки остаются на месте.
10. После smoke tests отключите и удалите прежний внешний проект авторизации/хранилища.

## Smoke tests

- Новый пользователь: register → Postbox OTP → verify → `/auth/me` → создать квиз → logout.
- Reset: forgot → Postbox link → новый пароль → прежние sessions revoked → login.
- Yandex ID: start → callback → existing/new UUID mapping → `/auth/me`.
- Admin: password login → TOTP → `current_aal=mfa` → admin panel.
- Existing user: reset/set password → тот же UUID → прежние quizzes/entitlements/payments.

Не включайте новую версию API до подтверждения sender и заполнения всех auth keys: регистрация и reset без Postbox не смогут завершиться.

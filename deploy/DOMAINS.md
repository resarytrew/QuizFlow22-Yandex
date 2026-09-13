# Production domains

- Основной и canonical: `https://mykviz.ru`.
- Дополнительный: `https://mykviz.online`.

Оба домена отдают одну сборку через Yandex CDN. Для cookie-auth каждый домен должен проксировать свой `/api` к одному API Gateway через правило `same-origin-api`; ответы API не кешируются.

В `ALLOWED_ORIGINS` Lockbox укажите:

```text
https://mykviz.ru,https://mykviz.online
```

Redirect URI приложения Yandex ID:

```text
https://mykviz.ru/api/auth/yandex/callback
```

Основной frontend URL в Lockbox:

```text
FRONTEND_URL=https://mykviz.ru
```

После настройки проверьте HTTPS, `/api/auth/me`, регистрацию, восстановление пароля, прямой вход через Яндекс, MFA администратора, возврат ЮKassa и отсутствие кеширования API.

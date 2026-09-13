# Поток — визуальный редактор квизов

«Поток» — React-приложение для создания ветвящихся квизов, публикации, аналитики и экспорта готового квиза в HTML.

## Архитектура

- Frontend: React 19, TypeScript, Vite, Zustand и React Flow.
- Статика: Yandex Object Storage и Yandex CDN.
- API: Yandex API Gateway и единая Yandex Cloud Function.
- Данные и авторизация: Yandex Managed PostgreSQL.
- Media: Yandex Object Storage.
- Письма подтверждения и восстановления: Yandex Cloud Postbox.
- Вход через Яндекс: прямой Yandex ID OAuth 2.0 с `state` и PKCE S256.

Авторизация использует server-side opaque sessions. Браузер получает только cookie `qf_session` с атрибутами `HttpOnly`, `Secure` и `SameSite=Lax`; в PostgreSQL хранится SHA-256 токена. UUID из `public.users.id` остаётся каноническим идентификатором пользователя.

## Локальный запуск

```bash
npm ci
npm run dev
```

Публичная frontend-конфигурация:

```text
VITE_API_URL=/api
VITE_PRIMARY_SITE_URL=https://mykviz.ru
VITE_ADDITIONAL_SITE_ORIGINS=https://mykviz.online
```

Backend-секреты задаются в Yandex Lockbox. Для локальной разработки их можно передать процессу Cloud Functions через непубликуемый `.env`; список приведён в [инструкции переключения](./deploy/AUTH_CUTOVER.md).

## Проверки

```bash
npm run typecheck
npm test
npm run build
npm --prefix yc-functions run lint
npm --prefix yc-functions test
npm --prefix yc-functions run build
```

## Развёртывание

Основная инструкция находится в [deploy/README.md](./deploy/README.md). Перед первым включением новой авторизации выполните [production checklist](./deploy/AUTH_CUTOVER.md): настройте Postbox, Yandex ID, значения Lockbox, примените SQL-миграцию и включите same-origin маршрут `/api` в CDN.

Исторические файлы предыдущей инфраструктуры сохранены в `legacy/supabase-migration` и не входят в runtime, build или deployment.

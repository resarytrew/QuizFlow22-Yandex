# Добавление Secrets в GitHub Actions

## Быстрый способ (рекомендуется)

Запустите скрипт в PowerShell:

```powershell
cd C:\Windows\System32\QuizeFlow22
.\scripts\setup-github-secrets.ps1 -GitHubToken "ghp_ВАШ_ТОКЕН"
```

Скрипт запросит все значения и добавит их автоматически.

---

## Ручной способ (веб-интерфейс)

1. Откройте https://github.com/Resarytrew/QuizeFlow22/settings/secrets/actions
2. Нажмите **New repository secret**
3. Добавьте каждый секрет:

### Yandex Cloud (обязательные для деплоя Functions)

| Имя              | Описание            | Как получить                                                                                     |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `YC_OAUTH_TOKEN` | OAuth токен Яндекса | https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb |
| `YC_CLOUD_ID`    | ID облака           | `yc config list` или веб-консоль Yandex Cloud                                                    |
| `YC_FOLDER_ID`   | ID каталога         | `yc config list` или веб-консоль Yandex Cloud                                                    |

### S3 / CDN (уже могут быть настроены)

| Имя                       | Описание       | Как получить                                                       |
| ------------------------- | -------------- | ------------------------------------------------------------------ |
| `YC_S3_ACCESS_KEY_ID`     | S3 Access Key  | `yc iam access-key create --service-account-name quizflow-storage` |
| `YC_S3_SECRET_ACCESS_KEY` | S3 Secret Key  | Получить при создании ключа                                        |
| `YC_BUCKET`               | Имя бакета     | Название бакета в Yandex Object Storage                            |
| `YC_CDN_RESOURCE_ID`      | ID CDN ресурса | Веб-консоль → Cloud CDN → ваш ресурс                               |

### Frontend Build

| Имя                      | Описание          | Значение                                                         |
| ------------------------ | ----------------- | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL Supabase      | `https://lntsyybfbunajmzbahrq.supabase.co`                       |
| `VITE_SUPABASE_ANON_KEY` | Anon Key Supabase | Ключ из Supabase → Settings → API                                |
| `VITE_API_URL`           | Yandex API Gateway | `https://<id>.apigw.yandexcloud.net/api` |

### Yandex Cloud DB

| Имя           | Описание        | Как получить                                           |
| ------------- | --------------- | ------------------------------------------------------ |
| `PG_HOST`     | Хост PostgreSQL | `yc managed-postgresql cluster list-hosts quizflow-db` |
| `PG_PORT`     | Порт            | `6432`                                                 |
| `PG_DATABASE` | Имя БД          | `quizflow`                                             |
| `PG_USER`     | Пользователь    | `quizflow_app`                                         |
| `PG_PASSWORD` | Пароль          | Придумать при создании кластера                        |
| `PG_CA_CERT`  | CA сертификат   | Содержимое `~/.postgresql/root.crt`                    |

### YooKassa (платежи)

| Имя                      | Описание        | Как получить                                   |
| ------------------------ | --------------- | ---------------------------------------------- |
| `YOOKASSA_SHOP_ID`       | Shop ID         | Личный кабинет YooKassa → Настройки            |
| `YOOKASSA_SECRET_KEY`    | Secret Key      | Личный кабинет YooKassa → Настройки → API keys |
| `BILLING_WEBHOOK_SECRET` | Секрет вебхуков | Придумать и задать в YooKassa → Webhooks       |
| `BILLING_ADMIN_SECRET`   | Админ-секрет    | Придумать (для grant-pro)                      |

### URLs

| Имя               | Описание            | Значение                                  |
| ----------------- | ------------------- | ----------------------------------------- |
| `FRONTEND_URL`    | URL фронтенда       | `https://mykviz.ru`                       |
| `ALLOWED_ORIGINS` | Разрешённые origins | `https://mykviz.ru,http://localhost:5173` |

### AI (YandexGPT)

| Имя             | Описание    | Как получить                 |
| --------------- | ----------- | ---------------------------- |
| `YC_CATALOG_ID` | ID каталога | `yc config list` (folder-id) |

### S3 Bucket for Assets

| Имя         | Описание          | Значение            |
| ----------- | ----------------- | ------------------- |
| `S3_BUCKET` | Бакет для ассетов | `potok-quiz-assets` |

---

## Проверка

После добавления всех secrets:

1. GitHub → Actions → **Deploy to Yandex Cloud**
2. Нажмите **Run workflow**
3. Выберите ветку `main`
4. Отметьте **Deploy Cloud Functions: true**
5. Нажмите **Run workflow**
6. Дождитесь завершения (обычно 5-10 минут)
7. Проверьте логи — все 10 функций должны быть задеплоены

## Получение OAuth токена Яндекса

1. Перейдите по ссылке:
   ```
   https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb
   ```
2. Авторизуйтесь через Яндекс ID
3. Скопируйте токен из URL (между `access_token=` и `&`)
4. Вставьте как `YC_OAUTH_TOKEN`

## Получение Cloud ID и Folder ID

```bash
# Установить yc CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Авторизоваться
yc init

# Посмотреть конфиг
yc config list
# cloud-id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# folder-id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```


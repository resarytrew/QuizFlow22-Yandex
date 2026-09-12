# GitHub secrets token fix

Use a GitHub token with the `repo` scope to update repository Actions secrets.
Do not commit real tokens, anon keys, S3 keys, or OAuth tokens into this file.

```powershell
cd C:\Windows\System32\QuizeFlow22
$env:GH_TOKEN = "ghp_REPLACE_WITH_TOKEN"

&"C:\Program Files\GitHub CLI\gh.exe" secret set VITE_SUPABASE_URL --body "https://lntsyybfbunajmzbahrq.supabase.co" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set VITE_SUPABASE_ANON_KEY --body "replace-with-supabase-anon-key" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set VITE_API_URL --body "https://replace-with-api-gateway-id.apigw.yandexcloud.net/api" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set YC_S3_ACCESS_KEY_ID --body "replace-with-yc-s3-access-key-id" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set YC_S3_SECRET_ACCESS_KEY --body "replace-with-yc-s3-secret-access-key" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set YC_BUCKET --body "quizflow22-prod" -R resarytrew/quize
&"C:\Program Files\GitHub CLI\gh.exe" secret set YC_CDN_RESOURCE_ID --body "replace-with-yc-cdn-resource-id" -R resarytrew/quize
```

The remaining backend secrets must be set from the current Yandex Cloud,
Managed PostgreSQL, YooKassa, and Supabase Auth dashboards:

| Secret | Source |
| --- | --- |
| `YC_OAUTH_TOKEN` | Yandex OAuth |
| `YC_CLOUD_ID` | `yc config list` |
| `YC_FOLDER_ID` | `yc config list` |
| `DATABASE_URL` or `PG_*` | Yandex Managed PostgreSQL |
| `SUPABASE_URL` | Supabase Auth project URL |
| `YOOKASSA_SHOP_ID` | YooKassa dashboard |
| `YOOKASSA_SECRET_KEY` | YooKassa dashboard |
| `BILLING_WEBHOOK_SECRET` | generated secret |
| `FRONTEND_URL` | production frontend URL |
| `ALLOWED_ORIGINS` | production and local origins |
| `YC_CATALOG_ID` | Yandex Cloud folder/catalog ID |
| `S3_BUCKET` | Yandex Object Storage bucket for quiz assets |

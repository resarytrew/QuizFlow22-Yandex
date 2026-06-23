# Production domains

Поток uses one build and one Yandex Object Storage origin for both domains:

- Primary and canonical: `https://mykviz.ru`
- Additional: `https://mykviz.online`
- Origin: `https://mykviz.ru`

Both domains must open the same application. Do not redirect
`mykviz.online` to `mykviz.ru`. The canonical tag still points to
`mykviz.ru` so search engines do not index duplicate pages.

## Yandex Cloud CDN

1. Create one CDN resource with origin
   `potok-prod.website.yandexcloud.net`.
2. Add both source domains to that CDN resource:
   `mykviz.ru` and `mykviz.online`.
3. Issue or attach a TLS certificate covering both names.
4. Copy the CDN resource ID to `YC_CDN_RESOURCE_ID`.
5. Replace the current REG.RU `A` records only after Yandex shows the
   exact CDN CNAME target.
6. Point both apex domains to that target using the record type supported
   by the DNS provider. Do not point them directly to an Object Storage IP.
7. Redirect `www.mykviz.ru` to `https://mykviz.ru` and
   `www.mykviz.online` to `https://mykviz.online`, or attach those names
   and certificates to the CDN as well.

## Supabase Auth

In Authentication -> URL Configuration:

- Site URL: `https://mykviz.ru`
- Redirect URLs:
  - `https://mykviz.ru/**`
  - `https://mykviz.online/**`
  - `http://127.0.0.1:3000/**`
  - `http://localhost:3000/**`

The frontend keeps password reset and signup confirmation on the domain
where the user started the operation.

## Supabase Edge Function secrets

Set the following production values:

```text
AI_PROXY_ALLOWED_ORIGINS=https://mykviz.ru,https://mykviz.online
BILLING_ALLOWED_ORIGINS=https://mykviz.ru,https://mykviz.online
BILLING_RETURN_URL=https://mykviz.ru
```

The checkout function may return a user to either configured domain.
Automatic renewal always uses the primary domain.

## Verification

Check both domains after DNS propagation:

1. HTTPS certificate is valid.
2. `/` and hash routes such as `/#/dashboard` load the same build.
3. Sign up, sign in, password reset, and email confirmation work.
4. AI requests have no CORS errors.
5. YooKassa checkout returns to the application.
6. `index.html` is not cached permanently; hashed assets are immutable.

// supabase/functions/yandex-userinfo/index.ts
// Normalizes Yandex OAuth userinfo for Supabase custom OAuth providers.

const YANDEX_USERINFO_URL = 'https://login.yandex.ru/info?format=json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    return jsonResponse({ error: 'missing_authorization' }, 401);
  }

  const upstream = await fetch(YANDEX_USERINFO_URL, {
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
  });

  const text = await upstream.text();
  let profile: Record<string, unknown>;
  try {
    profile = text ? JSON.parse(text) : {};
  } catch {
    return jsonResponse({ error: 'invalid_yandex_response' }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse(
      {
        error: 'yandex_userinfo_failed',
        status: upstream.status,
        details: profile,
      },
      502,
    );
  }

  const email =
    typeof profile.default_email === 'string'
      ? profile.default_email
      : typeof profile.email === 'string'
        ? profile.email
        : null;

  const realName =
    typeof profile.real_name === 'string'
      ? profile.real_name
      : typeof profile.display_name === 'string'
        ? profile.display_name
        : typeof profile.login === 'string'
          ? profile.login
          : null;

  const avatarId =
    typeof profile.default_avatar_id === 'string'
      ? profile.default_avatar_id
      : null;

  return jsonResponse({
    ...profile,
    sub: String(profile.id ?? profile.client_id ?? profile.login ?? ''),
    email,
    email_verified: Boolean(email),
    name: realName,
    full_name: realName,
    picture: avatarId
      ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
      : null,
    avatar_url: avatarId
      ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
      : null,
  });
});

function serve(handler: (req: Request) => Promise<Response>) {
  if (import.meta.main) {
    return Deno.serve(handler);
  }
  return { finish: () => {} };
}

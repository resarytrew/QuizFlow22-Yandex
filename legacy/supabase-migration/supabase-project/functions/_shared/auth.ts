// supabase/functions/_shared/auth.ts
// Извлечение пользователя из Authorization header.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Re-export timing-safe cron verification so existing callers that import
// from `_shared/auth.ts` keep working without source changes. The
// implementation lives in `_shared/crypto.ts` — see that file for the
// async / hashed variants.
export { verifyCronSecret } from './crypto.ts';

export interface AuthedUser {
  id: string;
  email: string | null;
}

export async function getUserFromRequest(
  req: Request,
  userClient: SupabaseClient,
): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

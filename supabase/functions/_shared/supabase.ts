// supabase/functions/_shared/supabase.ts
// Создание Supabase-клиентов с разными ролями.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[_shared/supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

/** Клиент от имени пользователя (anon) — для проверки JWT через getUser. */
export function createUserClient(authHeader: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: authHeader
      ? { headers: { Authorization: authHeader } }
      : undefined,
  });
}

/** Клиент с service_role — обходит RLS. ТОЛЬКО для доверенных edge-функций. */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { SUPABASE_URL };

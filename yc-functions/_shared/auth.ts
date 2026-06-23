import { createRemoteJWKSet, jwtVerify } from 'jose';
import { query } from './db';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set');
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    );
  }
  return jwks;
}

export interface AuthUser {
  id: string;
  email: string;
  aal: string;
}

export async function verifyAuth(
  authHeader: string | undefined,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `${supabaseUrl}/auth/v1`,
    });

    if (!payload.sub || !payload.email) return null;

    return {
      id: payload.sub as string,
      email: payload.email as string,
      aal: (payload.aal as string) ?? 'aal1',
    };
  } catch (err) {
    const remoteUser = await verifyAuthWithSupabase(token, supabaseUrl);
    if (remoteUser) return remoteUser;

    console.warn('[auth] verify failed:', (err as Error).message);
    return null;
  }
}

async function verifyAuthWithSupabase(
  token: string,
  supabaseUrl: string,
): Promise<AuthUser | null> {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const user = await response.json() as {
      id?: string;
      email?: string;
      aal?: string;
    };

    if (!user.id || !user.email) return null;

    return {
      id: user.id,
      email: user.email,
      aal: user.aal ?? 'aal1',
    };
  } catch (err) {
    console.warn('[auth] Supabase user lookup failed:', (err as Error).message);
    return null;
  }
}

export async function ensureUser(userId: string, email: string): Promise<void> {
  await query(
    `INSERT INTO public.users (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [userId, email],
  );
}

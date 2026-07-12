import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL
    : "";
export const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : "";

const isConfigValid =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";
export const isSupabaseReady = isConfigValid;

// The old project name was "potok" — sessions were stored under
// "potok-auth-token". On first load we copy any existing entry to the
// new key so users don't get logged out after the rename, then delete
// the legacy key.
const NEW_STORAGE_KEY = "potok-auth-token";
const LEGACY_STORAGE_KEYS = ["potok-auth-token"];

function migrateLegacySession() {
  if (typeof localStorage === "undefined") return;
  try {
    // If the new key already has a session, leave it alone. The user is
    // already on the new auth flow and we must not stomp a valid token.
    if (localStorage.getItem(NEW_STORAGE_KEY)) return;

    // Before touching any legacy key, validate its shape. Supabase stores
    // sessions as JSON; corrupt or partial JSON would crash the auth
    // client on first read. Parse the legacy value, validate it has the
    // expected fields, and only then copy it across.
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const hasShape =
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.access_token === "string" &&
          parsed.access_token.length > 0 &&
          typeof parsed.refresh_token === "string" &&
          typeof parsed.expires_at === "number";
        if (!hasShape) {
          // Drop the bad legacy entry; we'd rather sign the user out than
          // boot the client into an unparseable state.
          localStorage.removeItem(legacyKey);
          continue;
        }
        localStorage.setItem(NEW_STORAGE_KEY, raw);
        localStorage.removeItem(legacyKey);
        // Migrate once; do not chain to other legacy keys.
        break;
      } catch {
        // Corrupt JSON — drop it.
        localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // localStorage may be unavailable (private mode, etc.) — ignore.
  }
}

let supabase!: SupabaseClient;

if (!isConfigValid) {
  console.warn(
    "Supabase credentials are not set. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Authentication features are disabled.",
  );
} else {
  migrateLegacySession();
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: NEW_STORAGE_KEY,
      flowType: "pkce",
    },
  });
}

export { supabase };

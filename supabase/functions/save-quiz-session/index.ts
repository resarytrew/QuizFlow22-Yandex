import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MAX_EMAIL_LEN,
  MAX_NAME_LEN,
  MAX_PATH_ELEMENTS,
  MAX_SCORE,
  MAX_TIME_SECONDS,
  UUID_RE,
  clampInt,
  clampPathData,
} from "../_shared/validators.ts";
import { timingSafeEqual } from "../_shared/crypto.ts";
import { jsonResponse, handleCorsPreflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per IP per window
// NOTE: in-memory лимит не переживает cold start и не общий между инстансами.
// Это лишь грубая защита; для строгих лимитов нужен общий стор (БД/Redis).
const rateMap = new Map<string, { count: number; reset: number }>();

// Поля, которые клиент НЕ имеет права задавать/менять (защита от mass-assignment).
const PROTECTED_FIELDS = new Set([
  "id",
  "quiz_id",
  "user_id",
  "session_token",
  "created_at",
]);
// Поля, которые клиент может обновлять.
const UPDATABLE_FIELDS = new Set([
  "status",
  "score",
  "variables",
  "achievements",
  "path_data",
  "participant_name",
  "participant_email",
  "time_spent_seconds",
  "completed_at",
  "updated_at",
]);
const ALLOWED_STATUS = new Set(["in_progress", "completed", "abandoned"]);

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
  if (now > e.reset) {
    e.count = 0;
    e.reset = now + RATE_LIMIT_WINDOW_MS;
  }
  e.count++;
  rateMap.set(ip, e);
  return e.count <= RATE_LIMIT_MAX;
}

/** Оставляет только разрешённые к обновлению поля, отбрасывая защищённые. */
export function pickUpdatableFields(session: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(session)) {
    if (PROTECTED_FIELDS.has(k)) continue;
    if (!UPDATABLE_FIELDS.has(k)) continue;
    out[k] = v;
  }
  // Нормализация и ограничения значений.
  if ("status" in out && !ALLOWED_STATUS.has(String(out.status))) {
    delete out.status;
  }
  if ("score" in out) {
    out.score = clampInt(out.score, 0, MAX_SCORE, 0);
  }
  if ("time_spent_seconds" in out) {
    out.time_spent_seconds = clampInt(out.time_spent_seconds, 0, MAX_TIME_SECONDS, 0);
  }
  if (typeof out.participant_name === "string") {
    out.participant_name = (out.participant_name as string).slice(0, MAX_NAME_LEN);
  }
  if (typeof out.participant_email === "string") {
    out.participant_email = (out.participant_email as string).slice(0, MAX_EMAIL_LEN);
  }
  // Phase 2 SQL hardening: column-level CHECK rejects path_data with > 1000
  // elements. Clamp pre-emptively to keep legitimate long quizzes saving.
  if ("path_data" in out) {
    out.path_data = clampPathData(out.path_data, MAX_PATH_ELEMENTS);
  }
  out.updated_at = new Date().toISOString();
  return out;
}

/**
 * Best-effort extraction of the caller's user_id from the Authorization
 * header. Returns null for anonymous requests, invalid tokens, or any
 * Supabase error. The session row's user_id is informational — it lets
 * the uniq_user_quiz_in_progress partial index serialize a single
 * authenticated user's in_progress sessions per quiz. Anonymous callers
 * stay user_id=NULL and the index does not apply.
 */
async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  // Need anon key + the user's JWT to call auth.getUser. If SUPABASE_ANON_KEY
  // is not configured we silently skip (anonymous behaviour preserved).
  // Read on every call (not module load) so tests can flip the env.
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseAnonKey) return null;
  try {
    const userClient = createClient(SUPABASE_URL, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await userClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Exported wrapper around the local `extractUserId` so unit tests can
 * call it without recreating the Authorization-header parsing. The
 * Supabase client is created internally based on the current env.
 */
export async function extractUserIdForRequest(req: Request): Promise<string | null> {
  return extractUserId(req);
}

if (import.meta.main) {
  serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  // Shared CORS preflight — handles OPTIONS via _shared/cors.ts.
  // The preflight branch must come before method check so cross-origin
  // browsers can negotiate the request.
  const pre = handleCorsPreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const ip = getIp(req);
  if (!checkRate(ip)) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429, origin);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, origin);
  }

  // Ограничение размера полезной нагрузки.
  try {
    if (JSON.stringify(body || {}).length > 256 * 1024) {
      return jsonResponse({ error: "Payload too large" }, 413, origin);
    }
  } catch {
    return jsonResponse({ error: "Invalid payload" }, 400, origin);
  }

  const { action, session } = body || {};
  if (
    !action ||
    !session ||
    typeof session !== "object" ||
    !session.id ||
    typeof session.id !== "string"
  ) {
    return jsonResponse({ error: "Invalid payload" }, 400, origin);
  }
  if (!UUID_RE.test(session.id)) {
    return jsonResponse({ error: "Invalid session id" }, 400, origin);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    if (action === "create") {
      if (
        typeof session.quiz_id !== "string" ||
        !UUID_RE.test(session.quiz_id)
      ) {
        return jsonResponse({ error: "Invalid quiz_id" }, 400, origin);
      }

      // Квиз должен существовать и иметь допустимый visibility.
      //   * public  → доступен любым гостям и авторизованным
      //   * unlisted → доступен любым, кто знает UUID (по ссылке)
      //   * private  → только владельцу; гостям возвращаем 403 (без
      //                раскрытия факта существования)
      const userId = await extractUserId(req);
      const { data: quiz, error: qe } = await supabase
        .from("quizzes")
        .select("id,user_id,visibility")
        .eq("id", session.quiz_id)
        .maybeSingle();
      if (qe) {
        console.error("[save-quiz-session] quiz lookup error", qe);
        return jsonResponse({ error: "Internal error" }, 500, origin);
      }
      if (!quiz) {
        return jsonResponse(
          { error: "Quiz not found" },
          404,
          origin,
        );
      }
      if (quiz.visibility === "private" && quiz.user_id !== userId) {
        // Не раскрываем существование private-квиза гостям.
        return jsonResponse(
          { error: "Quiz not found" },
          404,
          origin,
        );
      }
      if (quiz.visibility !== "public" && quiz.visibility !== "unlisted" &&
          !(quiz.visibility === "private" && quiz.user_id === userId)) {
        // Defensive: не должно сработать (CHECK constraint), но на случай
        // рассинхрона visibility↔RLS отказываем в доступе явно.
        return jsonResponse(
          { error: "Quiz not playable" },
          403,
          origin,
        );
      }

      // Phase 2 SQL hardening: uniq_user_quiz_in_progress prevents a single
      // authenticated user from holding two simultaneous in_progress sessions
      // for the same quiz. If the caller is authenticated, mark any pre-existing
      // in_progress row for (user_id, quiz_id) as 'abandoned' so the new INSERT
      // does not collide with the partial unique index. Anonymous callers
      // (user_id=NULL) are exempt from the index — multiple visitors can play
      // the same quiz simultaneously.
      if (userId) {
        const { error: abErr } = await supabase
          .from("quiz_sessions")
          .update({
            status: "abandoned",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("quiz_id", session.quiz_id)
          .eq("status", "in_progress");
        if (abErr) {
          console.warn(
            "[save-quiz-session] abandon-existing failed",
            abErr.message,
          );
          // Non-fatal: the partial unique index will still reject duplicate
          // INSERTs, so the user sees a clean error rather than silently
          // accumulating in_progress rows.
        }
      }

      // Токен владения генерируется СЕРВЕРОМ. Возвращается клиенту один раз.
      const sessionToken = crypto.randomUUID();
      const safe = pickUpdatableFields(session);
      const row = {
        ...safe,
        id: session.id,
        quiz_id: session.quiz_id,
        // user_id is server-derived from the Authorization header. Mass-assignment
        // protection (PROTECTED_FIELDS) blocks the client from spoofing it.
        ...(userId ? { user_id: userId } : {}),
        session_token: sessionToken,
        status: ALLOWED_STATUS.has(String(safe.status))
          ? safe.status
          : "in_progress",
        started_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase
        .from("quiz_sessions")
        .insert([row]);
      if (insErr) {
        console.error("[save-quiz-session] insert error", insErr);
        return jsonResponse({ error: "Insert failed" }, 500, origin);
      }
      return jsonResponse(
        { ok: true, session_token: sessionToken },
        200,
        origin,
      );
    }

    if (action === "update" || action === "complete" || action === "abandon") {
      // Проверка владения: без валидного токена изменения запрещены.
      const token = session.session_token;
      if (typeof token !== "string" || !token) {
        return jsonResponse({ error: "session_token required" }, 401, origin);
      }

      const { data: existing, error: le } = await supabase
        .from("quiz_sessions")
        .select("id,session_token,status,quiz_id")
        .eq("id", session.id)
        .maybeSingle();
      if (le) {
        console.error("[save-quiz-session] lookup error", le);
        return jsonResponse({ error: "Internal error" }, 500, origin);
      }
      if (!existing) {
        // Не раскрываем, существует ли сессия.
        return jsonResponse({ error: "Forbidden" }, 403, origin);
      }
      if (!timingSafeEqual(String(existing.session_token ?? ""), token)) {
        return jsonResponse({ error: "Forbidden" }, 403, origin);
      }

      // Terminal sessions are immutable: an attacker who obtained the
      // token (XSS, leaked logs, devtools) cannot retroactively mutate
      // a completed or abandoned session.
      if (existing.status === "completed" || existing.status === "abandoned") {
        return jsonResponse(
          { error: "session_locked", status: existing.status },
          409,
          origin,
        );
      }

      // session_token is also part of the lookup key for the create above.
      // The body also carries it, but it must not be propagated as a
      // client-writable column. Make sure pickUpdatableFields already
      // filtered it via PROTECTED_FIELDS — it does.
      //
      // We do NOT rotate the token on complete/abandon. Earlier design
      // generated a new session_token on terminal transitions, but that
      // raced against the client's save-quiz-result call: the server
      // rotated before saveResults arrived, and saveResults was rejected
      // with 403 because it carried the now-stale token. The terminal
      // status check above already prevents further mutations to the
      // session row, so token rotation adds no security — it just
      // introduces a window of broken saves. Keep the token stable.
      const updates = pickUpdatableFields(session);
      if (action === "complete") updates.status = "completed";
      if (action === "abandon") updates.status = "abandoned";

      const { error: updErr } = await supabase
        .from("quiz_sessions")
        .update(updates)
        .eq("id", session.id);
      if (updErr) {
        console.error("[save-quiz-session] update error", updErr);
        return jsonResponse({ error: "Update failed" }, 500, origin);
      }
      return jsonResponse({ ok: true }, 200, origin);
    }

    return jsonResponse({ error: "Unknown action" }, 400, origin);
  } catch (e) {
    console.error("[save-quiz-session] exception", e);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
  });
}

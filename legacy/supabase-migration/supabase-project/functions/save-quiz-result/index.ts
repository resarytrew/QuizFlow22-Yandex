import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MAX_FINAL_NODE_TITLE_LEN,
  MAX_NAME_LEN,
  MAX_PATH_ELEMENTS,
  MAX_SCORE,
  MAX_TIME_SECONDS,
  UUID_RE,
  clampInt,
  clampPathData,
  str,
} from "../_shared/validators.ts";
import { timingSafeEqual } from "../_shared/crypto.ts";
import { jsonResponse, handleCorsPreflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per IP per window
const rateMap = new Map<string, { count: number; reset: number }>();

/**
 * Validates the body shape of a save-quiz-result request. Returns
 * either the validated fields on success or an HTTP Response
 * describing the failure (400/401/413). Exported for unit testing —
 * the downstream DB writes (quiz lookup, session lookup, atomic RPC)
 * are too Supabase-coupled to test in isolation and are covered by
 * integration tests.
 */
export function validateResultBody(
  body: unknown,
  origin: string | null,
):
  | { ok: true; data: ValidatedResultBody }
  | { ok: false; response: Response } {
  // Defensive null guard (body may be null when req.json() returns null).
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      response: jsonResponse({ error: "valid quiz_id required" }, 400, origin),
    };
  }
  const b = body as Record<string, unknown>;
  const {
    quiz_id,
    session_id,
    session_token,
  } = b;

  if (typeof quiz_id !== "string" || !UUID_RE.test(quiz_id)) {
    return {
      ok: false,
      response: jsonResponse({ error: "valid quiz_id required" }, 400, origin),
    };
  }
  if (typeof session_id !== "string" || !UUID_RE.test(session_id)) {
    return {
      ok: false,
      response: jsonResponse({ error: "valid session_id required" }, 400, origin),
    };
  }
  if (typeof session_token !== "string" || !session_token) {
    return {
      ok: false,
      response: jsonResponse({ error: "session_token required" }, 401, origin),
    };
  }
  return {
    ok: true,
    data: {
      quiz_id,
      session_id,
      session_token,
      score: b.score,
      final_node_title: b.final_node_title,
      participant_name: b.participant_name,
      results_data: b.results_data,
      path_data: b.path_data,
      time_spent_seconds: b.time_spent_seconds,
    },
  };
}

export interface ValidatedResultBody {
  quiz_id: string;
  session_id: string;
  session_token: string;
  score: unknown;
  final_node_title: unknown;
  participant_name: unknown;
  results_data: unknown;
  path_data: unknown;
  time_spent_seconds: unknown;
}

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

/**
 * Best-effort extraction of the caller's user_id from the Authorization
 * header. Returns null for anonymous requests, invalid tokens, or any
 * Supabase error. Used only to gate private-quiz access — anon callers
 * who hit a public/unlisted quiz are not affected.
 */
async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
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

if (import.meta.main) {
  serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  // Shared CORS preflight — handles OPTIONS via _shared/cors.ts.
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

  const validation = validateResultBody(body, origin);
  if (!validation.ok) return validation.response;
  const {
    quiz_id,
    session_id,
    session_token,
    score,
    final_node_title,
    participant_name,
    results_data,
    path_data,
    time_spent_seconds,
  } = validation.data;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Квиз должен существовать и иметь допустимый visibility.
    //   * public  → доступен любым гостям и авторизованным
    //   * unlisted → доступен любым, кто знает UUID (по ссылке)
    //   * private  → только владельцу; гостям возвращаем 403 (без
    //                раскрытия факта существования)
    const { data: quiz, error: qErr } = await supabase
      .from("quizzes")
      .select("id,user_id,visibility")
      .eq("id", quiz_id)
      .maybeSingle();
    if (qErr) {
      console.error("[save-quiz-result] quiz lookup error", qErr);
      return jsonResponse({ error: "Internal error" }, 500, origin);
    }
    if (!quiz) {
      return jsonResponse({ error: "Quiz not found" }, 404, origin);
    }
    if (quiz.visibility === "private") {
      // Для результата нужна авторизация: сессия могла быть создана
      // раньше (когда квиз был public) и остаться валидной, поэтому
      // сверяем user_id через сессионный токен ниже.
      // Здесь просто прячем существование от гостей.
      const userId = await extractUserId(req);
      if (quiz.user_id !== userId) {
        return jsonResponse({ error: "Quiz not found" }, 404, origin);
      }
    }
    if (quiz.visibility !== "public" && quiz.visibility !== "unlisted" &&
        !(quiz.visibility === "private")) {
      // Defensive: CHECK constraint already restricts visibility to the
      // three known values; any other value is rejected.
      return jsonResponse({ error: "Quiz not playable" }, 403, origin);
    }

    // Проверка владения сессией: результат можно сохранить только для реальной
    // сессии этого квиза, и только владельцу токена. Закрывает накрутку (SEC-02).
    const { data: sess, error: sErr } = await supabase
      .from("quiz_sessions")
      .select("id,quiz_id,session_token,status")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr) {
      console.error("[save-quiz-result] session lookup error", sErr);
      return jsonResponse({ error: "Internal error" }, 500, origin);
    }
    if (!sess || sess.quiz_id !== quiz_id) {
      return jsonResponse({ error: "Session not found for quiz" }, 403, origin);
    }
    if (!timingSafeEqual(String(sess.session_token ?? ""), session_token)) {
      return jsonResponse({ error: "Forbidden" }, 403, origin);
    }
    if (sess.status !== "completed" && sess.status !== "in_progress") {
      // No result for an abandoned session.
      return jsonResponse(
        { error: "session_not_completable", status: sess.status },
        409,
        origin,
      );
    }

    // Idempotency + terminal-status protection is enforced by the
    // save_quiz_result_atomic RPC (migration 20260606000000_atomic.sql).
    // The function checks session_token with constant-time compare,
    // refuses to write for terminal sessions, and upserts under
    // UNIQUE(session_id). The previous JS-side check-then-insert had
    // a TOCTOU window and allowed re-saving completed results.
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "save_quiz_result_atomic",
      {
        p_quiz_id: quiz_id,
        p_session_id: session_id,
        p_session_token: session_token,
        p_score: clampInt(score, 0, MAX_SCORE, 0),
        p_final_node_title: str(final_node_title, MAX_FINAL_NODE_TITLE_LEN, "Завершено"),
        p_participant_name: str(participant_name, MAX_NAME_LEN, "Guest"),
        p_results_data:
          results_data && typeof results_data === "object" ? results_data : {},
        p_path_data: clampPathData(path_data, MAX_PATH_ELEMENTS),
        p_time_spent_seconds: clampInt(time_spent_seconds, 0, MAX_TIME_SECONDS, 0),
      },
    );

    if (rpcErr) {
      // Map common PG error codes to client status. The RPC raises:
      //   42501 'session_token_mismatch'  → 403
      //   42501 'session_abandoned'       → 409
      //   P0002 'session_not_found'       → 404
      console.error("[save-quiz-result] rpc error", rpcErr);
      const msg = (rpcErr.message || "").toLowerCase();
      if (msg.includes("session_token_mismatch")) {
        return jsonResponse({ error: "Forbidden" }, 403, origin);
      }
      if (msg.includes("session_abandoned")) {
        return jsonResponse(
          { error: "session_abandoned" },
          409,
          origin,
        );
      }
      if (msg.includes("session_not_found")) {
        return jsonResponse({ error: "Session not found" }, 404, origin);
      }
      return jsonResponse({ error: "Insert failed" }, 500, origin);
    }

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return jsonResponse(
      { ok: true, already_saved: row?.already_saved === true },
      200,
      origin,
    );
  } catch (e) {
    console.error("[save-quiz-result] exception", e);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
  });
}

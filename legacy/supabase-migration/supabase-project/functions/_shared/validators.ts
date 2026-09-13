// supabase/functions/_shared/validators.ts
//
// Input-validation helpers shared by save-quiz-* / billing-* / ai-proxy
// edge functions. The cap constants (MAX_PATH_ELEMENTS, MAX_EMAIL_LEN,
// etc.) MUST match the SQL CHECK constraints added in
// 20260608000000_phase2_sql_hardening.sql — the test files verify this
// invariant.
//
// Naming: each constant is a CAPS_SNAKE_CASE integer. Functions are
// camelCase. Tests in _shared/validators.test.ts and _shared/path_data_clamp.test.ts
// import these directly — no more re-declaration of helpers in tests.

// Phase 2 SQL hardening — see migration chk_quiz_results_path_data_size /
// chk_quiz_sessions_path_data_size. We clamp path_data to the last N
// elements (the path is chronological; the tail is the most recent
// navigation).
export const MAX_PATH_ELEMENTS = 1000;

// Phase 2 SQL hardening — chk_quiz_sessions_email_len and
// chk_quiz_results_email_len cap at 320 chars (RFC 5321 hard limit).
export const MAX_EMAIL_LEN = 320;

// participant_name is not yet constrained at the DB level (kept flexible
// for i18n / display-name lengths), but the edge function clamps to
// 200 chars to match the existing UI.
export const MAX_NAME_LEN = 200;

// save_quiz_result_atomic clamps p_score to [0, 1_000_000]. The CHECK
// constraint is more permissive (0..10_000_000) so legitimate edits
// outside the RPC are not blocked, but the edge function uses the
// tighter bound.
export const MAX_SCORE = 1_000_000;

// 7 days. The CHECK constraint caps time_spent_seconds at 604_800 too.
export const MAX_TIME_SECONDS = 604_800;

// final_node_title is the human-readable label of the quiz's terminal
// node. The DB column is text (no CHECK), but the edge function clamps
// to 300 chars to keep payloads reasonable.
export const MAX_FINAL_NODE_TITLE_LEN = 300;

// UUID v4-ish shape. Accepts both lower- and upper-case hex digits.
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Coerce a value to a clamped integer.
 *
 *   * NaN / Infinity / non-numeric / undefined → `fallback`.
 *   * null coerces to 0 (not fallback). This is JS's `Number(null) === 0`
 *     quirk; the test in `validators.test.ts` documents it.
 *   * Finite numbers are truncated toward zero, then clamped to
 *     [min, max].
 */
export function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

/**
 * Clamp a string to `max` characters. Returns `fallback` for any
 * non-string or empty input.
 */
export function str(v: unknown, max: number, fallback: string): string {
  return typeof v === "string" && v.length ? v.slice(0, max) : fallback;
}

/**
 * Clamp `path_data` to the last `max` elements. Non-array inputs
 * (null, undefined, object, string) collapse to an empty array.
 *
 * This function is a pure helper — it does not validate element
 * shape. Callers that need a stricter contract (e.g. "must be a
 * string-id array") should validate before calling.
 *
 * The function is non-mutating: it always returns a new array, even
 * when the input is already within the cap. This matches the contract
 * tested in `path_data_clamp.test.ts`.
 */
export function clampPathData(
  v: unknown,
  max: number = MAX_PATH_ELEMENTS,
): unknown[] {
  if (!Array.isArray(v)) return [];
  if (v.length <= max) return v.slice();
  return v.slice(-max);
}

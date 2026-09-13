// supabase/functions/_shared/crypto.ts
//
// Centralised cryptographic helpers used by every edge function.
// All timing-sensitive comparisons MUST go through `timingSafeEqual` to
// prevent length / character-level timing oracles. A char-by-char XOR
// loop runs over the longer of the two inputs, so the wall-clock time
// correlates with max(|a|, |b|) rather than with the first mismatching
// position.
//
// SHA-256 helpers are also provided. The most common use is the
// "hashed webhook secret" pattern in billing-yookassa-webhook: the
// operator stores SHA-256(secret) in env, and the runtime hashes the
// inbound `?key=` query param before constant-time compare. This means
// the raw secret never needs to be inlined into deployment manifests /
// CI logs — only its hash. The runtime behaviour is identical to a
// direct compare (timing-safe, length-independent after hashing).

/**
 * Constant-time string comparison.
 *
 * Returns false on any non-string input or length mismatch (the length
 * check itself is `O(1)` and is not data-dependent). The main loop
 * visits every character of the longer input regardless of where the
 * first mismatch occurs, so the function's wall-clock time is
 * dominated by max(|a|, |b|), not the first differing byte.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const lengthDiff = (a.length ^ b.length) !== 0;
  const maxLen = a.length > b.length ? a.length : b.length;
  let diff = lengthDiff ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * SHA-256 of a string, returned as a lowercase hex digest.
 * Uses the Web Crypto API (built into Deno and every modern runtime).
 * Returns an empty string on missing / non-string input — callers
 * that need to distinguish "no input" from "empty input" should
 * check `raw` before calling.
 */
export async function sha256Hex(raw: string): Promise<string> {
  if (typeof raw !== "string" || raw.length === 0) return "";
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a provided secret against a stored SHA-256 hex digest.
 *
 * - If `expectedHash` is empty / non-hex / wrong length → returns false
 *   (env not configured or malformed).
 * - If `provided` is empty → returns false.
 * - Otherwise: hashes `provided`, then constant-time compares the two
 *   hex digests. Both digests are always 64 chars (256 bits → 64 hex
 *   chars) so the inner `timingSafeEqual` runs in 64 iterations
 *   regardless of secret length — the runtime does not leak input
 *   length.
 *
 * This is the primary API for edge functions: webhook entrypoints
 * are already async, and we want a single `await` at the top of the
 * handler to compute the hash.
 */
export async function verifyHashedSecret(
  provided: string,
  expectedHash: string,
): Promise<boolean> {
  if (typeof provided !== "string" || provided.length === 0) return false;
  if (typeof expectedHash !== "string" || expectedHash.length !== 64) {
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(expectedHash)) return false;
  const got = await sha256Hex(provided);
  if (got.length !== expectedHash.length) return false;
  return timingSafeEqual(got.toLowerCase(), expectedHash.toLowerCase());
}

/**
 * Verify a `X-Cron-Secret` header against `BILLING_CRON_SECRET`.
 *
 * Behaviour:
 *   * If env is not configured → returns false (refuse to run cron).
 *   * Length mismatch → returns false (length is not data-dependent).
 *   * Otherwise → constant-time XOR loop.
 *
 * This is the synchronous, raw-secret variant. If you want the
 * "hashed env" mode (`BILLING_CRON_SECRET_HASH`), use
 * `verifyCronSecretAsync` instead — SHA-256 is intrinsically async.
 * The hashed env var is ignored by this function and the request is
 * rejected, so an operator who has rotated to hashed env cannot
 * accidentally fall through to the (empty) raw secret.
 */
export function verifyCronSecret(req: Request): boolean {
  const expected = Deno.env.get("BILLING_CRON_SECRET") ?? "";
  const expectedHash = Deno.env.get("BILLING_CRON_SECRET_HASH") ?? "";
  const got = req.headers.get("X-Cron-Secret") ?? "";

  // Hashed env is set: refuse to fall through to a raw compare. The
  // async variant is the only safe path here.
  if (expectedHash) return false;

  if (!expected) return false;
  if (got.length === 0) return false;
  return timingSafeEqual(got, expected);
}

/**
 * Async variant of `verifyCronSecret` — supports both raw and hashed
 * env vars. Use this from cron edge functions (they are already
 * `async`). Hashed env is preferred for production: the operator
 * stores SHA-256(secret) in env, and the raw secret never appears in
 * deployment manifests / CI logs.
 */
export async function verifyCronSecretAsync(req: Request): Promise<boolean> {
  const expected = Deno.env.get("BILLING_CRON_SECRET") ?? "";
  const expectedHash = Deno.env.get("BILLING_CRON_SECRET_HASH") ?? "";
  const got = req.headers.get("X-Cron-Secret") ?? "";

  if (expectedHash) {
    return await verifyHashedSecret(got, expectedHash);
  }
  if (!expected) return false;
  if (got.length === 0) return false;
  return timingSafeEqual(got, expected);
}

# Поток — Test Results

Accumulated test results across all 3 runners (Deno, Vitest, SQL).
Updated on each CI run. Last refreshed: 2026-06-06.

## Summary

| Runner                       | Test files | Tests |  Pass |  Fail |  Skip | Command                             |
| ---------------------------- | ---------- | ----: | ----: | ----: | ----: | ----------------------------------- |
| **Deno** (edge fns + shared) | 12         |   197 |   197 |     0 |     0 | `npm run test:functions`            |
| **Vitest** (frontend utils)  | 25         |   377 |   377 |     0 |     0 | `npm test`                          |
| **SQL** (psql, manual/CI)    | 3          |   ~30 | n/a\* | n/a\* | n/a\* | `psql $URL -f supabase/tests/*.sql` |

\* SQL tests are not part of `npm test` — they're run separately against a live Supabase project after `supabase db reset`. See `README_DOCUMENTATION.md §21.5`.

**Total automated (Deno + Vitest): 574 tests, 574 passing.**

## Deno — breakdown

| File                                                        | Tests | Notes                                                                                                                                 |
| ----------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/_shared/cors.test.ts`                   |    14 | env snapshot/restore pattern, 7 cases for `corsHeaders`, 2 for `jsonResponse`, 3 for `handleCorsPreflight`, 2 for precedence/fallback |
| `supabase/functions/_shared/yookassa.test.ts`               |    33 | IPv4 literal matches, CIDR ranges (/27, /25), IPv6 literal-only, malformed input, X-Forwarded-For parsing                             |
| `supabase/functions/_shared/entitlement.test.ts`            |    22 | full `FEATURE_MATRIX` coverage per plan, unknown-key safe default, 403 response shape                                                 |
| `supabase/functions/_shared/auth.test.ts`                   |     9 | no header, non-Bearer, empty token, valid, no email, error, no user, case-sensitivity                                                 |
| `supabase/functions/_shared/crypto.test.ts`                 |    17 | `timingSafeEqual` (6) + `sha256Hex` (5) + `verifyHashedSecret` (4) + edge cases                                                       |
| `supabase/functions/_shared/validators.test.ts`             |    16 | `UUID_RE` (4) + `clampInt` (5) + `str` (4) + `clampPathData` (3)                                                                      |
| `supabase/functions/_shared/free_tier_defaults.test.ts`     |     6 | free tier shape stability                                                                                                             |
| `supabase/functions/_shared/path_data_clamp.test.ts`        |     5 | cross-layer parity (edge ↔ RPC)                                                                                                       |
| `supabase/functions/billing-create-checkout/index.test.ts`  |    31 | open-redirect guards: 20 for `safeReturnPath`, 11 for `resolveAllowedSiteOrigin`                                                      |
| `supabase/functions/billing-yookassa-webhook/index.test.ts` |    16 | 4-layer webhook validation (secret, IP, size, JSON shape)                                                                             |
| `supabase/functions/save-quiz-session/index.test.ts`        |    18 | mass-assignment, clamps, user_id extraction                                                                                           |
| `supabase/functions/save-quiz-result/index.test.ts`         |    12 | body validation: quiz_id/session_id UUID, session_token 401                                                                           |

## Vitest — breakdown

| File                                                   | Tests | Notes                                                                                                                                              |
| ------------------------------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/parseText.test.ts`                              |    20 | Markdown rendering (bold, italic, headings, lists, links, code blocks, newlines) + XSS guards (script, javascript:, onerror, iframe, style, data:) |
| `utils/videoUtils.test.ts`                             |    16 | RuTube URL extraction (canonical, embed, www, http), rejection (YouTube, Vimeo, plain text), embed URL construction                                |
| `utils/safeCssUrl.test.ts`                             |    29 | CSS `url(...)` allowlist for http/https + escape for inline contexts                                                                                |
| `services/parseQuizText.test.ts`                       |    15 | Edge cases in the standalone-engine markdown pipeline                                                                                             |
| `services/__tests__/state.test.ts`                     |    37 | `state.ts` reducers, path clamp, score guard, visited set                                                                                         |
| `services/__tests__/indexing.test.ts`                  |    37 | `buildIndexes` — node/edge maps, parent index, handle normalization                                                                                |
| `services/__tests__/sanitize.test.ts`                  |    45 | `sanitizeAssetUrl` + DOMPurify integration                                                                                                         |
| `services/__tests__/hud.test.ts`                       |     4 | HUD update + throttle                                                                                                                              |
| `services/__tests__/navigation.test.ts`                |    27 | `processNode` (UI/logic/groupNode/circuit-breaker), `resolveNextNode` (depth + group-traversal), `getNextNodeId` + edge effects                  |
| `services/__tests__/persistence.test.ts`               |    10 | `saveResults` (payload, idempotency, error swallow) + `sendAbandonmentBeacon` (saved/idempotent/missing-config/missing-API)                      |
| `services/__tests__/quizGeneratorHtml.test.ts`         |     3 | End-to-end: default template renders without `ReferenceError` on `quizData` (C-QUIZ-DATA bug)                                                       |
| `services/quizGenerator/__tests__/serialize.test.ts`   |    13 | XSS-safe JSON (`</script>`, `<!--`, `&`, U+2028/2029), circular refs, undefined                                                                       |
| `services/quizGenerator/__tests__/index.test.ts`       |    18 | `generateQuizHtml` happy path, payload injection, CSP/Tailwind, fallback HTML, legacy API                                                            |
| `services/quizGenerator/__tests__/csp.test.ts`         |    13 | CSP meta tag: `default-src`, `connect-src` per Supabase origin, hashes                                                                            |
| `services/quizGenerator/__tests__/env.test.ts`         |     9 | Supabase client-config + origin resolution                                                                                                         |
| `services/quizGenerator/__tests__/fallbackHtml.test.ts`|     9 | Error page — default title, custom title, detail paragraph, XSS escape, reload button                                                              |
| `services/quizGenerator/__tests__/htmlInject.test.ts`  |     4 | Placeholder substitution into the engine IIFE                                                                                                      |
| `services/quizGenerator/__tests__/inlineTailwind.test.ts` |  8 | Tailwind inlining into generated HTML                                                                                                              |
| `services/quizGenerator/__tests__/normalizeInput.test.ts` | 14 | Legacy-args compatibility layer                                                                                                                    |
| `services/quizGenerator/__tests__/renderTemplate.test.ts` | 10 | Placeholder resolution order, double-injection guards                                                                                              |
| `services/templates/__tests__/sri-integrity.test.ts`   |     9 | SRI hash stability for shipped templates                                                                                                           |
| `src/engine/__tests__/media.test.ts`                   |    12 | `getRutubeId` (anchored regex, YouTube/plain-text rejection, evil-subdomain guard), `safePlayAudio`, `videoLock`                                  |
| `src/engine/__tests__/sanitize.test.ts`               |     6 | Engine-side asset URL sanitization                                                                                                                 |
| `src/engine/__tests__/navigation.test.ts`             |     1 | Engine-side circuit-breaker on GoTo cycle                                                                                                          |
| `components/__tests__/sandbox-attrs.test.ts`           |     8 | QuizPlayer iframe sandbox + referrer policy                                                                                                        |

## SQL — file list

| File                                           | Tests | Scope                                                                                                                                   |
| ---------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/tests/phase2_sql_hardening.test.sql` |    21 | 12 CHECK constraints, 5 FK indexes, partial unique index, RPC behavior                                                                  |
| `supabase/tests/billing_migration.test.sql`    |    10 | `process_payment_atomic` — signature, security definer, idempotency, renewal, first-grant, entitlement sync, cancel-then-grant          |
| `supabase/tests/atomic_migration.test.sql`     |     5 | `save_quiz_result_atomic` — signature, security definer, token mismatch, abandoned session, replay idempotency, score clamp, path clamp |

## How to run

```bash
# Deno
npm run test:functions

# Vitest
npm test
npm run test:watch
npm run test:ui
npm run test:coverage

# SQL (requires live Supabase project)
supabase db reset
psql "$DATABASE_URL" -f supabase/tests/phase2_sql_hardening.test.sql
psql "$DATABASE_URL" -f supabase/tests/billing_migration.test.sql
psql "$DATABASE_URL" -f supabase/tests/atomic_migration.test.sql
```

## Adding a new test

- **Deno unit test**: drop `*.test.ts` next to the file under test. The `test:functions` script in `package.json` includes both `supabase/functions/_shared/` and the 4 edge function test files explicitly. To add a new edge function test, append its path to the script.
- **Vitest**: drop `*.test.ts` next to the file under `utils/`, `services/`, `store/`, `hooks/`, or `src/`. The `vitest.config.ts` `include` glob picks it up automatically.
- **SQL**: drop `*.test.sql` in `supabase/tests/`. The README §21.5 docs use `psql -f supabase/tests/*.sql` which globs automatically.

## Test isolation

- **Deno**: env vars are snapshotted in `try` and restored in `finally` — order-independent.
- **Vitest**: jsdom env, per-test file fresh state via vitest's default workers. Global setup in `vitest.setup.ts` patches jsdom gaps (e.g. `navigator.sendBeacon`).
- **SQL**: every data insert lives inside a `SAVEPOINT` block; the outer transaction is `ROLLBACK`ed at the end. Schema-only tests (CHECK, FK indexes, RPC signature) run unconditionally; data-bound tests skip with `RAISE NOTICE 'SKIP: ...'` when no `auth.users` row is present.

## Known limitations

- `getRutubeId` regex is unanchored in `utils/videoUtils.ts` (matches the first `rutube.ru/video/<id>` substring regardless of the actual host). The worst-case behavior is "embeds a random RuTube video", not a security bypass (the embed URL is always `https://rutube.ru/play/embed/<id>`). Tracked in `utils/videoUtils.test.ts`. P1 fix: anchor with `^https?://`. **The engine-side copy in `src/engine/media.ts:193` is already anchored** — only the util copy needs to be aligned.
- Vitest does not cover React components (`components/**`) beyond the iframe sandbox-attrs smoke test. Phase 5 follow-up will add `@testing-library/react` integration tests.
- SQL tests skip data-bound cases when no `auth.users` row exists. CI must run them against a freshly-seeded test database.

---

## Changelog

### 2026-06-09 — Fix: safeCssUrl ReferenceError в standalone HTML
- Удалён дублирующий export quizEngineScript (fs.readFileSync)
- safeCssUrl инлайнена в IIFE движка
- Исправлены: getRutubeId regex, empty origin в postMessage,
  renderNode мерцание, scoreNode guards, beforeunload beacon,
  circuit breaker, path clamp

### 2026-06-06 — Vitest suite rebuilt: 5 failing suites → 25 / 377 passing
- `services/navigation.ts` — was truncated mid-function at line 95 (`Unexpected end of file`). Restored: `resolveNextNode` (group-traversal, `MAX_RESOLVE_DEPTH=20`), `processNode` (UI/logic/groupNode, `MAX_LOGIC_CHAIN=100` circuit-breaker, try/catch with `renderError`), `executeLogic` for `scoreNode/conditionNode/variableNode/goToNode/startNode/achievementNode/progressionNode/formulaNode`. Reset `_logicChainDepth` on circuit-breaker trip and in the catch block so test ordering is isolated.
- `services/media.ts` — created as a thin re-export of `../src/engine/media`. Lets `services/navigation.ts` import `playNodeEntrySound`/`cleanupAllMedia` and lets `vi.mock("../media", …)` in the test resolve to a real module path.
- `services/__tests__/media.test.ts` — moved to `src/engine/__tests__/media.test.ts` with import path adjusted to `../media`.
- `services/quizGenerator/index.ts:35` — `import { serializeForHtmlScript } from "./serializeForHtmlScript"` → `"./serialize"` (file was always named `serialize.ts`).
- `services/quizGenerator/index.ts:63` — fallback title `Не удалось сгенерировать квиз` → `Ошибка: не удалось сгенерировать квиз` (integration test asserts the page contains the word "Ошибка").
- `services/__tests__/serialize.test.ts` — removed (0 bytes, duplicate of `services/quizGenerator/__tests__/serialize.test.ts`).
- `vitest.setup.ts` + `vitest.config.ts` — global setup file patches `navigator.sendBeacon` (jsdom does not implement it), unblocking the 3 `sendAbandonmentBeacon` tests in `persistence.test.ts`.
- `services/__tests__/navigation.test.ts:5` — `import type { QuizData, QuizNode, QuizEdge } from "../../types"` → from `../indexing`. `QuizNode`/`QuizEdge` are defined in `services/indexing.ts`, not the root `types.ts`; root `QuizData.designSettings: DesignSettings` is not assignable to `indexing.QuizData.designSettings: Record<string, unknown>` (missing index signature).
- `services/__tests__/persistence.test.ts:53,91` — cast `fetchSpy.mock.calls[0]` to `[string, RequestInit]`. `vi.spyOn` on a global typed as `(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>` widens `mock.calls[0]` to `unknown[]`; the cast restores `RequestInit` for `options.body`/`options.method`/`options.keepalive`.

Net: **Vitest 5 failed suites / 3 failed tests → 0 failed** (25 files / 377 tests). `tsc --noEmit` clean.

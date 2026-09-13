# Administrative stabilization

Base: a7d3177, integration branch codex/admin-stabilization. Supabase remains archival.

## Audit register

| Finding | Before this change | Resolution |
|---|---|---|
| TypeScript project boundaries | Already corrected in working branch | Preserved |
| Account blocking | Already central, but also blocked support/cancellation | Identity separated from action policy |
| Permissions | No route enforcement; production role permission table empty | Shared route matrix and seeded roles |
| Audit | Missing runtime columns in actual production schema | Additive migration; writes use transaction client |
| PRO | Invalid upsert; non-atomic; two endpoints | Shared idempotent grant ledger; effective entitlement |
| Moderation | Successful response contained null quiz | Stored entity response and runtime validation |
| Support/reports | UI invented state; history/notes/dates missing | Server transitions and canonical entities |
| Finance | Filters/totals/refunds inconsistent | SQL filters before pagination and full recorded refunds |
| Mobile navigation | Sidebar hidden below lg | Accessible collapsible navigation |
| Deployment | Manual functions bypassed checks | Shared verification workflow and SHA-named artifacts |

## Production metadata inspection

Read-only inspection on 2026-09-13 confirmed function version d4e1a4kctqtf3oj2ds59, nodejs22.
The audit table has payload/ip_address/request_id but lacks permission/actor_fingerprint/user_agent.
The subscription uniqueness constraint is partial (active, past_due). The role permission table is empty.
The new grant ledger and refresh_effective_entitlement function are absent. No production user records were fetched.

## Database migration and compatibility

Apply 004_admin_stabilization.sql after 003_quizflow_auth.sql, first to staging.
The SQL preserves manual entitlement expiry and subscription history, adds stable numeric quiz display codes,
and seeds the archived role defaults plus billing.grant. Per-user overrides are preserved.
The shared schema catalogue is imported from yc-functions/_shared/admin-contracts by both runtimes.
Old response envelopes retain staff/ok/generated_at. The new client updates staff only through session.
Legacy grant callers lacking idempotency_key are deduplicated by actor and canonical payload for the transition release;
new callers must use a fresh key for each intended grant, and reuse it when retrying.

## Local verification

Use an isolated PostgreSQL 16 database named quizflow_admin_test. Set PG_HOST, PG_PORT, PG_USER, PG_PASSWORD.
Run npm run lint; npm test; npm run lint:functions; npm run test:functions;
npm --prefix yc-functions run test:integration; npm run test:admin:e2e; npm run build.
Integration and browser fixtures refuse to reset any database with another name.

## Release and rollback

Inspect metadata with node scripts/inspect-admin-schema.mjs (PG_* environment), or --from-yandex with YC_CLI.
Apply the migration on staging, run the checks and exercise all four roles before production migration.
Deploy backend then frontend from the same verified SHA. Use additive schema rollback: keep new tables and audit rows.
Roll back only to an application version compatible with the grant ledger; the pre-fix backend is not a safe billing rollback.
Do not remove historical assets needed by cached frontend releases.
Watch structured admin_error/admin_audit_unavailable events, request IDs, 5xx, forbidden actions and idempotency conflicts.
Financial metrics include recorded full refunds only; partial refunds require a separate provider reconciliation project.

## Verification results

Local PostgreSQL 16: 14 integration scenarios passed (including all denied route aliases,
transaction rollback, concurrent/idempotent grants, service grant, promo redemption, and permitted blocked-user paths).
Backend: 18 unit tests. Frontend: 672 tests. Browser: 8 desktop/mobile scenarios with real HTTP handlers and PostgreSQL.
TypeScript, ESLint (existing warnings only), frontend build/SEO checks and all backend bundles passed.
The migration runner was rehearsed locally: first application and checksum-verified repeat both succeeded.
A pre-existing flaky TOTP tampering test changed a base64 padding bit; it now flips a ciphertext byte deterministically.

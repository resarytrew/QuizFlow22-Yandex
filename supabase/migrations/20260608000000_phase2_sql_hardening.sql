-- =============================================================================
-- Поток — Phase 2: SQL hardening (security audit roadmap)
-- Migration: 20260608000000_phase2_sql_hardening.sql
--
-- Closes the Phase 2 roadmap items documented in README_DOCUMENTATION.md §21.1.
-- All changes are additive (no drops of existing columns / data) and idempotent
-- (`if not exists` everywhere) so re-running this migration is safe.
--
-- Sections:
--   1. CHECK constraints on quiz_results / quiz_sessions / subscriptions /
--      payments — reject impossible values at the DB layer instead of trusting
--      the edge function clamps alone (defense-in-depth).
--   2. FK indexes — every foreign key without a covering index causes a full
--      table scan on parent DELETE/UPDATE cascade. We add the missing ones.
--   3. path_data size cap — both at column-level (CHECK) and at the RPC level
--      (save_quiz_result_atomic clamps to last 1000 elements before insert).
--   4. Partial unique index uniq_user_quiz_in_progress — a single authenticated
--      user cannot have two simultaneous in_progress sessions for the same
--      quiz. The edge function (save-quiz-session) is updated to mark any
--      previous in_progress session as 'abandoned' before inserting a new one,
--      so this index acts as a safety net, not a blocker for legitimate flows.
--
-- Note on csp_reports(user_id): the Phase 2 roadmap mentions a FK index on
-- this column, but csp_reports has no user_id by design — browsers fire CSP
-- reports automatically and cannot attach custom auth headers. The endpoint
-- is intentionally anonymous (see csp-report/index.ts). No change needed.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. CHECK constraints
--    Wrapped in DO blocks because Postgres lacks "ADD CONSTRAINT IF NOT EXISTS"
--    syntax. We probe pg_constraint and skip if already present.
-- ----------------------------------------------------------------------------

-- 1.1 quiz_results.score: 0..10_000_000 (matches edge function clamp).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_results_score_range'
      and conrelid = 'public.quiz_results'::regclass
  ) then
    alter table public.quiz_results
      add constraint chk_quiz_results_score_range
      check (score >= 0 and score <= 10000000) not valid;
  end if;
end $$;

-- 1.2 quiz_results.time_spent_seconds: 0..604_800 (1 week).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_results_time_range'
      and conrelid = 'public.quiz_results'::regclass
  ) then
    alter table public.quiz_results
      add constraint chk_quiz_results_time_range
      check (time_spent_seconds >= 0 and time_spent_seconds <= 604800) not valid;
  end if;
end $$;

-- 1.3 quiz_sessions.score: 0..10_000_000.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_sessions_score_range'
      and conrelid = 'public.quiz_sessions'::regclass
  ) then
    alter table public.quiz_sessions
      add constraint chk_quiz_sessions_score_range
      check (score >= 0 and score <= 10000000) not valid;
  end if;
end $$;

-- 1.4 quiz_sessions.time_spent_seconds: 0..604_800.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_sessions_time_range'
      and conrelid = 'public.quiz_sessions'::regclass
  ) then
    alter table public.quiz_sessions
      add constraint chk_quiz_sessions_time_range
      check (time_spent_seconds >= 0 and time_spent_seconds <= 604800) not valid;
  end if;
end $$;

-- 1.5 quiz_sessions.participant_email: max 320 chars (RFC 5321 hard limit).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_sessions_email_len'
      and conrelid = 'public.quiz_sessions'::regclass
  ) then
    alter table public.quiz_sessions
      add constraint chk_quiz_sessions_email_len
      check (participant_email is null or char_length(participant_email) <= 320) not valid;
  end if;
end $$;

-- 1.6 quiz_results.participant_email: max 320 chars.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_results_email_len'
      and conrelid = 'public.quiz_results'::regclass
  ) then
    alter table public.quiz_results
      add constraint chk_quiz_results_email_len
      check (participant_email is null or char_length(participant_email) <= 320) not valid;
  end if;
end $$;

-- 1.7 subscriptions: period_end strictly greater than period_start.
--     A subscription with end <= start would silently grant zero days of PRO.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_subscriptions_period_order'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint chk_subscriptions_period_order
      check (current_period_end > current_period_start) not valid;
  end if;
end $$;

-- 1.8 subscriptions.status: enum-style whitelist.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_subscriptions_status_enum'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint chk_subscriptions_status_enum
      check (status in ('active','past_due','canceled','expired')) not valid;
  end if;
end $$;

-- 1.9 payments.amount_kopecks: non-negative (refunds use status, not negative).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_payments_amount_nonneg'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint chk_payments_amount_nonneg
      check (amount_kopecks >= 0) not valid;
  end if;
end $$;

-- 1.10 payments.status: enum-style whitelist (YooKassa state machine).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_payments_status_enum'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint chk_payments_status_enum
      check (status in (
        'pending','succeeded','canceled','waiting_for_capture','refunded'
      )) not valid;
  end if;
end $$;

-- 1.11 path_data column-level cap (the RPC also enforces this; we add the
--      constraint as a hard floor for any future code path that bypasses
--      the RPC). path_data MUST be a JSONB array of <= 1000 elements.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_results_path_data_size'
      and conrelid = 'public.quiz_results'::regclass
  ) then
    alter table public.quiz_results
      add constraint chk_quiz_results_path_data_size
      check (
        jsonb_typeof(path_data) = 'array'
        and jsonb_array_length(path_data) <= 1000
      ) not valid;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_quiz_sessions_path_data_size'
      and conrelid = 'public.quiz_sessions'::regclass
  ) then
    alter table public.quiz_sessions
      add constraint chk_quiz_sessions_path_data_size
      check (
        jsonb_typeof(path_data) = 'array'
        and jsonb_array_length(path_data) <= 1000
      ) not valid;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. FK indexes — every FK should have a covering index for cascade speed.
--    Existing FK coverage check (manually verified):
--      quizzes(user_id)           → idx_quizzes_user                    ✓
--      quiz_sessions(quiz_id)     → idx_sessions_quiz                   ✓
--      quiz_sessions(user_id)     → idx_sessions_user (partial)         ✓
--      quiz_results(quiz_id)      → idx_results_quiz                    ✓
--      quiz_results(session_id)   → uniq_quiz_results_session           ✓
--      quiz_results(user_id)      → idx_results_user (partial)          ✓
--      ai_usage(user_id)          → idx_ai_usage_user_created           ✓
--      payments(user_id)          → idx_payments_user_created           ✓
--      payments(plan_id)          → MISSING — added below
--      subscriptions(user_id)     → uniq_active_subscription_per_user   ✓
--      subscriptions(plan_id)     → MISSING — added below
--      subscriptions(last_payment_id) → MISSING — added below
--      entitlements(user_id)      → PK                                  ✓
--      promo_redemptions(code)    → unique(code, user_id) leading       ✓
--      promo_redemptions(user_id) → MISSING — added below
--      promo_codes(plan_id)       → MISSING — added below
-- ----------------------------------------------------------------------------

create index if not exists idx_payments_plan
  on public.payments (plan_id);

create index if not exists idx_subscriptions_plan
  on public.subscriptions (plan_id);

create index if not exists idx_subscriptions_last_payment
  on public.subscriptions (last_payment_id)
  where last_payment_id is not null;

create index if not exists idx_promo_redemptions_user
  on public.promo_redemptions (user_id);

create index if not exists idx_promo_codes_plan
  on public.promo_codes (plan_id);

-- ----------------------------------------------------------------------------
-- 3. unique_user_quiz_in_progress partial index.
--    Prevents a single authenticated user from accumulating multiple
--    in_progress sessions for the same quiz (e.g., abandoned tabs). The
--    save-quiz-session edge function is updated to mark any pre-existing
--    in_progress session as 'abandoned' before inserting a new one, so this
--    index is a safety net rather than a hard wall.
--
--    Anonymous sessions (user_id IS NULL) are excluded: many different
--    anonymous visitors can legitimately have in_progress rows.
-- ----------------------------------------------------------------------------

create unique index if not exists uniq_user_quiz_in_progress
  on public.quiz_sessions (user_id, quiz_id)
  where status = 'in_progress' and user_id is not null;

-- ----------------------------------------------------------------------------
-- 4. Updated save_quiz_result_atomic — caps p_path_data to the last 1000
--    elements before insert. The RPC signature is unchanged, callers do not
--    need to update. We re-create the function with the same parameter
--    types so the existing GRANT / REVOKE still apply.
--
--    Cap strategy:
--      * Accept any JSONB value (defensive — non-array becomes empty array).
--      * If array_length > 1000, slice to the LAST 1000 entries
--        (the path is chronological; the tail is the most recent navigation).
--      * Then insert. Column-level CHECK above is the hard floor.
--
--    Implementation detail: we use jsonb_path_query_array with a range
--    slice, which Postgres 12+ supports directly without unnest+aggregate
--    round-trips. For older Postgres a fallback would use
--    jsonb_agg(value) over (select ... limit 1000 offset ...).
-- ----------------------------------------------------------------------------

create or replace function public.save_quiz_result_atomic(
  p_quiz_id              uuid,
  p_session_id           uuid,
  p_session_token        uuid,
  p_score                integer,
  p_final_node_title     text,
  p_participant_name     text,
  p_results_data         jsonb,
  p_path_data            jsonb,
  p_time_spent_seconds   integer
)
returns table (
  ok            boolean,
  already_saved boolean,
  status        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token          uuid;
  v_session_status text;
  v_existing_id    uuid;
  v_path_data      jsonb;
  v_path_len       integer;
  v_path_max       constant integer := 1000;
begin
  -- Look up session + verify ownership token.
  select session_token, status
    into v_token, v_session_status
  from public.quiz_sessions
  where id = p_session_id
  for update;

  if v_token is null then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  if v_token <> p_session_token then
    raise exception 'session_token_mismatch' using errcode = '42501';
  end if;

  -- Terminal sessions: result was already saved during the original
  -- complete flow. A late "retry" must be a no-op.
  if v_session_status = 'completed' then
    return query select true, true, 'completed'::text;
    return;
  end if;
  if v_session_status = 'abandoned' then
    raise exception 'session_abandoned' using errcode = '42501';
  end if;

  -- Idempotency: if a row already exists, return it without changes.
  select id into v_existing_id
  from public.quiz_results
  where session_id = p_session_id;

  if v_existing_id is not null then
    return query select true, true, 'completed'::text;
    return;
  end if;

  -- Normalize + cap path_data.
  --   * Non-array (or NULL) input → empty array.
  --   * Array of <= v_path_max elements → passed through unchanged.
  --   * Larger array → keep the LAST v_path_max entries (latest navigation,
  --     since path_data is chronological). The CHECK constraint installed
  --     above (chk_quiz_results_path_data_size) is the hard floor below
  --     this RPC; if a future caller bypasses the cap, the INSERT fails.
  if p_path_data is null or jsonb_typeof(p_path_data) <> 'array' then
    v_path_data := '[]'::jsonb;
  else
    v_path_len := jsonb_array_length(p_path_data);
    if v_path_len <= v_path_max then
      v_path_data := p_path_data;
    else
      -- Pick the last v_path_max elements (DESC + LIMIT) and re-emit them
      -- in chronological order (outer jsonb_agg ORDER BY ord ASC). Both
      -- jsonb_array_elements WITH ORDINALITY and jsonb_agg(ORDER BY) are
      -- available in Postgres 12+, well below Supabase's minimum.
      v_path_data := coalesce((
        select jsonb_agg(value order by ord asc)
        from (
          select value, ord
          from jsonb_array_elements(p_path_data) with ordinality as t(value, ord)
          order by ord desc
          limit v_path_max
        ) tail
      ), '[]'::jsonb);
    end if;
  end if;

  -- First save: insert and atomically mark session completed.
  insert into public.quiz_results (
    quiz_id, session_id, score, final_node_title,
    participant_name, results_data, path_data,
    status, time_spent_seconds
  ) values (
    p_quiz_id, p_session_id,
    greatest(0, least(p_score, 1000000)),
    coalesce(p_final_node_title, 'Завершено'),
    coalesce(p_participant_name, 'Guest'),
    coalesce(p_results_data, '{}'::jsonb),
    v_path_data,
    'completed',
    greatest(0, least(p_time_spent_seconds, 604800))
  )
  on conflict (session_id) do nothing
  returning id into v_existing_id;

  if v_existing_id is null then
    update public.quiz_sessions
       set status = 'completed',
           completed_at = coalesce(completed_at, now()),
           updated_at = now()
     where id = p_session_id and status = 'in_progress';
    return query select true, true, 'completed'::text;
    return;
  end if;

  update public.quiz_sessions
     set status = 'completed',
         completed_at = now(),
         updated_at = now()
   where id = p_session_id;

  return query select true, false, 'completed'::text;
end; $$;

-- Re-apply GRANTs (CREATE OR REPLACE preserves them, but we make it explicit).
revoke all on function public.save_quiz_result_atomic(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_quiz_result_atomic(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, integer) to service_role;

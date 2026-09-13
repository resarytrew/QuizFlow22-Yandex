-- =============================================================================
-- Поток — Phase 2 SQL hardening tests
-- File: supabase/tests/phase2_sql_hardening.test.sql
--
-- Validates the constraints, indexes and RPC behavior introduced by
-- supabase/migrations/20260608000000_phase2_sql_hardening.sql.
--
-- HOW TO RUN
--   # Against a local Supabase (after `supabase start`):
--   supabase db reset                # apply all migrations from scratch
--   psql "$DATABASE_URL" -f supabase/tests/phase2_sql_hardening.test.sql
--
--   # Or, against any test Postgres after running all migrations:
--   psql "$TEST_DB_URL" -f supabase/tests/phase2_sql_hardening.test.sql
--
-- The file uses pure plpgsql + EXCEPTION-catching, NO pgTAP / pgUnit deps.
-- A successful run prints "RESULT: 0 failed, N passed" and exits 0. A
-- single failure RAISES EXCEPTION and exits non-zero, so the file is safe
-- to use in CI as a gate.
--
-- TEST ISOLATION
-- All test data is inserted inside a single SAVEPOINT block at the bottom
-- and rolled back at the end. The database is left untouched.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- ----------------------------------------------------------------------------
-- Test runner: each test increments a counter. On failure, RAISE EXCEPTION.
-- ----------------------------------------------------------------------------
create temp table _test_results (
  passed integer not null default 0,
  failed integer not null default 0
);
insert into _test_results values (0, 0);

create or replace function pg_temp.assert(
  ok boolean, msg text
) returns void language plpgsql as $$
begin
  if ok then
    update _test_results set passed = passed + 1;
    raise notice 'PASS: %', msg;
  else
    update _test_results set failed = failed + 1;
    raise exception 'FAIL: %', msg using errcode = 'P0001';
  end if;
end; $$;

-- Helper: run a piece of SQL and return whether it raised an exception.
create or replace function pg_temp.raises(sql text) returns boolean
language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end; $$;

-- ============================================================================
-- 1. CHECK constraints exist with expected names
-- ============================================================================
do $$ begin
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_results_score_range'),
    'chk_quiz_results_score_range exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_results_time_range'),
    'chk_quiz_results_time_range exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_sessions_score_range'),
    'chk_quiz_sessions_score_range exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_sessions_time_range'),
    'chk_quiz_sessions_time_range exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_subscriptions_period_order'),
    'chk_subscriptions_period_order exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_subscriptions_status_enum'),
    'chk_subscriptions_status_enum exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_payments_amount_nonneg'),
    'chk_payments_amount_nonneg exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_payments_status_enum'),
    'chk_payments_status_enum exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_results_path_data_size'),
    'chk_quiz_results_path_data_size exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_sessions_path_data_size'),
    'chk_quiz_sessions_path_data_size exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_results_email_len'),
    'chk_quiz_results_email_len exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_constraint where conname = 'chk_quiz_sessions_email_len'),
    'chk_quiz_sessions_email_len exists'
  );
end $$;

-- ============================================================================
-- 2. FK indexes exist
-- ============================================================================
do $$ begin
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'idx_payments_plan'),
    'idx_payments_plan exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'idx_subscriptions_plan'),
    'idx_subscriptions_plan exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'idx_subscriptions_last_payment'),
    'idx_subscriptions_last_payment exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'idx_promo_redemptions_user'),
    'idx_promo_redemptions_user exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'idx_promo_codes_plan'),
    'idx_promo_codes_plan exists'
  );
  perform pg_temp.assert(
    exists(select 1 from pg_indexes where indexname = 'uniq_user_quiz_in_progress'),
    'uniq_user_quiz_in_progress exists'
  );
end $$;

-- ============================================================================
-- 3. uniq_user_quiz_in_progress is partial (status = 'in_progress' AND user_id IS NOT NULL)
-- ============================================================================
do $$
declare
  v_indexdef text;
begin
  select indexdef into v_indexdef from pg_indexes
    where indexname = 'uniq_user_quiz_in_progress';
  perform pg_temp.assert(
    v_indexdef ilike '%where%status%in_progress%user_id%not null%',
    'uniq_user_quiz_in_progress is partial on status+user_id'
  );
end $$;

-- ============================================================================
-- 4. CHECK constraints actually reject bad values
-- ============================================================================
-- We need a real user + quiz to test against the FKs. Create them in a
-- savepoint so we can roll back even if asserts pass.
savepoint t_check;

-- Create a stub user if auth.users is available, otherwise skip the FK-bound tests.
do $$
declare
  v_user_id uuid;
  v_quiz_id uuid;
  v_session_id uuid;
  v_token uuid := gen_random_uuid();
  v_path_too_long jsonb;
  v_email_too_long text;
begin
  -- Pick any existing user; if none, skip these data-bound tests.
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users row available — skipping data-bound CHECK tests';
    return;
  end if;

  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_user_id, 'test-phase2', '{}'::jsonb, false)
    returning id into v_quiz_id;

  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, v_token, 'in_progress')
    returning id into v_session_id;

  -- 4.1 quiz_results.score < 0 must fail
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_results (quiz_id, session_id, score, path_data)
      values (%L, %L, -1, '[]'::jsonb)
    $f$, v_quiz_id, v_session_id)),
    'quiz_results.score = -1 rejected'
  );

  -- 4.2 quiz_results.score > 10_000_000 must fail
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_results (quiz_id, session_id, score, path_data)
      values (%L, %L, 10000001, '[]'::jsonb)
    $f$, v_quiz_id, v_session_id)),
    'quiz_results.score = 10000001 rejected'
  );

  -- 4.3 quiz_results.time_spent_seconds < 0 must fail
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_results (quiz_id, session_id, time_spent_seconds, path_data)
      values (%L, %L, -1, '[]'::jsonb)
    $f$, v_quiz_id, v_session_id)),
    'quiz_results.time_spent_seconds = -1 rejected'
  );

  -- 4.4 quiz_results.time_spent_seconds > 604_800 must fail
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_results (quiz_id, session_id, time_spent_seconds, path_data)
      values (%L, %L, 604801, '[]'::jsonb)
    $f$, v_quiz_id, v_session_id)),
    'quiz_results.time_spent_seconds = 604801 rejected'
  );

  -- 4.5 path_data of 1001 elements must fail
  select jsonb_agg(i)
    into v_path_too_long
    from generate_series(1, 1001) as i;
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_results (quiz_id, session_id, path_data)
      values (%L, %L, %L::jsonb)
    $f$, v_quiz_id, v_session_id, v_path_too_long::text)),
    'quiz_results.path_data with 1001 elements rejected'
  );

  -- 4.6 path_data of exactly 1000 elements must pass
  declare
    v_path_max jsonb;
    v_session_id2 uuid;
  begin
    select jsonb_agg(i) into v_path_max
      from generate_series(1, 1000) as i;
    -- Need a fresh session for the actual insert
    insert into public.quiz_sessions (id, quiz_id, session_token, status)
      values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
      returning id into v_session_id2;

    insert into public.quiz_results (quiz_id, session_id, path_data)
      values (v_quiz_id, v_session_id2, v_path_max);
    perform pg_temp.assert(true, 'quiz_results.path_data with 1000 elements accepted');
  end;

  -- 4.7 path_data not an array must fail
  declare
    v_session_id3 uuid;
  begin
    insert into public.quiz_sessions (id, quiz_id, session_token, status)
      values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
      returning id into v_session_id3;
    perform pg_temp.assert(
      pg_temp.raises(format($f$
        insert into public.quiz_results (quiz_id, session_id, path_data)
        values (%L, %L, '{"not": "array"}'::jsonb)
      $f$, v_quiz_id, v_session_id3)),
      'quiz_results.path_data as object rejected'
    );
  end;

  -- 4.8 email > 320 chars rejected
  v_email_too_long := repeat('a', 321);
  declare
    v_session_id4 uuid;
  begin
    insert into public.quiz_sessions (id, quiz_id, session_token, status)
      values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
      returning id into v_session_id4;
    perform pg_temp.assert(
      pg_temp.raises(format($f$
        insert into public.quiz_results (quiz_id, session_id, path_data, participant_email)
        values (%L, %L, '[]'::jsonb, %L)
      $f$, v_quiz_id, v_session_id4, v_email_too_long)),
      'quiz_results.participant_email 321 chars rejected'
    );
  end;
end $$;

rollback to savepoint t_check;

-- ============================================================================
-- 5. subscriptions.current_period_end > current_period_start
-- ============================================================================
savepoint t_sub;
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users row available — skipping subscriptions data tests';
    return;
  end if;

  -- 5.1 period_end < period_start rejected
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end
      ) values (
        %L, 'pro_monthly', 'active',
        '2026-06-01'::timestamptz, '2026-05-01'::timestamptz
      )
    $f$, v_user_id)),
    'subscriptions period_end < period_start rejected'
  );

  -- 5.2 period_end = period_start rejected (strict greater)
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end
      ) values (
        %L, 'pro_monthly', 'active',
        '2026-06-01'::timestamptz, '2026-06-01'::timestamptz
      )
    $f$, v_user_id)),
    'subscriptions period_end = period_start rejected'
  );

  -- 5.3 unknown status rejected
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end
      ) values (
        %L, 'pro_monthly', 'completely_made_up_status',
        '2026-06-01'::timestamptz, '2026-07-01'::timestamptz
      )
    $f$, v_user_id)),
    'subscriptions status = "completely_made_up_status" rejected'
  );
end $$;
rollback to savepoint t_sub;

-- ============================================================================
-- 6. payments: amount and status constraints
-- ============================================================================
savepoint t_pay;
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users row available — skipping payments data tests';
    return;
  end if;

  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.payments (user_id, plan_id, status, amount_kopecks)
      values (%L, 'pro_monthly', 'pending', -1)
    $f$, v_user_id)),
    'payments amount_kopecks = -1 rejected'
  );

  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.payments (user_id, plan_id, status, amount_kopecks)
      values (%L, 'pro_monthly', 'imaginary_status', 100)
    $f$, v_user_id)),
    'payments status = "imaginary_status" rejected'
  );

  -- Sanity: a valid payment still works.
  perform pg_temp.assert(
    not pg_temp.raises(format($f$
      insert into public.payments (user_id, plan_id, status, amount_kopecks)
      values (%L, 'pro_monthly', 'pending', 39900)
    $f$, v_user_id)),
    'payments valid (status=pending, amount=39900) accepted'
  );
end $$;
rollback to savepoint t_pay;

-- ============================================================================
-- 7. uniq_user_quiz_in_progress: blocks duplicate in_progress sessions for
--    the same (user_id, quiz_id), but allows multiple completed/abandoned
--    sessions, and allows anonymous (user_id=NULL) sessions to multiply.
-- ============================================================================
savepoint t_uniq;
do $$
declare
  v_user_id uuid;
  v_quiz_id uuid;
  v_s1 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_s3 uuid := gen_random_uuid();
  v_s4 uuid := gen_random_uuid();
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users row available — skipping uniq_user_quiz_in_progress tests';
    return;
  end if;

  insert into public.quizzes (user_id, name, is_published)
    values (v_user_id, 'uniq-test', true) returning id into v_quiz_id;

  -- 7.1 First in_progress session for (user, quiz) succeeds
  insert into public.quiz_sessions (id, quiz_id, user_id, session_token, status)
    values (v_s1, v_quiz_id, v_user_id, gen_random_uuid(), 'in_progress');
  perform pg_temp.assert(true, 'first in_progress session for (user, quiz) accepted');

  -- 7.2 Second in_progress session for SAME (user, quiz) must be rejected
  perform pg_temp.assert(
    pg_temp.raises(format($f$
      insert into public.quiz_sessions (id, quiz_id, user_id, session_token, status)
      values (%L, %L, %L, gen_random_uuid(), 'in_progress')
    $f$, v_s2, v_quiz_id, v_user_id)),
    'second in_progress session for SAME (user, quiz) rejected by uniq_user_quiz_in_progress'
  );

  -- 7.3 After marking s1 as completed, s2 should be insertable
  update public.quiz_sessions set status = 'completed' where id = v_s1;
  insert into public.quiz_sessions (id, quiz_id, user_id, session_token, status)
    values (v_s2, v_quiz_id, v_user_id, gen_random_uuid(), 'in_progress');
  perform pg_temp.assert(true, 'after completing s1, s2 in_progress accepted');

  -- 7.4 Anonymous (user_id=NULL) sessions for the same quiz must coexist
  insert into public.quiz_sessions (id, quiz_id, user_id, session_token, status)
    values (v_s3, v_quiz_id, null, gen_random_uuid(), 'in_progress');
  insert into public.quiz_sessions (id, quiz_id, user_id, session_token, status)
    values (v_s4, v_quiz_id, null, gen_random_uuid(), 'in_progress');
  perform pg_temp.assert(true, 'multiple anonymous in_progress sessions for same quiz accepted');
end $$;
rollback to savepoint t_uniq;

-- ============================================================================
-- 8. save_quiz_result_atomic — path_data cap is enforced server-side.
--    Calls the RPC with a 5000-element path and verifies the stored row
--    has exactly 1000 elements (the last 1000 in chronological order).
-- ============================================================================
savepoint t_rpc;
do $$
declare
  v_user_id     uuid;
  v_quiz_id     uuid;
  v_session_id  uuid := gen_random_uuid();
  v_token       uuid := gen_random_uuid();
  v_huge_path   jsonb;
  v_stored      jsonb;
  v_stored_len  integer;
  v_first       integer;
  v_last        integer;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users — skipping save_quiz_result_atomic test';
    return;
  end if;

  insert into public.quizzes (user_id, name, is_published)
    values (v_user_id, 'rpc-test', true) returning id into v_quiz_id;

  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (v_session_id, v_quiz_id, v_token, 'in_progress');

  select jsonb_agg(i) into v_huge_path from generate_series(1, 5000) as i;

  perform public.save_quiz_result_atomic(
    v_quiz_id, v_session_id, v_token,
    100,            -- score
    'Done',         -- final_node_title
    'Alice',        -- participant_name
    '{}'::jsonb,
    v_huge_path,    -- 5000-element path (must be clamped to 1000)
    60              -- time_spent_seconds
  );

  select path_data into v_stored
    from public.quiz_results
    where session_id = v_session_id;

  v_stored_len := jsonb_array_length(v_stored);
  v_first := (v_stored->0)::int;
  v_last  := (v_stored->(v_stored_len - 1))::int;

  perform pg_temp.assert(
    v_stored_len = 1000,
    format('save_quiz_result_atomic clamped 5000 → %s elements (expected 1000)', v_stored_len)
  );
  perform pg_temp.assert(
    v_first = 4001,
    format('save_quiz_result_atomic kept LAST 1000; first stored = %s (expected 4001)', v_first)
  );
  perform pg_temp.assert(
    v_last = 5000,
    format('save_quiz_result_atomic kept LAST 1000; last stored = %s (expected 5000)', v_last)
  );
end $$;
rollback to savepoint t_rpc;

-- ============================================================================
-- 9. Print summary
-- ============================================================================
do $$
declare
  v_passed integer;
  v_failed integer;
begin
  select passed, failed into v_passed, v_failed from _test_results;
  raise notice '';
  raise notice '========================================';
  raise notice 'RESULT: % failed, % passed', v_failed, v_passed;
  raise notice '========================================';
  if v_failed > 0 then
    raise exception 'Phase 2 test suite FAILED (% failures)', v_failed;
  end if;
end $$;

-- All inserts are inside savepoints that have been rolled back. The outer
-- transaction has no permanent side effects, so we COMMIT for clarity
-- (everything has already been rolled back at the savepoint level).
rollback;

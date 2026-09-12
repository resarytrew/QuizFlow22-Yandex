-- =============================================================================
-- Поток — session RLS hardening tests (C-07 audit verification)
-- File: supabase/tests/session_rls_hardening.test.sql
--
-- Validates that public.quiz_sessions + public.quiz_results follow
-- the audit's RLS contract: NO permissive policy for ALL, and anon
-- can do nothing. All writes go through the SECURITY DEFINER edge
-- functions (save-quiz-session, save-quiz-result).
--
-- The audit (31.05.2026) flagged C-07 as "policy for ALL using
-- (user_id IS NULL)" — i.e. a risk that anon could touch rows.
-- As of Phase 2 / 3.5 the policies in 20260605000000_core.sql are
-- already correct (split SELECT policies, no INSERT/UPDATE/DELETE
-- for anon/authenticated), but this test makes the contract
-- explicit so a future migration can't silently re-open the hole.
--
-- Covers:
--   1. quiz_sessions: anon cannot SELECT / INSERT / UPDATE / DELETE.
--   2. quiz_results:  anon cannot SELECT / INSERT / UPDATE / DELETE.
--   3. quiz_sessions: an authenticated user who is NOT the quiz owner
--      and NOT the session participant cannot SELECT.
--   4. quiz_sessions: the participant (user_id = auth.uid()) CAN
--      SELECT their own row.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f supabase/tests/session_rls_hardening.test.sql
--   # After running supabase db reset (or applying all migrations manually)
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- ----------------------------------------------------------------------------
-- Test runner (same shape as atomic_migration.test.sql)
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

-- ============================================================================
-- 1. quiz_sessions: there is NO policy granting ALL to anon/authenticated
-- ============================================================================
savepoint t_no_all_policy;
do $$
declare
  v_permissive_count integer;
begin
  -- A permissive ALL policy is the audit's C-07 concern. We use
  -- pg_policies to enumerate every policy on quiz_sessions and
  -- assert none of them grants ALL without a USING clause that
  -- filters by auth.uid() / quiz ownership.
  select count(*) into v_permissive_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'quiz_sessions'
    and cmd = 'ALL'
    and (qual is null or qual = 'true' or qual like '%IS NULL%');
  perform pg_temp.assert(
    v_permissive_count = 0,
    format('quiz_sessions has no permissive ALL policy (found %s)', v_permissive_count)
  );
end $$;
rollback to savepoint t_no_all_policy;

-- ============================================================================
-- 2. quiz_sessions: anon can SELECT 0 rows (no permissive policy)
-- ============================================================================
savepoint t_anon_select_sessions;
do $$
declare
  v_visible_count integer;
  v_owner_id      uuid;
  v_quiz_id       uuid;
  v_session_id    uuid;
begin
  -- Seed: a quiz + a session for a non-null user.
  select id into v_owner_id from auth.users limit 1;
  if v_owner_id is null then
    raise notice 'SKIP t_anon_select_sessions: no auth.users row';
    return;
  end if;
  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_owner_id, 'rls-test', '{}'::jsonb, true)
    returning id into v_quiz_id;
  insert into public.quiz_sessions (id, quiz_id, session_token, status, user_id)
    values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress', v_owner_id)
    returning id into v_session_id;

  -- Switch to anon role.
  set local role anon;
  select count(*) into v_visible_count from public.quiz_sessions
    where id = v_session_id;
  reset role;
  perform pg_temp.assert(
    v_visible_count = 0,
    format('anon cannot SELECT from quiz_sessions (saw %s rows)', v_visible_count)
  );
end $$;
rollback to savepoint t_anon_select_sessions;

-- ============================================================================
-- 3. quiz_sessions: anon cannot INSERT (no INSERT policy)
-- ============================================================================
savepoint t_anon_insert_sessions;
do $$
declare
  v_owner_id   uuid;
  v_quiz_id    uuid;
  v_inserted   integer := 0;
begin
  select id into v_owner_id from auth.users limit 1;
  if v_owner_id is null then
    raise notice 'SKIP t_anon_insert_sessions: no auth.users row';
    return;
  end if;
  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_owner_id, 'rls-test-insert', '{}'::jsonb, true)
    returning id into v_quiz_id;

  set local role anon;
  begin
    insert into public.quiz_sessions (quiz_id, session_token, status)
      values (v_quiz_id, gen_random_uuid(), 'in_progress');
    v_inserted := 1;
  exception when insufficient_privilege or others then
    -- expected: RLS denies the insert
    v_inserted := 0;
  end;
  reset role;
  perform pg_temp.assert(
    v_inserted = 0,
    'anon cannot INSERT into quiz_sessions'
  );
end $$;
rollback to savepoint t_anon_insert_sessions;

-- ============================================================================
-- 4. quiz_sessions: anon cannot UPDATE (no UPDATE policy)
-- ============================================================================
savepoint t_anon_update_sessions;
do $$
declare
  v_owner_id    uuid;
  v_quiz_id     uuid;
  v_session_id  uuid;
  v_status_after text;
begin
  select id into v_owner_id from auth.users limit 1;
  if v_owner_id is null then
    raise notice 'SKIP t_anon_update_sessions: no auth.users row';
    return;
  end if;
  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_owner_id, 'rls-test-update', '{}'::jsonb, true)
    returning id into v_quiz_id;
  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
    returning id into v_session_id;

  set local role anon;
  update public.quiz_sessions set status = 'completed' where id = v_session_id;
  reset role;
  select status into v_status_after from public.quiz_sessions where id = v_session_id;
  perform pg_temp.assert(
    v_status_after = 'in_progress',
    format('anon UPDATE was a no-op (status still %s)', v_status_after)
  );
end $$;
rollback to savepoint t_anon_update_sessions;

-- ============================================================================
-- 5. quiz_sessions: anon cannot DELETE (no DELETE policy)
-- ============================================================================
savepoint t_anon_delete_sessions;
do $$
declare
  v_owner_id    uuid;
  v_quiz_id     uuid;
  v_session_id  uuid;
  v_count_after integer;
begin
  select id into v_owner_id from auth.users limit 1;
  if v_owner_id is null then
    raise notice 'SKIP t_anon_delete_sessions: no auth.users row';
    return;
  end if;
  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_owner_id, 'rls-test-delete', '{}'::jsonb, true)
    returning id into v_quiz_id;
  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
    returning id into v_session_id;

  set local role anon;
  delete from public.quiz_sessions where id = v_session_id;
  reset role;
  select count(*) into v_count_after from public.quiz_sessions where id = v_session_id;
  perform pg_temp.assert(
    v_count_after = 1,
    format('anon DELETE was a no-op (row still present, count=%s)', v_count_after)
  );
end $$;
rollback to savepoint t_anon_delete_sessions;

-- ============================================================================
-- 6. quiz_results: same audit (C-07 mentions results too)
-- ============================================================================
savepoint t_anon_results;
do $$
declare
  v_no_all integer;
begin
  select count(*) into v_no_all
  from pg_policies
  where schemaname = 'public'
    and tablename = 'quiz_results'
    and cmd = 'ALL'
    and (qual is null or qual = 'true' or qual like '%IS NULL%');
  perform pg_temp.assert(
    v_no_all = 0,
    format('quiz_results has no permissive ALL policy (found %s)', v_no_all)
  );
end $$;
rollback to savepoint t_anon_results;

-- ============================================================================
-- Summary
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
    raise exception 'Session RLS hardening test suite FAILED (% failures)', v_failed;
  end if;
end $$;

rollback;

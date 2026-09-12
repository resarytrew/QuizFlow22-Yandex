-- =============================================================================
-- Поток — atomic migration tests (save_quiz_result_atomic)
-- File: supabase/tests/atomic_migration.test.sql
--
-- Validates the save_quiz_result_atomic RPC installed by
-- supabase/migrations/20260608000000_phase2_sql_hardening.sql. The
-- function is called from save-quiz-result to write the result row +
-- mark the session completed in a single transaction. A bug here
-- would either:
--   - allow token forgery (no constant-time compare),
--   - let an abandoned session get retro-completed (terminal check),
--   - double-insert results on retry (no dedup),
--   - or crash on a 5000-element path_data array.
--
-- The test suite covers:
--   1. Session token mismatch → raises 42501 'session_token_mismatch'.
--   2. Abandoned session → raises 42501 'session_abandoned'.
--   3. Replay: same session_id → returns (ok=true, already_saved=true),
--      no second quiz_results row.
--   4. path_data with 5000 elements → stored as last 1000 (chronological).
--   5. Score clamp: 2_000_000 → stored as 1_000_000.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f supabase/tests/atomic_migration.test.sql
--   # After running supabase db reset (or applying all migrations manually)
--
-- The file is safe to run in CI. Outer transaction is rolled back.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- ----------------------------------------------------------------------------
-- Test runner
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
-- 1. save_quiz_result_atomic exists with the right signature
-- ============================================================================
savepoint t_sig;
do $$
declare
  v_arity integer;
begin
  select pronargs into v_arity
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'save_quiz_result_atomic';
  perform pg_temp.assert(
    v_arity = 9,
    format('save_quiz_result_atomic has 9 args (got %s)', coalesce(v_arity::text, 'NULL'))
  );
end $$;
rollback to savepoint t_sig;

-- ============================================================================
-- 2. Function is SECURITY DEFINER + granted only to service_role
-- ============================================================================
savepoint t_privs;
do $$
declare
  v_secdef boolean;
  v_has_grant_to_anon boolean;
begin
  select p.prosecdef into v_secdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'save_quiz_result_atomic';
  perform pg_temp.assert(
    v_secdef = true,
    'save_quiz_result_atomic is SECURITY DEFINER'
  );

  select has_function_privilege('anon',
    'public.save_quiz_result_atomic(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,integer)',
    'EXECUTE') into v_has_grant_to_anon;
  perform pg_temp.assert(
    v_has_grant_to_anon is distinct from true,
    'anon cannot EXECUTE save_quiz_result_atomic'
  );
end $$;
rollback to savepoint t_privs;

-- ============================================================================
-- 3. Functional tests (require auth.users + a published quiz)
-- ============================================================================
savepoint t_rpc;
do $$
declare
  v_user_id      uuid;
  v_quiz_id      uuid;
  v_session_id   uuid;
  v_token        uuid := gen_random_uuid();
  v_wrong_token  uuid := gen_random_uuid();
  v_ok           boolean;
  v_already      boolean;
  v_status       text;
  v_result_count integer;
  v_stored_score integer;
  v_stored_path  jsonb;
  v_stored_len   integer;
  v_first        integer;
  v_last         integer;
  v_session_status text;
  v_huge_path    jsonb;
begin
  -- Skip if no real user to test against.
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'SKIP: no auth.users row available — skipping RPC tests';
    return;
  end if;

  -- A published quiz (FK target)
  insert into public.quizzes (user_id, name, quiz_data, is_published)
    values (v_user_id, 'test-atomic', '{}'::jsonb, true)
    returning id into v_quiz_id;

  -- 3.1 Wrong token → raises session_token_mismatch
  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, v_token, 'in_progress')
    returning id into v_session_id;
  begin
    select * from public.save_quiz_result_atomic(
      v_quiz_id, v_session_id, v_wrong_token, 50, 'Done', 'Alice',
      '{}'::jsonb, '[]'::jsonb, 30
    ) into v_ok, v_already, v_status;
    perform pg_temp.assert(false, 'wrong token should have raised an exception');
  exception when sqlstate '42501' then
    perform pg_temp.assert(
      sqlerrm ilike '%session_token_mismatch%',
      format('wrong token raised 42501 with message: %s', sqlerrm)
    );
  end;
  -- Session must still be in_progress
  select status into v_session_status from public.quiz_sessions where id = v_session_id;
  perform pg_temp.assert(
    v_session_status = 'in_progress',
    'wrong token did NOT mark session as completed'
  );

  -- 3.2 Abandoned session → raises session_abandoned
  update public.quiz_sessions set status = 'abandoned' where id = v_session_id;
  begin
    select * from public.save_quiz_result_atomic(
      v_quiz_id, v_session_id, v_token, 50, 'Done', 'Alice',
      '{}'::jsonb, '[]'::jsonb, 30
    ) into v_ok, v_already, v_status;
    perform pg_temp.assert(false, 'abandoned session should have raised an exception');
  exception when sqlstate '42501' then
    perform pg_temp.assert(
      sqlerrm ilike '%session_abandoned%',
      format('abandoned session raised 42501 with message: %s', sqlerrm)
    );
  end;

  -- 3.3 Happy path + replay idempotency
  -- Reset to in_progress and replay with the right token.
  update public.quiz_sessions set status = 'in_progress' where id = v_session_id;
  -- A pre-existing completed session short-circuits the function
  -- with already_saved=true and no insert (idempotency).
  select * from public.save_quiz_result_atomic(
    v_quiz_id, v_session_id, v_token, 50, 'Done', 'Alice',
    '{"k":"v"}'::jsonb, '[]'::jsonb, 30
  ) into v_ok, v_already, v_status;
  perform pg_temp.assert(
    v_ok = true and v_already = false and v_status = 'completed',
    format('first save → (ok=%s, already=%s, status=%s)',
      coalesce(v_ok::text, 'NULL'),
      coalesce(v_already::text, 'NULL'),
      coalesce(v_status, 'NULL'))
  );
  select count(*) into v_result_count from public.quiz_results
    where session_id = v_session_id;
  perform pg_temp.assert(
    v_result_count = 1,
    format('first save created exactly 1 result row (got %s)', v_result_count)
  );

  -- Replay: same session_id, but the session is now 'completed' → returns
  -- (true, true, 'completed') without inserting a second row.
  select * from public.save_quiz_result_atomic(
    v_quiz_id, v_session_id, v_token, 99, 'Different Title', 'Bob',
    '{"k":"v2"}'::jsonb, '[]'::jsonb, 60
  ) into v_ok, v_already, v_status;
  perform pg_temp.assert(
    v_already = true,
    'replay of completed session → already_saved=true'
  );
  select count(*) into v_result_count from public.quiz_results
    where session_id = v_session_id;
  perform pg_temp.assert(
    v_result_count = 1,
    format('replay did NOT insert a 2nd result row (got %s)', v_result_count)
  );
  -- The replay must NOT have updated the original row either.
  select score into v_stored_score from public.quiz_results
    where session_id = v_session_id;
  perform pg_temp.assert(
    v_stored_score = 50,
    format('replay did NOT update existing row (score still %s)', v_stored_score)
  );

  -- 3.4 Score clamp: the function clamps to [0, 1_000_000]
  -- Use a fresh in_progress session.
  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
    returning id into v_session_id;
  select * from public.save_quiz_result_atomic(
    v_quiz_id, v_session_id, (select session_token from public.quiz_sessions where id = v_session_id),
    2_000_000,  -- over the cap
    'Done', 'Alice', '{}'::jsonb, '[]'::jsonb, 30
  ) into v_ok, v_already, v_status;
  select score into v_stored_score from public.quiz_results
    where session_id = v_session_id;
  perform pg_temp.assert(
    v_stored_score = 1_000_000,
    format('score 2_000_000 clamped to 1_000_000 (got %s)', v_stored_score)
  );

  -- 3.5 path_data cap: 5000-element array → stored as last 1000 (chronological)
  insert into public.quiz_sessions (id, quiz_id, session_token, status)
    values (gen_random_uuid(), v_quiz_id, gen_random_uuid(), 'in_progress')
    returning id into v_session_id;
  select jsonb_agg((jsonb_build_object('node', n))) into v_huge_path
  from generate_series(1, 5000) as s(n);
  v_huge_path := (select jsonb_agg(to_jsonb(n)) from generate_series(1, 5000) n);
  select * from public.save_quiz_result_atomic(
    v_quiz_id, v_session_id,
    (select session_token from public.quiz_sessions where id = v_session_id),
    100, 'Done', 'Alice', '{}'::jsonb, v_huge_path, 30
  ) into v_ok, v_already, v_status;
  select path_data into v_stored_path from public.quiz_results
    where session_id = v_session_id;
  v_stored_len := jsonb_array_length(v_stored_path);
  perform pg_temp.assert(
    v_stored_len = 1000,
    format('5000-element path clamped to 1000 (got %s)', v_stored_len)
  );
  v_first := (v_stored_path->0)::int;
  v_last  := (v_stored_path->(v_stored_len - 1))::int;
  perform pg_temp.assert(
    v_first = 4001,
    format('path kept LAST 1000; first stored = %s (expected 4001)', v_first)
  );
  perform pg_temp.assert(
    v_last = 5000,
    format('path kept LAST 1000; last stored = %s (expected 5000)', v_last)
  );
end $$;
rollback to savepoint t_rpc;

-- ============================================================================
-- 4. Summary
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
    raise exception 'Atomic migration test suite FAILED (% failures)', v_failed;
  end if;
end $$;

rollback;

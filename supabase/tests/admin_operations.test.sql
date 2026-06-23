\set ON_ERROR_STOP on
begin;

create temp table _test_results (passed integer not null default 0, failed integer not null default 0);
insert into _test_results values (0, 0);

create or replace function pg_temp.assert(ok boolean, msg text)
returns void language plpgsql as $$
begin
  if ok then
    update _test_results set passed = passed + 1;
    raise notice 'PASS: %', msg;
  else
    update _test_results set failed = failed + 1;
    raise exception 'FAIL: %', msg;
  end if;
end $$;

do $$
begin
  perform pg_temp.assert(
    to_regclass('public.quiz_reports') is not null,
    'quiz_reports table exists'
  );
  perform pg_temp.assert(
    to_regclass('public.support_tickets') is not null,
    'support_tickets table exists'
  );
  perform pg_temp.assert(
    to_regclass('public.support_ticket_messages') is not null,
    'support_ticket_messages table exists'
  );
  perform pg_temp.assert(
    (select relrowsecurity from pg_class where oid = 'public.quiz_reports'::regclass),
    'quiz_reports has RLS enabled'
  );
  perform pg_temp.assert(
    (select relrowsecurity from pg_class where oid = 'public.support_tickets'::regclass),
    'support_tickets has RLS enabled'
  );
  perform pg_temp.assert(
    (select relrowsecurity from pg_class where oid = 'public.support_ticket_messages'::regclass),
    'support_ticket_messages has RLS enabled'
  );
  perform pg_temp.assert(
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.quiz_reports'::regclass
        and pg_get_constraintdef(oid) like '%reviewing%'
    ),
    'quiz report statuses are constrained'
  );
  perform pg_temp.assert(
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.support_tickets'::regclass
        and pg_get_constraintdef(oid) like '%waiting_user%'
    ),
    'support ticket statuses are constrained'
  );
end $$;

do $$
declare
  v_passed integer;
  v_failed integer;
begin
  select passed, failed into v_passed, v_failed from _test_results;
  raise notice 'RESULT: % failed, % passed', v_failed, v_passed;
  if v_failed > 0 then raise exception 'admin operations tests failed'; end if;
end $$;

rollback;

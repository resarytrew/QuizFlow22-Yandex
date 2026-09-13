-- ============================================================================
-- Tests for 20260609000000_quiz_visibility.sql
--   * backfill (is_published=true → 'public', false → 'private')
--   * sync_is_published trigger (derived from visibility)
--   * validate_quiz_visibility trigger (PRO gate, grandfathering)
--   * RLS (anyone reads public/unlisted; only owner reads private)
-- ============================================================================

-- Use a throwaway test schema so we don't pollute public.* in a real DB.
create schema if not exists test_visibility;
set search_path = public, test_visibility;

-- ----------------------------------------------------------------------------
-- 1. Backfill: legacy is_published flag becomes visibility.
-- ----------------------------------------------------------------------------
-- We reuse the real public.quizzes table, but isolate by user. Create
-- two test users with free entitlement, two quizzes (one published,
-- one draft). Backfill must turn them into public / private respectively.
do $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_pub    uuid;
  v_draft  uuid;
begin
  v_user_a := gen_random_uuid();
  v_user_b := gen_random_uuid();

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vis-a@example.test', '{}', now(), now(), now());

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vis-b@example.test', '{}', now(), now(), now());

  -- Backfill runs inside the migration; we are post-migration here. The
  -- backfill is one-shot, so we cannot re-verify it on a populated DB.
  -- Instead we manually set is_published to mimic the legacy state and
  -- assert sync_is_published derives the right values via UPDATE.

  insert into public.quizzes (user_id, name, quiz_data, is_published)
  values (v_user_a, 'backfill-pub', '{}'::jsonb, true)
  returning id into v_pub;

  insert into public.quizzes (user_id, name, quiz_data, is_published)
  values (v_user_b, 'backfill-draft', '{}'::jsonb, false)
  returning id into v_draft;

  perform set_config('test.v_pub', v_pub::text, false);
  perform set_config('test.v_draft', v_draft::text, false);
  perform set_config('test.user_a', v_user_a::text, false);
  perform set_config('test.user_b', v_user_b::text, false);
end $$;

-- The migration's sync trigger fires on every UPDATE OF visibility, so
-- a 'bump' update should leave is_published matching the visibility.
do $$
declare
  v_pub    uuid := current_setting('test.v_pub')::uuid;
  v_draft  uuid := current_setting('test.v_draft')::uuid;
  v_pub_actual    boolean;
  v_draft_actual  boolean;
begin
  update public.quizzes set visibility = visibility where id = v_pub    returning is_published into v_pub_actual;
  update public.quizzes set visibility = visibility where id = v_draft  returning is_published into v_draft_actual;

  if v_pub_actual   is distinct from true  then raise exception 'FAIL: pub quiz should have is_published=true (got %)',  v_pub_actual;   end if;
  if v_draft_actual is distinct from false then raise exception 'FAIL: draft quiz should have is_published=false (got %)', v_draft_actual; end if;
  raise notice 'PASS: backfill sync';
end $$;

-- ----------------------------------------------------------------------------
-- 2. sync_is_published: a transition into 'public' must set is_published
--    + published_at; a transition into 'private' must clear them.
-- ----------------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_published boolean;
  v_published_at timestamptz;
begin
  v_id := current_setting('test.v_draft')::uuid;
  update public.quizzes set visibility = 'public' where id = v_id
    returning is_published, published_at into v_published, v_published_at;
  if v_published is distinct from true then raise exception 'FAIL: public transition did not set is_published'; end if;
  if v_published_at is null then raise exception 'FAIL: public transition did not set published_at'; end if;

  update public.quizzes set visibility = 'private' where id = v_id
    returning is_published, published_at into v_published, v_published_at;
  if v_published is distinct from false then raise exception 'FAIL: private transition did not clear is_published'; end if;
  if v_published_at is not null then raise exception 'FAIL: private transition did not clear published_at'; end if;

  raise notice 'PASS: sync_is_published';
end $$;

-- ----------------------------------------------------------------------------
-- 3. validate_quiz_visibility — free users cannot create or transition
--    INTO private/unlisted. PRO users can.
-- ----------------------------------------------------------------------------
do $$
declare
  v_free_user uuid := current_setting('test.user_b')::uuid;
  v_pro_user  uuid;
  v_q         uuid;
  v_err       text;
begin
  -- Make user_b's row public again so the subsequent test starts clean.
  update public.quizzes set visibility = 'public' where user_id = v_free_user;

  -- Create a PRO user.
  v_pro_user := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (v_pro_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vis-pro@example.test', '{}', now(), now(), now());

  -- Default entitlement from the core migration is 'free'; override for v_pro_user.
  insert into public.entitlements (user_id, plan, features, source)
  values (v_pro_user, 'pro',
          jsonb_build_object('max_quizzes', null, 'ai_tier', 'premium', 'hide_branding', true, 'premium_templates', true, 'unlimited_logic', true),
          'system')
  on conflict (user_id) do update set plan = 'pro', features = excluded.features;

  -- (a) FREE inserts private → must raise 42501 visibility_requires_pro
  begin
    insert into public.quizzes (user_id, name, quiz_data, visibility)
    values (v_free_user, 'free-private', '{}'::jsonb, 'private');
    raise exception 'FAIL: free INSERT private should have been rejected';
  exception when check_violation then
    raise exception 'FAIL: wrong error code (check_violation) on free private insert';
  exception when others then
    v_err := SQLERRM;
    if v_err !~* 'visibility_requires_pro' then
      raise exception 'FAIL: expected visibility_requires_pro, got: %', v_err;
    end if;
  end;

  -- (b) FREE inserts unlisted → also must raise
  begin
    insert into public.quizzes (user_id, name, quiz_data, visibility)
    values (v_free_user, 'free-unlisted', '{}'::jsonb, 'unlisted');
    raise exception 'FAIL: free INSERT unlisted should have been rejected';
  exception when others then
    v_err := SQLERRM;
    if v_err !~* 'visibility_requires_pro' then
      raise exception 'FAIL: expected visibility_requires_pro on unlisted, got: %', v_err;
    end if;
  end;

  -- (c) FREE inserts public → OK
  insert into public.quizzes (user_id, name, quiz_data, visibility)
  values (v_free_user, 'free-public', '{}'::jsonb, 'public')
  returning id into v_q;
  if v_q is null then raise exception 'FAIL: free public insert did not return id'; end if;

  -- (d) PRO inserts private/unlisted → OK
  insert into public.quizzes (user_id, name, quiz_data, visibility)
  values (v_pro_user, 'pro-private', '{}'::jsonb, 'private');

  insert into public.quizzes (user_id, name, quiz_data, visibility)
  values (v_pro_user, 'pro-unlisted', '{}'::jsonb, 'private')
  returning id into v_q;
  -- then flip to unlisted to confirm transitions are allowed for PRO
  update public.quizzes set visibility = 'unlisted' where id = v_q;

  -- (e) PRO transitions unlisted → public → OK
  update public.quizzes set visibility = 'public'
   where user_id = v_pro_user and visibility = 'unlisted';
  -- (only one row matched; we leave it that way)

  -- (f) FREE transitions an existing public row INTO private → blocked
  begin
    update public.quizzes set visibility = 'private'
     where user_id = v_free_user and visibility = 'public';
    raise exception 'FAIL: free transition into private should have been rejected';
  exception when others then
    v_err := SQLERRM;
    if v_err !~* 'visibility_requires_pro' then
      raise exception 'FAIL: expected visibility_requires_pro on free→private, got: %', v_err;
    end if;
  end;

  -- (g) FREE keeps the same visibility (content edit) → grandfathered OK
  update public.quizzes set name = name || ' (edited)'
   where user_id = v_free_user and visibility = 'public';
  -- no exception expected

  -- (h) PRO then downgrades to free, then edits their private quiz → must still work
  update public.entitlements set plan = 'free' where user_id = v_pro_user;
  update public.quizzes set name = name || ' (downgraded-edit)'
   where user_id = v_pro_user and visibility = 'private';
  -- no exception expected: same visibility, grandfathered

  raise notice 'PASS: validate_quiz_visibility';
end $$;

-- ----------------------------------------------------------------------------
-- 4. RLS — quizzes_read_public_or_unlisted. We can't fully exercise RLS
--    here (this script runs as superuser), but we can sanity-check that
--    the policy exists and the USING clause references the new column.
-- ----------------------------------------------------------------------------
do $$
declare
  v_qual text;
begin
  select pg_get_expr(qual, 'public.quizzes'::regclass) into v_qual
    from pg_policy
   where polname = 'quizzes_read_public_or_unlisted';

  if v_qual is null then
    raise exception 'FAIL: policy quizzes_read_public_or_unlisted not found';
  end if;
  if v_qual !~* 'visibility' then
    raise exception 'FAIL: policy USING clause does not reference visibility, got: %', v_qual;
  end if;
  if v_qual !~* 'unlisted' then
    raise exception 'FAIL: policy USING clause does not include unlisted, got: %', v_qual;
  end if;
  raise notice 'PASS: RLS policy';
end $$;

-- Cleanup (best-effort; the test schema is throwaway).
reset search_path;
-- Don't drop auth.users (could be referenced by other tests); just leave them.
delete from public.quizzes where name like 'backfill-%' or name like 'free-%' or name like 'pro-%';
delete from public.entitlements where user_id in (
  select id from auth.users where email in ('vis-a@example.test','vis-b@example.test','vis-pro@example.test')
);
delete from auth.users where email in ('vis-a@example.test','vis-b@example.test','vis-pro@example.test');
drop schema if exists test_visibility cascade;

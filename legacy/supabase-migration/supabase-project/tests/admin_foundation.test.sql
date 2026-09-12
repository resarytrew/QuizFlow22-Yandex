-- =============================================================================
-- Поток - admin foundation migration tests
-- File: supabase/tests/admin_foundation.test.sql
--
-- Validates the first admin-panel foundation migration:
--   * profiles get unique six-digit account codes
--   * quiz display codes are scoped by visibility and formatted by width
--   * admin role permissions and overrides are whitelisted
--   * admin tables are not directly exposed through anon/authenticated RLS
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f supabase/tests/admin_foundation.test.sql
-- =============================================================================

\set ON_ERROR_STOP on

begin;

create temp table _test_results (
  passed integer not null default 0,
  failed integer not null default 0
);
insert into _test_results values (0, 0);

create or replace function pg_temp.assert(
  ok boolean,
  msg text
) returns void language plpgsql as $$
begin
  if ok then
    update _test_results set passed = passed + 1;
    raise notice 'PASS: %', msg;
  else
    update _test_results set failed = failed + 1;
    raise exception 'FAIL: %', msg using errcode = 'P0001';
  end if;
end;
$$;

create or replace function pg_temp.raises(sql text) returns boolean
language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end;
$$;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_pro_user_id uuid := gen_random_uuid();
  v_profile_count integer;
  v_account_code integer;
  v_public_quiz uuid;
  v_private_quiz uuid;
  v_unlisted_quiz uuid;
  v_public_code text;
  v_private_code text;
  v_unlisted_code text;
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    raw_user_meta_data,
    created_at,
    updated_at,
    email_confirmed_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-foundation-user@example.test',
    '{"display_name":"Admin Test User"}',
    now(),
    now(),
    now()
  );

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    raw_user_meta_data,
    created_at,
    updated_at,
    email_confirmed_at
  ) values (
    v_pro_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-foundation-pro@example.test',
    '{"display_name":"Admin Test Pro"}',
    now(),
    now(),
    now()
  );

  insert into public.entitlements(user_id, plan, features, source)
  values (
    v_pro_user_id,
    'pro',
    jsonb_build_object(
      'max_quizzes', null,
      'ai_tier', 'premium',
      'hide_branding', true,
      'premium_templates', true,
      'unlimited_logic', true
    ),
    'system'
  )
  on conflict (user_id) do update
    set plan = 'pro', features = excluded.features;

  select count(*), min(account_code)
    into v_profile_count, v_account_code
    from public.profiles
   where id in (v_user_id, v_pro_user_id);

  perform pg_temp.assert(v_profile_count = 2, 'auth user trigger creates profiles');
  perform pg_temp.assert(
    v_account_code between 100000 and 999999,
    'profiles.account_code is six-digit'
  );

  insert into public.quizzes(user_id, name, quiz_data, visibility)
  values (v_user_id, 'admin-foundation-public', '{}'::jsonb, 'public')
  returning id into v_public_quiz;

  insert into public.quizzes(user_id, name, quiz_data, visibility)
  values (v_pro_user_id, 'admin-foundation-private', '{}'::jsonb, 'private')
  returning id into v_private_quiz;

  insert into public.quizzes(user_id, name, quiz_data, visibility)
  values (v_pro_user_id, 'admin-foundation-unlisted', '{}'::jsonb, 'unlisted')
  returning id into v_unlisted_quiz;

  select public.format_quiz_display_code(visibility, display_code)
    into v_public_code
    from public.quiz_display_codes
   where quiz_id = v_public_quiz and visibility = 'public';

  select public.format_quiz_display_code(visibility, display_code)
    into v_private_code
    from public.quiz_display_codes
   where quiz_id = v_private_quiz and visibility = 'private';

  select public.format_quiz_display_code(visibility, display_code)
    into v_unlisted_code
    from public.quiz_display_codes
   where quiz_id = v_unlisted_quiz and visibility = 'unlisted';

  perform pg_temp.assert(v_public_code ~ '^[0-9]{4,}$', 'public quiz code is at least four digits');
  perform pg_temp.assert(v_private_code ~ '^[0-9]{2,}$', 'private quiz code is at least two digits');
  perform pg_temp.assert(v_unlisted_code ~ '^[0-9]{3,}$', 'unlisted quiz code is at least three digits');

  insert into public.admin_staff(user_id, role)
  values (v_pro_user_id, 'moderator');

  perform pg_temp.assert(
    public.admin_has_permission(v_pro_user_id, 'quizzes.moderate') = true,
    'moderator has quizzes.moderate'
  );
  perform pg_temp.assert(
    public.admin_has_permission(v_pro_user_id, 'settings.manage') = false,
    'moderator does not have settings.manage by default'
  );

  insert into public.admin_staff_permissions(user_id, permission, granted)
  values (v_pro_user_id, 'settings.manage', true);
  perform pg_temp.assert(
    public.admin_has_permission(v_pro_user_id, 'settings.manage') = true,
    'permission override can grant settings.manage'
  );

  perform pg_temp.assert(
    pg_temp.raises(format(
      'insert into public.admin_staff_permissions(user_id, permission, granted) values (%L, %L, true)',
      v_pro_user_id,
      'typo.permission'
    )),
    'permission overrides reject unknown permission strings'
  );
end;
$$;

do $$
declare
  v_staff_policy text;
  v_role_policy text;
  v_override_policy text;
begin
  select pg_get_expr(qual, 'public.admin_staff'::regclass)
    into v_staff_policy
    from pg_policy
   where polname = 'admin_staff_no_direct_access';

  select pg_get_expr(qual, 'public.admin_role_permissions'::regclass)
    into v_role_policy
    from pg_policy
   where polname = 'admin_role_permissions_no_direct_access';

  select pg_get_expr(qual, 'public.admin_staff_permissions'::regclass)
    into v_override_policy
    from pg_policy
   where polname = 'admin_staff_permissions_no_direct_access';

  perform pg_temp.assert(v_staff_policy = 'false', 'admin_staff direct RLS policy denies access');
  perform pg_temp.assert(v_role_policy = 'false', 'admin_role_permissions direct RLS policy denies access');
  perform pg_temp.assert(v_override_policy = 'false', 'admin_staff_permissions direct RLS policy denies access');
end;
$$;

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
    raise exception 'Admin foundation test suite FAILED (% failures)', v_failed;
  end if;
end;
$$;

rollback;

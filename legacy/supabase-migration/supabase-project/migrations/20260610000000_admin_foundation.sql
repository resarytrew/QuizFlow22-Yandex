-- =============================================================================
-- Поток - Admin foundation
-- Migration: 20260610000000_admin_foundation.sql
--
-- Adds:
--   * public profiles with a unique six-digit account code
--   * per-user quiz display codes, scoped by visibility
--   * staff roles, permissions and per-user permission overrides
--   * an extensible append-only admin audit log
--
-- UUIDs remain the canonical identifiers. Numeric codes are display/search
-- aliases only and must never be used as authorization or share secrets.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. User profiles and six-digit account codes
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  account_code      integer not null unique
                      check (account_code between 100000 and 999999),
  username          text,
  display_name      text,
  status            text not null default 'active'
                      check (status in ('active', 'temporarily_blocked', 'blocked')),
  blocked_until     timestamptz,
  block_reason      text,
  last_active_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles
  add column if not exists account_code integer,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists status text not null default 'active',
  add column if not exists blocked_until timestamptz,
  add column if not exists block_reason text,
  add column if not exists last_active_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uniq_profiles_account_code
  on public.profiles(account_code);
create unique index if not exists uniq_profiles_username_ci
  on public.profiles(lower(username))
  where username is not null;
create index if not exists idx_profiles_status
  on public.profiles(status, created_at desc);
create index if not exists idx_profiles_last_active
  on public.profiles(last_active_at desc)
  where last_active_at is not null;

create or replace function public.ensure_user_profile(
  p_user_id uuid,
  p_display_name text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing integer;
  v_code integer;
  v_attempt integer;
  v_sanitized_display_name text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;

  v_sanitized_display_name := nullif(
    left(regexp_replace(coalesce(p_display_name, ''), '[[:cntrl:]]', '', 'g'), 120),
    ''
  );

  select account_code
    into v_existing
    from public.profiles
   where id = p_user_id;

  if v_existing is not null then
    return v_existing;
  end if;

  for v_attempt in 1..128 loop
    v_code := floor(random() * 900000)::integer + 100000;
    begin
      update public.profiles
         set account_code = v_code,
             display_name = coalesce(display_name, v_sanitized_display_name)
       where id = p_user_id
         and account_code is null
       returning account_code into v_existing;

      if v_existing is not null then
        return v_existing;
      end if;

      insert into public.profiles(id, account_code, display_name)
      values (
        p_user_id,
        v_code,
        v_sanitized_display_name
      );
      return v_code;
    exception
      when unique_violation then
        select account_code
          into v_existing
          from public.profiles
         where id = p_user_id;
        if v_existing is not null then
          return v_existing;
        end if;
    end;
  end loop;

  raise exception 'account_code_space_exhausted'
    using errcode = '54000';
end;
$$;

revoke all on function public.ensure_user_profile(uuid, text)
  from public, anon, authenticated;
grant execute on function public.ensure_user_profile(uuid, text)
  to service_role;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_user_profile(
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name'
    )
  );
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
      from information_schema.tables
     where table_schema = 'auth'
       and table_name = 'users'
  ) and not exists (
    select 1
      from pg_trigger
     where tgname = 'on_auth_user_created_profile'
  ) then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row execute function public.handle_new_user_profile();
  end if;
end;
$$;

do $$
declare
  v_user record;
begin
  if exists (
    select 1
      from information_schema.tables
     where table_schema = 'auth'
       and table_name = 'users'
  ) then
    for v_user in
      select id,
             coalesce(
               raw_user_meta_data ->> 'display_name',
               raw_user_meta_data ->> 'full_name'
             ) as display_name
        from auth.users
       order by created_at, id
    loop
      perform public.ensure_user_profile(v_user.id, v_user.display_name);
    end loop;
  end if;
end;
$$;

alter table public.profiles
  alter column account_code set not null;

drop trigger if exists tg_profiles_updated_at on public.profiles;
create trigger tg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update(username, display_name) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Quiz display codes
--
-- Codes are scoped to (user, visibility). Formatting uses a minimum width:
-- private=2, unlisted=3, public=4. Values grow beyond that width instead of
-- failing once 99/999/9999 quizzes have been created.
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_code_counters (
  user_id       uuid not null references auth.users(id) on delete cascade,
  visibility    text not null
                  check (visibility in ('private', 'unlisted', 'public')),
  next_value    bigint not null check (next_value > 0),
  primary key (user_id, visibility)
);

create table if not exists public.quiz_display_codes (
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  visibility    text not null
                  check (visibility in ('private', 'unlisted', 'public')),
  display_code  bigint not null check (display_code > 0),
  created_at    timestamptz not null default now(),
  primary key (quiz_id, visibility),
  unique (user_id, visibility, display_code)
);

create index if not exists idx_quiz_display_codes_lookup
  on public.quiz_display_codes(user_id, visibility, display_code);
create index if not exists idx_quiz_display_codes_quiz
  on public.quiz_display_codes(quiz_id);

create or replace function public.allocate_quiz_display_code(
  p_quiz_id uuid,
  p_user_id uuid,
  p_visibility text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing bigint;
  v_code bigint;
begin
  if p_quiz_id is null or p_user_id is null then
    raise exception 'quiz_id and user_id are required' using errcode = '22023';
  end if;
  if p_visibility not in ('private', 'unlisted', 'public') then
    raise exception 'invalid visibility' using errcode = '22023';
  end if;

  select display_code
    into v_existing
    from public.quiz_display_codes
   where quiz_id = p_quiz_id
     and visibility = p_visibility;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.quiz_code_counters(user_id, visibility, next_value)
  values (p_user_id, p_visibility, 2)
  on conflict (user_id, visibility) do update
    set next_value = public.quiz_code_counters.next_value + 1
  returning next_value - 1 into v_code;

  insert into public.quiz_display_codes(
    quiz_id,
    user_id,
    visibility,
    display_code
  )
  values (p_quiz_id, p_user_id, p_visibility, v_code)
  on conflict (quiz_id, visibility) do nothing;

  select display_code
    into v_existing
    from public.quiz_display_codes
   where quiz_id = p_quiz_id
     and visibility = p_visibility;

  return v_existing;
end;
$$;

revoke all on function public.allocate_quiz_display_code(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.allocate_quiz_display_code(uuid, uuid, text)
  to service_role;

create or replace function public.format_quiz_display_code(
  p_visibility text,
  p_code bigint
)
returns text
language sql
immutable
strict
as $$
  select lpad(
    p_code::text,
    case p_visibility
      when 'private' then 2
      when 'unlisted' then 3
      when 'public' then 4
      else 1
    end,
    '0'
  );
$$;

create or replace function public.ensure_quiz_display_code_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.allocate_quiz_display_code(new.id, new.user_id, new.visibility);
  return new;
end;
$$;

drop trigger if exists tg_quizzes_display_code on public.quizzes;
create trigger tg_quizzes_display_code
  after insert or update of visibility, user_id on public.quizzes
  for each row execute function public.ensure_quiz_display_code_trigger();

do $$
declare
  v_quiz record;
begin
  for v_quiz in
    select id, user_id, visibility
      from public.quizzes
     order by user_id, visibility, created_at, id
  loop
    perform public.allocate_quiz_display_code(
      v_quiz.id,
      v_quiz.user_id,
      v_quiz.visibility
    );
  end loop;
end;
$$;

alter table public.quiz_display_codes enable row level security;
alter table public.quiz_code_counters enable row level security;

drop policy if exists quiz_display_codes_read_own on public.quiz_display_codes;
create policy quiz_display_codes_read_own
  on public.quiz_display_codes for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.quiz_display_codes to authenticated;

drop policy if exists quiz_code_counters_no_access on public.quiz_code_counters;
create policy quiz_code_counters_no_access
  on public.quiz_code_counters for all
  to anon, authenticated
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- 3. Staff roles and permissions
-- -----------------------------------------------------------------------------
create table if not exists public.admin_role_permissions (
  role        text not null
                check (role in ('owner', 'admin', 'moderator', 'support')),
  permission  text not null
                check (permission in (
                  'admin.access',
                  'dashboard.read',
                  'users.read',
                  'users.manage',
                  'quizzes.read',
                  'quizzes.manage',
                  'quizzes.moderate',
                  'reports.read',
                  'reports.manage',
                  'subscriptions.read',
                  'subscriptions.manage',
                  'support.read',
                  'support.manage',
                  'finance.read',
                  'promocodes.manage',
                  'notifications.manage',
                  'settings.manage',
                  'audit.read',
                  'staff.manage'
                )),
  primary key (role, permission)
);

insert into public.admin_role_permissions(role, permission)
select 'owner', permission
from unnest(array[
  'admin.access',
  'dashboard.read',
  'users.read',
  'users.manage',
  'quizzes.read',
  'quizzes.manage',
  'quizzes.moderate',
  'reports.read',
  'reports.manage',
  'subscriptions.read',
  'subscriptions.manage',
  'support.read',
  'support.manage',
  'finance.read',
  'promocodes.manage',
  'notifications.manage',
  'settings.manage',
  'audit.read',
  'staff.manage'
]) as permission
on conflict do nothing;

insert into public.admin_role_permissions(role, permission)
select 'admin', permission
from unnest(array[
  'admin.access',
  'dashboard.read',
  'users.read',
  'users.manage',
  'quizzes.read',
  'quizzes.manage',
  'quizzes.moderate',
  'reports.read',
  'reports.manage',
  'subscriptions.read',
  'subscriptions.manage',
  'support.read',
  'support.manage',
  'finance.read',
  'promocodes.manage',
  'notifications.manage',
  'audit.read'
]) as permission
on conflict do nothing;

insert into public.admin_role_permissions(role, permission)
select 'moderator', permission
from unnest(array[
  'admin.access',
  'dashboard.read',
  'users.read',
  'quizzes.read',
  'quizzes.moderate',
  'reports.read',
  'reports.manage',
  'audit.read'
]) as permission
on conflict do nothing;

insert into public.admin_role_permissions(role, permission)
select 'support', permission
from unnest(array[
  'admin.access',
  'dashboard.read',
  'users.read',
  'quizzes.read',
  'subscriptions.read',
  'support.read',
  'support.manage',
  'notifications.manage'
]) as permission
on conflict do nothing;

create table if not exists public.admin_staff (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  role                  text not null
                          check (role in ('owner', 'admin', 'moderator', 'support')),
  is_active             boolean not null default true,
  allowed_ips           inet[],
  idle_timeout_minutes  integer not null default 30
                          check (idle_timeout_minutes between 5 and 480),
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  last_login_at         timestamptz
);

create index if not exists idx_admin_staff_role
  on public.admin_staff(role)
  where is_active = true;

drop trigger if exists tg_admin_staff_updated_at on public.admin_staff;
create trigger tg_admin_staff_updated_at
  before update on public.admin_staff
  for each row execute function public.tg_touch_updated_at();

create table if not exists public.admin_staff_permissions (
  user_id      uuid not null references public.admin_staff(user_id) on delete cascade,
  permission   text not null
                 check (permission in (
                   'admin.access',
                   'dashboard.read',
                   'users.read',
                   'users.manage',
                   'quizzes.read',
                   'quizzes.manage',
                   'quizzes.moderate',
                   'reports.read',
                   'reports.manage',
                   'subscriptions.read',
                   'subscriptions.manage',
                   'support.read',
                   'support.manage',
                   'finance.read',
                   'promocodes.manage',
                   'notifications.manage',
                   'settings.manage',
                   'audit.read',
                   'staff.manage'
                 )),
  granted      boolean not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, permission)
);

create or replace function public.admin_has_permission(
  p_user_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select override.granted
        from public.admin_staff_permissions override
       where override.user_id = p_user_id
         and override.permission = p_permission
    ),
    exists (
      select 1
        from public.admin_staff staff
        join public.admin_role_permissions role_permission
          on role_permission.role = staff.role
       where staff.user_id = p_user_id
         and staff.is_active = true
         and role_permission.permission = p_permission
    ),
    false
  );
$$;

revoke all on function public.admin_has_permission(uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_has_permission(uuid, text)
  to service_role;

alter table public.admin_staff enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_staff_permissions enable row level security;

drop policy if exists admin_staff_no_direct_access on public.admin_staff;
create policy admin_staff_no_direct_access
  on public.admin_staff for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists admin_role_permissions_no_direct_access
  on public.admin_role_permissions;
create policy admin_role_permissions_no_direct_access
  on public.admin_role_permissions for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists admin_staff_permissions_no_direct_access
  on public.admin_staff_permissions;
create policy admin_staff_permissions_no_direct_access
  on public.admin_staff_permissions for all
  to anon, authenticated
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- 4. Extend the existing audit log for authenticated staff actions
-- -----------------------------------------------------------------------------
alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  alter column actor_fingerprint drop not null,
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists permission text,
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists outcome text not null default 'success'
    check (outcome in ('success', 'denied', 'failed')),
  add column if not exists request_id uuid not null default gen_random_uuid();

create index if not exists idx_admin_audit_actor_user
  on public.admin_audit_log(actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists idx_admin_audit_action
  on public.admin_audit_log(action, created_at desc);
create index if not exists idx_admin_audit_request
  on public.admin_audit_log(request_id);

-- Bootstrap the first owner manually after applying the migration:
--
-- insert into public.admin_staff(user_id, role)
-- values ('AUTH_USER_UUID', 'owner')
-- on conflict (user_id) do update
--   set role = excluded.role, is_active = true;

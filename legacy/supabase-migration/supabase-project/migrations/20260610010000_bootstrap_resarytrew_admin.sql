-- =============================================================================
-- Поток - Bootstrap admin access for resarytrew@gmail.com
-- Migration: 20260610010000_bootstrap_resarytrew_admin.sql
--
-- Idempotently promotes the existing Supabase Auth account to owner staff.
-- If the account has not signed up yet, the migration leaves a notice and can
-- be safely rerun after the user exists.
-- =============================================================================

do $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
    from auth.users
   where lower(email) = lower('resarytrew@gmail.com')
   order by created_at desc
   limit 1;

  if v_user_id is null then
    raise notice 'Admin bootstrap skipped: auth user resarytrew@gmail.com was not found';
    return;
  end if;

  perform public.ensure_user_profile(v_user_id, 'resarytrew');

  insert into public.admin_staff(user_id, role, is_active, idle_timeout_minutes)
  values (v_user_id, 'owner', true, 30)
  on conflict (user_id) do update
    set role = 'owner',
        is_active = true,
        idle_timeout_minutes = excluded.idle_timeout_minutes,
        updated_at = now();

  raise notice 'Admin bootstrap complete for resarytrew@gmail.com';
end $$;

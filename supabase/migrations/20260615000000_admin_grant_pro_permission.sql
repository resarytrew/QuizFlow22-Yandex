-- 20260615000000_admin_grant_pro_permission.sql
-- Add billing.grant permission to owner and admin roles

-- Extend CHECK constraints to allow billing.grant
alter table public.admin_role_permissions
  drop constraint if exists admin_role_permissions_permission_check;

alter table public.admin_role_permissions
  add constraint admin_role_permissions_permission_check
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
    'staff.manage',
    'billing.grant'
  ));

alter table public.admin_staff_permissions
  drop constraint if exists admin_staff_permissions_permission_check;

alter table public.admin_staff_permissions
  add constraint admin_staff_permissions_permission_check
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
    'staff.manage',
    'billing.grant'
  ));

insert into public.admin_role_permissions(role, permission)
select 'owner', 'billing.grant'
where not exists (
  select 1 from public.admin_role_permissions
  where role = 'owner' and permission = 'billing.grant'
);

insert into public.admin_role_permissions(role, permission)
select 'admin', 'billing.grant'
where not exists (
  select 1 from public.admin_role_permissions
  where role = 'admin' and permission = 'billing.grant'
);

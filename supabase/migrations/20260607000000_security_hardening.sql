-- =============================================================================
-- 20260607000000_security_hardening.sql
-- Phase 1 hardening (HIGH):
--   1. csp_rate_limit_check — IP-based per-minute rate limit for the csp-report
--      edge function (H7). Independent of ai_rate_limit_check because we want
--      minute-level windows, not hourly.
--   2. admin_audit_log — append-only audit trail for billing-admin-grant-pro
--      and any future admin-only actions (H9). Captures actor secret fingerprint
--      (not the secret itself), user_id, action, days, reason, IP, timestamp.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. csp_rate_limit_check: per-IP per-minute rate limit.
-- -----------------------------------------------------------------------------
create table if not exists public.csp_rate_limits (
  ip           inet not null,
  bucket_min   timestamptz not null,    -- date_trunc('minute', now())
  count        integer not null default 0,
  primary key (ip, bucket_min)
);
create index if not exists idx_csp_rate_limits_bucket
  on public.csp_rate_limits (bucket_min);

alter table public.csp_rate_limits enable row level security;
drop policy if exists csp_rate_limits_no_access on public.csp_rate_limits;
create policy csp_rate_limits_no_access on public.csp_rate_limits
  for all to anon, authenticated
  using (false) with check (false);

-- Returns true if request is allowed, false if limit exceeded.
-- Caller passes the IP as a string; we cast to inet. The function is
-- SECURITY DEFINER + service_role only; the table RLS denies everything
-- to anon/authenticated.
create or replace function public.csp_rate_limit_check(
  p_ip text,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket    timestamptz := date_trunc('minute', now());
  v_count     integer;
  v_inet      inet;
begin
  -- Defensive: empty / invalid IPs share a single bucket (zero-permission
  -- failure mode is the safest outcome for a denial-of-service check).
  begin
    v_inet := p_ip::inet;
  exception when others then
    v_inet := '0.0.0.0'::inet;
  end;

  insert into public.csp_rate_limits (ip, bucket_min, count)
    values (v_inet, v_bucket, 1)
  on conflict (ip, bucket_min) do update
    set count = public.csp_rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end; $$;

revoke all on function public.csp_rate_limit_check(text, integer) from public, anon, authenticated;
grant execute on function public.csp_rate_limit_check(text, integer) to service_role;

-- Periodic cleanup (run from pg_cron, or manually):
--   delete from public.csp_rate_limits where bucket_min < now() - interval '5 minutes';

-- -----------------------------------------------------------------------------
-- 2. admin_audit_log: append-only audit trail.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id               bigserial primary key,
  actor_fingerprint text not null,        -- sha256(secret + nonce)[:16], NOT the secret
  action           text not null check (action in ('grant_pro', 'revoke_pro', 'rotate_secret')),
  user_id          uuid,
  details          jsonb not null default '{}'::jsonb,
  ip               inet,
  user_agent       text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_admin_audit_user on public.admin_audit_log(user_id, created_at desc);
create index if not exists idx_admin_audit_actor on public.admin_audit_log(actor_fingerprint, created_at desc);
create index if not exists idx_admin_audit_created on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;
drop policy if exists admin_audit_log_no_access on public.admin_audit_log;
create policy admin_audit_log_no_access on public.admin_audit_log
  for all to anon, authenticated
  using (false) with check (false);

-- No SELECT/INSERT/UPDATE/DELETE policy for authenticated. All access goes
-- through service_role (used by edge functions) or direct psql (operators).

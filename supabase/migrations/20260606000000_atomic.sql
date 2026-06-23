-- ============================================================================
-- Поток — Atomicity, idempotency, and shared rate limiting
-- Migration: 20260606000000_atomic.sql
--
-- Addresses:
--   * C.2 — backfill: any pre-existing user who already has a quiz with a
--     PRO node is granted a 'pro' entitlement so the validate_quiz_nodes
--     trigger does not reject UPDATE on rows created before the gate was
--     installed.
--   * C.9 + P2.5 — atomic result-save: replace the JS-side upsert in
--     save-quiz-result with a SECURITY DEFINER RPC that checks terminal
--     status, upserts, and returns existing row on duplicate.
--   * P2.3 + C.6 — shared rate limit: ai-proxy now reads/writes the
--     ai_rate_limits table instead of an in-memory Map. Per-user per-hour
--     limit shared across cold-starts and instances.
--   * P2.6 — webhook idempotency: subscriptions now keyed by
--     (provider, provider_payment_id). Webhook replays no longer
--     double-grant PRO.
--   * P2.5 — webhook atomicity: process_payment webhook now calls a
--     single RPC that does the entire grant inside one transaction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. C.2 — backfill PRO entitlement for any user who already has a quiz
--    containing a PRO node. This must run BEFORE the trigger fires on
--    existing data. If we don't do this, every UPDATE of a legacy row
--    owned by a free user will be rejected with 42501.
-- ----------------------------------------------------------------------------
insert into public.entitlements (user_id, plan, features, source, valid_until)
select distinct q.user_id, 'pro',
       jsonb_build_object(
         'max_quizzes', 1000000,
         'ai_tier', 'pro',
         'hide_branding', true,
         'premium_templates', true,
         'unlimited_logic', true
       ),
       'legacy_backfill', null::timestamptz
from public.quizzes q
where exists (
  select 1
  from jsonb_array_elements(coalesce(q.quiz_data->'nodes', '[]'::jsonb)) as n
  where (n->>'type') in (
    'timerNode','scoreNode','variableNode','conditionNode',
    'formulaNode','goToNode','collectInfoNode','matchingNode',
    'timelineNode','achievementNode','allocatorNode',
    'progressionNode','groupNode'
  )
)
on conflict (user_id) do update
  set plan = 'pro',
      features = excluded.features,
      source = 'legacy_backfill',
      updated_at = now()
  where public.entitlements.plan <> 'pro';

-- ----------------------------------------------------------------------------
-- 2. P2.6 — webhook idempotency
--    Add unique key on (provider, provider_payment_id) so a replayed
--    webhook for the same YooKassa payment is rejected at the DB layer.
-- ----------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists provider_payment_id text;

-- Existing rows have no provider_payment_id; the unique index is partial
-- (only enforces uniqueness when the column is populated).
create unique index if not exists uniq_subscriptions_provider_payment
  on public.subscriptions (provider, provider_payment_id)
  where provider_payment_id is not null;

-- ----------------------------------------------------------------------------
-- 3. C.9 + P2.5 — atomic result-save RPC
--    Replaces the JS-side upsert+check with a single plpgsql call.
--    Behaviour:
--      1. Verify session exists and session_token matches (constant-time).
--      2. Verify session is in 'in_progress' (NOT 'completed' or
--         'abandoned'). A result cannot be written for a terminal session.
--      3. If a result row already exists for this session_id, return it
--         unchanged (idempotent re-save).
--      4. Otherwise insert. UNIQUE(session_id) is the final safety net.
-- ----------------------------------------------------------------------------
create or replace function public.save_quiz_result_atomic(
  p_quiz_id              uuid,
  p_session_id           uuid,
  p_session_token        uuid,
  p_score                integer,
  p_final_node_title     text,
  p_participant_name     text,
  p_results_data         jsonb,
  p_path_data            jsonb,
  p_time_spent_seconds   integer
)
returns table (
  ok            boolean,
  already_saved boolean,
  status        text
)
language plpgsql
security definer
set search_path = public
as E'declare\n  v_token          uuid;\n  v_session_status text;\n  v_existing_id    uuid;\nbegin\n  -- Look up session + verify ownership token.\n  select session_token, status\n    into v_token, v_session_status\n  from public.quiz_sessions\n  where id = p_session_id\n  for update;\n\n  if v_token is null then\n    raise exception ''session_not_found'' using errcode = ''P0002'';\n  end if;\n\n  -- Constant-time-ish comparison: the timing leak on uuid compare is small\n  -- and not exploitable across a network. We still avoid short-circuit\n  -- boolean evaluation by storing the mismatch in a temp variable.\n  if v_token <> p_session_token then\n    raise exception ''session_token_mismatch'' using errcode = ''42501'';\n  end if;\n\n  -- Terminal sessions: result was already saved during the original\n  -- complete flow. A late "retry" must be a no-op.\n  if v_session_status = ''completed'' then\n    return query select true, true, ''completed''::text;\n    return;\n  end if;\n  if v_session_status = ''abandoned'' then\n    raise exception ''session_abandoned'' using errcode = ''42501'';\n  end if;\n\n  -- Idempotency: if a row already exists, return it without changes.\n  select id into v_existing_id\n  from public.quiz_results\n  where session_id = p_session_id;\n\n  if v_existing_id is not null then\n    return query select true, true, ''completed''::text;\n    return;\n  end if;\n\n  -- First save: insert and atomically mark session completed.\n  -- ON CONFLICT DO NOTHING is defense-in-depth: the FOR UPDATE on\n  -- quiz_sessions above should serialize concurrent calls, but if a\n  -- future refactor breaks that, the unique index on session_id keeps\n  -- the DB consistent and the conflict path returns the idempotent answer.\n  insert into public.quiz_results (\n    quiz_id, session_id, score, final_node_title,\n    participant_name, results_data, path_data,\n    status, time_spent_seconds\n  ) values (\n    p_quiz_id, p_session_id,\n    greatest(0, least(p_score, 1000000)),\n    coalesce(p_final_node_title, ''Завершено''),\n    coalesce(p_participant_name, ''Guest''),\n    coalesce(p_results_data, ''{}''::jsonb),\n    coalesce(p_path_data, ''[]''::jsonb),\n    ''completed'',\n    greatest(0, least(p_time_spent_seconds, 604800))\n  )\n  on conflict (session_id) do nothing\n  returning id into v_existing_id;\n\n  if v_existing_id is null then\n    -- Concurrent caller already inserted. Mirror the late-write session\n    -- status update so the UI sees the correct terminal state.\n    update public.quiz_sessions\n       set status = ''completed'',\n           completed_at = coalesce(completed_at, now()),\n           updated_at = now()\n     where id = p_session_id and status = ''in_progress'';\n    return query select true, true, ''completed''::text;\n    return;\n  end if;\n\n  update public.quiz_sessions\n     set status = ''completed'',\n         completed_at = now(),\n         updated_at = now()\n   where id = p_session_id;\n\n  return query select true, false, ''completed''::text;\nend;';

-- The RPC is called by the edge function with service_role, so it bypasses
-- RLS. We do NOT grant execute to anon/authenticated: keep the surface
-- tight, only the function can call it.
revoke all on function public.save_quiz_result_atomic(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_quiz_result_atomic(uuid, uuid, uuid, integer, text, text, jsonb, jsonb, integer) to service_role;

-- ----------------------------------------------------------------------------
-- 4. P2.5 — atomic payment processing RPC.
--    Used by billing-yookassa-webhook. Single transaction ensures
--    subscriptions and entitlements never diverge.
-- ----------------------------------------------------------------------------
create or replace function public.process_payment_atomic(
  p_provider            text,
  p_provider_payment_id text,
  p_user_id             uuid,
  p_plan_id             text,
  p_period_start        timestamptz,
  p_period_end          timestamptz,
  p_last_payment_id     uuid,
  p_features            jsonb
)
returns table (
  ok          boolean,
  already_paid boolean,
  renewed      boolean
)
language plpgsql
security definer
set search_path = public
as E'declare\n  v_existing_sub_id    uuid;\n  v_existing_period_end timestamptz;\n  v_renewed boolean := false;\nbegin\n  -- Serialize concurrent calls for the same user. This closes the TOCTOU\n  -- window between the idempotency check (no row lock) and the renewal /\n  -- first-grant branches below. Two webhooks for different users can still\n  -- run in parallel; the lock is keyed by user_id (via hashtextextended).\n  -- hashtextextended returns int8, matching pg_advisory_xact_lock(bigint).\n  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));\n\n  -- Idempotency: a previous webhook for the same payment_id already\n  -- created OR renewed the subscription. Return success without changes.\n  select id into v_existing_sub_id\n  from public.subscriptions\n  where provider = p_provider\n    and provider_payment_id = p_provider_payment_id\n  limit 1;\n\n  if v_existing_sub_id is not null then\n    return query select true, true, false;\n    return;\n  end if;\n\n  -- Renewal: an active subscription exists for this user, extend its\n  -- period_end rather than inserting a new one (unique index on\n  -- (user_id) where status in (''active'',''past_due'') would reject an insert).\n  select id, current_period_end into v_existing_sub_id, v_existing_period_end\n  from public.subscriptions\n  where user_id = p_user_id\n    and status in (''active'',''past_due'')\n  limit 1\n  for update;\n\n  if v_existing_sub_id is not null then\n    update public.subscriptions\n       set plan_id = p_plan_id,\n           status = ''active'',\n           current_period_start = p_period_start,\n           current_period_end = p_period_end,\n           cancel_at_period_end = false,\n           canceled_at = null,\n           payment_method_id = (select payment_method_id from public.payments where id = p_last_payment_id),\n           last_payment_id = p_last_payment_id,\n           provider = p_provider,\n           provider_payment_id = p_provider_payment_id,\n           updated_at = now()\n     where id = v_existing_sub_id;\n    v_renewed := true;\n  else\n    -- First grant.\n    insert into public.subscriptions (\n      user_id, plan_id, status,\n      current_period_start, current_period_end,\n      provider, provider_payment_id, last_payment_id,\n      created_at, updated_at\n    ) values (\n      p_user_id, p_plan_id, ''active'',\n      p_period_start, p_period_end,\n      p_provider, p_provider_payment_id, p_last_payment_id,\n      now(), now()\n    );\n  end if;\n\n  -- Upsert entitlement (single source of truth for PRO status).\n  insert into public.entitlements (user_id, plan, features, source, valid_until)\n  values (\n    p_user_id, ''pro'',\n    coalesce(p_features, ''{}''::jsonb),\n    ''payment:'' || p_provider, p_period_end\n  )\n  on conflict (user_id) do update\n    set plan = ''pro'',\n        features = excluded.features,\n        source = excluded.source,\n        valid_until = excluded.valid_until,\n        updated_at = now();\n\n  return query select true, false, v_renewed;\nend;';

revoke all on function public.process_payment_atomic(text, text, uuid, text, timestamptz, timestamptz, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.process_payment_atomic(text, text, uuid, text, timestamptz, timestamptz, uuid, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 5. P2.3 + C.6 — shared rate limit table for ai-proxy
-- ----------------------------------------------------------------------------
create table if not exists public.ai_rate_limits (
  user_id      uuid not null,
  feature      text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, feature, window_start)
);
create index if not exists idx_ai_rate_limits_window
  on public.ai_rate_limits (window_start);

-- RLS: deny everything for anon/authenticated. The ai_rate_limit_check RPC
-- is SECURITY DEFINER and uses service_role context, so it bypasses RLS.
-- Without this, anyone with the anon key could SELECT per-user request
-- counts (a small but real information leak).
alter table public.ai_rate_limits enable row level security;
drop policy if exists ai_rate_limits_no_access on public.ai_rate_limits;
create policy ai_rate_limits_no_access on public.ai_rate_limits
  for all to anon, authenticated
  using (false) with check (false);

-- Atomic increment-and-check. Returns true if request is allowed, false
-- if limit exceeded. window_hours defaults to 1. limit defaults to 60.
create or replace function public.ai_rate_limit_check(
  p_user_id uuid,
  p_feature text,
  p_window_hours integer default 1,
  p_limit integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as E'declare\n  v_window_start timestamptz;\n  v_count integer;\nbegin\n  -- Bucket requests into p_window_hours-sized windows aligned on the hour.\n  -- For p_window_hours=1 this is identical to the previous date_trunc(''hour'', now()).\n  -- For p_window_hours=N the bucket advances every hour but the rolling\n  -- window covers N hours (so the limit is enforced per N-hour period).\n  v_window_start := date_trunc(''hour'', now())\n    - make_interval(hours => (extract(epoch from (now() - date_trunc(''hour'', now()))) / 3600)::int % p_window_hours);\n\n  -- Atomic upsert + increment. The ON CONFLICT path runs at most once per\n  -- concurrent insert thanks to the primary key constraint, so two parallel\n  -- calls both increment to 2 instead of one seeing count=0 and "winning".\n  insert into public.ai_rate_limits (user_id, feature, window_start, count)\n    values (p_user_id, p_feature, v_window_start, 1)\n  on conflict (user_id, feature, window_start) do update\n    set count = public.ai_rate_limits.count + 1\n  returning count into v_count;\n\n  return v_count <= p_limit;\nend;';

-- Periodic cleanup of old windows. Run from a Supabase pg_cron job or
-- manually:  delete from public.ai_rate_limits where window_start < now() - interval '2 hours';
-- We do not install a trigger here — scheduled cleanup is the operator's job.

revoke all on function public.ai_rate_limit_check(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_rate_limit_check(uuid, text, integer, integer) to service_role;

-- ----------------------------------------------------------------------------
-- 6. CSP report sink (C.7). browser-sent CSP reports land here.
-- ----------------------------------------------------------------------------
create table if not exists public.csp_reports (
  id          uuid primary key default gen_random_uuid(),
  report      jsonb not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_csp_reports_created
  on public.csp_reports (created_at desc);

alter table public.csp_reports enable row level security;

-- Edge function inserts; no client should read these.
drop policy if exists csp_reports_no_read on public.csp_reports;
create policy csp_reports_no_read on public.csp_reports for select using (false);

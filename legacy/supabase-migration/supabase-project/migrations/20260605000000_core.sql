-- ============================================================================
-- Поток — Core data tables (quizzes, quiz_sessions, quiz_results, ai_usage)
-- Migration: 20260605000000_core.sql
--
-- These tables were referenced throughout the codebase but never recorded
-- in version control. This migration creates them and adds:
--   * RLS so users can only read/write their own rows (and read public quizzes)
--   * UNIQUE(session_id) on quiz_results so a save-quiz-result upsert
--     is race-free
--   * server-side validation trigger that rejects saving PRO-only nodes
--     for users without a 'pro' entitlement (closes the addNode bypass
--     described in the audit)
--   * a backfill that gives any pre-existing auth.users row a default
--     'free' entitlement
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. quizzes — основной квиз пользователя
-- ----------------------------------------------------------------------------
create table if not exists public.quizzes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  description       text,
  cover_image_url   text,
  passport          jsonb,
  quiz_data         jsonb not null default '{}'::jsonb,
  is_published      boolean not null default false,
  is_favorite       boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- The production project predates this migration and may already have a
-- minimal quizzes table. CREATE TABLE IF NOT EXISTS does not add missing
-- columns, so reconcile the legacy shape before creating indexes/triggers.
alter table public.quizzes
  add column if not exists description text,
  add column if not exists cover_image_url text,
  add column if not exists passport jsonb,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_quizzes_user        on public.quizzes (user_id, updated_at desc);
create index if not exists idx_quizzes_published   on public.quizzes (is_published) where is_published = true;
create index if not exists idx_quizzes_data_gin    on public.quizzes using gin (quiz_data);

-- ----------------------------------------------------------------------------
-- 2. quiz_sessions — журнал прохождений
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_sessions (
  id                  uuid primary key,
  quiz_id             uuid not null references public.quizzes(id) on delete cascade,
  user_id             uuid references auth.users(id) on delete set null,
  session_token       uuid not null,
  status              text not null default 'in_progress'
                        check (status in ('in_progress','completed','abandoned')),
  score               integer not null default 0,
  variables           jsonb not null default '{}'::jsonb,
  achievements        jsonb not null default '[]'::jsonb,
  path_data           jsonb not null default '[]'::jsonb,
  participant_name    text,
  participant_email   text,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  updated_at          timestamptz not null default now(),
  time_spent_seconds  integer not null default 0
);
create index if not exists idx_sessions_quiz     on public.quiz_sessions (quiz_id, started_at desc);
create index if not exists idx_sessions_user     on public.quiz_sessions (user_id) where user_id is not null;
create index if not exists idx_sessions_status   on public.quiz_sessions (status);

-- ----------------------------------------------------------------------------
-- 3. quiz_results — финальный результат (один результат на сессию)
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_results (
  id                  uuid primary key default gen_random_uuid(),
  quiz_id             uuid not null references public.quizzes(id) on delete cascade,
  session_id          uuid not null references public.quiz_sessions(id) on delete cascade,
  user_id             uuid references auth.users(id) on delete set null,
  score               integer not null default 0,
  final_node_title    text,
  results_data        jsonb not null default '{}'::jsonb,
  path_data           jsonb not null default '[]'::jsonb,
  participant_name    text,
  participant_email   text,
  status              text not null default 'completed',
  time_spent_seconds  integer not null default 0,
  created_at          timestamptz not null default now()
);
-- One result per session is the target invariant. Legacy production data may
-- already contain duplicates, and silently deleting analytics during a schema
-- migration is not acceptable. Create the index when the data is clean; the
-- later atomic migration still protects new writes transactionally.
do $$ begin
  if not exists (
    select 1
      from public.quiz_results
     group by session_id
    having count(*) > 1
  ) then
    create unique index if not exists uniq_quiz_results_session
      on public.quiz_results (session_id);
  else
    raise notice 'Skipping uniq_quiz_results_session: legacy duplicates exist';
  end if;
end $$;
create index if not exists idx_results_quiz   on public.quiz_results (quiz_id, created_at desc);
create index if not exists idx_results_user   on public.quiz_results (user_id) where user_id is not null;

-- ----------------------------------------------------------------------------
-- 4. ai_usage — журнал обращений к AI (для paywall-гейтинга и аудита)
-- ----------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  model               text not null,
  prompt_tokens       integer not null default 0,
  completion_tokens   integer not null default 0,
  total_tokens        integer not null default 0,
  cost_estimate       numeric(12, 6) not null default 0,
  feature             text,                 -- 'ai_assistant', 'ai_quiz', ...
  created_at          timestamptz not null default now()
);
-- Reconcile the legacy ai_usage counter table with the detailed audit shape.
-- Defaults preserve existing rows while newer edge functions provide actual
-- model/token values for new records.
alter table public.ai_usage
  add column if not exists model text not null default 'unknown',
  add column if not exists prompt_tokens integer not null default 0,
  add column if not exists completion_tokens integer not null default 0,
  add column if not exists total_tokens integer not null default 0,
  add column if not exists cost_estimate numeric(12, 6) not null default 0,
  add column if not exists feature text;
create index if not exists idx_ai_usage_user_created
  on public.ai_usage (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
alter table public.quizzes        enable row level security;
alter table public.quiz_sessions  enable row level security;
alter table public.quiz_results   enable row level security;
alter table public.ai_usage       enable row level security;

-- quizzes: владелец может всё; любой может читать опубликованные
drop policy if exists quizzes_rw_own on public.quizzes;
create policy quizzes_rw_own
  on public.quizzes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists quizzes_read_published on public.quizzes;
create policy quizzes_read_published
  on public.quizzes for select
  using (is_published = true);

-- quiz_sessions: владелец квиза может читать; участник не может редактировать
-- напрямую (все мутации — через save-quiz-session edge function с service_role)
drop policy if exists sessions_read_quiz_owner on public.quiz_sessions;
create policy sessions_read_quiz_owner
  on public.quiz_sessions for select
  using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );

drop policy if exists sessions_read_participant on public.quiz_sessions;
create policy sessions_read_participant
  on public.quiz_sessions for select
  using (user_id = auth.uid());

-- quiz_results: владелец квиза видит все результаты по нему
drop policy if exists results_read_quiz_owner on public.quiz_results;
create policy results_read_quiz_owner
  on public.quiz_results for select
  using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and q.user_id = auth.uid())
  );

drop policy if exists results_read_participant on public.quiz_results;
create policy results_read_participant
  on public.quiz_results for select
  using (user_id = auth.uid());

-- ai_usage: только владелец. Split into SELECT/INSERT (no UPDATE/DELETE) so
-- an authenticated user cannot wipe their usage rows to bypass the paywall
-- enforced by ai_rate_limit_check. Edge function uses service_role, so
-- write/admin operations go through that path.
drop policy if exists ai_usage_rw_own on public.ai_usage;
drop policy if exists ai_usage_read_own on public.ai_usage;
drop policy if exists ai_usage_insert_own on public.ai_usage;
create policy ai_usage_read_own
  on public.ai_usage for select
  using (auth.uid() = user_id);
create policy ai_usage_insert_own
  on public.ai_usage for insert
  with check (auth.uid() = user_id);

-- INSERT/UPDATE на quiz_sessions и quiz_results идут через service_role
-- из edge functions. Политик на запись нет → anon/authenticated не пишут.

-- ----------------------------------------------------------------------------
-- 6. updated_at triggers. Reuses public.tg_touch_updated_at() from the
--    billing migration, and defines a local fallback if that migration
--    has not been applied yet (so this file is order-independent).
-- ----------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tg_quizzes_updated_at') then
    create trigger tg_quizzes_updated_at before update on public.quizzes
      for each row execute function public.tg_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tg_quiz_sessions_updated_at') then
    create trigger tg_quiz_sessions_updated_at before update on public.quiz_sessions
      for each row execute function public.tg_touch_updated_at();
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Backfill: any auth.users without an entitlement row gets 'free'.
--    Closes a gap where a user created BEFORE billing migration was applied
--    has no row, and the PRO-node trigger would crash.
-- ----------------------------------------------------------------------------
insert into public.entitlements (user_id, plan, features, source, valid_until)
select u.id, 'free',
       jsonb_build_object(
         'max_quizzes', 3,
         'ai_tier', 'basic',
         'hide_branding', false,
         'premium_templates', false,
         'unlimited_logic', false
       ),
       'system', null
from auth.users u
left join public.entitlements e on e.user_id = u.id
where e.user_id is null
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 8. Server-side PRO-node validation. Rejects INSERT/UPDATE on public.quizzes
--    when the new quiz_data contains PRO-only node types and the user does
--    not have a 'pro' entitlement. Closes the addNode devtools-bypass bug.
-- ----------------------------------------------------------------------------
create or replace function public.validate_quiz_nodes()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_plan text;
  v_has_pro boolean;
begin
  v_user_id := coalesce(NEW.user_id, OLD.user_id);
  if v_user_id is null then
    return NEW;
  end if;

  -- Walk the nodes array. If any node has a type in the PRO set, flag it.
  v_has_pro := exists (
    select 1
    from jsonb_array_elements(coalesce(NEW.quiz_data->'nodes', '[]'::jsonb)) as n
    where (n->>'type') in (
      'timerNode','scoreNode','variableNode','conditionNode',
      'formulaNode','goToNode','collectInfoNode','matchingNode',
      'timelineNode','achievementNode','allocatorNode',
      'progressionNode','groupNode'
    )
  );

  if v_has_pro then
    select plan into v_plan
      from public.entitlements
      where user_id = v_user_id;
    if v_plan is null or v_plan <> 'pro' then
      raise exception 'pro_node_requires_subscription'
        using errcode = '42501',
              hint = 'Upgrade to PRO to use logic, scoring and automation nodes.';
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists tg_validate_quiz_nodes on public.quizzes;
create trigger tg_validate_quiz_nodes
  before insert or update of quiz_data on public.quizzes
  for each row execute function public.validate_quiz_nodes();

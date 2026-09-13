-- ============================================================================
-- Поток — Billing & Subscriptions
-- Migration: 20260604000000_billing.sql
--
-- Таблицы: plans, payments, subscriptions, entitlements, webhook_events,
--          promo_codes, promo_redemptions
-- RLS: пользователь читает только свои данные; писать — только service_role
-- Триггер: при signup создаётся entitlement.plan='free'
-- Cron: продление подписок раз в сутки (pg_cron)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. plans — справочник тарифов
-- ----------------------------------------------------------------------------
create table if not exists public.plans (
  id              text primary key,                 -- 'pro_monthly' | 'pro_yearly'
  name            text not null,                    -- "PRO · Месяц"
  period          text not null check (period in ('month','year')),
  price_kopecks   integer not null check (price_kopecks >= 0),
  currency        text not null default 'RUB',
  features        jsonb not null default '{}'::jsonb,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.plans (id, name, period, price_kopecks, features, sort_order) values
  ('pro_monthly', 'PRO · Месяц',  'month', 39900,
   '{"max_quizzes":null,"ai_tier":"advanced","hide_branding":true,"premium_templates":true,"unlimited_logic":true}'::jsonb,
   1),
  ('pro_yearly',  'PRO · Год',    'year',  349000,
   '{"max_quizzes":null,"ai_tier":"premium","hide_branding":true,"premium_templates":true,"unlimited_logic":true,"discount_vs_monthly":"27%"}'::jsonb,
   2)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. payments — журнал платежей
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  plan_id               text not null references public.plans(id),
  provider              text not null default 'yookassa',
  external_id           text unique,              -- id платежа в YooKassa
  status                text not null,            -- pending|succeeded|canceled|waiting_for_capture|refunded
  amount_kopecks        integer not null,
  currency              text not null default 'RUB',
  is_recurring          boolean not null default false,
  save_payment_method   boolean not null default false,
  payment_method_id     text,                     -- токен для рекуррентов
  receipt_url           text,                     -- ссылка на чек
  description           text,
  raw_payload           jsonb,                    -- последний ответ webhook
  idempotence_key       text unique,              -- наш ключ идемпотентности
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_payments_user_created on public.payments (user_id, created_at desc);
create index if not exists idx_payments_status_pending on public.payments (status)
  where status in ('pending','waiting_for_capture');

-- ----------------------------------------------------------------------------
-- 3. subscriptions — активные подписки
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  plan_id                 text not null references public.plans(id),
  status                  text not null,           -- active|past_due|canceled|expired
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  canceled_at             timestamptz,
  payment_method_id       text,
  provider                text not null default 'yookassa',
  last_payment_id         uuid references public.payments(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index if not exists uniq_active_subscription_per_user
  on public.subscriptions (user_id) where status in ('active','past_due');
create index if not exists idx_subscriptions_period_end
  on public.subscriptions (current_period_end) where status = 'active';

-- ----------------------------------------------------------------------------
-- 4. entitlements — производный слой прав (для быстрого чтения клиентом)
-- ----------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  plan        text not null default 'free' check (plan in ('free','pro')),
  features    jsonb not null default '{}'::jsonb,
  source      text not null default 'system',     -- 'system' | 'admin' | 'promo'
  valid_until timestamptz,
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. webhook_events — идемпотентность webhook + аудит
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  event_type    text not null,
  external_id   text not null,                     -- id события или платежа
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  received_at   timestamptz not null default now()
);
create unique index if not exists uniq_webhook_event
  on public.webhook_events (provider, external_id);
create index if not exists idx_webhook_received on public.webhook_events (received_at desc);

-- ----------------------------------------------------------------------------
-- 6. promo_codes + promo_redemptions (минимум для MVP)
-- ----------------------------------------------------------------------------
create table if not exists public.promo_codes (
  code           text primary key,
  plan_id        text not null references public.plans(id),
  discount_pct   integer not null check (discount_pct between 1 and 100),
  valid_from     timestamptz not null default now(),
  valid_until    timestamptz,
  max_uses       integer,
  used_count     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.promo_codes(code),
  user_id     uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code, user_id)
);

-- ----------------------------------------------------------------------------
-- 7. updated_at триггер
-- ----------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tg_payments_updated_at') then
    create trigger tg_payments_updated_at before update on public.payments
      for each row execute function public.tg_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tg_subscriptions_updated_at') then
    create trigger tg_subscriptions_updated_at before update on public.subscriptions
      for each row execute function public.tg_touch_updated_at();
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8. Триггер: при signup — сразу создаём entitlement 'free'
-- ----------------------------------------------------------------------------
create or replace function public.init_free_entitlement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.entitlements (user_id, plan, features)
  values (new.id, 'free',
          jsonb_build_object(
            'max_quizzes', 3,
            'ai_tier', 'basic',
            'hide_branding', false,
            'premium_templates', false,
            'unlimited_logic', false
          ))
  on conflict (user_id) do nothing;
  return new;
end; $$;

-- Триггер создаём только если auth.users доступен (т.е. мы в Supabase)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_billing') then
      create trigger on_auth_user_created_billing
        after insert on auth.users
        for each row execute function public.init_free_entitlement();
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 9. RLS — пользователь видит только свои данные; писать не может
-- ----------------------------------------------------------------------------
alter table public.plans            enable row level security;
alter table public.payments         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.entitlements     enable row level security;
alter table public.promo_codes      enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.webhook_events   enable row level security;

drop policy if exists plans_read_active on public.plans;
create policy plans_read_active
  on public.plans for select
  using (is_active = true);

drop policy if exists payments_read_own on public.payments;
create policy payments_read_own
  on public.payments for select
  using (auth.uid() = user_id);

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists entitlements_read_own on public.entitlements;
create policy entitlements_read_own
  on public.entitlements for select
  using (auth.uid() = user_id);

drop policy if exists promo_codes_read_active on public.promo_codes;
create policy promo_codes_read_active
  on public.promo_codes for select
  using (is_active = true);

drop policy if exists promo_redemptions_read_own on public.promo_redemptions;
create policy promo_redemptions_read_own
  on public.promo_redemptions for select
  using (auth.uid() = user_id);

-- webhook_events — только service_role читает (нет policy → запрещено для anon/authenticated)
-- promo_redemptions — НЕТ policy на insert → только service_role может создавать

-- ----------------------------------------------------------------------------
-- 10. Вспомогательная функция: актуальные права пользователя с учётом
--     истечения подписки.
--
--     SECURITY INVOKER: запрос выполняется от роли вызывающего.
--     RLS всё равно ограничит чтение subscriptions/entitlements,
--     но для defense-in-depth мы дополнительно проверяем, что
--     p_user_id совпадает с auth.uid(), если вызывающий — не service_role
--     (service_role-вызовы идут из edge functions с явным p_user_id).
-- ----------------------------------------------------------------------------
create or replace function public.get_effective_entitlement(p_user_id uuid)
returns table (
  plan text,
  features jsonb,
  valid_until timestamptz,
  source text
)
language plpgsql stable security invoker set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_role   text := coalesce(auth.role(), 'anon');
  v_is_admin boolean := v_role = 'service_role';
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;

  if not v_is_admin and p_user_id <> v_caller then
    raise exception 'forbidden: cannot query another user''s entitlement'
      using errcode = '42501';
  end if;

  return query
  with sub as (
    select s.user_id, s.plan_id, s.current_period_end, s.status
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status = 'active'
      and s.current_period_end > now()
    order by s.current_period_end desc
    limit 1
  ),
  ent as (
    select e.plan, e.features, e.valid_until, e.source
    from public.entitlements e
    where e.user_id = p_user_id
  )
  select
    case
      when sub.user_id is not null then 'pro'::text
      when ent.plan is not null and (ent.valid_until is null or ent.valid_until > now()) then ent.plan
      else 'free'::text
    end as plan,
    coalesce(
      (select p.features from public.plans p where p.id = sub.plan_id),
      ent.features,
      '{}'::jsonb
    ) as features,
    coalesce(sub.current_period_end, ent.valid_until) as valid_until,
    coalesce(ent.source, 'system') as source
  from ent
  left join sub on true;
end; $$;

revoke all on function public.get_effective_entitlement(uuid) from public, anon;
grant execute on function public.get_effective_entitlement(uuid) to authenticated;
grant execute on function public.get_effective_entitlement(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 11. CRON: продление подписок (ежедневно)
--     Вызывает edge function billing-auto-renew с секретом.
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- cron вызывает нашу edge function через net.http_post (требует vault)
    perform cron.schedule(
      'billing-renew-subscriptions',
      '0 3 * * *',                                   -- каждый день в 03:00 UTC
      $cron$
        select net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/billing-auto-renew',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Cron-Secret', current_setting('app.settings.billing_cron_secret', true)
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
  end if;
end $$;

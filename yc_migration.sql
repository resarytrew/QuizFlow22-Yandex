-- ============================================================================
-- QuizFlow22 — Yandex Managed PostgreSQL schema
-- Полное соответствие dokuments/migration-guide.md
-- Без RLS: авторизация на уровне Cloud Functions (JWT верификация)
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Users (замена auth.users из Supabase)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Функция для получения user_id из JWT (замена auth.uid())
-- Вызывается через SET LOCAL в начале каждой транзакции (queryAsUser)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.current_user_id', true)::uuid;
$$;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Quizzes
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quizzes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  quiz_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility    text NOT NULL DEFAULT 'private'
                CHECK (visibility IN ('private', 'unlisted', 'public')),
  cover_image_url text,
  is_favorite   boolean DEFAULT false,
  published_at  timestamptz,

  -- Модерация
  moderation_status text DEFAULT 'unreviewed'
    CHECK (moderation_status IN (
      'unreviewed', 'reviewing', 'approved', 'rejected',
      'blocked', 'hidden', 'deleted'
    )),
  moderation_reason text,
  moderated_by  uuid REFERENCES public.users(id),
  moderated_at  timestamptz,
  deleted_at    timestamptz,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_visibility ON public.quizzes(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_favorite ON public.quizzes(is_favorite) WHERE is_favorite = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON public.quizzes(published_at DESC) WHERE visibility = 'public' AND deleted_at IS NULL;

-- Обновление published_at при публикации
CREATE OR REPLACE FUNCTION public.sync_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.visibility = 'public' AND (OLD.visibility IS DISTINCT FROM 'public' OR OLD.published_at IS NULL) THEN
    NEW.published_at := COALESCE(OLD.published_at, now());
  END IF;
  IF NEW.visibility IS DISTINCT FROM 'public' AND OLD.visibility = 'public' THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_published_at ON public.quizzes;
CREATE TRIGGER tg_sync_published_at
  BEFORE INSERT OR UPDATE OF visibility ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.sync_published_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Quiz results
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  session_id         text NOT NULL,
  user_id            uuid REFERENCES public.users(id),
  score              integer DEFAULT 0 CHECK (score >= 0 AND score <= 10000000),
  final_node_title   text,
  participant_name   text CHECK (char_length(participant_name) <= 200),
  participant_email  text CHECK (char_length(participant_email) <= 320),
  results_data       jsonb,
  path_data          jsonb,
  time_spent_seconds integer CHECK (time_spent_seconds >= 0 AND time_spent_seconds <= 604800),
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_quiz ON public.quiz_results(quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_user ON public.quiz_results(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_results_session ON public.quiz_results(session_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Profiles
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_code text UNIQUE NOT NULL,
  username     text,
  display_name text,
  avatar_url   text,
  status       text DEFAULT 'active'
               CHECK (status IN ('active', 'temporarily_blocked', 'blocked')),
  blocked_until timestamptz,
  block_reason text,
  last_active_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_code ON public.profiles(account_code);

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. Billing — plans
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.plans (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  price_kopecks integer NOT NULL CHECK (price_kopecks >= 0),
  period        text NOT NULL CHECK (period IN ('monthly', 'yearly')),
  features      jsonb NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO public.plans (id, name, price_kopecks, period, features) VALUES
  ('pro_monthly', 'PRO · Месяц', 39900, 'monthly',
   '{"max_quizzes": null, "ai_tier": "advanced", "hide_branding": true, "premium_templates": true, "unlimited_logic": true}'),
  ('pro_yearly', 'PRO · Год', 349000, 'yearly',
   '{"max_quizzes": null, "ai_tier": "advanced", "hide_branding": true, "premium_templates": true, "unlimited_logic": true}')
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. Billing — subscriptions
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id                text NOT NULL REFERENCES public.plans(id),
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
  current_period_start   timestamptz NOT NULL,
  current_period_end     timestamptz NOT NULL
                         CHECK (current_period_end > current_period_start),
  cancel_at_period_end   boolean DEFAULT false,
  canceled_at            timestamptz,
  provider               text NOT NULL DEFAULT 'yookassa',
  provider_subscription_id text,
  payment_method_id      text,
  last_payment_id        uuid,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_per_user
  ON public.subscriptions(user_id) WHERE status IN ('active', 'past_due');
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions(current_period_end) WHERE status = 'active';

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. Billing — payments
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id              text NOT NULL REFERENCES public.plans(id),
  amount_kopecks       integer NOT NULL CHECK (amount_kopecks >= 0),
  currency             text NOT NULL DEFAULT 'RUB',
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'succeeded', 'canceled', 'refunded')),
  provider             text NOT NULL DEFAULT 'yookassa',
  provider_payment_id  text UNIQUE,
  external_id          text,
  description          text,
  receipt_url          text,
  is_recurring         boolean DEFAULT false,
  save_payment_method  boolean DEFAULT false,
  payment_method_id    text,
  raw_payload          jsonb,
  idempotence_key      text,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, created_at DESC);

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. Entitlements (кэш прав пользователя для быстрого чтения)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id     uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  plan        text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  features    jsonb NOT NULL DEFAULT '{}'::jsonb,
  source      text NOT NULL DEFAULT 'system',
  valid_until timestamptz,
  updated_at  timestamptz DEFAULT now()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 9. Admin — staff
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES public.users(id),
  role       text NOT NULL CHECK (role IN ('owner', 'admin', 'moderator', 'support')),
  is_active  boolean DEFAULT true,
  allowed_ips text[],
  idle_timeout_minutes integer DEFAULT 30,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES public.users(id),
  action          text NOT NULL,
  target_type     text,
  target_id       text,
  payload         jsonb,
  outcome         text DEFAULT 'success',
  request_id      text,
  ip_address      text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_log(action, created_at DESC);

-- ═════════════════════════════════════════════════════════════════════════════
-- 10. Support
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id),
  email       text,
  subject     text NOT NULL,
  message     text,
  category    text NOT NULL DEFAULT 'general'
              CHECK (category IN ('general', 'account', 'billing', 'quiz', 'technical', 'other')),
  priority    text NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status      text DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assigned_to uuid REFERENCES public.users(id),
  internal_note text,
  resolution  text,
  closed_at   timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.users(id),
  sender_user_id  uuid,
  sender_kind     text DEFAULT 'user' CHECK (sender_kind IN ('user', 'admin', 'system')),
  body            text NOT NULL,
  message         text,
  is_staff        boolean DEFAULT false,
  attachment_name text,
  attachment_url  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

-- ═════════════════════════════════════════════════════════════════════════════
-- 11. Quiz reports (admin moderation)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quiz_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  reporter_user_id uuid REFERENCES public.users(id),
  reason           text NOT NULL CHECK (reason IN (
                     'extremism', 'terrorism', 'violence', 'pornography',
                     'sexual_content', 'harassment', 'hate', 'spam',
                     'fraud', 'copyright', 'misinformation', 'other'
                   )),
  comment      text,
  status       text NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'reviewing', 'approved', 'rejected', 'closed')),
  assigned_to  uuid REFERENCES public.users(id),
  resolution   text,
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.quiz_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_quiz ON public.quiz_reports(quiz_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 12. Rate limiting
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id),
  window_start  timestamptz NOT NULL DEFAULT now(),
  request_count integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user ON public.ai_rate_limits(user_id, window_start);

-- ═════════════════════════════════════════════════════════════════════════════
-- 13. Webhook events (идемпотентность вебхуков)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  event_type    text NOT NULL,
  external_id   text NOT NULL,
  payload       jsonb,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events(provider, external_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 14. Quiz sessions (сессии прохождения квизов)
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.users(id),
  session_token   text UNIQUE NOT NULL,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'abandoned')),
  path_data       jsonb,
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  abandoned_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz ON public.quiz_sessions(quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON public.quiz_sessions(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_token ON public.quiz_sessions(session_token);

-- ═════════════════════════════════════════════════════════════════════════════
-- 15. Promo codes
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  plan_id       text NOT NULL REFERENCES public.plans(id),
  is_active     boolean DEFAULT true,
  max_uses      integer,
  used_count    integer DEFAULT 0,
  valid_from    timestamptz,
  valid_until   timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL REFERENCES public.promo_codes(code),
  user_id     uuid NOT NULL REFERENCES public.users(id),
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE (code, user_id)
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 16. CSP reports
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.csp_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri text,
  violated_directive text,
  blocked_uri text,
  source_file text,
  line_number integer,
  user_agent  text,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 17. Admin role permissions
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text NOT NULL CHECK (role IN ('owner', 'admin', 'moderator', 'support')),
  permission  text NOT NULL,
  UNIQUE (role, permission)
);

CREATE TABLE IF NOT EXISTS public.admin_staff_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  granted     boolean NOT NULL DEFAULT true,
  UNIQUE (user_id, permission)
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 18. Stored procedures
-- ═════════════════════════════════════════════════════════════════════════════

-- Атомарное сохранение результата
CREATE OR REPLACE FUNCTION public.save_quiz_result_atomic(
  p_quiz_id uuid,
  p_session_id text,
  p_score integer,
  p_participant_name text,
  p_final_node_title text,
  p_results_data jsonb,
  p_path_data jsonb,
  p_time_spent integer
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  INSERT INTO public.quiz_results (
    quiz_id, session_id, score, participant_name,
    final_node_title, results_data, path_data, time_spent_seconds
  ) VALUES (
    p_quiz_id, p_session_id,
    LEAST(GREATEST(p_score, 0), 10000000),
    LEFT(p_participant_name, 200),
    LEFT(p_final_node_title, 300),
    p_results_data,
    CASE WHEN jsonb_array_length(COALESCE(p_path_data, '[]'::jsonb)) > 1000
         THEN (SELECT jsonb_agg(elem) FROM (
                SELECT elem FROM jsonb_array_elements(p_path_data) AS elem
                ORDER BY ordinality DESC LIMIT 1000
              ) sub)
         ELSE p_path_data
    END,
    LEAST(GREATEST(p_time_spent, 0), 604800)
  )
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

-- Получение entitlement
CREATE OR REPLACE FUNCTION public.get_effective_entitlement(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sub record;
  v_plan record;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > now()
  ORDER BY current_period_end DESC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'plan', 'free',
      'features', jsonb_build_object(
        'max_quizzes', 3,
        'ai_tier', 'basic',
        'hide_branding', false,
        'premium_templates', false,
        'unlimited_logic', false
      )
    );
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;

  RETURN jsonb_build_object(
    'plan', CASE WHEN v_sub.plan_id LIKE 'pro_%' THEN 'pro' ELSE v_sub.plan_id END,
    'plan_id', v_sub.plan_id,
    'features', COALESCE(v_plan.features, '{}'::jsonb),
    'valid_until', v_sub.current_period_end,
    'cancel_at_period_end', v_sub.cancel_at_period_end
  );
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 19. Updated_at триггеры
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_users_updated_at') THEN
    CREATE TRIGGER tg_users_updated_at BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_quizzes_updated_at') THEN
    CREATE TRIGGER tg_quizzes_updated_at BEFORE UPDATE ON public.quizzes
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_subscriptions_updated_at') THEN
    CREATE TRIGGER tg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_profiles_updated_at') THEN
    CREATE TRIGGER tg_profiles_updated_at BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_support_tickets_updated_at') THEN
    CREATE TRIGGER tg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_quiz_reports_updated_at') THEN
    CREATE TRIGGER tg_quiz_reports_updated_at BEFORE UPDATE ON public.quiz_reports
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 20. Инструкция по миграции данных из Supabase
-- ═════════════════════════════════════════════════════════════════════════════
--
-- 1. pg_dump из Supabase (без auth.*, storage.*, realtime.*):
--    pg_dump --no-owner --no-acl --data-only \
--      --exclude-schema 'auth' \
--      --exclude-schema 'storage' \
--      --exclude-schema 'realtime' \
--      --exclude-schema 'vault' \
--      --exclude-schema 'extensions' \
--      --exclude-schema 'pgbouncer' \
--      --schema 'public' \
--      lntsyybfbunajmzbahrq > supabase_data.sql
--
-- 2. Импорт в YC PostgreSQL:
--    psql "$PG_DSN" -f yc_migration.sql
--    psql "$PG_DSN" -f supabase_data.sql
--
-- 3. Перенос пользователей из auth.users:
--    INSERT INTO public.users (id, email, role)
--    SELECT id, email,
--           CASE WHEN raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'user' END
--    FROM supabase_auth_users;

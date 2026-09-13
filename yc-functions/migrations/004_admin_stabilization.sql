BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.quiz_display_code_seq;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS display_code bigint;
SELECT setval('public.quiz_display_code_seq', GREATEST(COALESCE((SELECT MAX(display_code) FROM public.quizzes),0)+1,1), false);
ALTER TABLE public.quizzes ALTER COLUMN display_code SET DEFAULT nextval('public.quiz_display_code_seq');
UPDATE public.quizzes SET display_code=nextval('public.quiz_display_code_seq') WHERE display_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_display_code_unique ON public.quizzes(display_code);

ALTER TABLE public.auth_sessions ADD COLUMN IF NOT EXISTS admin_last_seen_at timestamptz;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS actor_fingerprint text,
 ADD COLUMN IF NOT EXISTS permission text, ADD COLUMN IF NOT EXISTS user_agent text;
CREATE TABLE IF NOT EXISTS public.admin_pro_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id),
 actor_key text NOT NULL,
 idempotency_key text NOT NULL,
 request_payload jsonb NOT NULL,
 plan_id text NOT NULL REFERENCES public.plans(id),
 days integer NOT NULL CHECK (days BETWEEN 1 AND 365),
 reason text,
 valid_until timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_key, idempotency_key)
);
CREATE INDEX IF NOT EXISTS admin_pro_grants_user_until ON public.admin_pro_grants(user_id, valid_until DESC);

-- Preserve previously issued manual access without rewriting subscription history.
INSERT INTO public.admin_pro_grants(user_id, actor_key, idempotency_key, request_payload, plan_id, days, reason, valid_until)
SELECT user_id, 'migration:004', user_id::text, '{}'::jsonb, 'pro_monthly', 1, 'Migrated manual entitlement', valid_until
FROM public.entitlements WHERE source = 'admin' AND plan = 'pro' AND valid_until > now()
ON CONFLICT(actor_key,idempotency_key) DO NOTHING;

ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.promo_redemptions r SET valid_until=e.valid_until FROM public.entitlements e
WHERE r.user_id=e.user_id AND e.source='promo' AND e.valid_until>now() AND r.valid_until IS NULL;

CREATE OR REPLACE FUNCTION public.get_effective_entitlement(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
 WITH candidates AS (
   SELECT plan_id, current_period_end AS valid_until, cancel_at_period_end, 'system'::text AS source
   FROM public.subscriptions WHERE user_id = p_user_id AND status IN ('active','canceled') AND current_period_end > now()
   UNION ALL
   SELECT plan_id, valid_until, true, 'admin' FROM public.admin_pro_grants WHERE user_id = p_user_id AND valid_until > now()
   UNION ALL
   SELECT p.plan_id,r.valid_until,true,'promo' FROM public.promo_redemptions r JOIN public.promo_codes p ON p.code=r.code WHERE r.user_id=p_user_id AND r.valid_until>now()
 ), best AS (SELECT * FROM candidates ORDER BY valid_until DESC, source DESC LIMIT 1)
 SELECT COALESCE((SELECT jsonb_build_object('plan','pro','plan_id',b.plan_id,'features',p.features,
   'valid_until',b.valid_until,'cancel_at_period_end',b.cancel_at_period_end,'source',b.source)
   FROM best b JOIN public.plans p ON p.id = b.plan_id),
   jsonb_build_object('plan','free','features',jsonb_build_object('max_quizzes',3,'ai_tier','basic',
   'hide_branding',false,'premium_templates',false,'unlimited_logic',false),'valid_until',null,'source','system'));
$$;
CREATE OR REPLACE FUNCTION public.refresh_effective_entitlement(p_user_id uuid)
RETURNS void LANGUAGE sql AS $$
 INSERT INTO public.entitlements(user_id,plan,features,valid_until,source,updated_at)
 SELECT p_user_id, e->>'plan', e->'features', (e->>'valid_until')::timestamptz, e->>'source', now()
 FROM (SELECT public.get_effective_entitlement(p_user_id) e) x
 ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan, features=excluded.features,
 valid_until=excluded.valid_until, source=excluded.source, updated_at=excluded.updated_at;
$$;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','dashboard.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','users.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','users.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','quizzes.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','quizzes.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','quizzes.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','reports.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','reports.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','subscriptions.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','subscriptions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','support.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','support.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','finance.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','promocodes.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','notifications.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','settings.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','audit.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','staff.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('owner','billing.grant') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','dashboard.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','users.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','users.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','quizzes.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','quizzes.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','quizzes.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','reports.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','reports.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','subscriptions.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','subscriptions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','support.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','support.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','finance.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','promocodes.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','notifications.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','audit.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('admin','billing.grant') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','dashboard.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','users.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','quizzes.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','quizzes.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','reports.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','reports.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('moderator','audit.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','dashboard.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','users.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','quizzes.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','subscriptions.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','support.read') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','support.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.admin_role_permissions(role,permission) VALUES ('support','notifications.manage') ON CONFLICT DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='admin_role_permissions_catalog_check') THEN
  ALTER TABLE public.admin_role_permissions ADD CONSTRAINT admin_role_permissions_catalog_check CHECK(permission IN ('admin.access','dashboard.read','users.read','users.manage','quizzes.read','quizzes.manage','quizzes.moderate','reports.read','reports.manage','subscriptions.read','subscriptions.manage','support.read','support.manage','finance.read','promocodes.manage','notifications.manage','settings.manage','audit.read','staff.manage','billing.grant')) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='admin_staff_permissions_catalog_check') THEN
  ALTER TABLE public.admin_staff_permissions ADD CONSTRAINT admin_staff_permissions_catalog_check CHECK(permission IN ('admin.access','dashboard.read','users.read','users.manage','quizzes.read','quizzes.manage','quizzes.moderate','reports.read','reports.manage','subscriptions.read','subscriptions.manage','support.read','support.manage','finance.read','promocodes.manage','notifications.manage','settings.manage','audit.read','staff.manage','billing.grant')) NOT VALID;
 END IF;
END $$;
COMMIT;

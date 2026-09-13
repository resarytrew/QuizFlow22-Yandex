BEGIN;
CREATE TABLE IF NOT EXISTS public.payment_applications (
 payment_id uuid PRIMARY KEY REFERENCES public.payments(id),
 subscription_id uuid REFERENCES public.subscriptions(id),
 applied_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL
);
-- Existing successful payments are already accounted for; never automatically charge their period twice.
INSERT INTO public.payment_applications(payment_id,source)
SELECT id,'legacy' FROM public.payments WHERE status IN ('succeeded','refunded') ON CONFLICT DO NOTHING;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_checked_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_status text;
CREATE TABLE IF NOT EXISTS public.support_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
 actor_user_id uuid REFERENCES public.users(id),body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_notes_ticket ON public.support_notes(ticket_id,created_at,id);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS beneficiary_user_id uuid REFERENCES public.users(id);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS support_ticket_id uuid REFERENCES public.support_tickets(id);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS grant_days integer CHECK(grant_days BETWEEN 1 AND 365);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS request_key text UNIQUE;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS compensation_reason text;
COMMIT;

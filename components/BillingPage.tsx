// components/BillingPage.tsx
// Главная страница биллинга: тарифы + текущая подписка + история платежей.
// Визуально продолжает тёмную премиальную систему LandingPage.

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useAuthStore } from '../store/useAuthStore';
import { createCheckout, cancelSubscription, BillingError } from '../services/billingService';
import { redeemPromoCode } from '../services/billingService';
import type { CheckoutPaymentMethod } from './billing/CheckoutModal';
import BillingPageBackground from './billing/BillingPageBackground';
import PricingCard, { type BadgeKind } from './billing/PricingCard';
import SubscriptionStatusBanner from './billing/SubscriptionStatusBanner';
import PaymentHistoryList from './billing/PaymentHistoryList';
import CheckoutModal from './billing/CheckoutModal';
import { LEGAL_DOCUMENTS } from './billing/legalDocuments';
import {
  buildAllPlans,
  HARDCODED_PRO_PLANS,
  type DerivedPlan,
} from './billing/featureLabels';
import type { PlanId } from '../types';
import { Link } from '@tanstack/react-router';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const BackIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const LogoMark: React.FC = () => (
  <Link
    to="/"
    className="flex items-center gap-3 shrink-0"
    aria-label="Поток — на главную"
  >
    <div className="w-9 h-9 rounded-[1rem_0.35rem_1rem_0.35rem] border border-amber-200 bg-amber-50
                    flex items-center justify-center text-amber-800 font-serif font-bold shadow-[0_10px_28px_rgba(180,83,9,0.10)]">
      П
    </div>
    <span className="text-lg font-semibold tracking-tight text-stone-950">Поток</span>
  </Link>
);

const TrustMark: React.FC<{ title: string; caption: string; icon: React.ReactNode }> = ({
  title,
  caption,
  icon,
}) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem_0.3rem_0.85rem_0.3rem]
                     border border-amber-200 bg-amber-50 text-amber-800">
      {icon}
    </span>
    <span>
      <strong className="block text-sm font-semibold text-stone-950">{title}</strong>
      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{caption}</span>
    </span>
  </div>
);

const ShieldIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.8-4" />
  </svg>
);

const ReceiptIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6M9 12h6" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 15 2 2 4-5" />
  </svg>
);

const BillingPage: React.FC = () => {
  const initialized = useEntitlementStore((s) => s.initialized);
  const loading = useEntitlementStore((s) => s.loading);
  const ent = useEntitlementStore((s) => s.entitlement);
  const sub = useEntitlementStore((s) => s.subscription);
  const plans = useEntitlementStore((s) => s.plans);
  const payments = useEntitlementStore((s) => s.payments);
  const refresh = useEntitlementStore((s) => s.refresh);
  const session = useAuthStore((s) => s.session);

  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<DerivedPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoOk, setPromoOk] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      refresh(session.user.id);
    }
  }, [session, refresh]);

  // Сборка всех тарифов: Free + (Monthly + Yearly из стора).
  const effectivePlans = plans.length > 0 ? plans : HARDCODED_PRO_PLANS;
  const allPlans: DerivedPlan[] = useMemo(
    () => buildAllPlans(effectivePlans),
    [effectivePlans],
  );
  const monthlyPlan = allPlans.find((p) => p.id === 'pro_monthly') ?? null;
  const monthlyPriceKopecks = monthlyPlan?.price_kopecks ?? null;

  const handleSubscribe = (planId: DerivedPlan['id']) => {
    if (planId === 'free') return;
    const plan = allPlans.find((candidate) => candidate.id === planId);
    if (plan) setCheckoutPlan(plan);
  };

  const handleCheckoutConfirm = async (paymentMethod: CheckoutPaymentMethod) => {
    if (!checkoutPlan || checkoutPlan.id === 'free') return;
    setBusyPlanId(checkoutPlan.id);
    try {
      const { confirmation_url } = await createCheckout(checkoutPlan.id as PlanId, paymentMethod);
      if (confirmation_url) {
        window.location.href = confirmation_url;
      } else {
        toast.error('Не получили ссылку на оплату');
      }
    } catch (e) {
      if (e instanceof BillingError) {
        const body = e.body as {
          error?: string;
          provider_message?: string | null;
        } | null;
        if (e.status === 409 && body?.error === 'already_subscribed') {
          toast.error('У вас уже есть активная подписка');
        } else if (e.status === 400 && body?.error === 'user_email_required') {
          toast.error('Для оплаты нужен email в аккаунте. Войдите через почту или добавьте email в профиль.');
        } else if (body?.provider_message) {
          toast.error(`ЮKassa отклонила платёж: ${body.provider_message}`);
        } else {
          toast.error('Не удалось создать платёж. Попробуйте позже.');
        }
      } else {
        toast.error('Ошибка сети');
      }
      console.error('[billing] checkout failed:', e);
    } finally {
      setBusyPlanId(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Отменить подписку? Доступ сохранится до конца оплаченного периода.')) {
      return;
    }
    setCancelling(true);
    try {
      await cancelSubscription();
      toast.success('Подписка будет отменена в конце периода');
      if (session?.user?.id) await refresh(session.user.id);
    } catch (e) {
      console.error('[billing] cancel failed:', e);
      toast.error('Не удалось отменить подписку');
    } finally {
      setCancelling(false);
    }
  };

  // Loading state.
  if (!initialized && loading) {
    return (
      <BillingPageBackground>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-stone-200 border-t-amber-700 rounded-full animate-spin" />
            <p className="text-sm text-stone-500 font-medium">Загружаем тарифы…</p>
          </div>
        </div>
      </BillingPageBackground>
    );
  }

  return (
    <BillingPageBackground>
      <CheckoutModal
        plan={checkoutPlan}
        busy={checkoutPlan !== null && busyPlanId === checkoutPlan.id}
        onClose={() => {
          if (!busyPlanId) setCheckoutPlan(null);
        }}
        onConfirm={handleCheckoutConfirm}
      />
      <header className="sticky top-0 z-20 border-b border-stone-900/10 bg-[#f8f7f2]/86 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <LogoMark />
          <Link
            to="/"
            aria-label="Назад на главную"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-[#fffaf0]
                       px-3 py-2 text-sm text-stone-500 transition-all hover:border-amber-200
                       hover:bg-amber-50 hover:text-stone-950 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <BackIcon /> Назад
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-6 pb-20 pt-12 md:pt-16">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mb-14 grid max-w-[1180px] items-end gap-10 lg:grid-cols-[1.4fr_0.6fr]"
        >
          <div>
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/70" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-800">
                Подписка Поток PRO
              </span>
            </div>
            <h1 className="max-w-[820px] text-balance font-serif text-[clamp(2.8rem,7vw,6.7rem)]
                           font-semibold leading-[0.93] tracking-[-0.045em] text-stone-950">
              Больше свободы
              <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-orange-700 to-red-700">
                для сложных квизов
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
              Начните бесплатно или откройте все возможности редактора: больше квизов,
              красивые шаблоны, помощь с текстами и публикацию без лишних надписей.
            </p>
          </div>

          <aside className="relative overflow-hidden rounded-[1.8rem_0.65rem_1.8rem_0.65rem] border border-stone-200
                            bg-[#fffaf0] p-6 backdrop-blur-xl
                            shadow-[0_24px_80px_rgba(68,64,60,0.10),inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-amber-200/60 bg-amber-50/70" />
            <p className="relative mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Лёгкая оплата
            </p>
            <div className="relative space-y-5">
              <TrustMark title="ЮKassa" caption="Защищённая платёжная форма" icon={<ShieldIcon />} />
              <TrustMark title="Официальный чек" caption="Формируется после оплаты" icon={<ReceiptIcon />} />
              <TrustMark title="Под контролем" caption="Управление подпиской в профиле" icon={<CalendarIcon />} />
            </div>
          </aside>
        </motion.section>

        {ent.plan === 'pro' && sub && (
          <SubscriptionStatusBanner
            subscription={sub}
            plans={plans}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        )}

        {ent.plan !== 'pro' && !promoOk && (
          <section className="mx-auto mb-12 max-w-[1180px]">
            <div className="rounded-[2rem] border border-stone-200 bg-[#fffaf0] shadow-[0_18px_60px_rgba(68,64,60,0.08)] p-6 sm:p-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-800">
                Есть промокод?
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input name="components-billingpage-278-input"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase().slice(0, 20)); setPromoError(null); }}
                  placeholder="Введите код"
                  disabled={redeeming}
                  className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-[#f8f7f2] px-5 py-3.5 text-sm text-stone-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10 placeholder:text-stone-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={redeeming || !promoCode.trim()}
                  onClick={async () => {
                    setRedeeming(true);
                    setPromoError(null);
                    try {
                      await redeemPromoCode(promoCode.trim());
                      setPromoOk(true);
                      setPromoCode('');
                      if (session?.user?.id) await refresh(session.user.id);
                    } catch (e) {
                      if (e instanceof BillingError) {
                        const body = e.body as { error?: string } | null;
                        const messages: Record<string, string> = {
                          promocode_not_found: 'Промокод не найден',
                          promocode_inactive: 'Промокод отключён',
                          promocode_expired: 'Срок действия промокода истёк',
                          promocode_exhausted: 'Промокод больше не действует',
                          promocode_already_used: 'Вы уже использовали этот промокод',
                          promocode_not_yet_valid: 'Промокод ещё не активен',
                        };
                        setPromoError(messages[body?.error ?? ''] ?? 'Не удалось активировать промокод');
                      } else {
                        setPromoError('Ошибка сети');
                      }
                    } finally {
                      setRedeeming(false);
                    }
                  }}
                  className="rounded-xl bg-stone-950 px-6 py-3.5 text-sm font-bold text-amber-50 shadow-[0_14px_34px_rgba(68,64,60,0.16)] transition hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {redeeming ? 'Активируем...' : 'Активировать'}
                </button>
              </div>
              {promoError && (
                <p className="mt-3 text-sm text-red-700">{promoError}</p>
              )}
            </div>
          </section>
        )}

        {promoOk && (
          <section className="mx-auto mb-12 max-w-[1180px]">
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8 text-center">
              <p className="font-serif text-2xl font-bold text-emerald-900">PRO активирован!</p>
              <p className="mt-2 text-sm text-stone-600">Обновите страницу, чтобы увидеть изменения.</p>
              <button type="button" onClick={() => { setPromoOk(false); window.location.reload(); }}
                className="mt-4 rounded-xl bg-stone-950 px-6 py-2.5 text-sm font-bold text-amber-50">
                Обновить
              </button>
            </div>
          </section>
        )}

        <section aria-labelledby="billing-plans-heading" className="mx-auto max-w-[1180px]">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-800">
                Три варианта
              </p>
              <h2 id="billing-plans-heading" className="font-serif text-3xl font-semibold tracking-[-0.035em] text-stone-950 md:text-4xl">
                Выберите свой ритм
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-stone-500">
              Все цены окончательные. Доступ включается сразу после подтверждения платежа.
            </p>
          </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-[0.9fr_1fr_1.08fr] mb-20"
        >
          {allPlans.map((plan) => {
            const isCurrent =
              plan.tier === 'free'
                ? ent.plan === 'free' && !sub
                : sub?.plan_id === plan.id && ent.plan === 'pro';

            let badge: BadgeKind = null;
            if (isCurrent) {
              badge = 'current';
            } else if (plan.id === 'pro_yearly') {
              badge = 'bestValue';
            } else if (plan.id === 'pro_monthly') {
              badge = 'popular';
            }

            return (
              <PricingCard
                key={plan.id}
                plan={plan}
                badge={badge}
                isCurrent={isCurrent}
                busy={busyPlanId === plan.id}
                monthlyPriceKopecks={monthlyPriceKopecks}
                onSubscribe={handleSubscribe}
                theme="light"
                freeActionable={false}
              />
            );
          })}
        </motion.div>
        </section>

        <PaymentHistoryList payments={payments} />

        <footer className="mx-auto mt-14 max-w-[1180px] border-t border-stone-900/10 pt-7">
          <div className="mb-8 grid gap-5 rounded-[1.6rem_0.55rem_1.6rem_0.55rem] border border-stone-200
                          bg-[#fffaf0] shadow-[0_18px_60px_rgba(68,64,60,0.07)] p-5 sm:p-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">
                Юридические документы
              </p>
              <div className="mt-4 flex flex-col items-start gap-3">
                {LEGAL_DOCUMENTS.map((document) => (
                  <a
                    key={document.id}
                    href={document.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4
                               transition-colors hover:text-stone-950 focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {document.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-[1.25rem_0.4rem_1.25rem_0.4rem] border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-stone-900">Ответственное использование проекта</p>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                При существенном или повторном нарушении Правил проекта технический администратор
                вправе ограничить или заблокировать аккаунт и прекратить доступ к подписке PRO.
                Возврат денежных средств рассматривается согласно публичной оферте и законодательству РФ.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-6 text-xs leading-relaxed sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-col gap-2 text-stone-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
                <span className="font-semibold text-stone-700">Некрытый Евгений Владимирович</span>
                <span>ИНН 560993778885</span>
                <a
                  href="mailto:mykviz@yandex.ru"
                  className="w-fit text-amber-800 transition-colors hover:text-stone-950
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  mykviz@yandex.ru
                </a>
              </div>
              <p className="mt-3 text-stone-400">
                Оплата через ЮKassa · Чеки формируются автоматически · Доступ активируется сразу
              </p>
            </div>
            <p className="shrink-0 text-stone-400 sm:text-right">© 2026 Поток</p>
          </div>
        </footer>
      </main>
    </BillingPageBackground>
  );
};

export default BillingPage;

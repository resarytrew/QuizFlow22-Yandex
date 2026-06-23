import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { DerivedPlan } from './featureLabels';
import {
  formatPrice,
  formatYearlyMonthlyEquivalent,
} from './featureLabels';
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_HREFS } from './legalDocuments';

export type CheckoutPaymentMethod = 'sbp' | 'any';

interface CheckoutModalProps {
  plan: DerivedPlan | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: CheckoutPaymentMethod) => void;
}

const CloseIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const SecureIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.8-4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 3.5 3.5L16 5" />
  </svg>
);

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  plan,
  busy,
  onClose,
  onConfirm,
}) => {
  const [accepted, setAccepted] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!plan) {
      setAccepted(false);
      setAcceptedRules(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, onClose, plan]);

  const modal = (
    <AnimatePresence>
      {plan && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) onClose();
          }}
          role="presentation"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[94dvh] w-full max-w-[980px] overflow-y-auto rounded-t-[2rem]
                       border border-white/10 bg-[#0c0c0f] text-white shadow-[0_40px_140px_rgba(0,0,0,0.75)]
                       sm:rounded-[2.2rem_0.8rem_2.2rem_0.8rem]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
              <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/10 blur-[90px]" />
              <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-rose-400/[0.07] blur-[100px]" />
              <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
            </div>

            <header className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 font-serif font-bold text-black">
                  П
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-amber-300/65">Поток PRO</p>
                  <p className="text-sm font-semibold text-white/80">Оформление подписки</p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Закрыть окно оплаты"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08]
                           bg-white/[0.035] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white
                           disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="relative grid lg:grid-cols-[0.92fr_1.08fr]">
              <div className="border-b border-white/[0.07] p-5 sm:p-8 lg:border-b-0 lg:border-r">
                <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
                  Ваш выбор
                </p>
                <h2 id={titleId} className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {plan.name}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-white/42">
                  {plan.tagline}
                </p>

                <div className="my-7 border-y border-white/[0.07] py-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">
                        К оплате
                      </span>
                      <strong className="mt-2 block text-4xl font-semibold tabular-nums text-white sm:text-5xl">
                        {formatPrice(plan.price_kopecks)}
                      </strong>
                    </div>
                    <span className="pb-1 text-right text-xs leading-relaxed text-white/35">
                      {plan.period === 'year'
                        ? `за год · ${formatYearlyMonthlyEquivalent(plan.price_kopecks)} в месяц`
                        : 'за один месяц'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.derived.filter((feature) => feature.enabled).map((feature) => (
                    <li key={feature.key} className="flex items-start gap-3 text-sm text-white/58">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-300/10 text-emerald-300">
                        <CheckIcon />
                      </span>
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 sm:p-8">
                <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
                  Оплата
                </p>
                <div className="rounded-[1.6rem_0.55rem_1.6rem_0.55rem] border border-amber-300/15 bg-amber-300/[0.055] p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem_0.35rem_1rem_0.35rem]
                                     border border-amber-300/15 bg-black/20 text-amber-300">
                      <SecureIcon />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">Защищённая форма ЮKassa</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/42">
                        После подтверждения откроется платёжная форма. Там можно выбрать банковскую карту,
                        СБП или другой доступный способ.
                      </p>
                    </div>
                  </div>
                </div>

                <dl className="mt-6 space-y-3 border-y border-white/[0.07] py-5 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/32">Исполнитель</dt>
                    <dd className="text-right font-medium text-white/65">Некрытый Евгений Владимирович</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/32">ИНН</dt>
                    <dd className="font-medium tabular-nums text-white/65">560993778885</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/32">Чек</dt>
                    <dd className="text-right font-medium text-white/65">На электронную почту после оплаты</dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/28">
                    Документы перед оплатой
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {LEGAL_DOCUMENTS.map((document) => (
                      <a
                        key={document.id}
                        href={document.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-amber-300/72 underline decoration-amber-300/25
                                   underline-offset-4 transition-colors hover:text-amber-200
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        {document.label}
                      </a>
                    ))}
                  </div>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/42">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                  />
                  <span>
                    Я подтверждаю выбранный тариф и принимаю условия публичной оферты и обработки
                    персональных данных.
                  </span>
                </label>

                <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/42">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(event) => setAcceptedRules(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                  />
                  <span>
                    Я ознакомился и согласен с{' '}
                    <a
                      href={LEGAL_DOCUMENT_HREFS.rules}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-amber-300/75 underline decoration-amber-300/25 underline-offset-2"
                    >
                      Правилами проекта
                    </a>
                    .
                  </span>
                </label>

                <div className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.055] p-4">
                  <p className="text-xs leading-relaxed text-white/48">
                    При существенном или повторном нарушении Правил технический администратор
                    вправе ограничить или заблокировать аккаунт и прекратить доступ к PRO.
                    Возврат рассматривается согласно оферте и законодательству РФ.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => onConfirm('sbp')}
                    disabled={!accepted || !acceptedRules || busy}
                    className="group flex w-full items-center justify-between gap-4 rounded-xl bg-gradient-to-r
                               from-amber-300 to-orange-400 px-5 py-3.5 text-left text-sm font-extrabold text-black
                               shadow-[0_16px_40px_rgba(251,191,36,0.18)] transition-all
                               hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(251,191,36,0.28)]
                               active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200
                               focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0f]"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        {busy ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                            Создаём платёж…
                          </>
                        ) : (
                          'Оплатить через СБП'
                        )}
                      </span>
                      {!busy && (
                        <span className="mt-0.5 text-xs font-semibold text-black/55">
                          Быстро по QR-коду или в приложении банка
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-lg bg-black/10 px-2.5 py-1 text-xs font-black tabular-nums">
                      {formatPrice(plan.price_kopecks)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onConfirm('any')}
                    disabled={!accepted || !acceptedRules || busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09]
                               bg-white/[0.035] px-5 py-3 text-sm font-bold text-white/72 transition-all
                               hover:border-amber-300/20 hover:bg-white/[0.07] hover:text-white
                               disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    Другие способы оплаты
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-white/25">
                  Платёжные данные обрабатывает ЮKassa. Поток не хранит данные банковской карты.
                </p>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default CheckoutModal;

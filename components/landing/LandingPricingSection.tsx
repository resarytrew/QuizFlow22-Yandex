import { useMemo } from "react";
import {
  buildAllPlans,
  computeYearlySavings,
  formatPrice,
  formatYearlyMonthlyEquivalent,
  HARDCODED_PRO_PLANS,
} from "../billing/featureLabels";
import { useUIStore } from "../../store/useUIStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useAppNavigation } from "@/src/router/useAppNavigation";

export default function LandingPricingSection({
  theme: _theme = "light",
}: {
  theme?: "light" | "dark";
}) {
  const plans = useMemo(() => buildAllPlans(HARDCODED_PRO_PLANS), []);
  const session = useAuthStore((state) => state.session);
  const setAuthModalOpen = useUIStore((state) => state.setAuthModalOpen);
  const nav = useAppNavigation();
  const month = plans.find((plan) => plan.id === "pro_monthly");
  const year = plans.find((plan) => plan.id === "pro_yearly");
  const savings =
    month && year
      ? computeYearlySavings(year.price_kopecks, month.price_kopecks)
      : null;
  return (
    <section
      id="pricing"
      className="studio-section studio-pricing"
      aria-labelledby="pricing-heading"
    >
      <div className="studio-heading">
        <p>Тарифы</p>
        <h2 id="pricing-heading">
          Место для первой идеи.
          <br />
          <span>Простор для следующих.</span>
        </h2>
      </div>
      <div className="studio-plans">
        {["free", "pro_monthly", "pro_yearly"].map((id) => {
          const plan = plans.find((item) => item.id === id);
          if (!plan) return null;
          const free = plan.id === "free";
          const annual = plan.id === "pro_yearly";
          return (
            <article
              className={annual ? "studio-plan plan-year" : "studio-plan"}
              key={plan.id}
            >
              <p className="studio-plan-caption">
                {free
                  ? "Познакомиться"
                  : annual
                    ? "На большие планы"
                    : "В своём темпе"}
              </p>
              <h3>{plan.name}</h3>
              <div className="studio-plan-price">
                {formatPrice(plan.price_kopecks)}
              </div>
              <p className="studio-plan-period">
                {free
                  ? "Навсегда, без карты"
                  : annual
                    ? `За год · ${formatYearlyMonthlyEquivalent(plan.price_kopecks)} в месяц`
                    : "За месяц · ежемесячное списание"}
              </p>
              <p className="studio-plan-note">
                {annual && savings
                  ? `На ${savings.formattedPercent} выгоднее помесячной оплаты`
                  : free
                    ? "Соберите первые квизы и познакомьтесь с редактором."
                    : "Все возможности PRO без оплаты на год вперёд."}
              </p>
              <ul>
                {plan.derived.map((feature) => (
                  <li key={feature.key}>{feature.label}</li>
                ))}
              </ul>
              <button
                className="potok-button"
                onClick={() => {
                  if (free) {
                    if (session) void nav.goToNewEditor();
                    else setAuthModalOpen(true);
                  } else void nav.goToBilling();
                }}
              >
                {free ? "Начать бесплатно" : "Выбрать PRO"}{" "}
                <span aria-hidden>↗</span>
              </button>
            </article>
          );
        })}
      </div>
      <div className="studio-pricing-foot">
        <p>
          Оплата через ЮKassa. Автопродление можно отменить в личном кабинете —
          доступ сохранится до конца оплаченного периода.
        </p>
        <button
          className="studio-text-link"
          onClick={() => void nav.goToBilling()}
        >
          Сравнить возможности ↗
        </button>
      </div>
    </section>
  );
}

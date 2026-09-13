const labels: Record<string, string> = {
  free: "FREE",
  pro: "PRO",
  pro_monthly: "PRO на месяц",
  pro_yearly: "PRO на год",
  pending: "Ожидает оплаты",
  waiting_for_capture: "Ожидает подтверждения",
  succeeded: "Оплачен",
  canceled: "Отменён",
  refunded: "Возвращён",
  active: "Активен",
  past_due: "Просрочен",
  expired: "Истёк",
  blocked: "Заблокирован",
  temporarily_blocked: "Временно заблокирован",
  subscription: "Подписка",
  admin: "Ручная выдача",
  promo: "Промокод",
  system: "Базовый тариф",
  open: "Новое",
  in_progress: "В работе",
  waiting_user: "Ожидает пользователя",
  closed: "Закрыто",
  resolved: "Решено",
};
export const adminLabel = (value: unknown) =>
  value == null ? "—" : (labels[String(value)] ?? String(value));
export function adminError(error: unknown) {
  const message = error instanceof Error ? error.message : "Ошибка операции";
  const reasons: Record<string, string> = {
    payment_mismatch:
      "Сумма, валюта или владелец платежа не совпадают. Требуется ручная проверка.",
    payment_not_confirmed:
      "Платёж не подтверждён либо по нему зарегистрирован возврат.",
    historical_payment_requires_review:
      "Исторический платёж уже отмечен обработанным, но подписка отсутствует. Проверьте историю и оформите явную компенсацию.",
    provider_unavailable:
      "ЮKassa временно недоступна. Повторите проверку позже.",
    idempotency_conflict:
      "Содержимое повторного запроса изменилось. Закройте диалог и оформите новую операцию.",
    permission_denied: "Недостаточно прав для этой операции.",
  };
  const reason = Object.entries(reasons).find(([code]) =>
    message.includes(code),
  );
  return reason ? reason[1] + " " + message : message;
}

import { adminLabel, adminError } from "./presentation";
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import {
  WorkspaceSchema,
  type Workspace,
} from "../../yc-functions/_shared/admin-workspace-contracts";
import { useAdminStore } from "../../store/useAdminStore";
import { AdminDialog } from "./AdminDialog";
const value = (v: unknown) => (v == null ? "—" : String(v));
const date = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("ru-RU") : "—";
const button =
  "rounded-xl border border-white/20 px-3 py-2 text-sm disabled:opacity-40";
export default function AdminUserWorkspace({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const permissions = useAdminStore((s) => s.staff?.permissions ?? []);
  const load = async () => {
    const r = await apiRequest<{ workspace: unknown }>(
      "/admin/user-workspace?user_id=" + encodeURIComponent(userId),
    );
    setData(WorkspaceSchema.parse(r.workspace));
  };
  useEffect(() => {
    let alive = true;
    apiRequest<{ workspace: unknown }>(
      "/admin/user-workspace?user_id=" + encodeURIComponent(userId),
    )
      .then((r) => {
        if (alive) setData(WorkspaceSchema.parse(r.workspace));
      })
      .catch((e) => {
        if (alive) setError(adminError(e));
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  const paymentAction = async (action: string, id: string) => {
    if (busy) return;
    if (
      action === "payment-restore" &&
      !window.confirm(
        "Восстановить доступ по подтверждённой оплате? Срок начисляется с текущей даты или конца действующей подписки. Повторное начисление исключено.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await apiRequest<{
        result: { already_applied?: boolean; provider_status?: string };
      }>("/admin/" + action, {
        method: "POST",
        body: JSON.stringify({ payment_id: id }),
      });
      setNotice(
        action === "payment-check"
          ? "Статус ЮKassa: " + adminLabel(r.result.provider_status)
          : r.result.already_applied
            ? "Платёж уже учтён. Повторное начисление не выполнено."
            : "Доступ восстановлен",
      );
      await load();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };
  const timeline = data
    ? [
        ...data.payments.map((p) => ({
          at: String(p.created_at),
          text: `Оплата: ${Number(p.amount_kopecks) / 100} ${value(p.currency)} · ${adminLabel(p.status)}`,
        })),
        ...data.grants.map((g) => ({
          at: String(g.created_at),
          text: `Доступ: ${adminLabel(g.source)} · ${value(g.reason)} · до ${date(g.valid_until)}`,
        })),
        ...data.events.map((e) => ({
          at: String(e.created_at),
          text: `${value(e.action)} · ${value(e.outcome)} · request ID: ${value(e.request_id)}`,
        })),
        ...data.messages.map((m) => ({
          at: String(m.created_at),
          text: `${m.sender_kind === "user" ? "Пользователь" : "Сотрудник"}: ${value(m.body)}`,
        })),
      ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    : [];
  return (
    <AdminDialog
      wide
      label="Карточка пользователя"
      onClose={onClose}
      busy={busy}
    >
      <div className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl bg-[#16141c] p-5 text-white">
        <div className="flex justify-between gap-3">
          <h2 className="text-xl font-bold">Карточка пользователя</h2>
          <button className={button} disabled={busy} onClick={onClose}>
            Закрыть
          </button>
        </div>
        {error && (
          <p role="alert" className="my-3 text-rose-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="my-3 text-cyan-200">
            {notice}
          </p>
        )}
        {!data && !error && <p>Загрузка…</p>}
        {data && (
          <div className="space-y-6 break-words">
            <section>
              <h3 className="mt-4 font-bold">{value(data.account.email)}</h3>
              <p>ID: {value(data.account.id)}</p>
              <p>
                Аккаунт #{value(data.account.account_code)} ·{" "}
                {adminLabel(data.account.status)}
              </p>
              <p>Регистрация: {date(data.account.created_at)}</p>
              {data.account.missing_profile === true && (
                <p className="text-amber-200">
                  Отсутствует профиль аккаунта. Требуется проверка миграции.
                </p>
              )}
            </section>
            {data.access && (
              <section>
                <h3 className="font-bold">Фактический доступ</h3>
                <p>
                  {adminLabel(data.access.plan)} · источник:{" "}
                  {adminLabel(data.access.source)} · до{" "}
                  {date(data.access.valid_until)}
                </p>
                <p className="text-sm text-white/60">
                  Доступ определяется действующей подпиской, ручной выдачей и
                  промокодами.
                </p>
              </section>
            )}
            <section>
              <h3 className="font-bold">Платежи</h3>
              {data.payments.map((p) => (
                <article
                  key={value(p.id)}
                  className="my-3 rounded-xl border border-white/15 p-3"
                >
                  <p>
                    {Number(p.amount_kopecks) / 100} {value(p.currency)} ·{" "}
                    {date(p.created_at)}
                  </p>
                  <p>
                    В системе: {adminLabel(p.status)} · ЮKassa:{" "}
                    {adminLabel(p.provider_status)}
                  </p>
                  <p className="text-xs">
                    ID ЮKassa: {value(p.provider_payment_id)} · Проверен:{" "}
                    {date(p.provider_checked_at)}
                  </p>
                  <p className="text-xs">
                    Обработка уведомления: {date(p.webhook_processed_at)} ·
                    Ошибка: {value(p.webhook_error)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void paymentAction("payment-check", value(p.id))
                      }
                    >
                      Проверить оплату
                    </button>
                    {permissions.includes("subscriptions.manage") && (
                      <button
                        className={button}
                        disabled={busy || p.status === "refunded"}
                        onClick={() =>
                          void paymentAction("payment-restore", value(p.id))
                        }
                      >
                        Восстановить доступ
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
            <section>
              <h3 className="font-bold">Подписки</h3>
              {data.subscriptions.map((s) => (
                <p key={value(s.id)}>
                  {adminLabel(s.plan_id)} · {adminLabel(s.status)} · до{" "}
                  {date(s.current_period_end)} · Автопродление:{" "}
                  {s.cancel_at_period_end ? "отключено" : "включено"}
                </p>
              ))}
            </section>
            <section>
              <h3 className="font-bold">Выдачи и промокоды</h3>
              {data.grants.map((g, i) => (
                <p key={i}>
                  {adminLabel(g.source)} · до {date(g.valid_until)} ·{" "}
                  {value(g.reason)}
                </p>
              ))}
            </section>
            <section>
              <h3 className="font-bold">Индивидуальные промокоды</h3>
              {data.promos.map((p) => (
                <p key={value(p.code)}>
                  {value(p.code)} · {value(p.grant_days)} дней ·{" "}
                  {Number(p.used_count) > 0
                    ? "использован"
                    : p.is_active
                      ? "доступен"
                      : "отключён"}
                </p>
              ))}
              <h3 className="mt-4 font-bold">Обращения</h3>
              {data.tickets.map((t) => (
                <p key={value(t.id)}>
                  {value(t.subject)} · {adminLabel(t.status)} · Ответственный:{" "}
                  {value(t.assigned_to)} · {date(t.created_at)}
                </p>
              ))}
            </section>
            <section>
              <h3 className="font-bold">Внутренние заметки</h3>
              {data.notes.map((n) => (
                <p className="whitespace-pre-wrap" key={value(n.id)}>
                  {date(n.created_at)} — {value(n.body)}
                </p>
              ))}
            </section>
            <section>
              <h3 className="font-bold">Общая история</h3>
              <div className="max-h-72 overflow-auto">
                {timeline.map((e, i) => (
                  <p className="my-2 whitespace-pre-wrap" key={i}>
                    {date(e.at)} · {e.text}
                  </p>
                ))}
              </div>
              <h3 className="mt-4 font-bold">Действия сотрудников</h3>
              {data.events.map((e, i) => (
                <p key={i}>
                  {date(e.created_at)} · {value(e.action)} · {value(e.outcome)}
                </p>
              ))}
            </section>
            <p className="text-xs text-white/50">
              Показаны последние 100 записей каждого раздела. Состав данных
              зависит от ваших прав.
            </p>
          </div>
        )}
      </div>
    </AdminDialog>
  );
}

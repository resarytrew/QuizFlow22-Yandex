import React, { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient";
import { AttentionSchema } from "../../yc-functions/_shared/admin-workspace-contracts";
import AdminUserWorkspace from "./AdminUserWorkspace";
export default function AdminAttention() {
  const [items, setItems] = useState<
      ReturnType<typeof AttentionSchema.parse>["items"]
    >([]),
    [error, setError] = useState(""),
    [user, setUser] = useState<string | null>(null);
  const load = () =>
    apiRequest("/admin/attention")
      .then((r) => {setItems(AttentionSchema.parse(r).items);setError("");})
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const labels: Record<string, string> = {
    webhook_error: "Ошибка уведомления об оплате",
    missing_profile: "Нет профиля",
    payment_review: "Проверить оплату",
    unanswered: "Ожидает ответа более суток",
    admin_error: "Ошибка операции",
  };
  return (
    <section className="my-5 rounded-2xl border border-amber-300/25 p-4">
      <div className="flex justify-between">
        <h2 className="font-bold">Требуют внимания</h2>
        <button onClick={() => void load()}>Обновить</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="text-xs opacity-60">
        До 100 самых старых проблем. Статус оплаты требует сверки с ЮKassa.
      </p>
      <div className="max-h-72 overflow-auto">
        {items.map((i) => (
          <div
            key={i.kind + i.id}
            className="my-2 border-b border-white/10 py-2 text-sm"
          >
            <span>
              {labels[i.kind]} · {i.label} ·{" "}
              {new Date(i.created_at).toLocaleString("ru-RU")}
            </span>
            {i.user_id && (
              <button
                className="ml-3 underline"
                onClick={() => setUser(i.user_id)}
              >
                Открыть аккаунт
              </button>
            )}
          </div>
        ))}
      </div>
      {user && (
        <AdminUserWorkspace userId={user} onClose={() => setUser(null)} />
      )}
    </section>
  );
}

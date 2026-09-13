import { adminError } from "./presentation";
import React, { useEffect, useState } from "react";
import { AdminDialog } from "./AdminDialog";
import { apiRequest } from "../../services/apiClient";
import { useAdminStore } from "../../store/useAdminStore";
export default function SupportActionDialog({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState("reply"),
    [body, setBody] = useState(""),
    [days, setDays] = useState(30),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const staff = useAdminStore((s) => s.staff);
  const [assignee, setAssignee] = useState(staff?.user_id ?? "");
  const [members, setMembers] = useState<
    { user_id: string; email: string; display_name: string | null }[]
  >([]);
  useEffect(() => {
    apiRequest<{ staff_members: typeof members }>("/admin/support-staff")
      .then((r) => setMembers(r.staff_members))
      .catch((e) => setError(e.message));
  }, []);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const action =
        mode === "reply"
          ? "support-reply"
          : mode === "note"
            ? "support-note"
            : mode === "assign"
              ? "support-assign"
              : mode === "promo"
                ? "support-promo"
                : "support-compensate";
      const result = await apiRequest<{ result?: { code?: string } }>(
        "/admin/" + action,
        {
          method: "POST",
          body: JSON.stringify({
            ticket_id: ticketId,
            ...(mode !== "assign" ? { body } : {}),
            days,
            idempotency_key: key,
            ...(mode === "assign" && assignee ? { user_id: assignee } : {}),
          }),
        },
      );
      if (result.result?.code) {
        setCode(result.result.code);
      } else {
        onClose();
      }
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminDialog label="Работа с обращением" onClose={onClose} busy={busy}>
      <div className="w-full max-w-xl space-y-4 rounded-2xl bg-[#16141c] p-5 text-white">
        <h2 className="text-xl font-bold">Работа с обращением</h2>
        <label className="block">
          Действие
          <select
            aria-label="Действие"
            className="mt-2 block w-full min-w-0 bg-black p-2"
            disabled={busy}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setPreview(false);
            }}
          >
            <option value="reply">Ответ пользователю</option>
            <option value="note">Внутренняя заметка</option>
            <option value="assign">Назначить ответственного</option>
            {staff?.permissions.includes("billing.grant") && (
              <option value="compensate">Предоставить PRO</option>
            )}
            {staff?.permissions.includes("billing.grant") &&
              staff.permissions.includes("promocodes.manage") && (
                <option value="promo">Индивидуальный промокод</option>
              )}
          </select>
        </label>
        {mode === "assign" && (
          <label className="block">
            Ответственный
            <select
              className="block w-full min-w-0 bg-black p-2"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Не назначен</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || m.email}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "reply" && (
          <label className="block">
            Шаблон
            <select
              aria-label="Шаблон ответа"
              defaultValue=""
              className="mt-2 block w-full min-w-0 bg-black p-2"
              onChange={(e) => {
                setBody(e.target.value);
                setPreview(false);
              }}
            >
              <option value="">Выберите шаблон</option>
              <option value="Здравствуйте! Проверяем оплату и доступ к вашему аккаунту. Сообщим результат в этом обращении.">
                Проверяем оплату
              </option>
              <option value="Здравствуйте! Уточните, пожалуйста, время возникновения ошибки и последовательность действий.">
                Запрос подробностей
              </option>
            </select>
          </label>
        )}
        {mode === "note" && (
          <p className="text-amber-200">Заметку увидят только сотрудники.</p>
        )}
        {(mode === "compensate" || mode === "promo") && (
          <label>
            Количество дней PRO
            <input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="ml-3 w-24 bg-black p-2"
            />
          </label>
        )}
        {mode !== "assign" && (
          <label className="block">
            {mode === "compensate" ? "Причина компенсации" : "Текст"}
            <textarea
              className="mt-2 w-full rounded-xl bg-black/40 p-3"
              rows={6}
              value={body}
              disabled={busy}
              onChange={(e) => {
                setBody(e.target.value);
                setPreview(false);
              }}
            />
          </label>
        )}
        {preview && (
          <div className="whitespace-pre-wrap rounded-xl border border-cyan-300/30 p-3">
            <p className="mb-2 font-bold">Пользователь получит:</p>
            {body}
          </div>
        )}
        {code && (
          <p role="status">
            Промокод: <strong>{code}</strong>. Только для этого аккаунта, одно
            применение. Пользователю ещё не отправлен.
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-200">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={onClose}>
            Отмена
          </button>
          {mode === "reply" && !preview ? (
            <button disabled={!body.trim()} onClick={() => setPreview(true)}>
              Предпросмотр ответа
            </button>
          ) : (
            <button
              disabled={busy || (mode !== "assign" && !body.trim())}
              onClick={() => void save()}
            >
              {busy
                ? "Сохраняем…"
                : mode === "reply"
                  ? "Отправить ответ"
                  : "Сохранить"}
            </button>
          )}
        </div>
      </div>
    </AdminDialog>
  );
}

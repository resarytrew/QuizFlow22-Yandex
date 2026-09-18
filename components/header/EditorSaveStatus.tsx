import { useEffect, useState } from "react";
import { useQuizDataStore } from "../../store/useQuizDataStore";
import { useAutosaveStore } from "../../store/useAutosaveStore";
import { api } from "../../services/apiClient";
import type { Quiz } from "../../types";
import { downloadQuizFile, serializeQuizFile } from "./quizFile";
import { buildCurrentQuizData } from "../../store/useQuizDataStore";
export function EditorSaveStatus() {
  const status = useQuizDataStore((s) => s.saveStatus);
  const error = useQuizDataStore((s) => s.saveError);
  const id = useQuizDataStore((s) => s.currentQuizId);
  const quiz = useQuizDataStore((s) =>
    s.userQuizzes.find((q) => q.id === s.currentQuizId),
  );
  const storageError = useAutosaveStore((s) => s.storageError);
  const versions = useAutosaveStore((s) => s.versions);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const label = {
    idle: "Черновик",
    dirty: "Есть изменения",
    saving: "Сохраняется…",
    saved: "Сохранено на сервере",
    local: "Только на устройстве",
    error: "Ошибка сохранения",
    conflict: "Конфликт версий",
  }[status];
  const reload = async () => {
    if (!id) return;
    useAutosaveStore.getState().autosaveCurrentQuiz();
    try {
      useQuizDataStore.getState().loadQuiz((await api.getQuiz(id)) as Quiz);
      setLoadError("");
    } catch {
      setLoadError("Не удалось загрузить актуальную версию. Попробуйте снова.");
    }
  };
  return (
    <div className="relative shrink-0 text-xs" data-testid="editor-save-status">
      <button
        className={`rounded-lg whitespace-nowrap px-2 py-2 ${status === "saved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
        onClick={() => {
          useAutosaveStore.getState().checkForAutosave();
          setOpen(!open);
        }}
        aria-expanded={open}
      >
        <span role="status">{label}</span> ▾
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 max-w-[90vw] rounded-xl border bg-white p-4 shadow-xl space-y-3">
          <strong>Сохранение и публикация</strong>
          <p>
            {quiz?.has_published_version
              ? "Участникам доступна одобренная версия."
              : "Квиз ещё не опубликован в галерее."}
          </p>
          <p>
            {quiz?.moderation_status === "approved"
              ? "Текущая версия одобрена."
              : "Изменения черновика требуют проверки администратора."}
          </p>
          {(error || storageError || loadError) && (
            <p role="alert" className="text-red-700">
              {error || storageError || loadError}
            </p>
          )}
          {status !== "conflict" && (
            <button
              className="underline"
              onClick={() => void useQuizDataStore.getState().saveQuiz()}
            >
              Сохранить на сервере
            </button>
          )}
          <button
            className="block underline"
            onClick={() => {
              const state = useQuizDataStore.getState();
              downloadQuizFile(
                serializeQuizFile(buildCurrentQuizData()),
                state.currentQuizName,
              );
            }}
          >
            Скачать копию в файл
          </button>
          {status === "conflict" && (
            <button className="block underline" onClick={() => void reload()}>
              Сохранить резервную копию и загрузить актуальную
            </button>
          )}
          <strong className="block">Восстановить локальную версию</strong>
          {versions.length ? (
            versions.map((v) => (
              <button
                key={v.id}
                className="block text-left underline"
                onClick={() => {
                  useAutosaveStore.getState().restoreAutosave(v.id);
                  setOpen(false);
                }}
              >
                {new Date(v.timestamp).toLocaleString("ru-RU")} —{" "}
                {v.currentQuizName || "Без названия"}
              </button>
            ))
          ) : (
            <p>Резервные копии появятся после редактирования.</p>
          )}
          <button className="block" onClick={() => setOpen(false)}>
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
export function RecoveryPrompt() {
  const id = useQuizDataStore((s) => s.currentQuizId);
  const key = useQuizDataStore((s) => s.editorKey);
  const backup = useAutosaveStore((s) => s.autosavedData);
  useEffect(() => {
    if (useQuizDataStore.getState().saveStatus !== "dirty")
      useAutosaveStore.getState().checkForAutosave();
  }, [id, key]);
  if (!backup) return null;
  return (
    <div
      role="status"
      className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[min(32rem,90vw)] rounded-xl border bg-white p-4 shadow-lg"
    >
      <p>
        Есть локальная копия от{" "}
        {new Date(backup.timestamp).toLocaleString("ru-RU")}.
      </p>
      <div className="flex gap-4 mt-2">
        <button
          onClick={() => useAutosaveStore.getState().restoreAutosave()}
          className="underline"
        >
          Восстановить
        </button>
        <button onClick={() => useAutosaveStore.getState().clearAutosave()}>
          Позже
        </button>
      </div>
    </div>
  );
}

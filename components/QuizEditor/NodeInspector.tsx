import { useRef, useState, type ReactNode } from "react";
import type { Node } from "reactflow";
import type { NodeData } from "../../types";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useQuizDataStore } from "../../store/useQuizDataStore";
import { TransitionEditor } from "./TransitionEditor";
export function NodeInspector({
  node,
  children,
}: {
  node: Node<NodeData>;
  children: ReactNode;
}) {
  const [tab, setTab] = useState("Содержание");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const content = useRef<HTMLDivElement>(null);
  const design = useQuizDataStore((s) => s.designSettings);
  const update = useQuizDataStore((s) => s.updateDesignSettings);
  const patch = (data: Partial<NodeData>) =>
    useCanvasStore.getState().updateNodeData(node.id, data);
  const find = () => {
    const label = Array.from(
      content.current?.querySelectorAll("label,h3,h4") || [],
    ).find((el) =>
      el.textContent?.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
    if (label) {
      label.scrollIntoView({ block: "center" });
      (label.querySelector("input,textarea,select") as HTMLElement)?.focus();
      setMessage("");
    } else setMessage("Настройка не найдена в этой вкладке.");
  };
  return (
    <div>
      <div
        role="tablist"
        aria-label="Настройки блока"
        className="grid grid-cols-2 gap-1 mb-4"
      >
        {["Содержание", "Переходы", "Оформление", "Дополнительно"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`p-2 rounded-lg text-sm ${tab === t ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Содержание" && (
        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <input
            aria-label="Найти настройку"
            placeholder="Найти настройку…"
            className="editor-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Найти</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <div role="tabpanel" ref={content}>
        {tab === "Содержание" && children}
        {tab === "Переходы" && <TransitionEditor node={node} />}
        {tab === "Оформление" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Общие цвета квиза. Полное оформление доступно в настройках
              дизайна.
            </p>
            <label className="block">
              Фон квиза
              <input
                className="editor-input"
                type="color"
                value={design.background.color}
                onChange={(e) =>
                  update({
                    background: { ...design.background, color: e.target.value },
                  })
                }
              />
            </label>
            <label className="block">
              Цвет кнопок
              <input
                className="editor-input"
                type="color"
                value={design.buttons.backgroundColor}
                onChange={(e) =>
                  update({
                    buttons: {
                      ...design.buttons,
                      backgroundColor: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="block">
              Изображение блока
              <input
                className="editor-input"
                type="url"
                value={node.data.imageUrl || ""}
                onChange={(e) => patch({ imageUrl: e.target.value })}
              />
            </label>
          </div>
        )}
        {tab === "Дополнительно" && (
          <div className="space-y-4">
            <label className="block">
              Озвучка при входе (ссылка)
              <input
                type="url"
                className="editor-input"
                value={node.data.soundSettings?.onEntry || ""}
                onChange={(e) =>
                  patch({
                    soundSettings: {
                      ...node.data.soundSettings,
                      onEntry: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="block">
              Заметка автора
              <textarea
                className="editor-input"
                value={node.data.editorNote || ""}
                onChange={(e) => patch({ editorNote: e.target.value })}
              />
            </label>
            <p className="text-xs text-slate-500">
              Заметка не показывается участникам.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

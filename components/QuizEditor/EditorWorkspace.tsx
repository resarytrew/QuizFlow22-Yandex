import { useMemo, useState } from "react";
import { useReactFlow } from "reactflow";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useQuizDataStore } from "../../store/useQuizDataStore";
import { useUIStore } from "../../store/useUIStore";
import { CustomNodeType } from "../../types";
import { createNewNode } from "./createNewNode";
import {
  nodeTitle,
  nodeOutputs,
  validateEditorGraph,
} from "../../utils/editorValidation";
export function EditorWorkspace({
  view,
  onView,
}: {
  view: string;
  onView: (view: string) => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes),
    edges = useCanvasStore((s) => s.edges);
  const base = useQuizDataStore((s) => s.quizDataBase);
  const locked = useCanvasStore((s) => s.isCanvasLocked);
  const [search, setSearch] = useState("");
  const { fitView } = useReactFlow();
  const issues = useMemo(
    () => validateEditorGraph(nodes, edges),
    [nodes, edges],
  );
  const order = base.editorOrder || [];
  const ordered = [...nodes].sort((a, b) => {
    const ai = order.indexOf(a.id),
      bi = order.indexOf(b.id);
    return (ai < 0 ? 1e6 : ai) - (bi < 0 ? 1e6 : bi);
  });
  const open = (id: string) => {
    const n = nodes.find((n) => n.id === id);
    useUIStore.getState().setCurrentGroup(n?.data.parentId || null);
    useCanvasStore.getState().selectSingleNode(id);
    useUIStore.getState().openSettingsPanel();
    if (view === "graph")
      void fitView({ nodes: [{ id }], duration: 200, maxZoom: 1 });
  };
  const move = (id: string, delta: number) => {
    const list = ordered.map((n) => n.id);
    const index = list.indexOf(id),
      target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    useQuizDataStore.setState({ quizDataBase: { ...base, editorOrder: list } });
  };
  const add = () => {
    const n = createNewNode(CustomNodeType.Question, {
      x: 200,
      y: nodes.length * 180,
    });
    const result = nodes.find(
      (n) => n.type === CustomNodeType.Result && !n.data.parentId,
    );
    const incoming = result ? edges.filter((e) => e.target === result.id) : [];
    let nextEdges = edges;
    if (incoming.length === 1) {
      const e = incoming[0];
      nextEdges = [
        ...edges.filter((x) => x.id !== e.id),
        { ...e, target: n.id },
        {
          id: crypto.randomUUID(),
          source: n.id,
          sourceHandle: nodeOutputs(n)[0]?.id,
          target: result!.id,
        },
      ];
    }
    useCanvasStore.getState().applyGraph([...nodes, n], nextEdges);
    openNew(n.id);
  };
  const openNew = (id: string) => {
    useCanvasStore.getState().selectSingleNode(id);
    useUIStore.getState().openSettingsPanel();
  };
  return (
    <>
      <div
        className="editor-workspace-tabs"
        role="tablist"
        aria-label="Представление редактора"
      >
        {[
          ["graph", "Схема"],
          ["questions", "Вопросы"],
          ["checks", `Проверка (${issues.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => onView(id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const ids = ["graph", "questions", "checks"];
                const i = ids.indexOf(view);
                onView(ids[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3]);
                (
                  e.currentTarget.parentElement?.children[
                    (i + (e.key === "ArrowRight" ? 1 : 2)) % 3
                  ] as HTMLElement
                )?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
        <button onClick={() => useUIStore.getState().setPreviewMode(true)}>
          Пройти квиз
        </button>
      </div>
      {view !== "graph" && (
        <div className="editor-document-view" role="tabpanel">
          {view === "checks" ? (
            <>
              <h2 className="text-xl font-semibold">Проверка перед запуском</h2>
              <p className="text-sm text-slate-600 my-3">
                Нажмите на замечание, чтобы открыть блок. Проверка охватывает
                весь сценарий, включая группы.
              </p>
              {!issues.length && (
                <p role="status">
                  Структурных ошибок не найдено. Пройдите разные ветки в
                  предпросмотре.
                </p>
              )}
              {issues.map((issue, i) => (
                <button
                  key={i}
                  className="block w-full text-left border-b py-3"
                  disabled={!issue.nodeId}
                  onClick={() => issue.nodeId && open(issue.nodeId)}
                >
                  <span
                    className={
                      issue.severity === "error"
                        ? "text-red-700"
                        : "text-amber-800"
                    }
                  >
                    {issue.severity === "error" ? "Ошибка" : "Рекомендация"}
                  </span>{" "}
                  · {issue.message}
                  {issue.nodeId && (
                    <small className="block text-slate-500">
                      {nodeTitle(nodes.find((n) => n.id === issue.nodeId)!)}
                    </small>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="text-xl font-semibold">Вопросы и шаги</h2>
                <button
                  className="rounded-lg bg-slate-900 text-white px-3 py-2"
                  disabled={locked}
                  onClick={add}
                >
                  Добавить вопрос
                </button>
              </div>
              <input
                className="editor-input my-4"
                aria-label="Поиск вопросов"
                placeholder="Найти вопрос…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <p className="text-xs text-slate-500 mb-3">
                Стрелки меняют порядок списка. Путь участника задаётся в
                «Переходах».
              </p>
              {ordered
                .filter((n) =>
                  nodeTitle(n).toLowerCase().includes(search.toLowerCase()),
                )
                .map((n, i) => (
                  <article
                    key={n.id}
                    className="border-b py-4 flex gap-3 items-start"
                  >
                    <span className="text-slate-400">{i + 1}</span>
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => open(n.id)}
                    >
                      <strong className="block break-words">
                        {nodeTitle(n)}
                      </strong>
                      <small className="text-slate-500">
                        {n.data.parentId ? "В группе · " : ""}
                        {edges.filter((e) => e.source === n.id).length}{" "}
                        переходов
                      </small>
                    </button>
                    <div className="flex gap-2">
                      <button
                        disabled={locked || i === 0}
                        aria-label={`Выше: ${nodeTitle(n)}`}
                        onClick={() => move(n.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={locked || i === ordered.length - 1}
                        aria-label={`Ниже: ${nodeTitle(n)}`}
                        onClick={() => move(n.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`Пройти с блока: ${nodeTitle(n)}`}
                        onClick={() =>
                          useUIStore.getState().setPreviewMode(true, n.id)
                        }
                      >
                        ▷
                      </button>
                    </div>
                  </article>
                ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

import { useState } from "react";
import type { Node } from "reactflow";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useUIStore } from "../../store/useUIStore";
import { CustomNodeType, type NodeData } from "../../types";
import { createNewNode } from "./createNewNode";
import { nodeOutputs, nodeTitle } from "../../utils/editorValidation";
export function TransitionEditor({ node }: { node: Node<NodeData> }) {
  const nodes = useCanvasStore((s) => s.nodes),
    edges = useCanvasStore((s) => s.edges);
  const locked = useCanvasStore((s) => s.isCanvasLocked);
  const [search, setSearch] = useState("");
  const ports = nodeOutputs(node);
  const extra = edges
    .filter(
      (e) =>
        e.source === node.id &&
        !ports.some((p) => p.id === (e.sourceHandle || "default")),
    )
    .map((e) => ({
      id: e.sourceHandle || "default",
      label: String(e.label || e.sourceHandle || "Переход"),
    }));
  const options = [
    ...ports,
    ...extra.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i),
  ];
  const connect = (handle: string, target: string) => {
    const existing = edges.find(
      (e) => e.source === node.id && (e.sourceHandle || "default") === handle,
    );
    const other = edges.filter(
      (e) =>
        !(e.source === node.id && (e.sourceHandle || "default") === handle),
    );
    useCanvasStore
      .getState()
      .applyGraph(
        nodes,
        target
          ? [
              ...other,
              {
                ...existing,
                id: existing?.id || crypto.randomUUID(),
                source: node.id,
                sourceHandle: handle === "default" ? null : handle,
                target,
              },
            ]
          : other,
      );
  };
  const insert = (handle: string) => {
    const edge = edges.find(
      (e) => e.source === node.id && (e.sourceHandle || "default") === handle,
    );
    if (!edge) return;
    const next = createNewNode(CustomNodeType.Question, {
      x: node.position.x + 350,
      y: node.position.y,
    });
    next.data.parentId = node.data.parentId;
    const port = nodeOutputs(next)[0]?.id;
    useCanvasStore
      .getState()
      .applyGraph(
        [...nodes, next],
        [
          ...edges.filter((e) => e.id !== edge.id),
          { ...edge, target: next.id },
          {
            id: crypto.randomUUID(),
            source: next.id,
            sourceHandle: port,
            target: edge.target,
            targetHandle: edge.targetHandle,
          },
        ],
      );
    useCanvasStore.getState().selectSingleNode(next.id);
  };
  return (
    <fieldset
      disabled={locked}
      className="space-y-4 disabled:opacity-60"
      data-testid="transition-editor"
    >
      <p className="text-sm text-slate-600">
        Выберите следующий шаг для каждого ответа.
      </p>
      <label className="block text-sm">
        Найти следующий блок
        <input
          className="editor-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {options.map((p) => {
        const edge = edges.find(
          (e) => e.source === node.id && (e.sourceHandle || "default") === p.id,
        );
        return (
          <div key={p.id} className="border-b pb-4">
            <label className="block text-sm font-medium">
              {p.label}
              <select
                className="editor-input"
                aria-label={`Переход: ${p.label}`}
                value={edge?.target || ""}
                onChange={(e) => connect(p.id, e.target.value)}
              >
                <option value="">Не задан</option>
                {nodes
                  .filter(
                    (n) =>
                      n.id !== node.id &&
                      (n.id === edge?.target ||
                        nodeTitle(n)
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {nodeTitle(n)}
                    </option>
                  ))}
              </select>
            </label>
            {edge && (
              <div className="flex flex-wrap gap-3 text-xs mt-2">
                <button
                  className="underline"
                  onClick={() => {
                    const n = nodes.find((n) => n.id === edge.target);
                    useUIStore
                      .getState()
                      .setCurrentGroup(n?.data.parentId || null);
                    useCanvasStore.getState().selectSingleNode(edge.target);
                  }}
                >
                  Открыть следующий блок
                </button>
                <button className="underline" onClick={() => insert(p.id)}>
                  Вставить вопрос между блоками
                </button>
              </div>
            )}
          </div>
        );
      })}
      {!options.length && <p>Это результат — завершение сценария.</p>}
    </fieldset>
  );
}

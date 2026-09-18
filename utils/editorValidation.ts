import type { Edge, Node } from "reactflow";
import type { NodeData } from "../types";
export type EditorIssue = {
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
};
export function nodeTitle(node: Node<NodeData>) {
  const d = node.data as unknown as Record<string, unknown>;
  return String(d.question || d.label || d.title || "Без названия");
}
export function nodeOutputs(
  node: Node<NodeData>,
): Array<{ id: string; label: string }> {
  const d = node.data as unknown as Record<string, unknown>;
  if (node.type === "resultNode") return [];
  if (node.type === "questionNode")
    return ((d.answers || []) as Array<{ id: string; text: string }>).map(
      (a) => ({ id: a.id, label: a.text || "Пустой ответ" }),
    );
  if (node.type === "conditionNode")
    return [
      { id: "true", label: "Условие выполнено" },
      { id: "false", label: "Условие не выполнено" },
    ];
  if (node.type === "multipleChoiceNode") {
    const count = Array.isArray(d.correctOptions) ? d.correctOptions.length : 0;
    return count
      ? Array.from({ length: count + 1 }, (_, i) => ({
          id: `correct-${i}`,
          label: `Верных ответов: ${i}`,
        }))
      : [{ id: "default", label: "Далее" }];
  }
  return [{ id: "default", label: "Далее" }];
}
export function validateEditorGraph(
  nodes: Node<NodeData>[],
  edges: Edge[],
): EditorIssue[] {
  const issues: EditorIssue[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const starts = nodes.filter(
    (n) => n.type === "startNode" && !n.data.parentId,
  );
  if (starts.length !== 1)
    issues.push({
      severity: "error",
      message: "Нужен один стартовый блок на основном холсте.",
    });
  for (const e of edges)
    if (!byId.has(e.source) || !byId.has(e.target))
      issues.push({
        severity: "error",
        nodeId: byId.has(e.source) ? e.source : undefined,
        message: "Связь ведёт к удалённому блоку.",
      });
  const links = new Map<string, string[]>();
  for (const n of nodes) {
    const d = n.data as unknown as Record<string, unknown>;
    const outgoing = edges.filter((e) => e.source === n.id);
    const targets = outgoing.map((e) => e.target);
    if (typeof d.targetNodeId === "string" && d.targetNodeId)
      targets.push(d.targetNodeId);
    if (n.type === "groupNode") {
      const child = nodes.find((c) => c.data.parentId === n.id);
      if (child) targets.push(child.id);
    }
    if (!targets.length && n.data.parentId)
      targets.push(
        ...edges
          .filter((e) => e.source === n.data.parentId)
          .map((e) => e.target),
      );
    links.set(n.id, targets);
    const add = (message: string, severity: "error" | "warning" = "error") =>
      issues.push({ severity, nodeId: n.id, message });
    if ("question" in d && !String(d.question || "").trim())
      add("Заполните текст вопроса.");
    if (n.type === "questionNode" || n.type === "multipleChoiceNode") {
      const answers = Array.isArray(d.answers)
        ? (d.answers as Array<{ id: string; text: string }>)
        : [];
      if (!answers.length) add("Добавьте хотя бы один ответ.");
      for (const a of answers)
        if (!a.text?.trim()) add("Заполните текст ответа.");
    }
    if (n.type !== "resultNode" && !targets.length)
      add("Нет продолжения: соедините блок со следующим шагом.");
    const ports = new Map<string, number>();
    for (const e of outgoing) {
      const h = e.sourceHandle || "default";
      ports.set(h, (ports.get(h) || 0) + 1);
    }
    if ([...ports.values()].some((count) => count > 1))
      add(
        "Один выход ведёт в несколько блоков. Участник пройдёт только по одному переходу.",
      );
    if (
      n.type === "questionNode" ||
      n.type === "conditionNode" ||
      n.type === "multipleChoiceNode"
    )
      for (const output of nodeOutputs(n))
        if (!ports.has(output.id) && !ports.has("default") && !n.data.parentId)
          add(`Не задан переход: «${output.label}».`);
    if (
      typeof d.targetNodeId === "string" &&
      d.targetNodeId &&
      !byId.has(d.targetNodeId)
    )
      add("Целевой блок перехода удалён.");
  }
  const reachable = new Set<string>();
  const stack = starts.map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    stack.push(...(links.get(id) || []));
  }
  for (const n of nodes)
    if (!reachable.has(n.id))
      issues.push({
        severity: "warning",
        nodeId: n.id,
        message: "Этот блок недоступен от старта.",
      });
  if (!nodes.some((n) => n.type === "resultNode" && reachable.has(n.id)))
    issues.push({
      severity: "error",
      message: "От старта нельзя добраться до результата.",
    });
  const done = new Set<string>(),
    active = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      issues.push({
        severity: "warning",
        nodeId: id,
        message:
          "Есть возврат по циклу. Проверьте, что участник сможет выйти к результату.",
      });
      return;
    }
    if (done.has(id)) return;
    active.add(id);
    for (const target of links.get(id) || []) visit(target);
    active.delete(id);
    done.add(id);
  };
  for (const n of starts) visit(n.id);
  return issues;
}

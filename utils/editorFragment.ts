import type { Edge, Node } from "reactflow";
import type { NodeData } from "../types";
export function copyFragment(
  nodes: Node<NodeData>[],
  edges: Edge[],
  ids: readonly string[],
) {
  const selected = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes)
      if (
        n.data.parentId &&
        selected.has(n.data.parentId) &&
        !selected.has(n.id)
      ) {
        selected.add(n.id);
        changed = true;
      }
  }
  const copied = nodes.filter(
    (n) => selected.has(n.id) && (n.type !== "startNode" || !!n.data.parentId),
  );
  const included = new Set(copied.map((n) => n.id));
  return structuredClone({
    nodes: copied,
    edges: edges.filter(
      (e) => included.has(e.source) && included.has(e.target),
    ),
  });
}
export function pasteFragment(
  fragment: ReturnType<typeof copyFragment>,
  parentId?: string | null,
) {
  const ids = new Map(fragment.nodes.map((n) => [n.id, crypto.randomUUID()]));
  const remap = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          typeof v === "string" &&
          /(?:nodeId|NodeId|parentId|target|source)$/.test(key)
            ? ids.get(v) || v
            : remap(v),
        ]),
      );
    return value;
  };
  const nodes = fragment.nodes.map((n) => ({
    ...structuredClone(n),
    id: ids.get(n.id)!,
    selected: false,
    parentNode: n.parentNode ? ids.get(n.parentNode) : undefined,
    position: { x: n.position.x + 40, y: n.position.y + 40 },
    data: {
      ...(remap(n.data) as NodeData),
      parentId:
        n.data.parentId && ids.has(n.data.parentId)
          ? ids.get(n.data.parentId)
          : parentId || undefined,
    },
  }));
  const edges = fragment.edges.map((e) => ({
    ...structuredClone(e),
    id: crypto.randomUUID(),
    source: ids.get(e.source)!,
    target: ids.get(e.target)!,
    selected: false,
  }));
  return { nodes, edges };
}

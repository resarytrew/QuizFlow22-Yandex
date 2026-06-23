import type { QuizData, QuizNode, QuizEdge } from "./types";

// ===== ИНДЕКСЫ ДЛЯ БЫСТРОГО ДОСТУПА =====

export const nodeById: Record<string, QuizNode> = Object.create(null);
export const edgesFrom: Record<string, QuizEdge[]> = Object.create(null);
export const edgesFromHandle: Record<string, QuizEdge[]> = Object.create(null);
export const nodesByParent: Record<string, QuizNode[]> = Object.create(null);

export function normalizeHandle(h: string | null | undefined): string {
  if (!h || h === "" || h === "default") return "default";
  return String(h);
}

export function buildIndexes(data: QuizData): void {
  // Очистка
  for (const k in nodeById) delete nodeById[k];
  for (const k in edgesFrom) delete edgesFrom[k];
  for (const k in edgesFromHandle) delete edgesFromHandle[k];
  for (const k in nodesByParent) delete nodesByParent[k];

  if (!data?.nodes || !Array.isArray(data.nodes)) return;

  for (const node of data.nodes) {
    if (!node?.id) continue;
    nodeById[node.id] = node;

    const parentId =
      node.parentId ??
      (node as any).data?.parentId ??
      (node as any).parentNode ??
      null;

    if (parentId) {
      if (!nodesByParent[parentId]) nodesByParent[parentId] = [];
      nodesByParent[parentId].push(node);
    }
  }

  if (!data.edges || !Array.isArray(data.edges)) return;

  for (const edge of data.edges) {
    if (!edge?.source || !edge?.target) continue;

    const src = edge.source;
    const handle = normalizeHandle(edge.sourceHandle);

    if (!edgesFrom[src]) edgesFrom[src] = [];
    edgesFrom[src].push(edge);

    const key = `${src}::${handle}`;
    if (!edgesFromHandle[key]) edgesFromHandle[key] = [];
    edgesFromHandle[key].push(edge);
  }
}

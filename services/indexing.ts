/**
 * Индексы для быстрого поиска нод и рёбер по ID.
 * Строятся один раз при загрузке квиза.
 */

export interface QuizNode {
  id: string;
  type: string;
  parentId?: string;
  parentNode?: string;
  position?: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface EdgeEffect {
  variableName: string;
  op: "set" | "add" | "subtract";
  value: string | number;
}

export interface QuizEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  data?: {
    effects?: EdgeEffect[];
    [key: string]: unknown;
  };
}

export interface QuizData {
  nodes: QuizNode[];
  edges: QuizEdge[];
  startNodeId?: string;
  quizId?: string;
  apiBaseUrl?: string;
  designSettings?: Record<string, unknown>;
}

// ─── Mutable indexes (reset on each buildIndexes call) ───

export const nodeById: Record<string, QuizNode> =
  Object.create(null);

export const edgesFrom: Record<string, QuizEdge[]> =
  Object.create(null);

export const edgesFromHandle: Record<string, QuizEdge[]> =
  Object.create(null);

export const nodesByParent: Record<string, QuizNode[]> =
  Object.create(null);

// ─── Helpers ─────────────────────────────────────────────

export function normalizeHandle(
  h: string | null | undefined,
): string {
  if (h === null || h === undefined || h === "" || h === "default") {
    return "default";
  }
  return String(h);
}

// ─── Build ───────────────────────────────────────────────

export function buildIndexes(data: QuizData | null | undefined): void {
  // Очистка предыдущего состояния
  for (const k in nodeById) delete nodeById[k];
  for (const k in edgesFrom) delete edgesFrom[k];
  for (const k in edgesFromHandle) delete edgesFromHandle[k];
  for (const k in nodesByParent) delete nodesByParent[k];

  if (!data) return;

  // Индексируем ноды
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  for (const node of nodes) {
    if (!node?.id) continue;

    nodeById[node.id] = node;

    const parentId =
      node.parentId ??
      (node.data?.parentId as string | undefined) ??
      node.parentNode ??
      null;

    if (parentId) {
      if (!nodesByParent[parentId]) nodesByParent[parentId] = [];
      nodesByParent[parentId].push(node);
    }
  }

  // Индексируем рёбра
  const edges = Array.isArray(data.edges) ? data.edges : [];
  for (const edge of edges) {
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

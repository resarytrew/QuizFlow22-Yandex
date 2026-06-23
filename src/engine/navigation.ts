import type { QuizEdge, QuizNode } from "./types";
import {
  edgesFrom,
  edgesFromHandle,
  nodeById,
  nodesByParent,
  normalizeHandle,
} from "./indexing";
import {
  markVisited,
  pushPath,
  setCurrentNode,
  updateVariable,
} from "./state";
import {
  INTERACTIVE_TYPES,
  LOGIC_TYPES,
  MAX_LOGIC_CHAIN,
  MAX_RESOLVE_DEPTH,
} from "./constants";
import { executeLogic } from "./logic";
import { playNodeEntrySound } from "./media";
import { renderError, renderNode } from "./render";
import { updateHUD } from "./hud";

let logicDepth = 0;

function applyEdgeEffects(edge: QuizEdge): void {
  for (const effect of edge.data?.effects ?? []) {
    if (effect.variableName) {
      updateVariable(effect.variableName, effect.op, effect.value);
    }
  }
}

function getNextNodeId(currentId: string, handle: string | null): string | null {
  const key = `${currentId}::${normalizeHandle(handle ?? "default")}`;
  const list = edgesFromHandle[key] ?? edgesFromHandle[`${currentId}::default`]
    ?? edgesFrom[currentId];
  const edge = list?.[0];
  if (!edge) return null;
  applyEdgeEffects(edge);
  return edge.target;
}

export function resolveNextNode(
  currentId: string,
  handle: string | null,
  depth = 0,
): string | null {
  if (depth > MAX_RESOLVE_DEPTH) return null;
  const direct = getNextNodeId(currentId, handle);
  if (direct) return direct;

  const node = nodeById[currentId];
  const parentId = node?.parentId ?? node?.data?.parentId as string | undefined
    ?? node?.parentNode;
  return parentId ? resolveNextNode(parentId, null, depth + 1) : null;
}

export function processNode(nodeId: string): void {
  try {
    processNodeUnsafe(nodeId);
  } catch (error) {
    console.error("[Quiz] Error at node", nodeId, error);
    logicDepth = 0;
    renderError("Произошла ошибка. Попробуйте перезагрузить страницу.");
  }
}

function processNodeUnsafe(nodeId: string): void {
  const node = nodeById[nodeId] as QuizNode | undefined;
  if (!node) {
    renderError(`Узел не найден: ${nodeId}`);
    return;
  }

  if (node.type === "groupNode") {
    const firstChild = nodesByParent[node.id]?.[0];
    const next = firstChild?.id ?? getNextNodeId(node.id, null);
    if (next) processNode(next);
    return;
  }

  setCurrentNode(nodeId);
  pushPath(nodeId);

  if ((INTERACTIVE_TYPES as readonly string[]).includes(node.type)) {
    markVisited(nodeId);
  }

  if ((LOGIC_TYPES as readonly string[]).includes(node.type)) {
    logicDepth += 1;
    if (logicDepth > MAX_LOGIC_CHAIN) {
      logicDepth = 0;
      renderError("Ошибка квиза: обнаружен бесконечный цикл.");
      return;
    }
    const next = executeLogic(node, resolveNextNode);
    if (next) setTimeout(() => processNode(next), 0);
    return;
  }

  logicDepth = 0;
  renderNode(node, { resolveNextNode, processNode });
  updateHUD();
  playNodeEntrySound((node.data.soundSettings as any)?.onEntry);
}

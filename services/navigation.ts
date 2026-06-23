/**
 * Навигация по графу квиза и выполнение логических нод.
 *
 * Дублирование с quizEngine.ts намеренное.
 */

import {
  nodeById,
  edgesFrom,
  edgesFromHandle,
  nodesByParent,
  normalizeHandle,
  type QuizEdge,
} from "./indexing";
import {
  getState,
  setCurrentNode,
  pushPath,
  markVisited,
  updateScore,
  updateVariable,
} from "./state";
import { playNodeEntrySound, cleanupAllMedia } from "./media";
import { renderNode, renderError } from "./render";

// ─── Constants ───────────────────────────────────────────

export const MAX_LOGIC_CHAIN = 100;
const MAX_RESOLVE_DEPTH = 20;

const INTERACTIVE_TYPES = new Set([
  "questionNode",
  "multipleChoiceNode",
  "matchingNode",
  "timelineNode",
  "textInputNode",
  "collectInfoNode",
  "allocatorNode",
]);

const LOGIC_TYPES = new Set([
  "startNode",
  "scoreNode",
  "variableNode",
  "conditionNode",
  "formulaNode",
  "goToNode",
  "achievementNode",
  "progressionNode",
]);

// ─── Circuit breaker ─────────────────────────────────────

let _logicChainDepth = 0;

export function resetLogicChain(): void {
  _logicChainDepth = 0;
}

// ─── Edge effects ────────────────────────────────────────

function applyEdgeEffects(edge: QuizEdge): void {
  if (!edge.data?.effects) return;
  for (const ef of edge.data.effects) {
    if (!ef.variableName) continue;
    updateVariable(ef.variableName, ef.op, ef.value);
  }
}

// ─── Navigation ──────────────────────────────────────────

export function getNextNodeId(
  srcId: string,
  handle?: string | null,
): string | null {
  const key = `${srcId}::${normalizeHandle(handle)}`;
  const list =
    edgesFromHandle[key] ??
    edgesFromHandle[`${srcId}::default`] ??
    edgesFrom[srcId];

  if (list?.length) {
    const edge = list[0];
    applyEdgeEffects(edge);
    return edge.target;
  }
  return null;
}

export function resolveNextNode(
  currentNodeId: string,
  handle: string | null,
  depth = 0,
): string | null {
  if (depth > MAX_RESOLVE_DEPTH) {
    console.error(
      "[navigation] resolveNextNode: max depth exceeded at",
      currentNodeId,
    );
    return null;
  }

  const direct = getNextNodeId(currentNodeId, handle);
  if (direct) return direct;

  // Подъём через родителя (для нод внутри groupNode)
  const node = nodeById[currentNodeId];
  const parentId = node
    ? (node.parentId ??
      (node.data?.parentId as string | undefined) ??
      (node as any).parentNode ??
      null)
    : null;

  if (parentId) {
    return resolveNextNode(parentId, null, depth + 1);
  }
  return null;
}

// ─── Process node ────────────────────────────────────────

export function processNode(nodeId: string): void {
  try {
    processNodeUnsafe(nodeId);
  } catch (err) {
    console.error("[navigation] Error at node", nodeId, err);
    _logicChainDepth = 0;
    renderError("Произошла ошибка. Попробуйте перезагрузить страницу.");
  }
}

function processNodeUnsafe(nodeId: string): void {
  const node = nodeById[nodeId];
  if (!node) return;

  // groupNode — входим в первого ребёнка, иначе по edge
  if (node.type === "groupNode") {
    const children = nodesByParent[node.id] || [];
    if (children.length > 0) {
      processNode(children[0].id);
    } else {
      const next = getNextNodeId(node.id, null);
      if (next) processNode(next);
    }
    return;
  }

  setCurrentNode(nodeId);
  pushPath(nodeId);

  if (INTERACTIVE_TYPES.has(node.type)) {
    markVisited(nodeId);
  }

  if (LOGIC_TYPES.has(node.type)) {
    _logicChainDepth++;
    if (_logicChainDepth > MAX_LOGIC_CHAIN) {
      console.error(
        "[navigation] Infinite logic chain detected at node:",
        nodeId,
      );
      _logicChainDepth = 0;
      renderError("Ошибка квиза: обнаружен бесконечный цикл.");
      return;
    }
    executeLogic(node);
    return;
  }

  // UI-нода — рендерим и сбрасываем circuit-breaker
  _logicChainDepth = 0;
  renderNode(node);
  playNodeEntrySound((node.data as any)?.soundSettings?.onEntry);
}

// ─── Logic execution ─────────────────────────────────────

function executeLogic(node: { id: string; type: string; data: any }): void {
  const d = node.data || {};
  let nextId: string | null = null;

  switch (node.type) {
    case "startNode": {
      nextId = resolveNextNode(node.id, null);
      break;
    }
    case "scoreNode": {
      const raw = d.value;
      const v = Number(raw);
      if (Number.isNaN(v)) break;
      updateScore(d.operation ?? "set", v);
      nextId = resolveNextNode(node.id, null);
      break;
    }
    case "variableNode": {
      if (d.variableName) {
        updateVariable(d.variableName, d.operation ?? "set", d.value);
      }
      nextId = resolveNextNode(node.id, null);
      break;
    }
    case "conditionNode": {
      const varName = d.variable ?? "";
      const actual =
        varName === "score" ? getState().score : getState().variables[varName];
      const expected = d.conditionValue !== undefined ? d.conditionValue : d.value;
      const a = Number(actual);
      const b = Number(expected);
      const numericOk = !Number.isNaN(a) && !Number.isNaN(b);

      let result = false;
      switch (d.operator) {
        case "==":
          result = numericOk ? a === b : String(actual) === String(expected);
          break;
        case "!=":
          result = numericOk ? a !== b : String(actual) !== String(expected);
          break;
        case ">":
          result = numericOk && a > b;
          break;
        case "<":
          result = numericOk && a < b;
          break;
        case ">=":
          result = numericOk && a >= b;
          break;
        case "<=":
          result = numericOk && a <= b;
          break;
        default:
          result = false;
      }
      nextId = resolveNextNode(node.id, result ? "true" : "false");
      break;
    }
    case "goToNode": {
      if (d.targetNodeId && nodeById[d.targetNodeId]) {
        nextId = d.targetNodeId;
      } else {
        nextId = resolveNextNode(node.id, null);
      }
      break;
    }
    case "achievementNode":
    case "progressionNode":
    case "formulaNode":
    default: {
      nextId = resolveNextNode(node.id, null);
      break;
    }
  }

  if (nextId) {
    setTimeout(() => processNode(nextId!), 0);
  }
}

// Re-export for tests / cleanup hooks
export { cleanupAllMedia };

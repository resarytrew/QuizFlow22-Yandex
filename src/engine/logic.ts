import type { QuizNode } from "./types";
import {
  addAchievement,
  getState,
  setVariable,
  updateScore,
  updateVariable,
} from "./state";
import { playSound } from "./media";
import { evaluateArithmetic } from "./expression";

declare global {
  interface Window {
    math?: {
      evaluate(expression: string, scope: Record<string, unknown>): unknown;
    };
  }
}

export type ResolveNext = (nodeId: string, handle: string | null) => string | null;

function evaluateCondition(data: any): boolean {
  const state = getState();
  const actual = data.variable === "score"
    ? state.score
    : state.variables[data.variable ?? ""];
  const expected = data.conditionValue ?? data.value;
  const a = Number(actual);
  const b = Number(expected);
  const numeric = !Number.isNaN(a) && !Number.isNaN(b);

  switch (data.operator) {
    case "eq":
    case "==": return numeric ? a === b : String(actual) === String(expected);
    case "neq":
    case "!=": return numeric ? a !== b : String(actual) !== String(expected);
    case "gt":
    case ">": return numeric && a > b;
    case "lt":
    case "<": return numeric && a < b;
    case "gte":
    case ">=": return numeric && a >= b;
    case "lte":
    case "<=": return numeric && a <= b;
    case "contains": return String(actual).includes(String(expected));
    default: return false;
  }
}

function executeFormula(data: any): void {
  const expression = data.expression ?? data.formula;
  const variable = data.variableName ?? data.resultVariable;
  if (!expression || !variable) return;

  try {
    const state = getState();
    const scope = { score: state.score, ...state.variables };
    let result = window.math?.evaluate
      ? window.math.evaluate(expression, scope)
      : evaluateArithmetic(expression, scope);
    if (typeof result === "number" && typeof data.decimalPlaces === "number") {
      result = Number(result.toFixed(data.decimalPlaces));
    }
    setVariable(variable, result as string | number | boolean);
  } catch (error) {
    console.error("[Quiz] Formula error", error);
  }
}

function executeProgression(
  node: QuizNode,
  data: any,
  resolveNext: ResolveNext,
): string | null {
  const state = getState();
  const currentLevel = Number(state.variables[data.levelVar ?? ""] ?? 0);
  const rules = [...(data.rules ?? [])].sort((a: any, b: any) => b.level - a.level);
  const matched = rules.find((rule: any) => {
    const checks = (rule.requirements ?? []).map((requirement: any) => {
      const value = String(requirement.type).includes("Score")
        ? state.score
        : Number(state.variables[requirement.variable ?? ""] ?? 0);
      if (requirement.type === "minVar" || requirement.type === "minScore") {
        return value >= requirement.value;
      }
      if (requirement.type === "maxVar" || requirement.type === "maxScore") {
        return value <= requirement.value;
      }
      return false;
    });
    return rule.requireAll === false ? checks.some(Boolean) : checks.every(Boolean);
  });

  let handle: string | null = null;
  if (matched && (matched.level >= currentLevel || !data.lockDegrade)) {
    if (matched.level > currentLevel) handle = data.onLevelUpHandle ?? "levelUp";
    if (data.levelVar) setVariable(data.levelVar, matched.level);
    if (data.nameVar) setVariable(data.nameVar, matched.name ?? "");
  }
  return (handle && resolveNext(node.id, handle)) || resolveNext(node.id, null);
}

export function executeLogic(node: QuizNode, resolveNext: ResolveNext): string | null {
  const data: any = node.data;
  switch (node.type) {
    case "startNode":
      return resolveNext(node.id, null);
    case "scoreNode":
      updateScore(data.operation ?? "set", Number(data.value));
      return resolveNext(node.id, null);
    case "variableNode":
      if (data.variableName) {
        updateVariable(data.variableName, data.operation ?? "set", data.value ?? "");
      }
      return resolveNext(node.id, null);
    case "conditionNode":
      return resolveNext(node.id, evaluateCondition(data) ? "true" : "false");
    case "goToNode":
      return data.targetNodeId ?? resolveNext(node.id, null);
    case "formulaNode":
      executeFormula(data);
      return resolveNext(node.id, null);
    case "achievementNode":
      if (addAchievement(data.title ?? "Достижение")) {
        playSound("achievement", undefined);
      }
      return resolveNext(node.id, null);
    case "progressionNode":
      return executeProgression(node, data, resolveNext);
    default:
      return resolveNext(node.id, null);
  }
}

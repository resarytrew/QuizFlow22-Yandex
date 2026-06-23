/**
 * Состояние движка квиза.
 * Единственный источник истины для runtime-данных прохождения.
 *
 * Дублирование с quizEngine.ts намеренное:
 * движок встраивается как inline IIFE в standalone HTML,
 * где ESM-импорты недоступны. Этот файл — тестируемая копия.
 * При изменении логики — менять оба места.
 */

export interface PathEntry {
  nodeId: string;
  timestamp: string;
}

export interface QuizState {
  currentNodeId: string | null;
  score: number;
  variables: Record<string, string | number | boolean>;
  startTime: number;
  path: PathEntry[];
  visitedInteractiveNodes: Set<string>;
  isResultSaved: boolean;
  isSessionCompleted: boolean;
  achievements: string[];
}

const MAX_PATH_LENGTH = 1000;
const MAX_SCORE = 1_000_000;

// ─── Singleton state ─────────────────────────────────────

let _state: QuizState = _createFresh();

function _createFresh(): QuizState {
  return {
    currentNodeId: null,
    score: 0,
    variables: {},
    startTime: performance.now(),
    path: [],
    visitedInteractiveNodes: new Set(),
    isResultSaved: false,
    isSessionCompleted: false,
    achievements: [],
  };
}

export function createInitialState(): QuizState {
  return _createFresh();
}

export function getState(): Readonly<QuizState> {
  return _state;
}

export function resetState(): void {
  _state = _createFresh();
}

// ─── Score ───────────────────────────────────────────────

export function updateScore(operation: string, value: number): void {
  const v = isNaN(value) ? 0 : value;

  switch (operation) {
    case "add":
      _state.score += v;
      break;
    case "subtract":
      _state.score -= v;
      break;
    case "multiply":
      _state.score *= v;
      break;
    case "set":
      _state.score = v;
      break;
    default:
      _state.score += v;
  }

  // Guards
  _state.score = Math.max(0, Math.min(_state.score, MAX_SCORE));
  _state.score = Math.round(_state.score);
}

// ─── Variables ───────────────────────────────────────────

export function setVariable(
  name: string,
  value: string | number | boolean,
): void {
  _state.variables[name] = value;
}

export function getVariable(
  name: string,
): string | number | boolean | undefined {
  return _state.variables[name];
}

export function updateVariable(
  name: string,
  operation: string,
  value: string | number,
): void {
  const numVal =
    typeof value === "string" ? parseFloat(value) : value;
  const curVal = parseFloat(String(_state.variables[name] ?? 0));

  switch (operation) {
    case "set":
      _state.variables[name] = isNaN(numVal) ? value : numVal;
      break;
    case "add":
      _state.variables[name] = curVal + (numVal || 0);
      break;
    case "subtract":
      _state.variables[name] = curVal - (numVal || 0);
      break;
    case "multiply":
      _state.variables[name] = curVal * (numVal || 0);
      break;
    case "append":
      _state.variables[name] =
        String(_state.variables[name] ?? "") + String(value);
      break;
    default:
      _state.variables[name] = value;
  }
}

// ─── Path ────────────────────────────────────────────────

export function pushPath(nodeId: string): void {
  _state.path.push({
    nodeId,
    timestamp: new Date().toISOString(),
  });

  // Clamp — защита от утечки памяти при GoTo-циклах
  if (_state.path.length > MAX_PATH_LENGTH) {
    _state.path = _state.path.slice(-MAX_PATH_LENGTH);
  }
}

// ─── Misc mutations ──────────────────────────────────────

export function markVisited(nodeId: string): void {
  _state.visitedInteractiveNodes.add(nodeId);
}

export function setCurrentNode(nodeId: string): void {
  _state.currentNodeId = nodeId;
}

export function markResultSaved(): void {
  _state.isResultSaved = true;
}

export function getTimeSince(startTime: number): number {
  return Math.floor((performance.now() - startTime) / 1000);
}
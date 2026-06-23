import type { QuizState, PathEntry } from './types';
import { MAX_PATH_LENGTH } from './constants';

// ===== ЕДИНСТВЕННАЯ ТОЧКА МУТАЦИИ STATE =====

let state: QuizState = createInitialState();

export function createInitialState(): QuizState {
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
    globalTimerInterval: null,
    globalTimeRemaining: 0,
  };
}

export function getState(): Readonly<QuizState> {
  return state;
}

export function resetState(): void {
  state = createInitialState();
}

// ===== Score =====

export function updateScore(operation: string, value: number): void {
  const prev = state.score;
  const v = isNaN(value) ? 0 : value;

  switch (operation) {
    case 'add': state.score += v; break;
    case 'subtract': state.score -= v; break;
    case 'multiply': state.score *= v; break;
    case 'set': state.score = v; break;
    default: state.score += v;
  }

  // Guards
  state.score = Math.max(0, Math.min(state.score, 1_000_000));
  state.score = Math.round(state.score);

  console.debug('[Quiz] Score:', prev, '→', state.score, `(${operation} ${v})`);
}

// ===== Variables =====

export function setVariable(name: string, value: string | number | boolean): void {
  state.variables[name] = value;
}

export function getVariable(name: string): string | number | boolean | undefined {
  return state.variables[name];
}

export function updateVariable(
  name: string,
  operation: string,
  value: string | number,
): void {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const current = parseFloat(String(state.variables[name] ?? 0));

  switch (operation) {
    case 'set': state.variables[name] = isNaN(numValue) ? value : numValue; break;
    case 'add': state.variables[name] = current + (numValue || 0); break;
    case 'subtract': state.variables[name] = current - (numValue || 0); break;
    case 'multiply': state.variables[name] = current * (numValue || 0); break;
    case 'append': {
      const prev = String(state.variables[name] ?? '');
      state.variables[name] = prev + String(value);
      break;
    }
    default: state.variables[name] = value;
  }
}

// ===== Path =====

export function pushPath(nodeId: string): void {
  state.path.push({
    nodeId,
    timestamp: new Date().toISOString(),
  });

  if (state.path.length > MAX_PATH_LENGTH) {
    state.path = state.path.slice(-MAX_PATH_LENGTH);
  }
}

export function markVisited(nodeId: string): void {
  state.visitedInteractiveNodes.add(nodeId);
}

export function setCurrentNode(nodeId: string): void {
  state.currentNodeId = nodeId;
}

export function markResultSaved(): void {
  state.isResultSaved = true;
}

export function addAchievement(title: string): boolean {
  if (state.achievements.includes(title)) return false;
  state.achievements.push(title);
  return true;
}

export function getTimeSince(startTime: number): number {
  return Math.floor((performance.now() - startTime) / 1000);
}

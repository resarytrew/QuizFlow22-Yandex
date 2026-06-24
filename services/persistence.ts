// services/persistence.ts
import { getState, markResultSaved, getTimeSince } from "./state";

interface QuizConfig {
  quizId?: string;
  apiBaseUrl?: string;
}

let _config: QuizConfig = {};
let _sessionId: string | null = null;

export function setQuizConfig(config: QuizConfig): void {
  _config = config;
}

function _getApiBase(): string | null {
  return _config.apiBaseUrl?.replace(/\/$/, "") ?? null;
}

function getSessionId(): string {
  if (_sessionId) return _sessionId;

  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  _sessionId = `anon_${Date.now()}_${random}`;
  return _sessionId;
}

export function saveResults(finalNodeTitle: string): void {
  const state = getState();
  if (!_config.quizId || state.isResultSaved) return;

  markResultSaved();

  const payload = {
    quiz_id: _config.quizId,
    session_id: getSessionId(),
    score: state.score,
    participant_name:
      (state.variables.playerName as string | undefined) ?? "Guest",
    final_node_title: finalNodeTitle,
    results_data: {
      variables: state.variables,
      achievements: state.achievements,
    },
    path_data: state.path,
    time_spent_seconds: getTimeSince(state.startTime),
  };

  const base = _getApiBase();
  if (!base) return;

  fetch(`${base}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export function sendAbandonmentBeacon(): void {
  const state = getState();
  if (state.isResultSaved) return;

  const base = _getApiBase();
  if (!base || !_config.quizId) return;

  const payload = JSON.stringify({
    quiz_id: _config.quizId,
    session_id: getSessionId(),
    score: state.score,
    participant_name:
      (state.variables.playerName as string | undefined) ?? "Guest",
    results_data: {
      variables: state.variables,
      abandoned: true,
      lastNodeId: state.currentNodeId,
    },
    time_spent_seconds: getTimeSince(state.startTime),
  });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(`${base}/results`, payload);
  }
}

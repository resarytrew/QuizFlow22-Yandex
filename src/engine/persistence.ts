import { getState, markResultSaved, getTimeSince } from './state';

// ===== SESSION =====

interface QuizConfig {
  quizId?: string;
  apiBaseUrl?: string;
}

let quizConfig: QuizConfig = {};
let sessionId: string | null = null;

export function setQuizConfig(config: QuizConfig): void {
  quizConfig = config;
}

function getApiBase(): string | null {
  return quizConfig.apiBaseUrl?.replace(/\/$/, '') ?? null;
}

function getSessionId(): string {
  if (sessionId) return sessionId;

  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  sessionId = `anon_${Date.now()}_${random}`;
  return sessionId;
}

// ===== SAVE =====

export function saveResults(finalNodeTitle: string): void {
  const state = getState();
  if (!quizConfig.quizId || state.isResultSaved) return;

  markResultSaved();

  const payload = {
    quiz_id: quizConfig.quizId,
    session_id: getSessionId(),
    score: state.score,
    participant_name: state.variables.playerName ?? 'Guest',
    final_node_title: finalNodeTitle,
    results_data: {
      variables: state.variables,
      achievements: state.achievements,
    },
    path_data: state.path,
    time_spent_seconds: getTimeSince(state.startTime),
  };

  const base = getApiBase();
  if (!base) return;

  fetch(`${base}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

// ===== BEACON (beforeunload) =====

export function sendAbandonmentBeacon(): void {
  const state = getState();
  if (state.isResultSaved) return;

  const base = getApiBase();
  if (!base || !quizConfig.quizId) return;

  const payload = {
    quiz_id: quizConfig.quizId,
    session_id: getSessionId(),
    score: state.score,
    participant_name: state.variables.playerName ?? 'Guest',
    results_data: {
      variables: state.variables,
      abandoned: true,
      lastNodeId: state.currentNodeId,
    },
    time_spent_seconds: getTimeSince(state.startTime),
  };

  // sendBeacon — единственный надёжный способ при закрытии вкладки
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${base}/results`,
      JSON.stringify(payload),
    );
  }
}

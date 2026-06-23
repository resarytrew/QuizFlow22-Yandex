import { getState, markResultSaved, getTimeSince } from './state';

// ===== SESSION =====

interface QuizConfig {
  quizId?: string;
  apiBaseUrl?: string;
}

let quizConfig: QuizConfig = {};

export function setQuizConfig(config: QuizConfig): void {
  quizConfig = config;
}

function getApiBase(): string | null {
  return quizConfig.apiBaseUrl?.replace(/\/$/, '') ?? null;
}

// ===== SAVE =====

export function saveResults(finalNodeTitle: string): void {
  const state = getState();
  if (!quizConfig.quizId || state.isResultSaved) return;

  markResultSaved();

  const payload = {
    quiz_id: quizConfig.quizId,
    score: state.score,
    participant_name: state.variables.playerName ?? 'Guest',
    final_node_title: finalNodeTitle,
    results_data: {
      variables: state.variables,
      achievements: state.achievements,
    },
    path_data: state.path,
    time_spent: getTimeSince(state.startTime),
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
  if (!base) return;

  const payload = {
    quiz_id: quizConfig.quizId,
    score: state.score,
    participant_name: state.variables.playerName ?? 'Guest',
    results_data: {
      variables: state.variables,
      abandoned: true,
      lastNodeId: state.currentNodeId,
    },
    time_spent: getTimeSince(state.startTime),
  };

  // sendBeacon — единственный надёжный способ при закрытии вкладки
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${base}/results`,
      JSON.stringify(payload),
    );
  }
}

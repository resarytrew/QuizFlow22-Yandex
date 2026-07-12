import type { QuizData } from './types';
import { buildIndexes } from './indexing';
import { applyDesign } from './design';
import { setupGlobalTimer } from './globalTimer';
import { setupBackgroundMusic } from './media';
import { processNode } from './navigation';
import { setQuizConfig, sendAbandonmentBeacon } from './persistence';
import { setDesignSettings } from './designState';
import { resetState } from './state';

declare global {
  interface Window {
    quizData?: QuizData;
  }
}

function loadQuizData(): QuizData | null {
  if (window.quizData) return window.quizData;
  const element = document.getElementById("quiz-data");
  if (!element?.textContent) return null;
  try {
    const data = JSON.parse(element.textContent) as QuizData;
    window.quizData = data;
    return data;
  } catch (error) {
    console.error("[Quiz] Failed to parse quiz data", error);
    return null;
  }
}

function init(): void {
  const quizData = loadQuizData();
  if (!quizData) {
    showFatalError('Данные квиза не найдены.');
    return;
  }

  if (!Array.isArray(quizData.nodes) || !Array.isArray(quizData.edges)) {
    showFatalError('Неверная структура данных квиза.');
    return;
  }

  resetState();
  buildIndexes(quizData);
  setDesignSettings(quizData.designSettings);
  setQuizConfig({
    quizId: quizData.quizId,
    apiBaseUrl: quizData.apiBaseUrl,
  });

  if (quizData.currentQuizName) {
    document.title = quizData.currentQuizName;
    const title = document.getElementById("header-title");
    if (title) title.textContent = quizData.currentQuizName;
  }

  if ((quizData.templateId ?? 'default') === 'default') {
    applyDesign(quizData.designSettings);
  }
  setupBackgroundMusic(quizData.designSettings);
  const stopGlobalTimer = setupGlobalTimer(quizData.globalTimer, processNode);

  let startId = quizData.startNodeId;
  if (!startId) {
    const startNode = quizData.nodes.find((node) => node.type === 'startNode');
    if (startNode) startId = startNode.id;
  }

  if (!startId) {
    showFatalError('Стартовый узел не найден.');
    return;
  }

  processNode(startId);

  window.addEventListener('beforeunload', () => {
    stopGlobalTimer();
    sendAbandonmentBeacon();
  });
}

function showFatalError(message: string): void {
  const body = document.body;
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "max-width:480px",
    "margin:80px auto",
    "padding:2rem",
    "text-align:center",
    "font-family:system-ui,sans-serif",
    "color:#1f2937",
  ].join(";");

  const title = document.createElement("h2");
  title.style.cssText = "color:#b91c1c;margin-bottom:1rem";
  title.textContent = "Ошибка загрузки";

  const copy = document.createElement("p");
  copy.textContent = message;

  wrap.append(title, copy);
  body.replaceChildren(wrap);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

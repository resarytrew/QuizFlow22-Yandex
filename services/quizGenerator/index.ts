/**
 * @module quizGenerator
 *
 * Публичный API для генерации standalone HTML квизов.
 *
 * Генератор берёт:
 * - Данные квиза (nodes, edges, settings)
 * - HTML-шаблон (по templateId)
 * - JS-движок (quizEngineScript)
 * - CSS (скомпилированный Tailwind)
 * - Supabase-конфиг (из env)
 *
 * И собирает из них один self-contained HTML-файл,
 * который можно открыть в любом браузере без сервера.
 *
 * @example
 * ```ts
 * import { generateQuizHtml } from './services/quizGenerator';
 *
 * const html = generateQuizHtml({
 *   nodes: [...],
 *   edges: [...],
 *   templateId: 'science',
 *   quizId: 'abc-123',
 * });
 *
 * // Скачать как файл
 * const blob = new Blob([html], { type: 'text/html' });
 * ```
 */

import type { GenerateQuizHtmlInput, QuizPayload } from "./types";
import type { QuizTemplateId } from "../../types";
import { DEFAULT_GLOBAL_TIMER, DEFAULT_TEMPLATE_ID } from "./types";
import { getApiBaseUrl, getApiOrigin } from "./env";
import { serializeForHtmlScript } from "./serialize";
import { renderTemplate } from "./renderTemplate";
import { injectCsp } from "./csp";
import { inlineTailwind } from "./inlineTailwind";
import { buildFallbackHtml } from "./fallbackHtml";
import { normalizeLegacyArgs } from "./normalizeInput";
import { injectDesignCss } from "./designCss";

import { quizEngineScript } from "../quizEngine";
import { getTemplateById } from "../templates/index";

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Генерирует standalone HTML-квиз из типизированного input.
 *
 * Это основная точка входа. Новый код должен вызывать эту функцию.
 *
 * @param options.preview — режим live preview (srcdoc iframe).
 *   В этом режиме движок подключается как `<script type="module" src="/__quiz_engine.js">`
 *   (внешний, same-origin), а данные — как `<script type="application/json">`.
 *   Inline-скриптов нет — это совместимо со строгим родительским CSP
 *   (без `unsafe-inline`). По умолчанию `false` — self-contained standalone HTML.
 *
 * @throws Никогда не бросает — возвращает fallback HTML при любой ошибке.
 */
export function generateQuizHtml(
  input: GenerateQuizHtmlInput,
  options: { preview?: boolean } = {},
): string {
  try {
    return generateUnsafe(input, options);
  } catch (error) {
    console.error("[quizGenerator] Generation failed:", error);

    const detail =
      error instanceof Error ? error.message : "Неизвестная ошибка";

    return buildFallbackHtml("Ошибка: не удалось сгенерировать квиз", detail);
  }
}

/**
 * Backward-compatible обёртка для legacy-вызовов.
 *
 * Поддерживает:
 * - Объект `{ nodes, edges, ... }` (рекомендуется)
 * - Позиционные аргументы `(nodes, edges, timer, ...)` (deprecated)
 *
 * Опциональный второй аргумент `options` пробрасывается в `generateQuizHtml`.
 * Это нужно, чтобы in-app превью (Header / QuizCard / QuizPlayer) могли
 * сгенерировать preview-режим, где движок подключается как
 * `<script type="module" src="/__quiz_engine.js">` — это совместимо со
 * строгой родительской CSP `script-src 'self'`. Inline-движок
 * (standalone-режим по умолчанию) блокируется в srcdoc-iframe под
 * `script-src 'self'`, и пользователь видит пустой шаблон.
 *
 * @deprecated Используйте `generateQuizHtml({ nodes, edges, ... }, options)` напрямую.
 */
export function generateQuizHtmlProgrammatically(
  ...args: unknown[]
): string {
  const hasOptions =
    args.length >= 2 && typeof args[args.length - 1] === "object";
  const options = hasOptions
    ? (args[args.length - 1] as { preview?: boolean })
    : {};
  const payloadArgs = hasOptions ? args.slice(0, -1) : args;
  const input = normalizeLegacyArgs(payloadArgs);
  return generateQuizHtml(input, options);
}

// ─── Core Logic ──────────────────────────────────────────────────────

function generateUnsafe(
  input: GenerateQuizHtmlInput,
  options: { preview?: boolean } = {},
): string {
  // 1. Валидация
  validateInput(input);

  // 2. Получаем шаблон
  const templateId = input.templateId ?? DEFAULT_TEMPLATE_ID;
  const templateHtml = resolveTemplate(templateId);

  // 3. Собираем payload
  const payload = buildPayload(input);

  // 4. Сериализуем данные
  const quizDataJson = serializeForHtmlScript(payload);

  // 5. Подготавливаем скрипт движка
  const engineScript = prepareEngineScript(quizDataJson);

  // 6. Рендерим шаблон
  let html = renderTemplate(templateHtml, quizDataJson, engineScript, {
    preview: options.preview,
    injectEngine: templateId !== "screenQuiz",
  });

  // 7. Post-processing: CSS + CSP.
  //
  //    В preview-режиме iframe встраивается в родительскую страницу
  //    с `sandbox="allow-scripts allow-same-origin"`. Браузер intersect'ит
  //    родительский CSP с iframe-meta CSP, причём итог — это
  //    ОБЪЕДИНЕНИЕ ограничений (более строгий выигрывает). Если мы
  //    инжектим iframe meta с `unsafe-inline` и CDN-доменами, это
  //    ничего не даст: родительский `script-src 'self'` всё равно
  //    заблокирует inline-скрипты и CDN-скрипты. И наоборот — это
  //    НЕ навредит безопасности preview. Но мы всё равно не инжектим
  //    iframe CSP в preview: external CDN-скрипты в шаблонах
  //    (cdn.jsdelivr.net, cdnjs.cloudflare.com) НЕ нужны движку
  //    (он gracefully handles missing supabase / mathjs), и их
  //    присутствие в iframe только замусорит консоль CSP-ошибками.
  html = inlineTailwind(html);
  if (templateId === DEFAULT_TEMPLATE_ID || templateId === "importantTalks") {
    html = injectDesignCss(html, input.designSettings);
  }
  if (!options.preview) {
    html = injectCsp(html, getApiOrigin());
  }

  return html;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function validateInput(input: GenerateQuizHtmlInput): void {
  if (!Array.isArray(input.nodes)) {
    throw new Error(
      `[quizGenerator] "nodes" must be an array, got ${typeof input.nodes}`,
    );
  }
  if (!Array.isArray(input.edges)) {
    throw new Error(
      `[quizGenerator] "edges" must be an array, got ${typeof input.edges}`,
    );
  }
}

function resolveTemplate(templateId: string): string {
  const template = getTemplateById(templateId as QuizTemplateId);

  if (typeof template !== "string") {
    throw new Error(
      `[quizGenerator] Template "${templateId}" must return a string, ` +
        `got ${typeof template}`,
    );
  }

  if (template.length === 0) {
    throw new Error(`[quizGenerator] Template "${templateId}" is empty`);
  }

  return template;
}

function buildPayload(input: GenerateQuizHtmlInput): QuizPayload {
  return {
    nodes: input.nodes,
    edges: input.edges,
    globalTimer: input.globalTimer ?? DEFAULT_GLOBAL_TIMER,
    designSettings: input.designSettings,
    quizId: input.quizId ?? null,
    templateId: input.templateId ?? DEFAULT_TEMPLATE_ID,
    currentQuizName: input.currentQuizName ?? "",
    startNodeId: input.startNodeId,
    apiBaseUrl: getApiBaseUrl(),
  };
}

/**
 * Подставляет сериализованные данные квиза в скрипт движка.
 *
 * Движок ожидает placeholder `%%QUIZ_DATA_JSON%%` — при сборке через Rollup
 * этот placeholder встраивается в IIFE.
 * Если placeholder отсутствует — скрипт используется as-is
 * (данные будут прочитаны движком из <script type="application/json">).
 */
function prepareEngineScript(quizDataJson: string): string {
  const script = String(quizEngineScript);

  if (script.includes("%%QUIZ_DATA_JSON%%")) {
    return script.replace(/%%QUIZ_DATA_JSON%%/g, quizDataJson);
  }

  // Движок читает данные из DOM самостоятельно
  return script;
}

/**
 * @module quizGenerator/normalizeInput
 *
 * Преобразует legacy-вызов с позиционными аргументами
 * в типизированный GenerateQuizHtmlInput.
 *
 * Legacy-сигнатура (до рефакторинга):
 *   generateQuizHtml(nodes, edges, globalTimer, designSettings,
 *                    quizId, templateId, currentQuizName, startNodeId)
 *
 * Новая сигнатура:
 *   generateQuizHtml({ nodes, edges, ... })
 *
 * Этот модуль существует ТОЛЬКО для backward compatibility.
 * Новый код должен использовать объектную сигнатуру напрямую.
 *
 * @deprecated Позиционная сигнатура. Используйте объектную.
 */

import type { GenerateQuizHtmlInput, GlobalTimer } from "./types";
import { DEFAULT_GLOBAL_TIMER, DEFAULT_TEMPLATE_ID } from "./types";
import type { QuizTemplateId } from "../../types";

/**
 * Нормализует произвольные аргументы в типизированный input.
 *
 * Поддерживает три формата вызова:
 * 1. Один объект с полями `{ nodes, edges, ... }`
 * 2. Позиционные аргументы `(nodes, edges, timer, design, ...)`
 * 3. Пустой вызов → пустой квиз
 */
export function normalizeLegacyArgs(
  args: readonly unknown[],
): GenerateQuizHtmlInput {
  // Формат 1: единственный объект-payload
  if (args.length === 1 && isPayloadObject(args[0])) {
    return extractFromPayload(args[0] as Record<string, unknown>);
  }

  // Формат 2: позиционные аргументы
  return extractFromPositional(args);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isPayloadObject(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.nodes) || Array.isArray(obj.edges);
}

function extractFromPayload(
  payload: Record<string, unknown>,
): GenerateQuizHtmlInput {
  return {
    nodes: toArray(payload.nodes),
    edges: toArray(payload.edges),
    globalTimer: toGlobalTimer(payload.globalTimer),
    designSettings: toRecord(payload.designSettings),
    quizId: toNullableString(payload.quizId),
    templateId: toTemplateId(payload.templateId),
    currentQuizName: toString(
      payload.currentQuizName ?? payload.name ?? "",
    ),
    startNodeId: toOptionalString(payload.startNodeId),
    previewBridge: toPreviewBridge(payload.previewBridge),
  };
}

function extractFromPositional(
  args: readonly unknown[],
): GenerateQuizHtmlInput {
  return {
    nodes: toArray(args[0]),
    edges: toArray(args[1]),
    globalTimer: toGlobalTimer(args[2]),
    designSettings: toRecord(args[3]),
    quizId: toNullableString(args[4]),
    templateId: toTemplateId(args[5]),
    currentQuizName: toString(args[6] ?? ""),
    startNodeId: toOptionalString(args[7]),
  };
}

// ─── Type Coercions ──────────────────────────────────────────────────

function toArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function toGlobalTimer(value: unknown): GlobalTimer {
  if (!value || typeof value !== "object") return DEFAULT_GLOBAL_TIMER;
  const obj = value as Record<string, unknown>;
  return {
    enabled: Boolean(obj.enabled),
    duration: typeof obj.duration === "number" ? obj.duration : 0,
    onTimeoutNodeId:
      typeof obj.onTimeoutNodeId === "string" ? obj.onTimeoutNodeId : null,
  };
}

function toRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toOptionalString(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toTemplateId(value: unknown): QuizTemplateId {
  if (typeof value === "string" && value.length > 0) {
    return value as QuizTemplateId;
  }
  return DEFAULT_TEMPLATE_ID;
}

function toPreviewBridge(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  return obj.enabled === true && obj.version === 1
    ? { enabled: true, version: 1 as const }
    : undefined;
}

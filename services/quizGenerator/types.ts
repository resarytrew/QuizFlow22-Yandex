/**
 * @module quizGenerator/types
 * Единственный источник истины для типов генератора HTML.
 * Импортируется всеми модулями пакета.
 */

import type { QuizTemplateId } from "../../types";

// ─── Input ───────────────────────────────────────────────────────────

/** Типизированный вход для генератора. Все поля — с безопасными дефолтами. */
export interface GenerateQuizHtmlInput {
  readonly nodes: readonly unknown[];
  readonly edges: readonly unknown[];
  readonly globalTimer?: GlobalTimer;
  readonly designSettings?: Readonly<Record<string, unknown>>;
  readonly quizId?: string | null;
  readonly templateId?: QuizTemplateId;
  readonly currentQuizName?: string;
  readonly startNodeId?: string;
}

export interface GlobalTimer {
  readonly enabled: boolean;
  readonly duration: number;
  readonly onTimeoutNodeId: string | null;
}

// ─── Internal ────────────────────────────────────────────────────────

/** Полный payload, сериализуемый в JSON и передаваемый движку. */
export interface QuizPayload extends GenerateQuizHtmlInput {
  readonly apiBaseUrl?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_GLOBAL_TIMER: GlobalTimer = Object.freeze({
  enabled: false,
  duration: 0,
  onTimeoutNodeId: null,
});

export const DEFAULT_TEMPLATE_ID: QuizTemplateId = "default";

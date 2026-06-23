
// services/openRouterClient.ts
// Calls AI through backend proxy — API keys are never exposed to the client.

import { chatCompletion, chatCompletionStream } from './aiProxy';

/**
 * Модели для разных задач
 */
export const AI_MODEL_TEXT = 'openai/gpt-4o-mini';      // Дешёвая для текста/идей
export const AI_MODEL_JSON = 'google/gemini-3-flash-preview';           // Лучшая для JSON
export const AI_MODEL = AI_MODEL_TEXT;                        // Дефолтная (для обратной совместимости)

type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type StreamCallbacks = {
  onToken?: (token: string) => void;
  onError?: (err: unknown) => void;
};

/**
 * Основной вызов AI через прокси.
 * Сетевые/HTTP-ошибки нормализуются в дружелюбные сообщения.
 */
export async function callOpenRouter(
  model: string,
  prompt: string,
  expectJson: boolean = false,
  signal?: AbortSignal
): Promise<string> {
  try {
    const content = await chatCompletion(model, prompt, expectJson, signal);
    if (!content) throw new Error('Received an empty response from the AI model.');
    return content;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    if (error?.name === 'TypeError' && error?.message === 'Failed to fetch') {
      throw new Error('Ошибка сети. Сервер AI недоступен.');
    }
    throw error;
  }
}

/**
 * Streaming-версия для real-time отображения токенов
 */
export async function callOpenRouterStream(
  model: string,
  prompt: string,
  callbacks: StreamCallbacks,
  options?: {
    expectJson?: boolean;
    signal?: AbortSignal;
    temperature?: number;
  }
): Promise<string> {
  return chatCompletionStream(model, prompt, callbacks, options);
}

// =====================================================
// JSON extraction + repair utilities
// =====================================================

export function extractFirstJsonObject(text: string): string | null {
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  let inStr = false;
  let escape = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }

    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return clean.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

export function extractJsonArray(text: string): string | null {
  const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  let inStr = false;
  let escape = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }

    if (ch === '"') { inStr = true; continue; }
    if (ch === '[') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === ']') {
      depth--;
      if (depth === 0 && start !== -1) {
        return clean.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

export async function repairJsonViaOpenRouter(badText: string, signal?: AbortSignal): Promise<string | null> {
  const prompt = `Fix this JSON. Return ONLY valid JSON object.
Rules:
- Double quotes for keys/strings
- Remove comments, trailing commas
- Keep structure intact

Input:
${badText.slice(0, 8000)}`;

  try {
    const fixed = await callOpenRouter(AI_MODEL_JSON, prompt, true, signal);
    return extractFirstJsonObject(fixed);
  } catch {
    return null;
  }
}

export async function parseJsonWithRepair<T = any>(
  rawText: string,
  signal?: AbortSignal
): Promise<{ data: T; jsonText: string; repaired: boolean }> {
  const extracted = extractFirstJsonObject(rawText) ?? rawText;

  try {
    return { data: JSON.parse(extracted) as T, jsonText: extracted, repaired: false };
  } catch {
    const repaired = await repairJsonViaOpenRouter(rawText, signal);
    if (repaired) {
      try {
        return { data: JSON.parse(repaired) as T, jsonText: repaired, repaired: true };
      } catch {}
    }
    throw new Error('Не удалось распарсить JSON.');
  }
}

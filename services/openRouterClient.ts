// services/openRouterClient.ts
// Calls AI through a backend proxy. API keys must never be exposed to the client.

import { chatCompletion, chatCompletionStream } from './aiProxy';

export const AI_MODEL_TEXT = 'openai/gpt-4o-mini';
export const AI_MODEL_JSON = 'google/gemini-3-flash-preview';
export const AI_MODEL = AI_MODEL_TEXT;

type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type StreamCallbacks = {
  onToken?: (token: string) => void;
  onError?: (err: unknown) => void;
};

export async function callOpenRouter(
  model: string,
  prompt: string,
  expectJson: boolean = false,
  signal?: AbortSignal,
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

export async function callOpenRouterStream(
  model: string,
  prompt: string,
  callbacks: StreamCallbacks,
  options?: {
    expectJson?: boolean;
    signal?: AbortSignal;
    temperature?: number;
  },
): Promise<string> {
  return chatCompletionStream(model, prompt, callbacks, options);
}

export function extractFirstJsonObject(text: string): string | null {
  const clean = stripJsonMarkdown(text);
  return extractBalancedJson(clean, '{', '}');
}

export function extractJsonArray(text: string): string | null {
  const clean = stripJsonMarkdown(text);
  return extractBalancedJson(clean, '[', ']');
}

function extractBalancedJson(text: string, open: '{' | '[', close: '}' | ']'): string | null {
  let inStr = false;
  let escape = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }

    if (ch === '"') {
      inStr = true;
      continue;
    }

    if (ch === open) {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === close) {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function stripJsonMarkdown(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json|javascript|js)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractFirstJsonValue(text: string): string | null {
  const objectJson = extractFirstJsonObject(text);
  const arrayJson = extractJsonArray(text);

  if (!objectJson) return arrayJson;
  if (!arrayJson) return objectJson;

  const clean = stripJsonMarkdown(text);
  const objectIndex = clean.indexOf(objectJson);
  const arrayIndex = clean.indexOf(arrayJson);
  return arrayIndex !== -1 && arrayIndex < objectIndex ? arrayJson : objectJson;
}

function stripJsonComments(text: string): string {
  let out = '';
  let inStr = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inStr) {
      out += ch;
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }

    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }

    out += ch;
  }

  return out;
}

function normalizeLikelyJson(text: string): string {
  return stripJsonComments(stripJsonMarkdown(text))
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function tryParseJson<T>(text: string): { data: T; jsonText: string } | null {
  const candidates = [
    text,
    stripJsonMarkdown(text),
    extractFirstJsonValue(text),
    normalizeLikelyJson(text),
    extractFirstJsonValue(normalizeLikelyJson(text)),
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const jsonText = candidate.trim();
    if (seen.has(jsonText)) continue;
    seen.add(jsonText);

    try {
      return { data: JSON.parse(jsonText) as T, jsonText };
    } catch {}
  }

  return null;
}

export async function repairJsonViaOpenRouter(badText: string, signal?: AbortSignal): Promise<string | null> {
  const prompt = `Fix this JSON. Return ONLY valid JSON.
Rules:
- Double quotes for keys/strings
- Remove comments, trailing commas
- Keep structure intact
- Do not add Markdown fences

Input:
${badText.slice(0, 12000)}`;

  try {
    const fixed = await callOpenRouter(AI_MODEL_JSON, prompt, true, signal);
    return extractFirstJsonValue(fixed) ?? normalizeLikelyJson(fixed);
  } catch {
    return null;
  }
}

export async function parseJsonWithRepair<T = any>(
  rawText: string,
  signal?: AbortSignal,
): Promise<{ data: T; jsonText: string; repaired: boolean }> {
  const parsed = tryParseJson<T>(rawText);
  if (parsed) return { ...parsed, repaired: false };

  const repaired = await repairJsonViaOpenRouter(rawText, signal);
  if (repaired) {
    const parsedRepair = tryParseJson<T>(repaired);
    if (parsedRepair) return { ...parsedRepair, repaired: true };
  }

  const preview = stripJsonMarkdown(rawText).slice(0, 240);
  console.error('[AI JSON] Failed to parse response preview:', preview);
  throw new Error('Не удалось распарсить JSON. Ответ AI был неполным или невалидным.');
}

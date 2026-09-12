import { api } from "./apiClient";

function resolveProxyUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  if (typeof apiUrl === "string" && apiUrl.length > 0) {
    return `${apiUrl.replace(/\/$/, "")}/ai-proxy`;
  }
  return "/api";
}

const PROXY_URL = resolveProxyUrl();

export async function generateImage(
  prompt: string,
  type: "node" | "background" = "node",
): Promise<string> {
  if (!PROXY_URL) throw new Error("VITE_API_URL is not configured");
  const response = await fetch(`${PROXY_URL}/generate-image`, {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, type }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed to generate image" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.imageUrl;
}

export async function chatCompletion(
  model: string,
  prompt: string,
  expectJson: boolean = false,
  signal?: AbortSignal,
): Promise<string> {
  const payload = {
    model,
    prompt,
    type: expectJson ? 'json' as const : 'text' as const,
    expectJson,
  };

  if (import.meta.env.DEV) {
    const response = await fetch('/api/ai-proxy', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.result;
  }

  const result = await api.aiProxy(payload, signal);
  return result.result;
}

export async function chatCompletionStream(
  model: string,
  prompt: string,
  callbacks: {
    onToken?: (token: string) => void;
    onError?: (err: unknown) => void;
  },
  options?: {
    expectJson?: boolean;
    signal?: AbortSignal;
    temperature?: number;
  },
): Promise<string> {
  try {
    const full = await chatCompletion(model, prompt, options?.expectJson ?? false, options?.signal);
    callbacks.onToken?.(full);
    return full;
  } catch (err) {
    callbacks.onError?.(err);
    throw err;
  }
}

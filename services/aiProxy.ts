import { supabase } from "./supabaseClient";
import { api } from "./apiClient";

function resolveProxyUrl(): string {
  const apiUrl = (import.meta as any).env && (import.meta as any).env.VITE_API_URL;
  if (typeof apiUrl === "string" && apiUrl.length > 0) {
    return `${apiUrl.replace(/\/$/, "")}/ai-proxy`;
  }
  return "";
}

const PROXY_URL = resolveProxyUrl();

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!supabase) return headers;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch (error) {
    console.warn("[aiProxy] Failed to read auth session:", error);
  }
  return headers;
}

export async function generateImage(
  prompt: string,
  type: "node" | "background" = "node",
): Promise<string> {
  if (!PROXY_URL) throw new Error("VITE_API_URL is not configured");
  const headers = await buildAuthHeaders();
  const response = await fetch(`${PROXY_URL}/generate-image`, {
    method: "POST",
    headers,
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
    type: expectJson ? 'json' : 'text',
    expectJson,
  };

  if (import.meta.env.DEV) {
    const response = await fetch('/api/ai-proxy', {
      method: 'POST',
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

// Читаем env один раз — Vite заменяет эти вызовы статически
const _apiUrl = import.meta.env.VITE_API_URL ?? "";

/**
 * Принимает опциональный override для тестирования.
 * В продакшне использует import.meta.env.
 */
export function getApiBaseUrl(
  overrides?: { apiUrl?: string },
): string | undefined {
  const apiUrl = (overrides?.apiUrl ?? _apiUrl).trim().replace(/\/$/, "");
  return apiUrl || undefined;
}

export function getApiOrigin(
  overrides?: { apiUrl?: string },
): string {
  const apiUrl = (overrides?.apiUrl ?? _apiUrl).trim();
  if (!apiUrl) return "";

  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

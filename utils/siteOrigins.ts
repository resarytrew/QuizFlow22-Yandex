const DEFAULT_PRIMARY_SITE_ORIGIN = 'https://mykviz.ru';
const DEFAULT_ADDITIONAL_SITE_ORIGINS = 'https://mykviz.online';

export interface SiteOriginConfig {
  primaryOrigin: string;
  additionalOrigins: readonly string[];
}

export function normalizeSiteOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function createSiteOriginConfig(
  primaryValue: string | undefined,
  additionalValue: string | undefined,
): SiteOriginConfig {
  const primaryOrigin =
    normalizeSiteOrigin(primaryValue) ?? DEFAULT_PRIMARY_SITE_ORIGIN;
  const additionalOrigins = (additionalValue ?? '')
    .split(',')
    .map((value) => normalizeSiteOrigin(value))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) =>
      value !== primaryOrigin && values.indexOf(value) === index
    );

  return { primaryOrigin, additionalOrigins };
}

export function resolveSiteOrigin(
  currentOrigin: string,
  config: SiteOriginConfig,
  allowLocalDevelopment = false,
): string {
  const normalizedCurrent = normalizeSiteOrigin(currentOrigin);
  if (!normalizedCurrent) return config.primaryOrigin;

  if (
    normalizedCurrent === config.primaryOrigin ||
    config.additionalOrigins.includes(normalizedCurrent)
  ) {
    return normalizedCurrent;
  }

  if (allowLocalDevelopment) {
    const hostname = new URL(normalizedCurrent).hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return normalizedCurrent;
    }
  }

  return config.primaryOrigin;
}

export const siteOriginConfig = createSiteOriginConfig(
  import.meta.env.VITE_PRIMARY_SITE_URL,
  import.meta.env.VITE_ADDITIONAL_SITE_ORIGINS ??
    DEFAULT_ADDITIONAL_SITE_ORIGINS,
);

export function getAuthRedirectOrigin(): string {
  return resolveSiteOrigin(
    window.location.origin,
    siteOriginConfig,
    Boolean(import.meta.env.DEV),
  );
}

export function getAuthCallbackRedirectUrl(): string {
  return `${getAuthRedirectOrigin()}/#/auth/confirm`;
}

export function getPasswordResetRedirectUrl(): string {
  const origin = resolveSiteOrigin(
    window.location.origin,
    siteOriginConfig,
    false,
  );
  return `${origin}/#/auth/reset-password`;
}

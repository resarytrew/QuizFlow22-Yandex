import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';

type AcquisitionKind = 'ai' | 'search' | 'direct' | 'referral';

const AI_HOSTS = ['chatgpt.com', 'perplexity.ai', 'copilot.microsoft.com', 'gemini.google.com', 'claude.ai'];
const SEARCH_HOSTS = ['google.', 'yandex.', 'bing.com', 'duckduckgo.com', 'mail.ru'];

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

export function classifyReferrer(referrer: string): AcquisitionKind {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (AI_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))) return 'ai';
    if (SEARCH_HOSTS.some((candidate) => host.includes(candidate))) return 'search';
    return 'referral';
  } catch {
    return 'direct';
  }
}

function acquisitionData() {
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }
  return {
    acquisition: classifyReferrer(document.referrer),
    referrer_host: referrerHost,
    utm_source: params.get('utm_source') ?? '',
    utm_medium: params.get('utm_medium') ?? '',
    utm_campaign: params.get('utm_campaign') ?? '',
  };
}

export default function SeoAnalytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const metrikaId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID || 0);
  const initialized = useRef(false);
  const firstRoute = useRef(true);

  useEffect(() => {
    const acquisition = acquisitionData();
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: 'potok_acquisition', ...acquisition });

    if (!metrikaId || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    if (document.querySelector('script[data-potok-metrika]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.dataset.potokMetrika = 'true';
    script.onload = () => {
      window.ym?.(metrikaId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false,
      });
      window.ym?.(metrikaId, 'params', acquisition);
      initialized.current = true;
    };
    document.head.appendChild(script);
  }, [metrikaId]);

  useEffect(() => {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: 'potok_page_view', page_path: pathname });
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (initialized.current && metrikaId) {
      window.ym?.(metrikaId, 'hit', window.location.href, {
        title: document.title,
        referer: document.referrer,
      });
    }
  }, [metrikaId, pathname]);

  return null;
}

import { createHash } from 'node:crypto';

const INLINE_SCRIPT_RE =
  /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

export function getInlineScriptCspSources(html: string): string[] {
  return Array.from(html.matchAll(INLINE_SCRIPT_RE), ([, script]) => {
    const digest = createHash('sha256').update(script).digest('base64');
    return `'sha256-${digest}'`;
  });
}

export function replaceInlineScriptCspMarker(
  html: string,
  marker: string,
): string {
  return html.replace(marker, getInlineScriptCspSources(html).join(' '));
}

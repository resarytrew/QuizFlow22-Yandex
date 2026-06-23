import { useEffect } from 'react';
import { usePreferencesStore } from '../store/usePreferencesStore';

const SIZE_MAP: Record<string, string> = {
  sm: '12rem',
  md: '14rem',
  lg: '16rem',
};

const RADIUS_MAP: Record<string, string> = {
  sharp: '0.5rem',
  soft: '1rem',
  rounded: '1.5rem',
};

const SHADOW_MAP: Record<number, string> = {
  0: 'none',
  1: '0 1px 2px rgba(0,0,0,0.06)',
  2: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
  3: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
};

const FONT_MAP: Record<string, string> = {
  inter: '"Inter", system-ui, -apple-system, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
};

const ACCENT_PALETTE: Record<string, { 50: string; 100: string; 500: string; 600: string; 700: string; 900: string }> = {
  '#6366f1': { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
  '#0ea5e9': { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 900: '#0c4a6e' },
  '#10b981': { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b' },
  '#f43f5e': { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' },
  '#a855f7': { 50: '#faf5ff', 100: '#f3e8ff', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 900: '#581c87' },
  '#f59e0b': { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 900: '#78350f' },
};

const DEFAULT_ACCENT = '#6366f1';

function getEffectiveTheme(theme: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (theme === 'auto') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

function systemPrefersReduceMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useApplyPreferencesToDom(): void {
  const prefs = usePreferencesStore((s) => s.preferences);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    root.style.setProperty('--node-width', SIZE_MAP[prefs.nodeSize] ?? SIZE_MAP.md);
    root.style.setProperty('--node-padding', prefs.compactMode ? '0.5rem' : '1rem');
    root.style.setProperty('--node-radius', RADIUS_MAP[prefs.borderRadius] ?? RADIUS_MAP.soft);
    root.style.setProperty('--editor-font', FONT_MAP[prefs.fontFamily] ?? FONT_MAP.inter);
    root.style.setProperty('--editor-accent', prefs.accentColor);

    const accentKey = prefs.accentColor.toLowerCase();
    const palette = ACCENT_PALETTE[accentKey] ?? ACCENT_PALETTE[DEFAULT_ACCENT];
    root.style.setProperty('--accent-50', palette[50]);
    root.style.setProperty('--accent-100', palette[100]);
    root.style.setProperty('--accent-500', palette[500]);
    root.style.setProperty('--accent-600', palette[600]);
    root.style.setProperty('--accent-700', palette[700]);
    root.style.setProperty('--accent-900', palette[900]);
    root.style.setProperty('--editor-primary', prefs.accentColor);
    root.style.setProperty('--editor-primary-hover', palette[500]);

    root.setAttribute('data-theme', getEffectiveTheme(prefs.theme));

    const sysReduce = systemPrefersReduceMotion();
    const reduceMotion = prefs.reduceMotion || prefs.simplified || sysReduce;
    const minimizeEffects = prefs.minimizeEffects || reduceMotion;
    root.style.setProperty(
      '--editor-shadow',
      minimizeEffects ? 'none' : (SHADOW_MAP[prefs.shadowIntensity] ?? SHADOW_MAP[2]),
    );

    const classes: ReadonlyArray<readonly [string, boolean]> = [
      ['pref-no-anim', !prefs.nodeAnimations || reduceMotion],
      ['pref-no-shadow', !prefs.nodeShadows || minimizeEffects],
      ['pref-no-icons', !prefs.showNodeIcons],
      ['pref-no-badges', !prefs.showNodeBadges],
      ['pref-no-descriptions', !prefs.showNodeDescriptions],
      ['pref-compact', prefs.compactMode],
      ['pref-reduce-motion', reduceMotion],
      ['pref-minimal', minimizeEffects],
      ['pref-simplified', prefs.simplified],
    ];

    classes.forEach(([name, on]) => {
      root.classList.toggle(name, Boolean(on));
    });
  }, [prefs]);
}

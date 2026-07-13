import type { DesignSettings } from '../../types';
import {
  createLayoutDocumentPatch,
  resolveLayoutDocument,
  resolveLayoutDocumentForBreakpoint,
  type LayoutBreakpoint,
  type LayoutDocument,
  type LayoutElementOverride,
  type LayoutScopeContext,
} from './layoutDocument';

export type PreviewSafeAreaPreset = 'browser' | 'telegram' | 'max' | 'mobile-browser' | 'keyboard';

export interface PreviewViewport {
  width: number;
  height: number;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEVICE_VIEWPORTS: Record<LayoutBreakpoint, PreviewViewport> = {
  desktop: { width: 1280, height: 820 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

export const SAFE_AREA_PRESETS: Record<PreviewSafeAreaPreset, SafeAreaInsets> = {
  browser: { top: 0, right: 0, bottom: 0, left: 0 },
  telegram: { top: 64, right: 0, bottom: 24, left: 0 },
  max: { top: 56, right: 0, bottom: 24, left: 0 },
  'mobile-browser': { top: 48, right: 0, bottom: 84, left: 0 },
  keyboard: { top: 48, right: 0, bottom: 320, left: 0 },
};

export function getPreviewViewport(
  device: LayoutBreakpoint | 'custom' | 'fullscreen',
  customSize?: PreviewViewport,
): PreviewViewport {
  if (device === 'custom') {
    return {
      width: Math.min(3840, Math.max(320, Math.round(customSize?.width ?? 1024))),
      height: Math.min(3840, Math.max(320, Math.round(customSize?.height ?? 720))),
    };
  }
  if (device === 'fullscreen') return DEVICE_VIEWPORTS.desktop;
  return DEVICE_VIEWPORTS[device];
}

export function getPreviewOrientation(viewport: PreviewViewport): 'landscape' | 'portrait' {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait';
}

export function createBreakpointElementOverridePatch(
  settings: DesignSettings,
  context: LayoutScopeContext,
  breakpoint: Exclude<LayoutBreakpoint, 'desktop'>,
  elementId: string,
  override: LayoutElementOverride,
): ReturnType<typeof createLayoutDocumentPatch> | null {
  const document = resolveLayoutDocument(settings, context);
  if (!document) return null;
  const next: LayoutDocument = {
    ...document,
    breakpoints: {
      ...(document.breakpoints ?? {}),
      [breakpoint]: {
        elements: {
          ...(document.breakpoints?.[breakpoint]?.elements ?? {}),
          [elementId]: {
            ...(document.breakpoints?.[breakpoint]?.elements?.[elementId] ?? {}),
            ...override,
            ...(override.frame ? {
              frame: {
                ...(document.breakpoints?.[breakpoint]?.elements?.[elementId]?.frame ?? {}),
                ...override.frame,
              },
            } : {}),
            ...(override.constraints ? {
              constraints: {
                ...(document.breakpoints?.[breakpoint]?.elements?.[elementId]?.constraints ?? {}),
                ...override.constraints,
              },
            } : {}),
          },
        },
      },
    },
  };
  return createLayoutDocumentPatch(settings, context, next);
}

export function createCopyDesktopLayoutPatch(
  settings: DesignSettings,
  context: LayoutScopeContext,
  breakpoint: Exclude<LayoutBreakpoint, 'desktop'>,
): ReturnType<typeof createLayoutDocumentPatch> | null {
  const document = resolveLayoutDocument(settings, context);
  if (!document) return null;
  const elements = Object.fromEntries(
    Object.entries(document.elements).map(([id, element]) => [
      id,
      {
        frame: { ...element.frame },
        constraints: { ...element.constraints },
        positionMode: element.positionMode,
        ...(element.order !== undefined ? { order: element.order } : {}),
        ...(element.zIndex !== undefined ? { zIndex: element.zIndex } : {}),
      },
    ]),
  );
  return createLayoutDocumentPatch(settings, context, {
    ...document,
    breakpoints: {
      ...(document.breakpoints ?? {}),
      [breakpoint]: { elements },
    },
  });
}

export function createAutoAdaptLayoutPatch(
  settings: DesignSettings,
  context: LayoutScopeContext,
  breakpoint: Exclude<LayoutBreakpoint, 'desktop'>,
  viewport = DEVICE_VIEWPORTS[breakpoint],
): ReturnType<typeof createLayoutDocumentPatch> | null {
  const document = resolveLayoutDocument(settings, context);
  if (!document) return null;
  const source = resolveLayoutDocumentForBreakpoint(document, breakpoint === 'mobile' ? 'tablet' : 'desktop');
  const base = document.baseViewport;
  const scale = Math.min(viewport.width / Math.max(1, base.width), viewport.height / Math.max(1, base.height));
  const logicalWidth = viewport.width / Math.max(scale, 0.1);
  const logicalHeight = viewport.height / Math.max(scale, 0.1);
  const elements: Record<string, LayoutElementOverride> = {};

  for (const [id, element] of Object.entries(source.elements)) {
    if (element.role === 'canvas-background') continue;
    const nextWidth = Math.min(element.frame.width, logicalWidth - 32);
    const nextHeight = Math.min(element.frame.height, logicalHeight - 32);
    elements[id] = {
      frame: {
        x: Math.max(16, Math.min(element.frame.x, Math.max(16, logicalWidth - nextWidth - 16))),
        y: Math.max(16, Math.min(element.frame.y, Math.max(16, logicalHeight - nextHeight - 16))),
        width: Math.max(44, nextWidth),
        height: Math.max(44, nextHeight),
      },
      constraints: {
        horizontal: element.frame.width >= logicalWidth * 0.75 ? 'stretch' : element.constraints.horizontal,
        vertical: element.constraints.vertical,
      },
    };
  }

  return createLayoutDocumentPatch(settings, context, {
    ...document,
    breakpoints: {
      ...(document.breakpoints ?? {}),
      [breakpoint]: { elements },
    },
  });
}

export function createAutoLayoutResponsivePatch(
  breakpoint: LayoutBreakpoint,
): Partial<DesignSettings> {
  if (breakpoint === 'desktop') return {};
  return {
    layout: {
      elementOrder: ['question-title', 'media', 'question-description', 'answers-container', 'primary-action'],
      mediaPosition: 'top',
    } as never,
    answerCards: {
      columns: breakpoint === 'mobile' ? 1 : 2,
      minHeight: breakpoint === 'mobile' ? 52 : 56,
    } as never,
    buttons: {
      width: breakpoint === 'mobile' ? 'full' : 'auto',
      height: 52,
    } as never,
  };
}

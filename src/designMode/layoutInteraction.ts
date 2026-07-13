import {
  getLayoutRoleRule,
  normalizeLayoutDocument,
  type LayoutDocument,
  type LayoutElement,
  type LayoutFrame,
  type LayoutRoleRule,
} from './layoutDocument';

export type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type SnapAxis = 'x' | 'y';
export type SnapKind = 'scene-edge' | 'scene-center' | 'element-edge' | 'element-center' | 'grid';

export interface LayoutViewport {
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: SnapAxis;
  position: number;
  kind: SnapKind;
  elementId?: string;
}

export interface SnapResult {
  frame: LayoutFrame;
  guides: SnapGuide[];
}

export interface LayoutInteractionOptions {
  element?: Pick<LayoutElement, 'role' | 'locked'>;
  viewport: LayoutViewport;
  minSize?: { width: number; height: number };
  preserveAspectRatio?: boolean;
}

const DEFAULT_MIN_SIZE = { width: 32, height: 24 };
const GRID_SIZE = 8;
const SNAP_THRESHOLD = 6;

const ROLE_MIN_SIZE: Partial<Record<LayoutElement['role'], { width: number; height: number }>> = {
  'question-card': { width: 240, height: 120 },
  'answers-container': { width: 180, height: 88 },
  'answer-card': { width: 120, height: 44 },
  media: { width: 80, height: 60 },
  'primary-action': { width: 72, height: 36 },
  'result-action': { width: 72, height: 36 },
  'result-card': { width: 240, height: 120 },
};

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function roundFrame(frame: LayoutFrame): LayoutFrame {
  return {
    x: Math.round(finiteNumber(frame.x, 0)),
    y: Math.round(finiteNumber(frame.y, 0)),
    width: Math.round(finiteNumber(frame.width, DEFAULT_MIN_SIZE.width)),
    height: Math.round(finiteNumber(frame.height, DEFAULT_MIN_SIZE.height)),
  };
}

function minSizeFor(element: Pick<LayoutElement, 'role'> | undefined, explicit?: { width: number; height: number }) {
  return explicit ?? (element ? ROLE_MIN_SIZE[element.role] : undefined) ?? DEFAULT_MIN_SIZE;
}

export function canMoveLayoutElement(element: Pick<LayoutElement, 'role' | 'locked'>): boolean {
  if (element.locked || element.role === 'answer-card') return false;
  return getLayoutRoleRule(element.role).canMove;
}

export function canResizeLayoutElement(element: Pick<LayoutElement, 'role' | 'locked'>): boolean {
  if (element.locked || element.role === 'answer-card') return false;
  return getLayoutRoleRule(element.role).canResize;
}

export function clampLayoutFrame(
  frame: LayoutFrame,
  viewport: LayoutViewport,
  minSize: { width: number; height: number } = DEFAULT_MIN_SIZE,
): LayoutFrame {
  const safeViewport = {
    width: Math.max(1, finiteNumber(viewport.width, 1280)),
    height: Math.max(1, finiteNumber(viewport.height, 720)),
  };
  const width = Math.min(safeViewport.width, Math.max(minSize.width, finiteNumber(frame.width, minSize.width)));
  const height = Math.min(safeViewport.height, Math.max(minSize.height, finiteNumber(frame.height, minSize.height)));
  const x = Math.min(Math.max(0, finiteNumber(frame.x, 0)), Math.max(0, safeViewport.width - width));
  const y = Math.min(Math.max(0, finiteNumber(frame.y, 0)), Math.max(0, safeViewport.height - height));
  return roundFrame({ x, y, width, height });
}

export function moveLayoutFrame(frame: LayoutFrame, dx: number, dy: number, options: LayoutInteractionOptions): LayoutFrame {
  if (options.element && !canMoveLayoutElement(options.element)) return roundFrame(frame);
  return clampLayoutFrame(
    { ...frame, x: frame.x + finiteNumber(dx, 0), y: frame.y + finiteNumber(dy, 0) },
    options.viewport,
    minSizeFor(options.element, options.minSize),
  );
}

export function resizeLayoutFrame(
  frame: LayoutFrame,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  options: LayoutInteractionOptions,
): LayoutFrame {
  if (options.element && !canResizeLayoutElement(options.element)) return roundFrame(frame);

  const minSize = minSizeFor(options.element, options.minSize);
  let x = frame.x;
  let y = frame.y;
  let width = frame.width;
  let height = frame.height;

  if (handle.includes('e')) width += dx;
  if (handle.includes('s')) height += dy;
  if (handle.includes('w')) {
    x += dx;
    width -= dx;
  }
  if (handle.includes('n')) {
    y += dy;
    height -= dy;
  }

  if (options.preserveAspectRatio) {
    const aspect = frame.width / Math.max(1, frame.height);
    if (Math.abs(width - frame.width) >= Math.abs(height - frame.height)) {
      height = width / Math.max(0.01, aspect);
      if (handle.includes('n')) y = frame.y + frame.height - height;
    } else {
      width = height * aspect;
      if (handle.includes('w')) x = frame.x + frame.width - width;
    }
  }

  if (width < minSize.width) {
    if (handle.includes('w')) x -= minSize.width - width;
    width = minSize.width;
  }
  if (height < minSize.height) {
    if (handle.includes('n')) y -= minSize.height - height;
    height = minSize.height;
  }

  return clampLayoutFrame({ x, y, width, height }, options.viewport, minSize);
}

function nearestSnap(value: number, candidates: Array<Omit<SnapGuide, 'axis'> & { value: number }>): Omit<SnapGuide, 'axis'> & { value: number } | null {
  let best: (Omit<SnapGuide, 'axis'> & { value: number; distance: number }) | null = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.value - value);
    if (distance > SNAP_THRESHOLD) continue;
    if (!best || distance < best.distance) {
      best = { ...candidate, distance };
    }
  }
  return best ? { value: best.value, position: best.position, kind: best.kind, elementId: best.elementId } : null;
}

export function snapLayoutFrame(
  frame: LayoutFrame,
  viewport: LayoutViewport,
  otherElements: Array<Pick<LayoutElement, 'id' | 'frame'>> = [],
  gridSize = GRID_SIZE,
): SnapResult {
  const clamped = clampLayoutFrame(frame, viewport);
  const xCandidates: Array<Omit<SnapGuide, 'axis'> & { value: number }> = [
    { value: 0, position: 0, kind: 'scene-edge' },
    { value: viewport.width / 2, position: viewport.width / 2, kind: 'scene-center' },
    { value: viewport.width, position: viewport.width, kind: 'scene-edge' },
  ];
  const yCandidates: Array<Omit<SnapGuide, 'axis'> & { value: number }> = [
    { value: 0, position: 0, kind: 'scene-edge' },
    { value: viewport.height / 2, position: viewport.height / 2, kind: 'scene-center' },
    { value: viewport.height, position: viewport.height, kind: 'scene-edge' },
  ];

  for (const element of otherElements) {
    xCandidates.push(
      { value: element.frame.x, position: element.frame.x, kind: 'element-edge', elementId: element.id },
      { value: element.frame.x + element.frame.width / 2, position: element.frame.x + element.frame.width / 2, kind: 'element-center', elementId: element.id },
      { value: element.frame.x + element.frame.width, position: element.frame.x + element.frame.width, kind: 'element-edge', elementId: element.id },
    );
    yCandidates.push(
      { value: element.frame.y, position: element.frame.y, kind: 'element-edge', elementId: element.id },
      { value: element.frame.y + element.frame.height / 2, position: element.frame.y + element.frame.height / 2, kind: 'element-center', elementId: element.id },
      { value: element.frame.y + element.frame.height, position: element.frame.y + element.frame.height, kind: 'element-edge', elementId: element.id },
    );
  }

  const gridX = Math.round(clamped.x / gridSize) * gridSize;
  const gridY = Math.round(clamped.y / gridSize) * gridSize;
  xCandidates.push({ value: gridX, position: gridX, kind: 'grid' });
  yCandidates.push({ value: gridY, position: gridY, kind: 'grid' });

  const left = nearestSnap(clamped.x, xCandidates);
  const centerX = nearestSnap(clamped.x + clamped.width / 2, xCandidates);
  const right = nearestSnap(clamped.x + clamped.width, xCandidates);
  const top = nearestSnap(clamped.y, yCandidates);
  const centerY = nearestSnap(clamped.y + clamped.height / 2, yCandidates);
  const bottom = nearestSnap(clamped.y + clamped.height, yCandidates);
  const xSnap = left ?? centerX ?? right;
  const ySnap = top ?? centerY ?? bottom;

  const snapped = {
    ...clamped,
    ...(xSnap ? {
      x: xSnap.value - (xSnap === centerX ? clamped.width / 2 : xSnap === right ? clamped.width : 0),
    } : {}),
    ...(ySnap ? {
      y: ySnap.value - (ySnap === centerY ? clamped.height / 2 : ySnap === bottom ? clamped.height : 0),
    } : {}),
  };
  const frameWithBounds = clampLayoutFrame(snapped, viewport);
  const guides: SnapGuide[] = [
    ...(xSnap ? [{ axis: 'x' as const, position: xSnap.position, kind: xSnap.kind, ...(xSnap.elementId ? { elementId: xSnap.elementId } : {}) }] : []),
    ...(ySnap ? [{ axis: 'y' as const, position: ySnap.position, kind: ySnap.kind, ...(ySnap.elementId ? { elementId: ySnap.elementId } : {}) }] : []),
  ];
  return { frame: frameWithBounds, guides };
}

export function logicalFrameToViewport(frame: LayoutFrame, baseViewport: LayoutViewport, viewport: LayoutViewport): LayoutFrame {
  const scaleX = Math.max(1, viewport.width) / Math.max(1, baseViewport.width);
  const scaleY = Math.max(1, viewport.height) / Math.max(1, baseViewport.height);
  return roundFrame({
    x: frame.x * scaleX,
    y: frame.y * scaleY,
    width: frame.width * scaleX,
    height: frame.height * scaleY,
  });
}

export function viewportFrameToLogical(frame: LayoutFrame, viewport: LayoutViewport, baseViewport: LayoutViewport): LayoutFrame {
  const scaleX = Math.max(1, baseViewport.width) / Math.max(1, viewport.width);
  const scaleY = Math.max(1, baseViewport.height) / Math.max(1, viewport.height);
  return clampLayoutFrame({
    x: frame.x * scaleX,
    y: frame.y * scaleY,
    width: frame.width * scaleX,
    height: frame.height * scaleY,
  }, baseViewport);
}

export function updateLayoutDocumentElementFrame(
  document: LayoutDocument,
  elementId: string,
  frame: LayoutFrame,
): LayoutDocument {
  const existing = document.elements[elementId];
  if (!existing) return document;
  const rule: LayoutRoleRule = getLayoutRoleRule(existing.role);
  const nextElement: LayoutElement = {
    ...existing,
    frame: rule.canResize || rule.canMove
      ? clampLayoutFrame(frame, document.baseViewport, minSizeFor(existing))
      : existing.frame,
    positionMode: existing.positionMode === 'free' || document.mode === 'free' ? 'free' : existing.positionMode,
  };
  return normalizeLayoutDocument({
    ...document,
    elements: {
      ...document.elements,
      [elementId]: nextElement,
    },
  }) ?? document;
}

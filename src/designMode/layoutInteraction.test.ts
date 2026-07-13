import { describe, expect, it } from 'vitest';
import { createFreeLayoutDocumentFromMeasurements } from './layoutDocument';
import {
  canMoveLayoutElement,
  canResizeLayoutElement,
  logicalFrameToViewport,
  moveLayoutFrame,
  resizeLayoutFrame,
  snapLayoutFrame,
  updateLayoutDocumentElementFrame,
  viewportFrameToLogical,
} from './layoutInteraction';

describe('layout interaction geometry', () => {
  const viewport = { width: 1000, height: 600 };

  it('drags elements within scene bounds', () => {
    const frame = moveLayoutFrame(
      { x: 900, y: 540, width: 160, height: 80 },
      100,
      100,
      { viewport, element: { role: 'media' } },
    );

    expect(frame).toEqual({ x: 840, y: 520, width: 160, height: 80 });
  });

  it('blocks locked elements and standalone answer cards', () => {
    expect(canMoveLayoutElement({ role: 'media', locked: true })).toBe(false);
    expect(canResizeLayoutElement({ role: 'answer-card' })).toBe(false);
    expect(moveLayoutFrame(
      { x: 10, y: 10, width: 100, height: 50 },
      20,
      20,
      { viewport, element: { role: 'answer-card' } },
    )).toEqual({ x: 10, y: 10, width: 100, height: 50 });
  });

  it('resizes with minimum size and proportional Shift behavior', () => {
    const resized = resizeLayoutFrame(
      { x: 100, y: 100, width: 200, height: 100 },
      'se',
      80,
      0,
      { viewport, element: { role: 'media' }, preserveAspectRatio: true },
    );

    expect(resized).toEqual({ x: 100, y: 100, width: 280, height: 140 });
  });

  it('snaps to scene center and other element edges', () => {
    const centerSnap = snapLayoutFrame(
      { x: 396, y: 20, width: 200, height: 100 },
      viewport,
      [],
      1000,
    );
    expect(centerSnap.frame.x).toBe(400);
    expect(centerSnap.guides.some((guide) => guide.kind === 'scene-center')).toBe(true);

    const edgeSnap = snapLayoutFrame(
      { x: 297, y: 20, width: 100, height: 50 },
      viewport,
      [{ id: 'media', frame: { x: 300, y: 100, width: 100, height: 80 } }],
      1000,
    );
    expect(edgeSnap.frame.x).toBe(300);
    expect(edgeSnap.guides.some((guide) => guide.elementId === 'media')).toBe(true);
  });

  it('keeps saved logical frames independent from preview zoom', () => {
    const logical = viewportFrameToLogical(
      { x: 50, y: 25, width: 200, height: 100 },
      { width: 500, height: 300 },
      { width: 1000, height: 600 },
    );
    expect(logical).toEqual({ x: 100, y: 50, width: 400, height: 200 });
    expect(logicalFrameToViewport(logical, { width: 1000, height: 600 }, { width: 500, height: 300 }))
      .toEqual({ x: 50, y: 25, width: 200, height: 100 });
  });

  it('updates a LayoutDocument element frame as one normalized operation', () => {
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport,
      elements: [
        { id: 'media', role: 'media', nodeId: null, rect: { x: 10, y: 20, width: 200, height: 120 } },
      ],
    });
    const updated = updateLayoutDocumentElementFrame(doc, 'media', { x: 900, y: 580, width: 200, height: 120 });

    expect(updated.elements.media.frame).toEqual({ x: 800, y: 480, width: 200, height: 120 });
    expect(updated.elements.media.positionMode).toBe('free');
  });
});

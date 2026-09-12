import { describe, expect, it } from 'vitest';
import { qrImageSource } from './AdminMfaPage';

describe('qrImageSource', () => {
  it('keeps a QR data URL unchanged', () => {
    const source = 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E';
    expect(qrImageSource(source)).toBe(source);
  });

  it('converts raw SVG markup to a data URL', () => {
    expect(qrImageSource('<svg><rect /></svg>')).toBe(
      'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Crect%20%2F%3E%3C%2Fsvg%3E',
    );
  });
});

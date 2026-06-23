import { describe, expect, it, vi } from 'vitest';
import { CustomNodeType } from '../../types';
import {
  NODE_DRAG_MIME,
  readDraggedNodeType,
  writeDraggedNodeType,
} from './nodeDragData';

function createDataTransfer(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    effectAllowed: 'uninitialized',
    setData: vi.fn((type: string, value: string) => values.set(type, value)),
    getData: vi.fn((type: string) => values.get(type) ?? ''),
  } as unknown as DataTransfer;
}

describe('node drag data', () => {
  it('writes custom and plain-text payloads', () => {
    const dataTransfer = createDataTransfer();

    writeDraggedNodeType(dataTransfer, CustomNodeType.Question);

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      NODE_DRAG_MIME,
      CustomNodeType.Question,
    );
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'text/plain',
      CustomNodeType.Question,
    );
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('reads the custom payload first', () => {
    const dataTransfer = createDataTransfer({
      [NODE_DRAG_MIME]: CustomNodeType.Info,
      'text/plain': CustomNodeType.Question,
    });

    expect(readDraggedNodeType(dataTransfer)).toBe(CustomNodeType.Info);
  });

  it('falls back to text/plain', () => {
    const dataTransfer = createDataTransfer({
      'text/plain': CustomNodeType.Result,
    });

    expect(readDraggedNodeType(dataTransfer)).toBe(CustomNodeType.Result);
  });

  it('rejects unknown node types', () => {
    const dataTransfer = createDataTransfer({
      [NODE_DRAG_MIME]: 'malicious-node',
    });

    expect(readDraggedNodeType(dataTransfer)).toBeNull();
  });
});

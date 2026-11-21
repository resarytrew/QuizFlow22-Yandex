import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './createId';
import { createNewNode } from '../components/QuizEditor/createNewNode';
import { CustomNodeType } from '../types';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('editor identifiers', () => {
  it('stays unique during rapid creation even without UUID support and with a frozen clock and random source', () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Date, 'now').mockReturnValue(123);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ids = Array.from({ length: 1000 }, () => createId('answer'));
    expect(new Set(ids).size).toBe(ids.length);
    const nodes = Array.from({ length: 50 }, () => createNewNode(CustomNodeType.Question, { x: 0, y: 0 }));
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
  });
});

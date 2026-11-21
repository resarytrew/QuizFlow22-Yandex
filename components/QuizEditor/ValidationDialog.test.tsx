import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationDialog } from './ValidationDialog';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useUIStore } from '../../store/useUIStore';
import { CustomNodeType } from '../../types';

describe('graph validation', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useUIStore.getState().reset();
    useCanvasStore.getState().setNodes([
      { id: 'start', type: CustomNodeType.Start, position: { x: 0, y: 0 }, data: {} },
      { id: 'question', type: CustomNodeType.Question, position: { x: 1, y: 2 }, data: { question: 'Вопрос', answers: [], parentId: 'group' } },
    ]);
    useCanvasStore.getState().setEdges([{ id: 'broken', source: 'question', sourceHandle: 'answer-1', target: 'missing' }]);
  });
  afterEach(() => { cleanup(); useCanvasStore.getState().reset(); useUIStore.getState().reset(); });

  it('shows real issues and opens the affected node without changing its edges', () => {
    const close = vi.fn();
    render(<ValidationDialog onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: /Связь ведёт к удалённому блоку/ }));
    expect(useCanvasStore.getState().selection.primarySelectedNodeId).toBe('question');
    expect(useUIStore.getState().currentGroup).toBe('group');
    expect(useCanvasStore.getState().edges[0].sourceHandle).toBe('answer-1');
    expect(close).toHaveBeenCalledOnce();
  });

  it('closes using Escape', () => {
    const close = vi.fn();
    render(<ValidationDialog onClose={close} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
});

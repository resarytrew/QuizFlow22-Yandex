import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EdgeContextMenu from './EdgeContextMenu';
import { useCanvasStore } from '../store/useCanvasStore';
import { CustomNodeType } from '../types';

describe('editing an existing transition', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useCanvasStore.getState().setNodes(['a', 'b', 'c'].map((id, index) => ({ id, type: CustomNodeType.Info, position: { x: index * 100, y: 0 }, data: { label: id } })));
    useCanvasStore.getState().setEdges([
      { id: 'edge', source: 'a', sourceHandle: 'answer-1', target: 'b', targetHandle: 'in', data: { label: 'Да', effects: [{ variableName: 'score', op: 'add', value: '5' }] } },
      { id: 'other', source: 'a', sourceHandle: 'answer-1', target: 'c', data: { label: 'Parallel' } },
    ]);
  });
  afterEach(() => { cleanup(); useCanvasStore.getState().reset(); });

  it('retargets only the selected edge in one undoable operation', () => {
    render(<EdgeContextMenu id="edge" top={0} left={0} onClose={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Следующий блок'), { target: { value: 'c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    const state = useCanvasStore.getState();
    expect(state.edges[0]).toMatchObject({ id: 'edge', source: 'a', sourceHandle: 'answer-1', target: 'c', targetHandle: null, data: { label: 'Да', effects: [{ variableName: 'score', op: 'add', value: '5' }] } });
    expect(state.edges[1]).toMatchObject({ id: 'other', target: 'c', data: { label: 'Parallel' } });
    act(() => state.undo());
    expect(useCanvasStore.getState().edges[0]).toMatchObject({ target: 'b', targetHandle: 'in', sourceHandle: 'answer-1' });
    act(() => useCanvasStore.getState().redo());
    expect(useCanvasStore.getState().edges[0].target).toBe('c');
  });
  it('inserts a question into the selected edge as one undoable action', () => {
    render(<EdgeContextMenu id="edge" top={0} left={0} onClose={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Вставить вопрос между блоками' }));
    const state = useCanvasStore.getState();
    const inserted = state.nodes.find(node => !['a', 'b', 'c'].includes(node.id));
    expect(inserted?.type).toBe(CustomNodeType.Question);
    expect(state.edges.find(edge => edge.id === 'edge')).toMatchObject({ target: inserted?.id, sourceHandle: 'answer-1', data: { label: 'Да' } });
    expect(state.edges.find(edge => edge.source === inserted?.id)).toMatchObject({ target: 'b', targetHandle: 'in' });
    expect(state.edges.find(edge => edge.id === 'other')).toBeDefined();
    act(() => state.undo());
    expect(useCanvasStore.getState().nodes).toHaveLength(3);
    expect(useCanvasStore.getState().edges).toHaveLength(2);
  });

  it('protects a draft when clicking outside the editor', () => {
    const close = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EdgeContextMenu id="edge" top={0} left={0} onClose={close} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Следующий блок'), { target: { value: 'c' } });
    fireEvent.click(document.body);
    expect(confirm).toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

});

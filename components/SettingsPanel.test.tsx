import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';
import { createNewNode } from './QuizEditor/createNewNode';
import { useCanvasStore } from '../store/useCanvasStore';
import { useUIStore } from '../store/useUIStore';
import { CustomNodeType, type QuestionNodeData, type ScoreNodeData } from '../types';

describe('contextual settings panel', () => {
  beforeEach(() => { useCanvasStore.getState().reset(); useUIStore.getState().reset(); });
  afterEach(() => { cleanup(); useCanvasStore.getState().reset(); useUIStore.getState().reset(); });

  it('renders nothing without a selected node', () => {
    const { container } = render(<SettingsPanel />);
    expect(container.childElementCount).toBe(0);
  });

  it('renders the selected node and closes without replacing it with design', () => {
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    useCanvasStore.getState().setNodes([node]);
    useCanvasStore.getState().selectSingleNode(node.id);
    useUIStore.getState().openSettingsPanel();
    const { container } = render(<SettingsPanel />);
    expect(screen.getByText('Настройки узла')).toBeTruthy();
    act(() => useCanvasStore.getState().clearSelection());
    expect(container.childElementCount).toBe(0);
    expect(useUIStore.getState().isDesignModeActive).toBe(false);
  });
  it('shows node content directly, with one sound section and an editable author note', () => {
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    useCanvasStore.getState().setNodes([node]);
    useCanvasStore.getState().selectSingleNode(node.id);
    render(<SettingsPanel />);
    expect(screen.queryByRole('tablist', { name: 'Настройки блока' })).toBeNull();
    expect(screen.queryByLabelText('Найти настройку')).toBeNull();
    expect(screen.getAllByText('Звуковые эффекты')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Заметка автора'), { target: { value: 'Подсказка для автора' } });
    expect(useCanvasStore.getState().nodes[0].data.editorNote).toBe('Подсказка для автора');
  });

  it('keeps answers distinct when several are added in the same millisecond', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    try {
      const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
      useCanvasStore.getState().setNodes([node]);
      useCanvasStore.getState().selectSingleNode(node.id);
      render(<SettingsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'Добавить ответ' }));
      fireEvent.click(screen.getByRole('button', { name: 'Добавить ответ' }));
      const answers = (useCanvasStore.getState().nodes[0].data as QuestionNodeData).answers ?? [];
      expect(answers).toHaveLength(3);
      expect(new Set(answers.map(answer => answer.id)).size).toBe(3);
    } finally { vi.restoreAllMocks(); }
  });

  it('does not store an incomplete score and commits zero explicitly', () => {
    const node = createNewNode(CustomNodeType.Score, { x: 0, y: 0 });
    useCanvasStore.getState().setNodes([node]);
    useCanvasStore.getState().selectSingleNode(node.id);
    render(<SettingsPanel />);
    const input = screen.getByLabelText('Значение');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect((useCanvasStore.getState().nodes[0].data as ScoreNodeData).value).toBe(10);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect((useCanvasStore.getState().nodes[0].data as ScoreNodeData).value).toBe(0);
  });

});

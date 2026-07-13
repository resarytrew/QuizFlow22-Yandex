import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import SettingsPanel from './SettingsPanel';
import { useCanvasStore } from '../store/useCanvasStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useUIStore } from '../store/useUIStore';
import { CustomNodeType } from '../types';

describe('SettingsPanel visual design mode', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
    const questionNode = {
      id: 'q1',
      type: CustomNodeType.Question,
      position: { x: 0, y: 0 },
      data: { label: 'Question', question: 'Question text', answers: [] },
    };
    useCanvasStore.getState().setNodes([questionNode]);
    useCanvasStore.getState().setSelectedNode(questionNode);
  });

  it('shows design overview instead of node settings in design mode', () => {
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });

    render(<SettingsPanel />);

    expect(screen.getByText('Дизайн квиза')).toBeTruthy();
    expect(screen.queryByText('Настройки узла')).toBeNull();
  });

  it('shows the element inspector when a design element is selected', () => {
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });
    useUIStore.getState().setSelectedDesignElement({
      elementId: 'question-card',
      role: 'question-card',
      nodeId: 'q1',
    });

    render(<SettingsPanel />);

    expect(screen.getByText('Карточка вопроса')).toBeTruthy();
    expect(screen.getByText('question-card')).toBeTruthy();
  });

  it('clears the inspector without leaving design mode', () => {
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });
    useUIStore.getState().setSelectedDesignElement({
      elementId: 'question-card',
      role: 'question-card',
      nodeId: 'q1',
    });

    render(<SettingsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть инспектор элемента' }));

    expect(useUIStore.getState().editorMode).toBe('design');
    expect(useUIStore.getState().selectedDesignElement).toBeNull();
    expect(screen.getByText('Дизайн квиза')).toBeTruthy();
  });

  it('restores node settings after returning from design mode to flow mode', () => {
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });
    useUIStore.getState().setSelectedDesignElement({
      elementId: 'question-title',
      role: 'question-title',
      nodeId: 'q1',
    });
    useUIStore.getState().setEditorMode('flow');

    render(<SettingsPanel />);

    expect(screen.getByText('Настройки узла')).toBeTruthy();
    expect(screen.getByText('Вопрос')).toBeTruthy();
    expect(screen.getByText('q1')).toBeTruthy();
  });

  it('changes inspector scope and writes node overrides from controls', () => {
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });
    useUIStore.getState().setSelectedDesignElement({
      elementId: 'question-card',
      role: 'question-card',
      nodeId: 'q1',
    });

    render(<SettingsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Текущий экран' }));
    fireEvent.change(screen.getAllByLabelText('Radius')[0], { target: { value: '12' } });

    const overrides = (useQuizDataStore.getState().designSettings as any).elementOverrides;
    expect(overrides.nodes.q1['question-card'].questionCard.radius).toBe(12);
  });
});

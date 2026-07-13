import { render, screen } from '@testing-library/react';
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
    useCanvasStore.getState().setSelectedNode({
      id: 'q1',
      type: CustomNodeType.Question,
      position: { x: 0, y: 0 },
      data: { label: 'Question', question: 'Question text', answers: [] },
    });
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
      role: 'questionCard',
      nodeId: 'q1',
    });

    render(<SettingsPanel />);

    expect(screen.getByText('Карточка вопроса')).toBeTruthy();
    expect(screen.getByText('question-card')).toBeTruthy();
  });
});

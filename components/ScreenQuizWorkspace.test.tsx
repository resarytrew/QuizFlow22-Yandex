import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenQuizWorkspace } from './ScreenQuizWorkspace';
import { createNewNode } from './QuizEditor/createNewNode';
import { useCanvasStore } from '../store/useCanvasStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useUIStore } from '../store/useUIStore';
import { CustomNodeType, type QuestionNodeData } from '../types';

vi.mock('./LivePreview', () => ({ default: ({ startNodeId }: { startNodeId: string }) => <div data-testid="real-preview-start">{startNodeId}</div> }));
beforeEach(() => {
  useCanvasStore.getState().reset(); useQuizDataStore.getState().reset(); useUIStore.getState().reset();
  const first = createNewNode(CustomNodeType.Question, { x: 0, y: 0 }); (first.data as QuestionNodeData).question = 'Первый вопрос';
  const second = createNewNode(CustomNodeType.Info, { x: 300, y: 0 }); second.data.title = 'Второй экран';
  useCanvasStore.getState().setNodes([first, second]); useQuizDataStore.getState().setTemplateId('screenQuiz');
});
afterEach(() => { cleanup(); useCanvasStore.getState().reset(); useQuizDataStore.getState().reset(); useUIStore.getState().reset(); });

describe('screen quiz workspace', () => {
  it('selects a screen for both local overrides and the real preview without changing graph selection', () => {
    const second = useCanvasStore.getState().nodes[1];
    const before = useCanvasStore.getState().selection;
    render(<ScreenQuizWorkspace />);
    fireEvent.change(screen.getByLabelText('Область настроек'), { target: { value: second.id } });
    expect(screen.getByTestId('real-preview-start').textContent).toBe(second.id);
    expect(screen.getByText('Общая настройка', { selector: '[data-source="timerSeconds"]' })).toBeTruthy();
    expect(useCanvasStore.getState().selection).toEqual(before);
  });
});

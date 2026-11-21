import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScreenQuizEditor } from './ScreenQuizEditor';
import SettingsPanel from './SettingsPanel';
import { createNewNode } from './QuizEditor/createNewNode';
import { useCanvasStore } from '../store/useCanvasStore';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useUIStore } from '../store/useUIStore';
import { CustomNodeType } from '../types';

beforeEach(() => { useCanvasStore.getState().reset(); useQuizDataStore.getState().reset(); useUIStore.getState().reset(); });
afterEach(() => { cleanup(); useCanvasStore.getState().reset(); useQuizDataStore.getState().reset(); useUIStore.getState().reset(); });

describe('screen quiz settings', () => {
  it('does not show screen quiz controls in a regular node inspector', () => {
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    useCanvasStore.getState().setNodes([node]);
    useCanvasStore.getState().selectSingleNode(node.id);
    render(<SettingsPanel />);
    expect(screen.queryByText('Экранная викторина')).toBeNull();
  });

  it('overrides a screen value and returns to inheritance without changing the ordinary timer', () => {
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    node.data.timer = 17;
    useCanvasStore.getState().setNodes([node]);
    useQuizDataStore.getState().setTemplateId('screenQuiz');
    render(<ScreenQuizEditor nodeId={node.id} />);
    expect(screen.getByText('Общая настройка', { selector: '[data-source="timerSeconds"]' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Переопределить: Длительность таймера' }));
    const input = screen.getByLabelText('Длительность таймера') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.blur(input);
    expect(useCanvasStore.getState().nodes[0].data.screenQuiz?.timerSeconds).toBe(45);
    expect(useCanvasStore.getState().nodes[0].data.timer).toBe(17);
    fireEvent.click(screen.getByRole('button', { name: 'Вернуть общее: Длительность таймера' }));
    expect(useCanvasStore.getState().nodes[0].data.screenQuiz?.timerSeconds).toBeUndefined();
    expect(useCanvasStore.getState().nodes[0].data.timer).toBe(17);
  });
  it('preserves an explicit zero and existing overrides across template changes', () => {
    const node = createNewNode(CustomNodeType.Info, { x: 0, y: 0 });
    node.data.screenQuiz = { holdSeconds: 0, backgroundImageUrl: '' };
    useCanvasStore.getState().setNodes([node]);
    useQuizDataStore.getState().setTemplateId('screenQuiz');
    const { unmount } = render(<ScreenQuizEditor nodeId={node.id} />);
    expect((screen.getByLabelText('Удержание до таймера, сек') as HTMLInputElement).value).toBe('0');
    expect(screen.getByText('Переопределено здесь', { selector: '[data-source="holdSeconds"]' })).toBeTruthy();
    unmount();
    useQuizDataStore.getState().setTemplateId('default');
    useQuizDataStore.getState().setTemplateId('screenQuiz');
    expect(useCanvasStore.getState().nodes[0].data.screenQuiz).toEqual({ holdSeconds: 0, backgroundImageUrl: '' });
  });

  it('updates a shared value without editing node-specific values', () => {
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    node.data.screenQuiz = { timerSeconds: 40 };
    useCanvasStore.getState().setNodes([node]);
    useQuizDataStore.getState().setTemplateId('screenQuiz');
    render(<ScreenQuizEditor nodeId={null} />);
    const input = screen.getByLabelText('Длительность таймера');
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.blur(input);
    expect(useQuizDataStore.getState().designSettings.screenQuiz?.timerSeconds).toBe(55);
    expect(useCanvasStore.getState().nodes[0].data.screenQuiz?.timerSeconds).toBe(40);
  });

});

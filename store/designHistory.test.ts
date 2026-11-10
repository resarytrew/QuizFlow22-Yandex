import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from './useCanvasStore';
import { useQuizDataStore } from './useQuizDataStore';
import { createNewNode } from '../components/QuizEditor/createNewNode';
import { CustomNodeType } from '../types';

describe('design and graph history', () => {
  beforeEach(() => { useCanvasStore.getState().reset(); useQuizDataStore.getState().reset(); });
  it('undoes and redoes a theme change in order with graph edits', () => {
    const initial = useQuizDataStore.getState().designSettings.background.color;
    useQuizDataStore.getState().updateDesignSettings({ background: { ...useQuizDataStore.getState().designSettings.background, color: '#123456' } });
    const node = createNewNode(CustomNodeType.Question, { x: 0, y: 0 });
    useCanvasStore.getState().addNode(node);
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().nodes.some(item => item.id === node.id)).toBe(false);
    expect(useQuizDataStore.getState().designSettings.background.color).toBe('#123456');
    useCanvasStore.getState().undo();
    expect(useQuizDataStore.getState().designSettings.background.color).toBe(initial);
    useCanvasStore.getState().redo();
    useCanvasStore.getState().redo();
    expect(useQuizDataStore.getState().designSettings.background.color).toBe('#123456');
    expect(useCanvasStore.getState().nodes.some(item => item.id === node.id)).toBe(true);
  });
  it('does not create history for unchanged settings and clears redo on a new design edit', () => {
    const ds = useQuizDataStore.getState().designSettings;
    useQuizDataStore.getState().updateDesignSettings({ background: ds.background });
    expect(useCanvasStore.getState().history.past).toHaveLength(0);
    useQuizDataStore.getState().updateDesignSettings({ background: { ...ds.background, color: '#123456' } });
    useCanvasStore.getState().undo();
    useQuizDataStore.getState().updateDesignSettings({ background: { ...ds.background, color: '#654321' } });
    expect(useCanvasStore.getState().history.future).toHaveLength(0);
  });
});

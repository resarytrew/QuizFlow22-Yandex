import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SettingsPanel from './SettingsPanel';
import { createNewNode } from './QuizEditor/createNewNode';
import { useCanvasStore } from '../store/useCanvasStore';
import { useUIStore } from '../store/useUIStore';
import { CustomNodeType } from '../types';

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
});

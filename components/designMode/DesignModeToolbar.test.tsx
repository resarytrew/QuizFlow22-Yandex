import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import DesignModeToolbar from './DesignModeToolbar';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore } from '../../store/useUIStore';
import { CustomNodeType } from '../../types';

describe('DesignModeToolbar', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
    useCanvasStore.getState().setNodes([
      {
        id: 'start',
        type: CustomNodeType.Start,
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'q1',
        type: CustomNodeType.Question,
        position: { x: 100, y: 0 },
        data: { label: 'Question 1', question: 'Text', answers: [] },
      },
    ]);
    useCanvasStore.getState().setEdges([{ id: 'e1', source: 'start', target: 'q1' }]);
    useCanvasStore.getState().setSelectedNode(useCanvasStore.getState().nodes[0]);
  });

  it('selects the current screen from the compact screen select', () => {
    render(<DesignModeToolbar />);

    fireEvent.change(screen.getByLabelText('Текущий экран'), { target: { value: 'q1' } });

    expect(useCanvasStore.getState().selectedNode?.id).toBe('q1');
  });

  it('switches select and test interaction modes', () => {
    render(<DesignModeToolbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Проверять прохождение' }));
    expect(useUIStore.getState().designInteractionMode).toBe('test');

    fireEvent.click(screen.getByRole('button', { name: 'Выбирать элементы' }));
    expect(useUIStore.getState().designInteractionMode).toBe('select');
  });

  it('switches desktop tablet and mobile devices', () => {
    render(<DesignModeToolbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));
    expect(useUIStore.getState().previewDevice).toBe('tablet');

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(useUIStore.getState().previewDevice).toBe('mobile');

    fireEvent.click(screen.getByRole('button', { name: 'Desktop' }));
    expect(useUIStore.getState().previewDevice).toBe('desktop');
  });

  it('runs design undo and redo through DesignHistory', () => {
    useQuizDataStore.getState().updateDesignSettings({ background: { color: '#111111' } });
    render(<DesignModeToolbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useQuizDataStore.getState().designSettings.background.color).not.toBe('#111111');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(useQuizDataStore.getState().designSettings.background.color).toBe('#111111');
  });
});

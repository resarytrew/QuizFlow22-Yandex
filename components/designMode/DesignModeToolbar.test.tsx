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

    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    expect(useUIStore.getState().previewDevice).toBe('fullscreen');
  });

  it('supports custom viewport and safe area controls', () => {
    render(<DesignModeToolbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('Custom preview width'), { target: { value: '412' } });
    fireEvent.change(screen.getByLabelText('Custom preview height'), { target: { value: '900' } });
    fireEvent.change(screen.getByLabelText('Safe area preset'), { target: { value: 'telegram' } });

    expect(useUIStore.getState().previewDevice).toBe('custom');
    expect(useUIStore.getState().previewCustomSize).toEqual({ width: 412, height: 900 });
    expect(useUIStore.getState().previewSafeAreaPreset).toBe('telegram');
  });

  it('opens the layers drawer from an explicit labeled button', () => {
    render(<DesignModeToolbar />);

    const button = screen.getByRole('button', { name: 'Слои' });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);

    expect(useUIStore.getState().isDesignLayersDrawerOpen).toBe(true);
  });

  it('opens the design quality panel from the toolbar indicator', () => {
    render(<DesignModeToolbar />);

    fireEvent.click(screen.getByRole('button', { name: /Проверка:/ }));

    expect(useUIStore.getState().isDesignQualityPanelOpen).toBe(true);
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

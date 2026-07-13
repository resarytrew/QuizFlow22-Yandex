import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import DesignLayersDrawer from './DesignLayersDrawer';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore } from '../../store/useUIStore';
import { CustomNodeType } from '../../types';

describe('DesignLayersDrawer', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
    useCanvasStore.getState().setNodes([
      {
        id: 'q1',
        type: CustomNodeType.Question,
        position: { x: 0, y: 0 },
        data: { label: 'Question', question: 'Text', answers: [] },
      },
    ]);
    useCanvasStore.getState().setSelectedNode(useCanvasStore.getState().nodes[0]);
    useUIStore.getState().setEditorMode('design', { previewStartNodeId: 'q1' });
    useUIStore.getState().openDesignLayersDrawer();
  });

  it('renders as a closeable drawer over design mode', () => {
    render(<DesignLayersDrawer />);

    expect(screen.getByTestId('design-layers-drawer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(useUIStore.getState().isDesignLayersDrawerOpen).toBe(false);
    expect(useUIStore.getState().editorMode).toBe('design');
  });

  it('selects the same element source used by LivePreview', () => {
    render(<DesignLayersDrawer />);

    const mediaLayer = screen.getByTestId('design-layer-media');
    fireEvent.click(mediaLayer.querySelector('button') as HTMLElement);

    expect(useUIStore.getState().selectedDesignElement).toEqual({
      elementId: 'media',
      role: 'media',
      nodeId: 'q1',
    });
  });

  it('protects required functional elements from deletion', () => {
    render(<DesignLayersDrawer />);

    fireEvent.click((screen.getByTestId('design-layer-primary-action').querySelector('button') as HTMLElement));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(screen.getByText(/cannot be deleted/i)).toBeTruthy();
  });

  it('supports copy paste shortcuts without editable target interception', () => {
    render(<DesignLayersDrawer />);

    fireEvent.click((screen.getByTestId('design-layer-media').querySelector('button') as HTMLElement));
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });

    expect(useUIStore.getState().selectedDesignElement?.elementId).toContain('media-paste-');
  });
});

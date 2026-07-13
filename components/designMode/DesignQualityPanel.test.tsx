import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import DesignQualityPanel from './DesignQualityPanel';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import { useUIStore } from '../../store/useUIStore';
import { createFreeLayoutDocumentFromMeasurements } from '../../src/designMode/layoutDocument';
import { CustomNodeType } from '../../types';

describe('DesignQualityPanel', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
    const node = {
      id: 'q1',
      type: CustomNodeType.Question,
      position: { x: 0, y: 0 },
      data: { label: 'Question', question: 'Text', answers: [] },
    };
    useCanvasStore.getState().setNodes([node]);
    useCanvasStore.getState().setSelectedNode(node);
    const doc = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1280, height: 720 },
      elements: [{ id: 'primary-action', role: 'primary-action', nodeId: 'q1', rect: { x: 20, y: 20, width: 20, height: 20 } }],
    });
    useQuizDataStore.getState().updateDesignSettings({ layoutDocuments: { global: doc } } as never);
    useUIStore.getState().openDesignQualityPanel();
  });

  it('selects the related design element from a quality issue', () => {
    render(<DesignQualityPanel />);

    fireEvent.click(screen.getByText(/Зона нажатия/));

    expect(useUIStore.getState().selectedDesignElement?.elementId).toBe('primary-action');
    expect(useUIStore.getState().highlightedDesignIssueId).toContain('touch-target-small');
  });

  it('previews and applies an automatic fix through design history', () => {
    render(<DesignQualityPanel />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Предпросмотр' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Исправить автоматически' })[0]);

    const frame = (useQuizDataStore.getState().designSettings as {
      layoutDocuments?: { global?: { elements?: Record<string, { frame: { width: number; height: number } }> } };
    }).layoutDocuments?.global?.elements?.['primary-action'].frame;
    expect(frame?.width).toBeGreaterThanOrEqual(44);
    expect(useQuizDataStore.getState().canUndoDesign).toBe(true);
  });
});

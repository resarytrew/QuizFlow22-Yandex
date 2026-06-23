import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { TimerSection } from './TimerSection';

describe('TimerSection', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useQuizDataStore.getState().reset();
  });

  it('enables the timer and clamps duration to at least one second', () => {
    render(<TimerSection />);

    fireEvent.click(screen.getByRole('checkbox'));
    const duration = screen.getByRole('spinbutton');
    fireEvent.change(duration, { target: { value: '0' } });

    expect(useQuizDataStore.getState().globalTimer).toMatchObject({
      enabled: true,
      duration: 1,
    });
  });

  it('stores the selected timeout node', () => {
    useCanvasStore.getState().setNodes([
      {
        id: 'result-1',
        type: 'resultNode',
        position: { x: 0, y: 0 },
        data: { title: 'Финиш' },
      },
    ]);

    render(<TimerSection />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'result-1' },
    });

    expect(useQuizDataStore.getState().globalTimer.onTimeoutNodeId).toBe('result-1');
  });
});

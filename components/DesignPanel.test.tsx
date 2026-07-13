import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import DesignPanel from './DesignPanel';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { useUIStore } from '../store/useUIStore';

describe('DesignPanel navigation', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
    useUIStore.getState().reset();
  });

  it('shows the simplified top-level design sections', () => {
    render(<DesignPanel />);

    expect(screen.getByRole('button', { name: 'Быстрый старт' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Бренд' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Экран' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Элементы' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Дополнительно' })).toBeTruthy();
  });

  it('changes the quiz template from the design quick start', () => {
    render(<DesignPanel />);

    const templateId = screen.getByText('science');
    const templateButton = templateId.closest('button');
    expect(templateButton).toBeTruthy();

    fireEvent.click(templateButton!);

    expect(useQuizDataStore.getState().templateId).toBe('science');
  });
});

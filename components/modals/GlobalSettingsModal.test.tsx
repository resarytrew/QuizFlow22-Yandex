import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalSettingsModal from './GlobalSettingsModal';

describe('GlobalSettingsModal', () => {
  it('shows one selected settings group at a time', () => {
    render(<GlobalSettingsModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Шаблон оформления')).toBeTruthy();
    expect(screen.queryByText('Глобальный таймер')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Таймер/ }));

    expect(screen.getByText('Глобальный таймер')).toBeTruthy();
    expect(screen.queryByText('Шаблон оформления')).toBeNull();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<GlobalSettingsModal isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

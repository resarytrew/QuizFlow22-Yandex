import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalSettingsModal from './GlobalSettingsModal';

describe('GlobalSettingsModal', () => {
  it('shows only workspace settings and keeps quiz templates out', () => {
    render(<GlobalSettingsModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Настройки рабочего пространства')).toBeTruthy();
    expect(screen.queryByText('Шаблон оформления')).toBeNull();
    expect(screen.queryByText('Глобальный таймер')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Пресеты рабочего пространства/ }));

    expect(screen.getAllByText('Пресеты рабочего пространства').length).toBeGreaterThan(0);
    expect(screen.queryByText('Шаблон оформления')).toBeNull();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<GlobalSettingsModal isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

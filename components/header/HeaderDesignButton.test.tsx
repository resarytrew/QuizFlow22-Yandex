import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeaderDesignButton from './HeaderDesignButton';

describe('HeaderDesignButton', () => {
  it('exposes an explicit keyboard-focusable design entry', () => {
    const onOpen = vi.fn();
    render(<HeaderDesignButton isActive={false} onOpen={onOpen} />);

    const button = screen.getByRole('button', { name: 'Открыть дизайн квиза' });
    expect(button.textContent).toContain('Дизайн');

    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('marks the design entry as pressed when design is open', () => {
    render(<HeaderDesignButton isActive onOpen={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Открыть дизайн квиза' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});

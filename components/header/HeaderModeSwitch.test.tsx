import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeaderModeSwitch from './HeaderModeSwitch';

describe('HeaderModeSwitch', () => {
  it('switches between scenario and design modes with explicit labels', () => {
    const onChange = vi.fn();
    render(<HeaderModeSwitch mode="flow" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Сценарий' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Дизайн' }));

    expect(onChange).toHaveBeenCalledWith('design');
  });
});

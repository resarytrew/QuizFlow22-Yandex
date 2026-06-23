import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorInput } from './ColorInput';

describe('ColorInput', () => {
  it('commits a valid hex color on blur', () => {
    const onChange = vi.fn();
    render(<ColorInput value="#ffffff" onChange={onChange} ariaLabel="Акцент" />);

    const input = screen.getByRole('textbox', { name: 'Акцент, HEX' });
    fireEvent.change(input, { target: { value: '#AABBCC' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('#aabbcc');
  });

  it('rejects an invalid color and restores the previous value', () => {
    const onChange = vi.fn();
    render(<ColorInput value="#ffffff" onChange={onChange} ariaLabel="Акцент" />);

    const input = screen.getByRole('textbox', { name: 'Акцент, HEX' });
    fireEvent.change(input, { target: { value: 'red' } });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('#ffffff');
  });
});

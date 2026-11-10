import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumericInput } from './NumericInput';

describe('numeric input', () => {
  it('keeps incomplete input out of the model and preserves zero', () => {
    const commit = vi.fn();
    render(<NumericInput label="Баллы" value={12} onCommit={commit} min={0} />);
    const input = screen.getByLabelText('Баллы');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(commit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(commit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledWith(0);
  });
  it('distinguishes an optional empty value from zero and rejects out-of-range values', () => {
    const commit = vi.fn();
    render(<NumericInput label="Округление" value={2} onCommit={commit} optional min={0} max={10} />);
    const input = screen.getByLabelText('Округление');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledWith(undefined);
    fireEvent.change(input, { target: { value: '11' } });
    fireEvent.blur(input);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

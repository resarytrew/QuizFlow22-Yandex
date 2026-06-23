import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderSaveControls } from './HeaderSaveControls';

function renderSaveControls(
  overrides: Partial<Parameters<typeof HeaderSaveControls>[0]> = {},
) {
  const props = {
    isSaving: false,
    isExistingQuiz: true,
    isOpen: true,
    menuRef: createRef<HTMLDivElement>(),
    currentVisibility: 'public' as const,
    canUsePrivateVisibility: true,
    onToggle: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
    onSaveWithVisibility: vi.fn(),
    ...overrides,
  };

  render(<HeaderSaveControls {...props} />);
  return props;
}

describe('HeaderSaveControls', () => {
  it('opens as a dropdown and saves an existing quiz from the menu', () => {
    const props = renderSaveControls({ isOpen: false });

    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }));

    expect(props.onToggle).toHaveBeenCalledOnce();
  });

  it('runs quick save for an existing quiz from the dropdown', () => {
    const props = renderSaveControls();

    fireEvent.click(screen.getByRole('button', { name: /Сохранить изменения/ }));

    expect(props.onSave).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('saves a new quiz with selected visibility from the dropdown', () => {
    const props = renderSaveControls({
      isExistingQuiz: false,
      currentVisibility: null,
    });

    fireEvent.click(screen.getByRole('button', { name: /По ссылке/ }));

    expect(props.onSaveWithVisibility).toHaveBeenCalledWith('unlisted');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('locks private visibility options for free users', () => {
    const props = renderSaveControls({
      isExistingQuiz: false,
      currentVisibility: null,
      canUsePrivateVisibility: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Только мне/ }));

    expect(props.onSaveWithVisibility).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Доступно в PRO/)).toHaveLength(2);
  });

  it('disables the menu button while saving', () => {
    renderSaveControls({ isSaving: true, isOpen: false });

    expect(
      (screen.getByRole('button', { name: /Сохранение/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

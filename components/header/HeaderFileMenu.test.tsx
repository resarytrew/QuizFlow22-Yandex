import { createRef, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderFileMenu } from './HeaderFileMenu';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

function renderFileMenu(options: { importLocked?: boolean } = {}) {
  const actions = {
    onToggle: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
    onImportJson: vi.fn(),
    onExportJson: vi.fn(),
    onGenerateHtml: vi.fn(),
    onClearCanvas: vi.fn(),
  };

  render(
    <HeaderFileMenu
      isOpen
      menuRef={createRef<HTMLDivElement>()}
      importLocked={options.importLocked ?? false}
      {...actions}
    />,
  );

  return actions;
}

describe('HeaderFileMenu', () => {
  it('keeps project actions available from the compact file menu', () => {
    const actions = renderFileMenu();

    fireEvent.click(screen.getByRole('button', { name: /Настройки проекта/ }));
    fireEvent.click(screen.getByRole('button', { name: /Импорт JSON/ }));
    fireEvent.click(screen.getByRole('button', { name: /Экспорт JSON/ }));
    fireEvent.click(screen.getByRole('button', { name: /Сгенерировать HTML/ }));
    fireEvent.click(screen.getByRole('button', { name: /Очистить холст/ }));

    expect(actions.onOpenSettings).toHaveBeenCalledOnce();
    expect(actions.onImportJson).toHaveBeenCalledOnce();
    expect(actions.onExportJson).toHaveBeenCalledOnce();
    expect(actions.onGenerateHtml).toHaveBeenCalledOnce();
    expect(actions.onClearCanvas).toHaveBeenCalledOnce();
    expect(actions.onClose).toHaveBeenCalledTimes(5);
  });

  it('shows a PRO marker when JSON import is locked', () => {
    renderFileMenu({ importLocked: true });

    expect(screen.getByText('Доступно в подписке PRO')).toBeTruthy();
    expect(screen.getByText('PRO')).toBeTruthy();
  });
});

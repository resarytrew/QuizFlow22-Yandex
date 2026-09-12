import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/useAuthStore';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(), register: vi.fn(), verifyEmail: vi.fn(), resendCode: vi.fn(),
  forgotPassword: vi.fn(), startYandexLogin: vi.fn(),
}));

vi.mock('../../services/authClient.ts', () => ({ authClient: authMocks }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import AuthModal from './AuthModal';

const user = { id: 'user-1', email: 'user@example.com', emailVerified: true, role: 'user', authLevel: 'normal' as const };

describe('AuthModal', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    Object.values(authMocks).forEach((mock) => mock.mockReset());
  });

  it('stores the authenticated user without a browser token', async () => {
    authMocks.login.mockResolvedValue({ user });
    render(<AuthModal id="auth-test" isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: user.email } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти в аккаунт' }));
    await waitFor(() => expect(useAuthStore.getState().user).toEqual(user));
    expect(JSON.stringify(useAuthStore.getState())).not.toContain('access_token');
  });

  it('waits for an email code and completes registration', async () => {
    authMocks.register.mockResolvedValue({ ok: true, verificationRequired: true });
    authMocks.verifyEmail.mockResolvedValue({ ok: true, user });
    render(<AuthModal id="auth-test" isOpen initialMode="sign-up" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: user.email } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    await screen.findByPlaceholderText('000000');
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить почту' }));
    await waitFor(() => expect(authMocks.verifyEmail).toHaveBeenCalledWith(user.email, '123456'));
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('blocks a weak password before registration', async () => {
    render(<AuthModal id="auth-test" isOpen initialMode="sign-up" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: user.email } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    expect(await screen.findByText('Минимум 8 символов, строчная и заглавная буквы, цифра')).toBeTruthy();
    expect(authMocks.register).not.toHaveBeenCalled();
  });

  it('resends the pending verification code', async () => {
    authMocks.register.mockResolvedValue({ ok: true, verificationRequired: true });
    authMocks.resendCode.mockResolvedValue({ ok: true });
    render(<AuthModal id="auth-test" isOpen initialMode="sign-up" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: user.email } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    await screen.findByPlaceholderText('000000');
    fireEvent.click(screen.getByRole('button', { name: 'Отправить код повторно' }));
    await waitFor(() => expect(authMocks.resendCode).toHaveBeenCalledWith(user.email));
  });

  it('starts direct Yandex OAuth', () => {
    render(<AuthModal id="auth-test" isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Яндекс' }));
    expect(authMocks.startYandexLogin).toHaveBeenCalledOnce();
  });
});

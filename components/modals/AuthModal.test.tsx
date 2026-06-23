import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/useAuthStore";

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
  verifyOtp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("../../services/supabaseClient.ts", () => ({
  isSupabaseReady: true,
  supabase: {
    auth: authMocks,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import AuthModal from "./AuthModal";

describe("AuthModal", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    authMocks.signInWithPassword.mockReset();
    authMocks.signInWithOAuth.mockReset();
    authMocks.signUp.mockReset();
    authMocks.verifyOtp.mockReset();
    authMocks.resend.mockReset();
    authMocks.resetPasswordForEmail.mockReset();
  });

  it("stores the returned session immediately after sign in", async () => {
    const session = {
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1", email: "user@example.com" },
    };
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });
    const onClose = vi.fn();

    render(<AuthModal id="auth-test" isOpen onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти в аккаунт" }));

    await waitFor(() => {
      expect(useAuthStore.getState().session).toBe(session);
      expect(useAuthStore.getState().authInitialized).toBe(true);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("does not report success when Supabase returns no session", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    render(<AuthModal id="auth-test" isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти в аккаунт" }));

    expect(
      (await screen.findByText("Сессия не была создана. Попробуйте войти повторно.")).textContent,
    ).toContain("Сессия не была создана");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("opens on the registration tab when requested", () => {
    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Создайте аккаунт" }),
    ).toBeTruthy();
  });

  it("waits for the email code after sign up and finishes registration with verifyOtp", async () => {
    const session = {
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "user-1", email: "user@example.com" },
    };
    authMocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: "pending-user", email: "user@example.com" } },
      error: null,
    });
    authMocks.verifyOtp.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });
    const onClose = vi.fn();

    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText(/Подтвердите почту/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить почту" }));

    await waitFor(() => {
      expect(authMocks.verifyOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        token: "123456",
        type: "email",
      });
      expect(useAuthStore.getState().session).toBe(session);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it("blocks weak passwords before sign up", async () => {
    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Минимум 8 символов, строчная и заглавная буквы, цифра")).toBeTruthy();
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("does not continue registration when Supabase reports an existing email and offers password reminder", async () => {
    authMocks.signUp.mockResolvedValue({
      data: {
        session: null,
        user: { id: "existing-user", email: "user@example.com", identities: [] },
      },
      error: null,
    });
    authMocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Вы уже зарегистрированы")).toBeTruthy();
    expect(screen.queryByText(/Подтвердите почту/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Напомнить пароль" }));

    await waitFor(() => {
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/#/auth/reset-password"),
        }),
      );
    });
  });

  it("can resend the signup code for the pending email", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: "pending-user", email: "user@example.com" } },
      error: null,
    });
    authMocks.resend.mockResolvedValue({ data: {}, error: null });

    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await screen.findByText(/Подтвердите почту/);
    fireEvent.click(screen.getByRole("button", { name: "Отправить код повторно" }));

    await waitFor(() => {
      expect(authMocks.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "user@example.com",
      });
      expect(screen.getByText(/Код подтверждения отправлен повторно/)).toBeTruthy();
    });
  });

  it("starts a clean signup attempt when the user changes the pending email", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: "pending-user", email: "first@example.com" } },
      error: null,
    });

    render(
      <AuthModal
        id="auth-test"
        isOpen
        initialMode="sign-up"
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "first@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await screen.findByText(/Подтвердите почту/);
    expect(screen.getByText(/first@example.com/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Изменить email" }));
    expect(screen.queryByText(/first@example.com/)).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "second@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Повторите пароль"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledTimes(2);
      expect(authMocks.signUp).toHaveBeenLastCalledWith({
        email: "second@example.com",
        password: "Password1",
        options: expect.any(Object),
      });
    });
  });

  it("starts Yandex OAuth with the auth callback redirect", async () => {
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { provider: "custom:yandex", url: "https://oauth.yandex.ru" },
      error: null,
    });

    render(<AuthModal id="auth-test" isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Яндекс" }));

    await waitFor(() => {
      expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "custom:yandex",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/#/auth/confirm"),
        }),
      });
      expect(authMocks.signInWithOAuth.mock.calls[0][0].options).not.toHaveProperty("scopes");
    });
  });
});

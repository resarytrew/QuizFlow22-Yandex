
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authClient } from '../../services/authClient.ts';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore.ts';

interface Props {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'sign-in' | 'sign-up';
}

const SIGNUP_PASSWORD_REQUIREMENTS = 'Минимум 8 символов, строчная и заглавная буквы, цифра';
const EXISTING_ACCOUNT_MESSAGE = 'Вы уже зарегистрированы';

const isPasswordStrong = (value: string): boolean =>
  value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const AuthModal: React.FC<Props> = ({
  id,
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'sign-in',
}) => {
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthInitialized = useAuthStore((state) => state.setAuthInitialized);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [pendingSignupEmail, setPendingSignupEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'yandex' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [signupCodeError, setSignupCodeError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'sign-up');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [initialMode, isOpen]);

  const translateError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Произошла ошибка при авторизации';
    if (message === EXISTING_ACCOUNT_MESSAGE) return EXISTING_ACCOUNT_MESSAGE;
    const msg = message.toLowerCase();
    if (msg.includes('сессия не была создана')) return message;
    if (msg.includes('почта подтверждена, но сессия не была создана')) return message;
    if (msg.includes('сначала отправьте форму регистрации')) return message;
    if (msg.includes('invalid login credentials')) return 'Неверный email или пароль';
    if (msg.includes('user already registered')) return EXISTING_ACCOUNT_MESSAGE;
    if (msg.includes('user already exists')) return EXISTING_ACCOUNT_MESSAGE;
    if (msg.includes('already been registered')) return EXISTING_ACCOUNT_MESSAGE;
    if (msg.includes('email address is invalid')) return 'Введите корректный email';
    if (msg.includes('signup is disabled')) return 'Регистрация временно недоступна';
    if (msg.includes('error sending confirmation email')) return 'Не удалось отправить письмо с кодом. Попробуйте позже.';
    if (msg.includes('password should be at least')) return SIGNUP_PASSWORD_REQUIREMENTS;
    if (msg.includes('password should contain')) return SIGNUP_PASSWORD_REQUIREMENTS;
    if (msg.includes('weak password')) return SIGNUP_PASSWORD_REQUIREMENTS;
    if (msg.includes('email not confirmed')) return 'Email не подтвержден';
    if (msg.includes('rate limit')) return 'Слишком много попыток. Попробуйте позже';
    return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
      return false;
    }
    if (!re.test(email)) {
      setEmailError('Введите корректный email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('');
      return false;
    }
    if (isSignUp && !isPasswordStrong(password)) {
      setPasswordError(SIGNUP_PASSWORD_REQUIREMENTS);
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!isSignUp) {
      setConfirmPasswordError('');
      return true;
    }
    if (!value) {
      setConfirmPasswordError('');
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError('Пароли не совпадают');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const validateSignupCode = (value: string) => {
    const normalized = value.trim();
    if (!/^\d{6}$/.test(normalized)) {
      setSignupCodeError('Введите 6 цифр из письма');
      return false;
    }
    setSignupCodeError('');
    return true;
  };

  const clearPendingSignup = (options: { clearEmail?: boolean } = {}) => {
    setPendingSignupEmail(null);
    setSignupCode('');
    setSignupCodeError('');
    setMessage(null);
    setError(null);
    setResendLoading(false);
    if (options.clearEmail) {
      setEmail('');
      setEmailError('');
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
    const nextEmail = normalizeEmail(value);
    if (pendingSignupEmail && nextEmail !== pendingSignupEmail) {
      clearPendingSignup();
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!validateEmail(normalizedEmail)) {
      toast.error('Сначала введите корректный email');
      return;
    }

    setLoading(true);
    try {
      await authClient.forgotPassword(normalizedEmail);
      toast.success('Инструкции по сбросу пароля отправлены на ваш email');
    } catch (err: unknown) {
      toast.error(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleYandexSignIn = async () => {
    setSocialLoading('yandex');
    setError(null);
    setMessage(null);

    try {
      authClient.startYandexLogin();
    } catch (err: unknown) {
      setError(translateError(err));
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = normalizeEmail(email);
    const isEmailValid = validateEmail(normalizedEmail);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await authClient.register(normalizedEmail, password);
        setPendingSignupEmail(normalizedEmail);
        setMessage('Если адрес доступен для регистрации, на него отправлен 6-значный код.');
      } else {
        const { user } = await authClient.login(normalizedEmail, password);
        setUser(user);
        setAuthInitialized(true);
        toast.success('С возвращением!');
        onSuccess?.();
        handleClose();
      }
    } catch (err: unknown) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingSignupEmail) {
      setError('Сначала отправьте форму регистрации.');
      return;
    }
    if (!validateSignupCode(signupCode)) return;

    setLoading(true);
    setError(null);

    try {
      const { user } = await authClient.verifyEmail(pendingSignupEmail, signupCode.trim());
      setUser(user);
      setAuthInitialized(true);
      toast.success('Почта подтверждена. Регистрация завершена!');
      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupCode = async () => {
    if (!pendingSignupEmail) {
      setError('Сначала отправьте форму регистрации.');
      return;
    }

    setResendLoading(true);
    setError(null);

    try {
      await authClient.resendCode(pendingSignupEmail);
      setMessage('Код подтверждения отправлен повторно. Проверьте почту и папку «Спам».');
    } catch (err: unknown) {
      setError(translateError(err));
    } finally {
      setResendLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    clearPendingSignup();
    setError(null);
    setMessage(null);
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setSignupCodeError('');
    setIsSignUp(false);
    setShowPassword(false);
    setResendLoading(false);
    setSocialLoading(null);
    onClose();
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    clearPendingSignup();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"></div>
      
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex overflow-hidden animate-scale-in border border-slate-200/50"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold">Поток</h1>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">Создавайте увлекательные квизы</h2>
              <p className="text-lg text-white/80 leading-relaxed">
                Визуальный редактор, мощная аналитика и безграничные возможности для создания интерактивного контента.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            {[
              { icon: '🎨', text: 'Визуальный редактор' },
              { icon: '📊', text: 'Детальная аналитика' },
              { icon: '🚀', text: 'Быстрая публикация' },
            ].map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
              >
                <span className="text-2xl">{feature.icon}</span>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="flex justify-end p-6">
            <button 
              onClick={handleClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 px-8 pb-8 overflow-y-auto">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => isSignUp && switchMode()}
                    className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Вход
                  </button>
                  <button
                    onClick={() => !isSignUp && switchMode()}
                    className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Регистрация
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {isSignUp ? 'Создайте аккаунт' : 'С возвращением!'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {pendingSignupEmail
                    ? `Введите код, отправленный на ${pendingSignupEmail}`
                    : isSignUp
                      ? 'Начните создавать удивительные квизы сегодня'
                      : 'Войдите, чтобы продолжить работу'}
                </p>
              </div>

              {message && (
                <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-3 animate-slide-down">
                  <p className="text-sm text-emerald-800 flex-1">{message}</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex flex-col items-start gap-3 animate-slide-down">
                  <p className="text-sm text-red-800 flex-1">{error}</p>
                  {isSignUp && !pendingSignupEmail && error === EXISTING_ACCOUNT_MESSAGE && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Напомнить пароль
                    </button>
                  )}
                </div>
              )}

              {pendingSignupEmail ? (
                <form onSubmit={handleVerifySignupCode} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Код подтверждения
                    </label>
                    <input name="components-modals-authmodal-508-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={signupCode}
                      onChange={(e) => {
                        setSignupCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setError(null);
                      }}
                      required
                      className={`w-full px-4 py-3.5 text-center text-2xl font-bold tracking-[0.4em] bg-white border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        signupCodeError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                      placeholder="000000"
                    />
                    {signupCodeError && <p className="mt-2 text-xs text-red-600">{signupCodeError}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? 'Проверяем...' : 'Подтвердить почту'}
                  </button>

                  <button
                    type="button"
                    disabled={resendLoading || loading}
                    onClick={handleResendSignupCode}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendLoading ? 'Отправляем код...' : 'Отправить код повторно'}
                  </button>

                  <button
                    type="button"
                    onClick={() => clearPendingSignup({ clearEmail: true })}
                    className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Изменить email
                  </button>
                </form>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email адрес</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input name="components-modals-authmodal-561-input"
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                      className={`w-full pl-12 pr-4 py-3.5 bg-white border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        emailError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {emailError && <p className="mt-2 text-xs text-red-600">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Пароль</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input name="components-modals-authmodal-583-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      required
                      className={`w-full pl-12 pr-12 py-3.5 bg-white border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        passwordError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className={`mt-2 text-xs ${passwordError ? 'text-red-600' : 'text-slate-500'}`}>
                      {passwordError || SIGNUP_PASSWORD_REQUIREMENTS}
                    </p>
                  )}
                  {!isSignUp && passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
                </div>

                {isSignUp && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Повторите пароль
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input name="components-modals-authmodal-620-input"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        required
                        className={`w-full pl-12 pr-4 py-3.5 bg-white border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                          confirmPasswordError ? 'border-red-300' : 'border-slate-200 focus:border-indigo-500'
                        }`}
                        placeholder="Повторите пароль"
                      />
                    </div>
                    {confirmPasswordError && <p className="mt-2 text-xs text-red-600">{confirmPasswordError}</p>}
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || Boolean(socialLoading)}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? 'Обработка...' : (isSignUp ? 'Зарегистрироваться' : 'Войти в аккаунт')}
                </button>
              </form>
              )}

              {!pendingSignupEmail && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-slate-200" />
                  <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Войти через
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleYandexSignIn}
                  disabled={loading || Boolean(socialLoading)}
                  className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-800 transition-all duration-200 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-base font-black text-white"
                  >
                    Я
                  </span>
                  {socialLoading === 'yandex' ? 'Переходим в Яндекс...' : 'Яндекс'}
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AuthModal;

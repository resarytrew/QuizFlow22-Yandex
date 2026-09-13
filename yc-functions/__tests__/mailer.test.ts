import { beforeEach, describe, expect, it, vi } from 'vitest';

const mail = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mail.sendMail })),
  },
}));

import { sendPasswordReset, sendVerificationCode } from '../_shared/mailer';

describe('Yandex Cloud Postbox mailer', () => {
  beforeEach(() => {
    mail.sendMail.mockReset().mockResolvedValue({ messageId: 'test' });
    process.env.POSTBOX_SMTP_USER = 'postbox-test-user';
    process.env.POSTBOX_SMTP_PASSWORD = 'postbox-test-password';
    process.env.POSTBOX_FROM_EMAIL = 'no-reply@mykviz.ru';
    process.env.POSTBOX_FROM_NAME = 'Поток';
    process.env.FRONTEND_URL = 'https://mykviz.ru';
  });

  it('sends verification code as both plain text and HTML without exposing credentials', async () => {
    await sendVerificationCode('user@example.com', '482913');
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      subject: 'Код подтверждения — Поток',
      text: expect.stringContaining('482913'),
      html: expect.stringContaining('482913'),
    }));
    expect(JSON.stringify(mail.sendMail.mock.calls)).not.toContain('postbox-test-password');
  });

  it('sends a one-time reset link rather than an OTP', async () => {
    await sendPasswordReset('user@example.com', 'raw-reset-token');
    const message = mail.sendMail.mock.calls[0][0];
    expect(message.text).toContain('https://mykviz.ru/#/auth/reset-password?token=raw-reset-token');
    expect(message.html).toContain('raw-reset-token');
    expect(message.text).toContain('30 минут');
  });
});

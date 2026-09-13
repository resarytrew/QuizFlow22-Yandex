import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function mailTransport() {
  if (transporter) return transporter;
  const user = process.env.POSTBOX_SMTP_USER;
  const pass = process.env.POSTBOX_SMTP_PASSWORD;
  if (!user || !pass) throw new Error('Yandex Cloud Postbox credentials are not configured');
  transporter = nodemailer.createTransport({
    host: 'postbox.cloud.yandex.net',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });
  return transporter;
}

function sender(): { name: string; address: string } {
  const address = process.env.POSTBOX_FROM_EMAIL;
  if (!address) throw new Error('POSTBOX_FROM_EMAIL not configured');
  return { name: process.env.POSTBOX_FROM_NAME || 'Поток', address };
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const escapedCode = code.replace(/[^0-9]/g, '');
  await mailTransport().sendMail({
    from: sender(),
    to: email,
    subject: 'Код подтверждения — Поток',
    text: `Ваш код подтверждения:\n\n${escapedCode}\n\nКод действует 10 минут.\n\nЕсли вы не регистрировались в Потоке, просто проигнорируйте письмо.`,
    html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6"><h1 style="font-size:24px">Подтверждение email</h1><p>Ваш код подтверждения:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${escapedCode}</p><p>Код действует 10 минут.</p><p style="color:#6b7280">Если вы не регистрировались в Потоке, просто проигнорируйте письмо.</p></div>`,
  });
}

export async function sendPasswordReset(email: string, rawToken: string): Promise<void> {
  const origin = (process.env.FRONTEND_URL || 'https://mykviz.ru').replace(/\/$/, '');
  const link = `${origin}/#/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
  await mailTransport().sendMail({
    from: sender(),
    to: email,
    subject: 'Восстановление пароля — Поток',
    text: `Чтобы задать новый пароль, откройте ссылку:\n\n${link}\n\nСсылка действует 30 минут. Если вы не запрашивали восстановление, просто проигнорируйте письмо.`,
    html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6"><h1 style="font-size:24px">Восстановление пароля</h1><p>Чтобы задать новый пароль, нажмите кнопку:</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#4f46e5;color:white;text-decoration:none;font-weight:700">Задать новый пароль</a></p><p>Ссылка действует 30 минут.</p><p style="color:#6b7280">Если вы не запрашивали восстановление, просто проигнорируйте письмо.</p></div>`,
  });
}

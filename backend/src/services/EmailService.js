const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendPasswordResetEmail = async (to, name, resetToken) => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
            <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <tr>
                        <td style="background-color:#0f172a;padding:32px 40px;">
                            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">Redefinir Senha</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px;">
                                Olá <strong>${name || 'Usuário'}</strong>,
                            </p>
                            <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px;">
                                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                                <tr>
                                    <td style="background-color:#f97316;border-radius:12px;">
                                        <a href="${resetUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;">
                                            Redefinir Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px;">
                                Ou copie e cole este link no seu navegador:
                            </p>
                            <p style="color:#3b82f6;font-size:13px;word-break:break-all;margin:0 0 24px;">
                                ${resetUrl}
                            </p>
                            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                            <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                                Este link é válido por <strong>24 horas</strong>. Se você não solicitou esta alteração, ignore este email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject: 'Redefinição de Senha',
            html
        });
        logger.info(`[EmailService] Email de reset enviado para ${to}`);
        return true;
    } catch (error) {
        logger.error(`[EmailService] Erro ao enviar email para ${to}:`, error.message);
        throw new Error('Falha ao enviar email de redefinição.');
    }
};

module.exports = { sendPasswordResetEmail };

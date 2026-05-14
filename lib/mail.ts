import nodemailer from 'nodemailer';

/**
 * Configure le transporteur SMTP à partir des variables d'environnement.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true, // true pour le port 465, false pour les autres
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoie un email via SMTP.
 */
export async function sendMail({ to, subject, text, html }: MailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[MAIL] SMTP credentials missing. Skipping email.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Suivi de Chantier" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log('[MAIL] Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('[MAIL] Error sending email:', error);
    throw error;
  }
}

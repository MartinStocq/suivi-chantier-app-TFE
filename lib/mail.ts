import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Configure les services d'envoi d'email.
 * On privilégie Resend si une clé API est présente (recommandé pour la production).
 * On utilise Nodemailer/SMTP comme solution de repli (pour le développement local).
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

console.log(`[MAIL] Initializing SMTP: ${process.env.SMTP_HOST}:${smtpPort} (secure: ${smtpSecure})`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpSecure,
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
 * Envoie un email via Resend (API) ou SMTP.
 */
export async function sendMail({ to, subject, text, html }: MailOptions) {
  // Option 1 : Resend (Préféré en production)
  if (resend) {
    try {
      const fromEmail = process.env.MAIL_FROM || 'onboarding@resend.dev';
      const { data, error } = await resend.emails.send({
        from: `Suivi de Chantier <${fromEmail}>`,
        to: [to],
        subject,
        text,
        html: html || text,
      });

      if (error) {
        console.error('[MAIL] Resend error:', error);
        // On continue vers SMTP si Resend échoue et que SMTP est configuré
      } else {
        console.log('[MAIL] Email sent via Resend:', data?.id);
        return data;
      }
    } catch (error) {
      console.error('[MAIL] Resend exception:', error);
    }
  }

  // Option 2 : SMTP (Repli ou développement local)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[MAIL] No valid email configuration found (Resend or SMTP). Skipping email.');
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
    console.log('[MAIL] Email sent via SMTP: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('[MAIL] SMTP Error:', error);
    throw error;
  }
}

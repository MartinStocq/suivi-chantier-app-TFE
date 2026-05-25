import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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
  console.log(`[MAIL] Tentative d'envoi d'email à: ${to} (Sujet: ${subject})`);

  // Option 1 : Resend (Préféré en production)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      console.log('[MAIL] Utilisation de Resend API...');
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.MAIL_FROM || 'onboarding@resend.dev';
      
      const { data, error } = await resend.emails.send({
        from: `Suivi de Chantier <${fromEmail}>`,
        to: [to],
        subject,
        text,
        html: html || text,
      });

      if (error) {
        console.error('[MAIL] Erreur Resend détaillée:', error);
        // On continue vers SMTP si Resend échoue
      } else {
        console.log('[MAIL] Email envoyé avec succès via Resend:', data?.id);
        return data;
      }
    } catch (error) {
      console.error('[MAIL] Exception lors de l\'envoi via Resend:', error);
    }
  } else {
    console.log('[MAIL] RESEND_API_KEY non configurée, passage au SMTP.');
  }

  // Option 2 : SMTP (Repli ou développement local)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[MAIL] Configuration SMTP manquante (SMTP_USER ou SMTP_PASSWORD). Skipping.');
    return;
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  console.log(`[MAIL] Initialisation SMTP: ${smtpHost}:${smtpPort} (secure: ${smtpSecure}, user: ${process.env.SMTP_USER})`);

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"Suivi de Chantier" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    
    console.log('[MAIL] Email envoyé avec succès via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error('[MAIL] Erreur SMTP critique:', error);
    
    if (smtpPort === 465) {
      console.info('[MAIL] Conseil: Si vous êtes sur un hébergeur cloud (Vercel, etc.), essayez le port 587 avec SMTP_SECURE=false');
    }
    
    throw error;
  }
}
